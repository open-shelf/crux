import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Add Book", () => {
  it("Can add a book", async () => {
    const { program, bookKeypair, author, bookTitle, chapterPrices, fullBookPrice } = await setup();

    try {
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

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.equal(bookAccount.title, bookTitle);
      assert.deepEqual(
        bookAccount.chapterPrices.map((price) => price.toNumber()),
        chapterPrices
      );
      assert.equal(bookAccount.fullBookPrice.toNumber(), fullBookPrice.toNumber());
      assert.equal(bookAccount.totalStake.toNumber(), 0);
      assert.deepEqual(bookAccount.readers, []);
      assert.deepEqual(bookAccount.chapterReaders, [[], [], []]);
      assert.deepEqual(bookAccount.chapters, []);
      assert.deepEqual(bookAccount.stakes, []);

      console.log("Book added successfully:", bookAccount);
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  });
});