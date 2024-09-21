import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Purchase Full Book", () => {
  it("Can purchase a full book and distribute earnings", async () => {
    const { program, bookKeypair, author, reader2, staker1, bookTitle, chapterPrices, fullBookPrice } = await setup();

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

      // Stake on the book
      const stakeAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL stake
      await program.methods
        .stakeOnBook(stakeAmount)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker1])
        .rpc();

      const initialAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const initialBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);

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
      const finalBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);

      const expectedAuthorPayment = fullBookPrice.toNumber() * 0.7; // 70% to author
      const expectedBookPayment = fullBookPrice.toNumber() * 0.3; // 30% to book account (for stakers)

      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedAuthorPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );

      assert.approximately(
        finalBookBalance - initialBookBalance,
        expectedBookPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Book account should have received the correct payment for stakers"
      );

      // Check staker earnings
      const stakerStake = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      assert.approximately(
        stakerStake.earnings.toNumber(),
        expectedBookPayment,
        1000, // Allow for small rounding differences
        "Staker should have received the correct earnings"
      );

      // Check that all chapters are marked as read for the buyer
      for (let chapterReaders of bookAccount.chapterReaders) {
        assert.isTrue(chapterReaders.some(
          (pubkey) => pubkey.equals(reader2.publicKey)
        ), "All chapters should be marked as read for the buyer");
      }

      console.log("Full book purchased successfully");
      console.log("Author payment:", finalAuthorBalance - initialAuthorBalance);
      console.log("Book account increase (for stakers):", finalBookBalance - initialBookBalance);
      console.log("Staker earnings:", stakerStake.earnings.toNumber());
    } catch (error) {
      console.error("Error purchasing full book:", error);
      throw error;
    }
  });
});