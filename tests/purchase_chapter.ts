import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Purchase Chapter", () => {
  it("Can purchase a chapter and distribute earnings", async () => {
    const { program, bookKeypair, author, reader1, staker1, platform, bookTitle, chapterPrices, fullBookPrice } = await setup();

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

      // Add a chapter
      await program.methods
        .addChapter("https://example.com/chapter1", 0)
        .accounts({
          book: bookKeypair.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([author])
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

      const chapterIndex = 0;
      const initialAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const initialPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

      await program.methods
        .purchaseChapter(chapterIndex)
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader1.publicKey,
          author: author.publicKey,
          platform: platform.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader1])
        .rpc();

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.isTrue(bookAccount.chapterReaders[chapterIndex].some(
        (pubkey) => pubkey.equals(reader1.publicKey)
      ));

      const finalAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const finalPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

      const expectedAuthorPayment = chapterPrices[chapterIndex] * 0.7; // 70% to author
      const expectedPlatformPayment = chapterPrices[chapterIndex] * 0.1; // 10% to platform
      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedAuthorPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );
      assert.approximately(
        finalPlatformBalance - initialPlatformBalance,
        expectedPlatformPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Platform should have received the correct payment"
      );

      // Check staker earnings
      const stakerStake = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      const expectedStakerEarnings = chapterPrices[chapterIndex] * 0.2; // 20% to stakers
      assert.approximately(
        stakerStake.earnings.toNumber(),
        expectedStakerEarnings,
        1000, // Allow for small rounding differences
        "Staker should have received the correct earnings"
      );

      console.log("Chapter purchased successfully");
      console.log("Author payment:", finalAuthorBalance - initialAuthorBalance);
      console.log("Platform payment:", finalPlatformBalance - initialPlatformBalance);
      console.log("Staker earnings:", stakerStake.earnings.toNumber());
    } catch (error) {
      console.error("Error purchasing chapter:", error);
      throw error;
    }
  });
});