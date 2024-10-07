import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Add Book", () => {
  it("Can add a book", async () => {
    const { program, bookKeypair, author, bookTitle, description,  genre, image_url } = await setup();

    try {
      await program.methods
        .addBook(
          bookTitle,
          description,
          genre,
          image_url
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
      assert.equal(bookAccount.metadata.imageUrl, image_url); 
      assert.equal(bookAccount.fullBookPrice.toNumber(), 0); // Change full_book_price to fullBookPrice
      assert.equal(bookAccount.totalStake.toNumber(), 0); // Change total_stake to totalStake
      assert.deepEqual(bookAccount.readers, []);
      assert.deepEqual(bookAccount.chapters, []);
      assert.deepEqual(bookAccount.stakes, []);

      console.log("Book added successfully:", bookAccount);
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  });
});