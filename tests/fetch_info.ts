import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Fetch_info", () => {
  it("Can fetch book and chapter details", async () => {
    const { program, bookKeypair, author, bookTitle, metaUrl, chapterPrices } = await setup();

    try {
      // Add a book
      await program.methods
        .addBook(bookTitle, metaUrl)
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

      // Fetch book details
      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);

      console.log(bookAccount.chapters);
      
      // Format book details according to structure.json
      const formattedBookDetails = {
        author: bookAccount.author.toString(),
        title: bookAccount.title,
        meta_url: bookAccount.metaUrl,
        fullBookPrice: bookAccount.fullBookPrice.toNumber(),
        totalStake: bookAccount.totalStake.toNumber(),
        chapters: bookAccount.chapters.map(chapter => ({
          url: chapter.url,
          name: chapter.name
        })),
        stakes: bookAccount.stakes.map(stake => ({
          staker: stake.staker.toString(),
          amount: stake.amount.toNumber()
        }))
      };

      console.log("Book details:", formattedBookDetails);

      // Assert book details
      assert.equal(formattedBookDetails.author, author.publicKey.toString());
      assert.equal(formattedBookDetails.title, bookTitle);
      assert.equal(formattedBookDetails.meta_url, metaUrl);
      assert.equal(formattedBookDetails.chapters.length, chapterUrls.length);

      // Format chapter details according to structure.json
      const formattedChapterDetails = bookAccount.chapters.map((chapter, index) => ({
        index: chapter.index,
        is_purchased: false, // Assuming this information is not stored on-chain
        name: chapter.name,
        url: chapter.url,
        price: chapter.price.toNumber()
      }));

      console.log("Chapter details:", formattedChapterDetails);

      // Assert chapter details
      assert.equal(formattedChapterDetails.length, chapterUrls.length);
      formattedChapterDetails.forEach((chapter, index) => {
        assert.equal(chapter.index, index);
        assert.equal(chapter.url, chapterUrls[index]);
        assert.equal(chapter.name, chapterNames[index]);
        assert.equal(chapter.price, chapterPrices[index]);
      });

    } catch (error) {
      console.error("Error fetching book and chapter details:", error);
      throw error;
    }
  });
});