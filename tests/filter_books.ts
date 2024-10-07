import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Filter Books", () => {
  it("Should filter books by author and number of stakers", async () => {
    const { program, bookKeypair, author, staker1, staker2, bookTitle, description,  genre, image_url, chapterPrices } = await setup();

    try {
      // Add a book
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

      // Add chapters
      const chapterUrls = [
        "https://example.com/chapter1",
        "https://example.com/chapter2",
        "https://example.com/chapter3",
      ];
      const chapterNames = ["Chapter 1", "Chapter 2", "Chapter 3"];

      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .addChapter(chapterUrls[i], i, new anchor.BN(chapterPrices[i]), chapterNames[i])
          .accounts({
            book: bookKeypair.publicKey,
            author: author.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([author])
          .rpc();
      }

      // Stake on the book - Staker 1
      const stakeAmount1 = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      await program.methods
        .stakeOnBook(stakeAmount1)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker1])
        .rpc();

      // Stake on the book - Staker 2
      const stakeAmount2 = new anchor.BN(3 * anchor.web3.LAMPORTS_PER_SOL);
      await program.methods
        .stakeOnBook(stakeAmount2)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker2])
        .rpc();

      // Fetch the book account
      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);

      // Check if the author matches
      assert.isTrue(bookAccount.author.equals(author.publicKey), "The book should be authored by the correct author");

      // Check the number of stakers
      assert.isTrue(bookAccount.stakes.length >= 2, "The book should have at least 2 stakers");

      console.log("Book filtered successfully");
    } catch (error) {
      console.error("Error filtering books:", error);
      throw error;
    }
  });
});