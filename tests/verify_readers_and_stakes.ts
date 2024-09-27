import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Verify Readers and Stakes", () => {
  it("Can verify readers and stakes for a book", async () => {
    const { program, bookKeypair, author, reader1, reader2, staker1, staker2, platform, bookTitle, metaUrl, chapterPrices } = await setup();

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
      const stakeAmount2 = new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL);
      await program.methods
        .stakeOnBook(stakeAmount2)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker2])
        .rpc();

      // Purchase chapter 0 - Reader 1
      await program.methods
        .purchaseChapter(0)
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader1.publicKey,
          author: author.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader1])
        .rpc();

      // Purchase full book - Reader 2
      await program.methods
        .purchaseFullBook()
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader2.publicKey,
          author: author.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader2])
        .rpc();

      // Fetch the book account
      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);

      // Verify readers
      assert.isTrue(bookAccount.chapters[0].readers.some(pubkey => pubkey.equals(reader1.publicKey)), "Reader 1 should have access to chapter 0");
      assert.isFalse(bookAccount.chapters[1].readers.some(pubkey => pubkey.equals(reader1.publicKey)), "Reader 1 should not have access to chapter 1");
      assert.isFalse(bookAccount.chapters[2].readers.some(pubkey => pubkey.equals(reader1.publicKey)), "Reader 1 should not have access to chapter 2");

      bookAccount.chapters.forEach((chapter, index) => {
        assert.isTrue(chapter.readers.some(pubkey => pubkey.equals(reader2.publicKey)), `Reader 2 should have access to chapter ${index}`);
      });

      // Verify stakes
      const stake1 = bookAccount.stakes.find(stake => stake.staker.equals(staker1.publicKey));
      const stake2 = bookAccount.stakes.find(stake => stake.staker.equals(staker2.publicKey));

      assert.isDefined(stake1, "Stake 1 should exist");
      assert.isDefined(stake2, "Stake 2 should exist");
      assert.equal(stake1.amount.toNumber(), stakeAmount1.toNumber(), "Stake 1 amount should be correct");
      assert.equal(stake2.amount.toNumber(), stakeAmount2.toNumber(), "Stake 2 amount should be correct");

      console.log("Readers and stakes verified successfully");
      console.log("Book details:", {
        title: bookAccount.title,
        author: bookAccount.author.toString(),
        chapters: bookAccount.chapters.map(chapter => ({
          name: chapter.name,
          url: chapter.url,
          price: chapter.price.toNumber(),
          readers: chapter.readers.length
        })),
        stakes: bookAccount.stakes.map(stake => ({
          staker: stake.staker.toString(),
          amount: stake.amount.toNumber(),
          earnings: stake.earnings.toNumber()
        }))
      });
    } catch (error) {
      console.error("Error verifying readers and stakes:", error);
      throw error;
    }
  });
});