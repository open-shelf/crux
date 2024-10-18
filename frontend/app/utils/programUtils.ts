import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/openshelf.json";
import { Openshelf } from "../types/openshelf";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { AssetV1, fetchAssetsByOwner, fetchAssetsByCollection } from '@metaplex-foundation/mpl-core';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';

export class ProgramUtils {
  private program: Program<Openshelf>;
  private provider: AnchorProvider;
  private lastAddedBookPubKey: PublicKey | null = null;
  private readonly PLATFORM_ADDRESS = new PublicKey("6TRrKrkZENEVQyRmMc6NRgU1SYjWPRwQZqeVVmfr7vup");

  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    setProvider(this.provider);

    const programId = new PublicKey(idl.address);
    console.log("Program ID from IDL:", programId.toString());
    this.program = new Program(idl as Idl, this.provider) as Program<Openshelf>;
  }

  async addBook(
    title: string,
    description: string,
    genre: string,
    imageUrl: string,
    chapters?: { url: string; index: number; price: number; name: string }[]
  ): Promise<[tx: string, pubKey: string]> {
    const book = Keypair.generate();
    console.log("New book public key:", book.publicKey.toString());

    const tx = await this.program.methods
      .addBook(
        title,
        description,
        genre,
        imageUrl,
        chapters ? chapters.map(ch => ({
          url: ch.url,
          index: ch.index,
          price: new anchor.BN(ch.price* LAMPORTS_PER_SOL) ,
          name: ch.name
        })) : null
      )
      .accounts({
        book: book.publicKey,
        author: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([book])
      .rpc();

    this.lastAddedBookPubKey = book.publicKey;
    return [ tx, book.publicKey.toString()] ;
  }

  async fetchAllBooks() {
    // Fetch all book public keys from the program
    const bookPubKeys = await this.program.account.book.all();

    // // Fetch all book public keys from the API
    // const response = await fetch("http://localhost:8000/books");
    // const bookPubKeys = await response.json();

    console.log(bookPubKeys);
    
    // Fetch book data for each public key using a for loop
    const fetchedBooks = [];
    for (const pubKey of bookPubKeys) {
      const bookPubKey = new PublicKey(pubKey);
      const bookData = await this.fetchBook(bookPubKey);
      fetchedBooks.push({ ...bookData, pubKey });
    }

    return fetchedBooks
  }

  async fetchBook(pubKey: PublicKey): Promise<any> {
    const bookAccount = await this.program.account.book.fetch(pubKey);
    const user = this.provider.wallet.publicKey;

    return {
      author: bookAccount.author.toString(),
      title: bookAccount.title,
      description: bookAccount.metadata.description,
      genre: bookAccount.metadata.genre,
      imageUrl: bookAccount.metadata.imageUrl,
      fullBookPrice: bookAccount.fullBookPrice.toNumber(),
      totalStake: bookAccount.totalStake.toNumber(),
      bookPurchased: bookAccount.readers.some((reader: PublicKey) => reader.equals(user)),
      chapters: bookAccount.chapters.map((chapter: any) => ({
        index: chapter.index,
        isPurchased: chapter.readers.some((reader: PublicKey) => reader.equals(user)),
        name: chapter.name,
        url: chapter.url,
        price: chapter.price.toNumber(),
      })),
      stakes: bookAccount.stakes.map((stake: any) => ({
        staker: stake.staker.toString(),
        amount: stake.amount.toNumber(),
        earnings: stake.earnings.toNumber(),
      })),
    };
  }

  async addChapter(bookPubKey: PublicKey, url: string, index: number, price: number, name: string): Promise<string> {
    return this.program.methods
      .addChapter(url, index, new anchor.BN(price), name)
      .accounts({
        book: bookPubKey,
        author: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async purchaseChapter(
    bookPubKey: PublicKey,
    authorPubKey: PublicKey,
    chapterIndex: number,
    collectionKey: PublicKey,
    needNFT: boolean = false,
    existingBookNftAddress?: PublicKey
  ): Promise<string> {
    console.log("Purchasing chapter with the following details:");
    console.log("Book Public Key:", bookPubKey.toString());
    console.log("Author Public Key:", authorPubKey.toString());
    console.log("Chapter Index:", chapterIndex);
    console.log("Collection Key:", collectionKey.toString());
    console.log("Is Secondary:", needNFT);
    console.log("Program ID:", this.program.programId.toString());

    let bookNft: PublicKey;
    let signers: Keypair[] = [];

    if (existingBookNftAddress) {
      console.log("Using existing Book NFT Address:", existingBookNftAddress.toString());
      bookNft = existingBookNftAddress;
    } else {
      const bnft = Keypair.generate();
      console.log("Generated new book NFT:", bnft.publicKey.toString());
      bookNft = bnft.publicKey;
      signers.push(bnft);
    }

    try {
      const method = existingBookNftAddress
        ? this.program.methods.purchaseChapterWithExistingNft(chapterIndex, needNFT)
        : this.program.methods.purchaseChapter(chapterIndex, needNFT);

      const tx = await method
        .accounts({
          book: bookPubKey,
          buyer: this.provider.wallet.publicKey,
          author: authorPubKey,
          collection: collectionKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          bookNft: bookNft,
          platform: this.PLATFORM_ADDRESS,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers(signers)
        .rpc();
      return tx;
    } catch (error) {
      console.error("Error in purchaseChapter:", error);
      throw error;
    }
  }

  async purchaseFullBook(
    bookPubKey: PublicKey,
    authorPubKey: PublicKey,
    collectionKey: PublicKey,
    needNFT: boolean = false,
    existingBookNftAddress?: PublicKey
  ): Promise<string> {
    console.log("Purchasing full book with the following details:");
    console.log("Book Public Key:", bookPubKey.toString());
    console.log("Author Public Key:", authorPubKey.toString());
    console.log("Collection Key:", collectionKey.toString());
    console.log("Need NFT:", needNFT);
    console.log("Program ID:", this.program.programId.toString());

    let bookNft: PublicKey;
    let signers: Keypair[] = [];

    if (existingBookNftAddress) {
      console.log("Using existing Book NFT Address:", existingBookNftAddress.toString());
      bookNft = existingBookNftAddress;
    } else {
      const bnft = Keypair.generate();
      console.log("Generated new book NFT:", bnft.publicKey.toString());
      bookNft = bnft.publicKey;
      signers.push(bnft);
    }

    try {
      const method = existingBookNftAddress
        ? this.program.methods.purchaseFullBookWithExistingNft(needNFT)
        : this.program.methods.purchaseFullBook(needNFT);

      const tx = await method
        .accounts({
          book: bookPubKey,
          buyer: this.provider.wallet.publicKey,
          author: authorPubKey,
          collection: collectionKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          bookNft: bookNft,
          platform: this.PLATFORM_ADDRESS,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers(signers)
        .rpc();
      return tx;
    } catch (error) {
      console.error("Error in purchaseFullBook:", error);
      throw error;
    }
  }

  async stakeOnBook(bookPubKey: PublicKey, amount: number): Promise<string> {
    return this.program.methods
      .stakeOnBook(new anchor.BN(amount))
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  async claimStakeEarnings(bookPubKey: PublicKey): Promise<string> {
    return this.program.methods
      .claimStakerEarnings()
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  getLastAddedBookPubKey(): PublicKey | null {
    return this.lastAddedBookPubKey;
  }

  async createUserCollection(): Promise<string> {
    const collection = Keypair.generate();
    const userNFTAsset = Keypair.generate();
    console.log("Generated collection keypair:", collection.publicKey.toString());
    console.log("Generated user NFT keypair:", userNFTAsset.publicKey.toString());

    return this.program.methods
      .createUserCollection()
      .accounts({
        signer: this.provider.wallet.publicKey,
        payer: this.provider.wallet.publicKey,
        collection: collection.publicKey,
        userNftAsset: userNFTAsset.publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([collection, userNFTAsset])
      .rpc();
  }

  async createBookAsset(bookPubKey: PublicKey, collectionKey: PublicKey,authorPubKey: PublicKey,
  ): Promise<string> {
    const bookAsset = Keypair.generate();
    console.log("Generated book asset keypair:", bookAsset.publicKey.toString());
    
    const tx = await this.program.methods
      .mintBookNft()
      .accounts({
        book: bookPubKey,
        buyer: this.provider.wallet.publicKey,
        author: authorPubKey,
        collection: collectionKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        bookNft: bookAsset.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bookAsset])
      .rpc();

    console.log("Create Book Asset transaction:", tx);
    await this.provider.connection.confirmTransaction(tx);

    return tx;
  }

  async fetchCollection(collectionId: PublicKey): Promise<AssetV1[]> {
    const umi = createUmi('https://api.devnet.solana.com');
    //const umi = createUmi('http://127.0.0.1:8899')

    // Register Wallet Adapter to Umi
    umi.use(walletAdapterIdentity(this.provider.wallet));

    const collectionPublicKey = fromWeb3JsPublicKey(collectionId);

    const assetsByCollection = await fetchAssetsByCollection(umi, collectionPublicKey, {
      skipDerivePlugins: false,
    });
    
    console.log("assetsByCollection", assetsByCollection);

    return assetsByCollection;
  }

  async fetchAllNFTByOwner(owner: PublicKey): Promise<AssetV1[]> {
    const umi = createUmi('https://api.devnet.solana.com');
    //const umi = createUmi('http://127.0.0.1:8899')
    umi.use(walletAdapterIdentity(this.provider.wallet));

    const umiPublicKey = fromWeb3JsPublicKey(owner);

    const assetsByOwner = await fetchAssetsByOwner(umi, umiPublicKey, {
      skipDerivePlugins: false,
    });

    console.log("All NFTs owned by", owner.toString());
    assetsByOwner.forEach((asset, index) => {
      console.log(`Asset ${index + 1}:`);
      console.log("  Public Key:", asset.publicKey.toString());
      console.log("  URI:", asset.uri);
      console.log("  Plugins:");
      
      // Check for collection_id in attributes
      if (asset.attributes) {
        const attributes = asset.attributes?.attributeList;
        const collectionIdAttribute = attributes.find(attr => attr.key === 'collection_id');
        if (collectionIdAttribute) {
          console.log("  Collection ID:", collectionIdAttribute.value);
        }
      }
      
      console.log("---");
    });

    return assetsByOwner;
  }
}
