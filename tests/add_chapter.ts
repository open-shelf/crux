import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Add Chapter", () => {
  it("Can add chapters", async () => {
    const { program, bookKeypair, author, bookTitle, chapterPrices, fullBookPrice } = await setup();

    try {
      // First, add a book
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

      // Now add chapters
      const chapterUrls = [
        "https://example.com/chapter1",
        "https://example.com/chapter2",
        "https://example.com/chapter3",
      ];

      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .addChapter(chapterUrls[i], i)
          .accounts({
            book: bookKeypair.publicKey,
            author: author.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([author])
          .rpc();
      }

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.deepEqual(bookAccount.chapters, chapterUrls);

      console.log("Chapters added successfully:", bookAccount.chapters);
    } catch (error) {
      console.error("Error adding chapters:", error);
      throw error;
    }
  });
});