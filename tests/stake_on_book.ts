import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Purchase Full Book with Multiple Stakers", () => {
  it("Can purchase a full book and distribute earnings to multiple stakers", async () => {
    const { program, bookKeypair, author, reader2, staker1, staker2, bookTitle, chapterPrices, fullBookPrice } = await setup();

    try {
      // Print the book price
      console.log("Full book price:", fullBookPrice.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");

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
      const stakeAmount2 = new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL); // 2 SOL stake
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

      // Purchase the full book
      await program.methods
        .purchaseFullBook()
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader2.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader2])
        .rpc();

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      const finalAuthorBalance = await program.provider.connection.getBalance(author.publicKey);
      const finalBookBalance = await program.provider.connection.getBalance(bookKeypair.publicKey);

      const expectedAuthorPayment = fullBookPrice.toNumber() * 0.7; // 70% to author
      const expectedBookPayment = fullBookPrice.toNumber() * 0.3; // 30% to book account (for stakers)

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

      // Check staker earnings
      const stakerStake1 = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      const stakerStake2 = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker2.publicKey)
      );

      const totalStake = stakeAmount1.toNumber() + stakeAmount2.toNumber();
      const expectedEarnings1 = (expectedBookPayment * stakeAmount1.toNumber()) / totalStake;
      const expectedEarnings2 = (expectedBookPayment * stakeAmount2.toNumber()) / totalStake;

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
      console.log("Staker 1 earnings:", stakerStake1.earnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      console.log("Staker 2 earnings:", stakerStake2.earnings.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    } catch (error) {
      console.error("Error in multi-staker full book purchase test:", error);
      throw error;
    }
  });
});