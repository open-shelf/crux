import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Add Chapter", () => {
  it("Can add chapters", async () => {
    const { program, bookKeypair, author, bookTitle, metaUrl, chapterPrices } = await setup();

    try {
      // First, add a book
      await program.methods
        .addBook(
          bookTitle,
          metaUrl // Add meta_url parameter
        )
        .accounts({
          book: bookKeypair.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bookKeypair, author])
        .rpc();

      // Now add chapters
      const chapterUrls = [
        "https://example.com/chapter1",
        "https://example.com/chapter2",
        "https://example.com/chapter3",
      ];

      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .addChapter(chapterUrls[i], i, new anchor.BN(chapterPrices[i])) // Convert chapterPrices to BN
          .accounts({
            book: bookKeypair.publicKey, // Ensure the book account is provided
            author: author.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([author])
          .rpc();
      }

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      const expectedChapters = chapterUrls.map((url, index) => ({
        url,
        price: new anchor.BN(chapterPrices[index]),
        index,
        readers: [],
      }));

      // Convert BN to number for comparison
      const actualChapters = bookAccount.chapters.map((chapter) => ({
        ...chapter,
        price: chapter.price.toNumber(),
      }));
      const expectedChaptersForComparison = expectedChapters.map((chapter) => ({
        ...chapter,
        price: chapter.price.toNumber(),
      }));

      assert.deepEqual(actualChapters, expectedChaptersForComparison);

      console.log("Chapters added successfully:", bookAccount.chapters);
    } catch (error) {
      console.error("Error adding chapters:", error);
      throw error;
    }
  });
});