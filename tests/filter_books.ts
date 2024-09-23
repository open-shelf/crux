import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Filter Books", () => {
  it("Should filter books by author and number of stakers", async () => {
    const { program, bookKeypair, author, reader1, reader2, staker1, staker2, platform, bookTitle, metaUrl, chapterPrices } = await setup();

    try {
      // Add a book
      await program.methods
        .addBook(
          bookTitle,
          metaUrl
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

      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .addChapter(chapterUrls[i], i, new anchor.BN(chapterPrices[i]))
          .accounts({
            book: bookKeypair.publicKey,
            author: author.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([author])
          .rpc();
      }

      // Stake on the book - Staker 1
      const stakeAmount1 = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL stake
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
      const stakeAmount2 = new anchor.BN(3 * anchor.web3.LAMPORTS_PER_SOL); // 3 SOL stake
      await program.methods
        .stakeOnBook(stakeAmount2)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker2])
        .rpc();

      // Fetch all books
      const books = await program.account.book.all();

      // Filter books by author
      const booksByAuthor = books.filter(book => book.account.author.equals(author.publicKey));
      assert.isTrue(booksByAuthor.length > 0, "There should be books by the author");

      // Filter books by number of stakers
      const booksByStakers = books.filter(book => book.account.stakes.length >= 2);
      assert.isTrue(booksByStakers.length > 0, "There should be books with at least 2 stakers");

      console.log("Books filtered successfully");
    } catch (error) {
      console.error("Error filtering books:", error);
      throw error;
    }
  });
});