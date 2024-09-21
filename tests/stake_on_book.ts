import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setup } from "./setup";

describe("Stake on Book", () => {
  let testVars: any;

  before(async () => {
    testVars = await setup();
  });

  it("Can stake on a book", async () => {
    const { program, bookKeypair, author, staker1, stakePoolKeypair, bookTitle, chapterPrices, fullBookPrice } = testVars;

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

      const stakeAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL stake

      await program.methods
        .stakeOnBook(stakeAmount)
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker1.publicKey,
          stakePool: stakePoolKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker1, stakePoolKeypair])
        .rpc();

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.isTrue(bookAccount.stakes.some(
        (stake) => stake.staker.equals(staker1.publicKey) && stake.amount.eq(stakeAmount)
      ));
      assert.equal(bookAccount.totalStake.toNumber(), stakeAmount.toNumber());

      console.log("Staked on book successfully");
    } catch (error) {
      console.error("Error staking on book:", error);
      throw error;
    }
  });
});