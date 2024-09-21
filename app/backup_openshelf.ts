import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Openshelf } from "../target/types/openshelf";
import { assert } from "chai";

describe("openshelf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Openshelf as Program<Openshelf>;

  let bookKeypair: anchor.web3.Keypair,
    author: anchor.web3.Keypair,
    chapterKeypair: anchor.web3.Keypair;


  const bookTitle = "The Great Gatsby";
  const chapterPrices = [100000000, 200000000, 300000000]; // 0.1 SOL, 0.2 SOL, 0.3 SOL
  const fullBookPrice = new anchor.BN(500000000); // 0.5 SOL

  before(async () => {
    bookKeypair = anchor.web3.Keypair.generate();
    author = anchor.web3.Keypair.generate();

    const provider = anchor.getProvider();

    // Airdrop SOL to author
    await provider.connection.requestAirdrop(
      author.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for the airdrop transaction to confirm
    const airdropSignature = await provider.connection.requestAirdrop(
      author.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );

    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    });
  });

  it("Can add a book", async () => {
    try {
      console.log("Adding book...");
      console.log("Author public key:", author.publicKey.toString());
      console.log("Author balance:", await program.provider.connection.getBalance(author.publicKey));

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
        bookAccount.chapterPrices.map((price: anchor.BN) => price.toNumber()),
        chapterPrices
      );
      assert.equal(
        bookAccount.fullBookPrice.toNumber(),
        fullBookPrice.toNumber()
      );
      console.log("Book added successfully:", bookAccount);
    } catch (error) {
      console.error("Error adding book:", error);
      if (error instanceof anchor.AnchorError) {
        console.error("Error code:", error.error.errorCode.number);
        console.error("Error message:", error.error.errorMessage);
        console.error("Error logs:", error.logs);
      }
      throw error;
    }
  });
  
  it("Author can add a chapter", async () => {
    try {
      const chapterContent = "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.";
      const chapterIndex = 0;
      const chapterKeypair = anchor.web3.Keypair.generate();
  
      await program.methods
        .addChapter(
          chapterContent,
          chapterIndex
        )
        .accounts({
          book: bookKeypair.publicKey,
          chapter: chapterKeypair.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([chapterKeypair, author])
        .rpc();
  
      // Verify the chapter was added correctly
      const chapterAccount = await program.account.chapter.fetch(chapterKeypair.publicKey);
      assert.equal(chapterAccount.content, chapterContent);
      assert.equal(chapterAccount.index, chapterIndex);
      assert.ok(chapterAccount.book.equals(bookKeypair.publicKey));
  
      console.log("Chapter added successfully:", chapterAccount);
    } catch (error) {
      console.error("Error adding chapter:", error);
      if (error instanceof anchor.AnchorError) {
        console.error("Error code:", error.error.errorCode.number);
        console.error("Error message:", error.error.errorMessage);
        console.error("Error logs:", error.logs);
      }
      throw error;
    }
  });

  it("A reader can buy a chapter", async () => {
    try {
      // Create a new keypair for the reader
      const reader = anchor.web3.Keypair.generate();
  
      // Airdrop some SOL to the reader
      const provider = anchor.getProvider();
      const airdropSignature = await provider.connection.requestAirdrop(
        reader.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL // Airdrop 2 SOL
      );
  
      // Wait for the airdrop transaction to confirm
      const latestBlockHash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,
      });
  
      // Get the initial balance of the author
      const initialAuthorBalance = await provider.connection.getBalance(author.publicKey);
  
      // Choose a chapter to purchase (let's say chapter 0)
      const chapterIndex = 0;
  
      // Purchase the chapter
      await program.methods
        .purchaseChapter(chapterIndex)
        .accounts({
          book: bookKeypair.publicKey,
          buyer: reader.publicKey,
          author: author.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([reader])
        .rpc();
  
      // Fetch the updated book account
      const updatedBookAccount = await program.account.book.fetch(bookKeypair.publicKey);
  
      // Check if the reader's public key is in the chapter_readers list for the purchased chapter
      assert.isTrue(updatedBookAccount.chapterReaders[chapterIndex].some(
        (pubkey) => pubkey.equals(reader.publicKey)
      ), "Reader's public key should be in the chapter_readers list");
  
      // Check if the correct amount was transferred to the author
      const finalAuthorBalance = await provider.connection.getBalance(author.publicKey);
      const expectedPayment = chapterPrices[chapterIndex];
      assert.equal(
        finalAuthorBalance - initialAuthorBalance,
        expectedPayment,
        "Author should have received the correct payment"
      );
  
      console.log("Chapter purchased successfully by reader:", reader.publicKey.toString());
    } catch (error) {
      console.error("Error purchasing chapter:", error);
      if (error instanceof anchor.AnchorError) {
        console.error("Error code:", error.error.errorCode.number);
        console.error("Error message:", error.error.errorMessage);
        console.error("Error logs:", error.logs);
      }
      throw error;
    }
  });

});