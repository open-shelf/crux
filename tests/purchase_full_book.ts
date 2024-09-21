import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Purchase Full Book", () => {
  it("Can purchase a full book", async () => {
    const { program, bookKeypair, author, reader2, bookTitle, chapterPrices, fullBookPrice } = await setup();

    try {
      // Add a book
      await program.methods
        .addBook(
          bookTitle,
          chapterPrices.map((price) => new anchor.BN(price)),
          fullBookPrice
        )
        .accounts({
          book: bookKeypair.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bookKeypair, author])
        .rpc();

      const initialAuthorBalance = await program.provider.connection.getBalance(author.publicKey);

      await program.methods
        .purchaseFullBook()
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader2.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader2])
        .rpc();

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.isTrue(bookAccount.readers.some(
        (pubkey) => pubkey.equals(reader2.publicKey)
      ));

      const finalAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const expectedPayment = fullBookPrice.toNumber() * 0.8; // 80% to author
      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );

      console.log("Author balance increased by", finalAuthorBalance - initialAuthorBalance);
      console.log("Full book purchased successfully");
    } catch (error) {
      console.error("Error purchasing full book:", error);
      throw error;
    }
  });
});