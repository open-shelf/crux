import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Purchase Full Book", () => {
  it("Can purchase a full book and distribute earnings", async () => {
    const { program, bookKeypair, author, reader2, staker1, platform, bookTitle, metaUrl, chapterPrices } = await setup();

    try {
      // Add a book
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

      // Add chapters
      const chapterUrls = [
        "https://example.com/chapter1",
        "https://example.com/chapter2",
        "https://example.com/chapter3",
      ];

      for (let i = 0; i < chapterUrls.length; i++) {
        await program.methods
          .addChapter(chapterUrls[i], i, new anchor.BN(chapterPrices[i])) // Convert chapterPrices to BN
          .accounts({
            book: bookKeypair.publicKey,
            author: author.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([author])
          .rpc();
      }

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

      const initialAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const initialBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);
      const initialPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

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
      assert.isTrue(bookAccount.readers.some(
        (pubkey) => pubkey.equals(reader2.publicKey)
      ));

      const finalAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const finalBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);
      const finalPlatformBalance = await program.provider.connection.getBalance(platform.publicKey);

      const fullBookPrice = chapterPrices.reduce((acc, price) => acc + price, 0);
      console.log("Full book price:", fullBookPrice / anchor.web3.LAMPORTS_PER_SOL, "SOL");

      const expectedAuthorPayment = fullBookPrice * 0.7; // 70% to author
      const expectedBookPayment = fullBookPrice * 0.2; // 20% to book account (for stakers)
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
        expectedBookPayment,
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
      const stakerStake = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      assert.approximately(
        stakerStake.earnings.toNumber(),
        expectedBookPayment,
        1000, // Allow for small rounding differences
        "Staker should have received the correct earnings"
      );

      // Check that all chapters are marked as read for the buyer
      for (let chapter of bookAccount.chapters) {
        assert.isTrue(chapter.readers.some(
          (pubkey) => pubkey.equals(reader2.publicKey)
        ), "All chapters should be marked as read for the buyer");
      }

      console.log("Full book purchased successfully");
      console.log("Author payment:", (finalAuthorBalance - initialAuthorBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Book account increase (for stakers):", (finalBookBalance - initialBookBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Platform payment:", (finalPlatformBalance - initialPlatformBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Staker earnings:", stakerStake.earnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    } catch (error) {
      console.error("Error purchasing full book:", error);
      throw error;
    }
  });
});