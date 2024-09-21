import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Openshelf } from "../target/types/openshelf";
import { assert } from "chai";

describe("openshelf", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Openshelf as Program<Openshelf>;

  let bookKeypair: anchor.web3.Keypair,
    author: anchor.web3.Keypair,
    reader1: anchor.web3.Keypair,
    reader2: anchor.web3.Keypair,
    staker1: anchor.web3.Keypair,
    staker2: anchor.web3.Keypair,
    stakePoolKeypair: anchor.web3.Keypair;

  const bookTitle = "The Great Gatsby";
  const chapterPrices = [100000000, 200000000, 300000000]; // 0.1 SOL, 0.2 SOL, 0.3 SOL
  const fullBookPrice = new anchor.BN(500000000); // 0.5 SOL

  before(async () => {
    bookKeypair = anchor.web3.Keypair.generate();
    author = anchor.web3.Keypair.generate();
    reader1 = anchor.web3.Keypair.generate();
    reader2 = anchor.web3.Keypair.generate();
    staker1 = anchor.web3.Keypair.generate();
    staker2 = anchor.web3.Keypair.generate();
    stakePoolKeypair = anchor.web3.Keypair.generate();

    // Airdrop SOL to all accounts
    const accounts = [author, reader1, reader2, staker1, staker2];
    for (const account of accounts) {
      await provider.connection.requestAirdrop(
        account.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
    }

    // Wait for the airdrop transactions to confirm
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        author.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  it("Can add a book", async () => {
    try {
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

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.equal(bookAccount.title, bookTitle);
      assert.deepEqual(
        bookAccount.chapterPrices.map((price) => price.toNumber()),
        chapterPrices
      );
      assert.equal(bookAccount.fullBookPrice.toNumber(), fullBookPrice.toNumber());
      assert.equal(bookAccount.totalStake.toNumber(), 0);
      assert.deepEqual(bookAccount.readers, []);
      assert.deepEqual(bookAccount.chapterReaders, []);
      assert.deepEqual(bookAccount.chapters, []);
      assert.deepEqual(bookAccount.stakes, []);

      console.log("Book added successfully:", bookAccount);
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  });

  it("Can add chapters", async () => {
    try {
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

  it("Can purchase a chapter", async () => {
    try {
      const chapterIndex = 0;
      const initialAuthorBalance = await provider.connection.getBalance(author.publicKey);

      await program.methods
        .purchaseChapter(chapterIndex)
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader1.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader1])
        .rpc();

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      assert.isTrue(bookAccount.chapterReaders[chapterIndex].some(
        (pubkey) => pubkey.equals(reader1.publicKey)
      ));

      const finalAuthorBalance = await provider.connection.getBalance(author.publicKey);
      const expectedPayment = chapterPrices[chapterIndex] * 0.8; // 80% to author
      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );

      console.log("Chapter purchased successfully");
    } catch (error) {
      console.error("Error purchasing chapter:", error);
      throw error;
    }
  });

  it("Can purchase a full book", async () => {
    try {
      const initialAuthorBalance = await provider.connection.getBalance(author.publicKey);

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
      assert.isTrue(bookAccount.readers.some(
        (pubkey) => pubkey.equals(reader2.publicKey)
      ));

      const finalAuthorBalance = await provider.connection.getBalance(author.publicKey);
      const expectedPayment = fullBookPrice.toNumber() * 0.8; // 80% to author
      assert.approximately(
        finalAuthorBalance - initialAuthorBalance,
        expectedPayment,
        1000000, // Allow for a small difference due to transaction fees
        "Author should have received the correct payment"
      );

      console.log("Full book purchased successfully");
    } catch (error) {
      console.error("Error purchasing full book:", error);
      throw error;
    }
  });

  it("Can stake on a book", async () => {
    try {
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

  it("Can claim earnings", async () => {
    try {
      // First, let's make a purchase to generate some earnings for the staker
      await program.methods
        .purchaseChapter(1) // Purchase the second chapter
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader1.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader1])
        .rpc();

      // Now, let's claim the earnings
      const initialStakerBalance = await provider.connection.getBalance(staker1.publicKey);

      await program.methods
        .claimEarnings()
        .accounts({
          book: bookKeypair.publicKey,
          staker: staker1.publicKey,
          stakePool: stakePoolKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([staker1])
        .rpc();

      const finalStakerBalance = await provider.connection.getBalance(staker1.publicKey);
      assert.isTrue(finalStakerBalance > initialStakerBalance, "Staker should have received earnings");

      const bookAccount = await program.account.book.fetch(bookKeypair.publicKey);
      const stakerStake = bookAccount.stakes.find(
        (stake) => stake.staker.equals(staker1.publicKey)
      );
      assert.equal(stakerStake.earnings.toNumber(), 0, "Earnings should be reset to 0 after claiming");

      console.log("Earnings claimed successfully");
    } catch (error) {
      console.error("Error claiming earnings:", error);
      throw error;
    }
  });
});