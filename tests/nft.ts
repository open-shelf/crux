import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Openshelf } from "../target/types/openshelf";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import {  fetchCollection } from '@metaplex-foundation/mpl-core';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { expect } from "chai";
import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi';

describe("Openshelf NFT Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const wallet = anchor.Wallet.local();
  const program = anchor.workspace.Openshelf as Program<Openshelf>;

  const collection = Keypair.generate();
  const bookAsset = Keypair.generate();
  const chapterAsset = Keypair.generate();
  const book = Keypair.generate();

  const bookTitle = "Test Book";
  const bookMetaUrl = "http://example.com/book-meta";
  const chapterUrl = "http://example.com/chapter1";
  const chapterIndex = 0;
  const chapterPrice = new anchor.BN(1000000); // 1 SOL in lamports
  const chapterName = "Chapter 1";

  it("Add Book", async () => {
    const tx = await program.methods.addBook(bookTitle, bookMetaUrl)
      .accounts({
        book: book.publicKey,
        author: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([book])
      .rpc();

    console.log("Add Book transaction:", tx);
    await program.provider.connection.confirmTransaction(tx);
  });

  it("Add Chapter", async () => {
    const tx = await program.methods.addChapter(chapterUrl, chapterIndex, chapterPrice, chapterName)
      .accounts({
        book: book.publicKey,
        author: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Add Chapter transaction:", tx);
    await program.provider.connection.confirmTransaction(tx);
  });

  it("Create User Collection", async () => {
    const tx = await program.methods.createUserCollection()
      .accounts({
        signer: wallet.publicKey,
        payer: wallet.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: new PublicKey(MPL_CORE_PROGRAM_ID),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet.payer, collection])
      .rpc();

    console.log("Create User Collection transaction:", tx);
    await program.provider.connection.confirmTransaction(tx);
  });

  it("Create Book Asset", async () => {
    const tx = await program.methods.createBookAsset(book.publicKey.toBase58())
      .accounts({
        signer: wallet.publicKey,
        payer: wallet.publicKey,
        asset: bookAsset.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: new PublicKey(MPL_CORE_PROGRAM_ID),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet.payer, bookAsset])
      .rpc();

    console.log("Create Book Asset transaction:", tx);
    await program.provider.connection.confirmTransaction(tx);
  });

  it("Create Chapter Asset", async () => {
    const tx = await program.methods.createChapterAsset(book.publicKey.toBase58(), new anchor.BN(chapterIndex))
      .accounts({
        signer: wallet.publicKey,
        payer: wallet.publicKey,
        asset: chapterAsset.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: new PublicKey(MPL_CORE_PROGRAM_ID),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet.payer, chapterAsset])
      .rpc();

    console.log("Create Chapter Asset transaction:", tx);
    await program.provider.connection.confirmTransaction(tx);
  });

  // it("Read Collection", async () => {
  //   // Use the provider's connection instead of creating a new one
  //   const connection = program.provider.connection;
  //   const umi = createUmi(connection.rpcEndpoint);
  
  //   // Create a signer from the wallet's keypair
  //   const signer = createSignerFromKeypair(umi, {
  //     publicKey: publicKey(wallet.publicKey.toBytes()),
  //     secretKey: wallet.payer.secretKey,
  //   });
  
  //   // Use the signer for Umi's identity
  //   umi.use(signerIdentity(signer));
  
  //   console.log("Collection public key:", collection.publicKey.toBase58());
  
  //   try {
  //     const collectionAsset = await fetchCollection(umi, publicKey(collection.publicKey), {
  //       skipDerivePlugins: false,
  //     });
  
  //     console.log("Collection Asset:");
  //     console.log(JSON.stringify(collectionAsset, null, 2));
  
  //     expect(collectionAsset).to.not.be.undefined;
  //   } catch (error) {
  //     console.error("Error fetching collection:", error);
      
  //     // Check if the collection account exists
  //     const accountInfo = await connection.getAccountInfo(collection.publicKey);
  //     if (accountInfo === null) {
  //       console.error("Collection account does not exist at the specified address");
  //     } else {
  //       console.log("Collection account exists, but might not be of the expected type");
  //     }
  
  //     throw error;
  //   }
  // });

  // // Replace the existing "Read Book NFT" test with this:
  // it("Read Book Asset", async () => {
  //   const umi = createUmi();
  //   const bookNftAsset = await fetchAsset(umi, bookAsset.publicKey, {
  //     skipDerivePlugins: false,
  //   });

  //   console.log("Book Asset:");
  //   console.log(bookNftAsset);

  //   expect(bookNftAsset.name).to.include(bookTitle);
  // });

  // // Replace the existing "Read Chapter NFT" test with this:
  // it("Read Chapter Asset", async () => {
  //   const umi = createUmi();
  //   const chapterNftAsset = await fetchAsset(umi, chapterAsset.publicKey, {
  //     skipDerivePlugins: false,
  //   });

  //   console.log("Chapter Asset:");
  //   console.log(chapterNftAsset);

  //   expect(chapterNftAsset.name).to.include(chapterName);
  // });

});


