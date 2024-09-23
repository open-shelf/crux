import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Verify Readers and Stakes", () => {
  it("Should correctly populate readers and stakes", async () => {
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

      // Purchase chapters by reader1
      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .purchaseChapter(i)
          .accounts({
            book: bookKeypair.publicKey,
            buyer: reader1.publicKey,
            author: author.publicKey,
            platform: platform.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([reader1])
          .rpc();
      }

      // Purchase full book by reader2
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

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);

      // Verify readers
      assert.isTrue(bookAccount.readers.some((pubkey) => pubkey.equals(reader1.publicKey)), "Reader1 should be in the readers list");
      assert.isTrue(bookAccount.readers.some((pubkey) => pubkey.equals(reader2.publicKey)), "Reader2 should be in the readers list");

      // Verify chapter readers
      for (let chapter of bookAccount.chapters) {
        assert.isTrue(chapter.readers.some((pubkey) => pubkey.equals(reader1.publicKey)), `Reader1 should be in the readers list for chapter ${chapter.index}`);
        assert.isTrue(chapter.readers.some((pubkey) => pubkey.equals(reader2.publicKey)), `Reader2 should be in the readers list for chapter ${chapter.index}`);
      }

      // Verify stakes
      const stakerStake1 = bookAccount.stakes.find((stake) => stake.staker.equals(staker1.publicKey));
      const stakerStake2 = bookAccount.stakes.find((stake) => stake.staker.equals(staker2.publicKey));

      assert.isNotNull(stakerStake1, "Staker1 should have a stake");
      assert.isNotNull(stakerStake2, "Staker2 should have a stake");

      console.log("Readers and stakes verified successfully");
    } catch (error) {
      console.error("Error verifying readers and stakes:", error);
      throw error;
    }
  });
});