import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Stake on Book", () => {
  it("Can stake on a book and distribute earnings correctly", async () => {
    const { program, bookKeypair, author, reader2, staker1, staker2, platform, bookTitle, description,  genre, image_url, chapterPrices } = await setup();

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

      console.log("Staker 1 staked:", stakeAmount1.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Staker 2 staked:", stakeAmount2.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");

      const initialAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const initialBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);
      const initialPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

      // Purchase the full book
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
      const finalAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const finalBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);
      const finalPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

      const fullBookPrice = chapterPrices.reduce((acc, price) => acc + price, 0);
      console.log("Full book price:", fullBookPrice / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      assert.equal(fullBookPrice, anchor.web3.LAMPORTS_PER_SOL, "Full book price should be 1 SOL");

      const expectedAuthorPayment = fullBookPrice * 0.7; // 70% to author
      const expectedStakersPayment = fullBookPrice * 0.2; // 20% to book account (for stakers)
      const expectedPlatformPayment = fullBookPrice * 0.1; // 10% to platform

      console.log("Expected author payment:", expectedAuthorPayment / anchor.web3.LAMPORTS_PER_SOL, "SOL");

      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedAuthorPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );

      assert.approximately(
        finalBookBalance - initialBookBalance,
        expectedStakersPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Book account should have received the correct payment for stakers"
      );

      assert.approximately(
        finalPlatformBalance - initialPlatformBalance,
        expectedPlatformPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Platform should have received the correct payment"
      );

      // Check staker earnings
      const stakerStake1 = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      const stakerStake2 = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker2.publicKey)
      );

      const totalStake = stakeAmount1.toNumber() + stakeAmount2.toNumber();
      const expectedEarnings1 = (expectedStakersPayment * stakeAmount1.toNumber()) / totalStake;
      const expectedEarnings2 = (expectedStakersPayment * stakeAmount2.toNumber()) / totalStake;

      assert.approximately(
        stakerStake1.earnings.toNumber(),
        expectedEarnings1,
        1000, // Allow for small rounding differences
        "Staker 1 should have received the correct earnings"
      );

      assert.approximately(
        stakerStake2.earnings.toNumber(),
        expectedEarnings2,
        1000, // Allow for small rounding differences
        "Staker 2 should have received the correct earnings"
      );

      console.log("Full book purchased successfully");
      console.log("Author payment:", (finalAuthorBalance - initialAuthorBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Book account increase (for stakers):", (finalBookBalance - initialBookBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Platform payment:", (finalPlatformBalance - initialPlatformBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Staker 1 earnings:", stakerStake1.earnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Staker 2 earnings:", stakerStake2.earnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    } catch (error) {
      console.error("Error in multi-staker full book purchase test:", error);
      throw error;
    }
  });
});