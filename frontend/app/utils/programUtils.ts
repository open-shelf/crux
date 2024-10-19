import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/openshelf.json";
import { Openshelf } from "../types/openshelf";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { AssetV1, fetchAssetsByOwner, fetchAssetsByCollection } from '@metaplex-foundation/mpl-core';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

interface IProgramUtils {
  // Book Management
  addBook(title: string, description: string, genre: string, imageUrl: string, chapters?: { url: string; index: number; price: number; name: string }[]): Promise<[tx: string, pubKey: string]>;
  fetchAllBooks(): Promise<any[]>;
  fetchBook(pubKey: PublicKey): Promise<any>;

  // Chapter Management
  addChapter(bookPubKey: PublicKey, url: string, index: number, price: number, name: string): Promise<string>;

  // Purchase Operations
  purchaseChapter(bookPubKey: PublicKey, authorPubKey: PublicKey, chapterIndex: number, needNFT?: boolean, existingBookNftAddress?: PublicKey): Promise<string>;
  purchaseFullBook(bookPubKey: PublicKey, authorPubKey: PublicKey, needNFT?: boolean, existingBookNftAddress?: PublicKey): Promise<string>;

  // Staking Operations
  stakeOnBook(bookPubKey: PublicKey, amount: number): Promise<string>;
  claimStakeEarnings(bookPubKey: PublicKey): Promise<string>;

  // Collection Management
  createUserCollection(): Promise<string>;
  fetchCollection(): Promise<AssetV1[]>;
  fetchUserCollectionKey(): Promise<string>;

  // NFT Operations
  createBookAsset(bookPubKey: PublicKey, authorPubKey: PublicKey): Promise<string>;
  findPurchasedBookNFT(bookPubKey: PublicKey): Promise<string>;
  fetchAllNFTByOwner(owner: PublicKey): Promise<AssetV1[]>;

  // Asset Management
  getAssets(): AssetV1[];
}

export class ProgramUtils implements IProgramUtils {
  private program: Program<Openshelf>;
  private provider: AnchorProvider;
  collectionPubKey: PublicKey | null = null;
  private readonly PLATFORM_ADDRESS = new PublicKey("6TRrKrkZENEVQyRmMc6NRgU1SYjWPRwQZqeVVmfr7vup");
  private assets: AssetV1[] = [];
  
  /**
   * Initializes the ProgramUtils instance.
   * @param connection - The Solana connection object.
   * @param wallet - The wallet object.
   */
  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    setProvider(this.provider);

    const programId = new PublicKey(idl.address);
    console.log("Program ID from IDL:", programId.toString());

    this.program = new Program(idl as Idl, this.provider) as unknown as Program<Openshelf>;

    this.initializeCollectionPubKey();
  }

  /**
   * Initializes the collection public key for the user and fetches all assets.
   */
  private async initializeCollectionPubKey() {
    try {
      const collectionKey = await this.fetchUserCollectionKey();
      if (collectionKey) {
        this.collectionPubKey = new PublicKey(collectionKey);
        console.log("Collection public key set:", this.collectionPubKey.toString());
        await this.fetchAndSetAssets();
      } else {
        console.log("No collection public key found for the user");
      }
    } catch (error) {
      console.error("Error initializing collection public key:", error);
    }
  }

  /**
   * Fetches all assets in the collection and sets them to the assets property.
   */
  private async fetchAndSetAssets() {
    try {
      if (this.collectionPubKey) {
        this.assets = await this.fetchCollection();
        console.log(`Fetched ${this.assets.length} assets from the collection`);
      } else {
        console.log("Collection public key not set, unable to fetch assets");
      }
    } catch (error) {
      console.error("Error fetching and setting assets:", error);
    }
  }

  /**
   * Gets all assets in the collection.
   * @returns An array of AssetV1 objects.
   */
  getAssets(): AssetV1[] {
    return this.assets;
  }

  /**
   * Adds a new book to the program.
   * @param title - The title of the book.
   * @param description - The description of the book.
   * @param genre - The genre of the book.
   * @param imageUrl - The URL of the book's image.
   * @param chapters - Optional array of chapter information.
   * @returns A promise that resolves to a tuple containing the transaction signature and the new book's public key.
   */
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
      })
      .signers([book])
      .rpc();

    return [ tx, book.publicKey.toString()];
  }

  /**
   * Fetches all books from the program.
   * @returns A promise that resolves to an array of book data.
   */
  async fetchAllBooks() {
    // Fetch all book public keys from the program
    const bookPubKeys = await this.program.account.book.all();

    // // Fetch all book public keys from the API
    // const response = await fetch("http://localhost:8000/books");
    // const bookPubKeys = await response.json();

    console.log(bookPubKeys);
    
    const fetchedBooks = [];
    for (const pubKey of bookPubKeys) {
      const bookPubKey = new PublicKey(pubKey);
      const bookData = await this.fetchBook(bookPubKey);
      fetchedBooks.push({ ...bookData, pubKey });
    }

    return fetchedBooks;
  }

  /**
   * Fetches a specific book's details.
   * @param pubKey - The public key of the book to fetch.
   * @returns A promise that resolves to the book's details.
   */
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

  /**
   * Adds a new chapter to a book.
   * @param bookPubKey - The public key of the book.
   * @param url - The URL of the chapter content.
   * @param index - The index of the chapter.
   * @param price - The price of the chapter in lamports.
   * @param name - The name of the chapter.
   * @returns A promise that resolves to the transaction signature.
   */
  async addChapter(bookPubKey: PublicKey, url: string, index: number, price: number, name: string): Promise<string> {
    return this.program.methods
      .addChapter(url, index, new anchor.BN(price), name)
      .accounts({
        book: bookPubKey,
      })
      .rpc();
  }

  /**
   * Purchases a chapter of a book.
   * @param bookPubKey - The public key of the book.
   * @param authorPubKey - The public key of the author.
   * @param chapterIndex - The index of the chapter to purchase.
   * @param needNFT - Whether an NFT is needed for the purchase.
   * @param existingBookNftAddress - Optional existing book NFT address.
   * @returns A promise that resolves to the transaction signature.
   */
  async purchaseChapter(
    bookPubKey: PublicKey,
    authorPubKey: PublicKey,
    chapterIndex: number,
    needNFT: boolean = false,
    existingBookNftAddress?: PublicKey
  ): Promise<string> {
    if (!this.collectionPubKey) {
      throw new Error("Collection public key not set");
    }

    console.log("Purchasing chapter with the following details:");
    console.log("Book Public Key:", bookPubKey.toString());
    console.log("Author Public Key:", authorPubKey.toString());
    console.log("Chapter Index:", chapterIndex);
    console.log("Collection Key:", this.collectionPubKey.toString());
    console.log("NeedNFT:", needNFT);
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
          collection: this.collectionPubKey,
          bookNft: bookNft,
        })
        .signers(signers)
        .rpc();
      return tx;
    } catch (error) {
      console.error("Error in purchaseChapter:", error);
      throw error;
    }
  }

  /**
   * Purchases a full book.
   * @param bookPubKey - The public key of the book.
   * @param authorPubKey - The public key of the author.
   * @param needNFT - Whether an NFT is needed for the purchase.
   * @param existingBookNftAddress - Optional existing book NFT address.
   * @returns A promise that resolves to the transaction signature.
   */
  async purchaseFullBook(
    bookPubKey: PublicKey,
    authorPubKey: PublicKey,
    needNFT: boolean = false,
    existingBookNftAddress?: PublicKey
  ): Promise<string> {
    if (!this.collectionPubKey) {
      throw new Error("Collection public key not set");
    }

    console.log("Purchasing full book with the following details:");
    console.log("Book Public Key:", bookPubKey.toString());
    console.log("Author Public Key:", authorPubKey.toString());
    console.log("Collection Key:", this.collectionPubKey.toString());
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
        ? this.program.methods.purchaseFullBookWithExistingNft(true)
        : this.program.methods.purchaseFullBook(true);

      const tx = await method
        .accounts({
          book: bookPubKey,
          buyer: this.provider.wallet.publicKey,
          author: authorPubKey,
          collection: this.collectionPubKey,
          bookNft: bookNft,
        })
        .signers(signers)
        .rpc();
      return tx;
    } catch (error) {
      console.error("Error in purchaseFullBook:", error);
      throw error;
    }
  }

  /**
   * Stakes on a book.
   * @param bookPubKey - The public key of the book.
   * @param amount - The amount to stake in lamports.
   * @returns A promise that resolves to the transaction signature.
   */
  async stakeOnBook(bookPubKey: PublicKey, amount: number): Promise<string> {
    return this.program.methods
      .stakeOnBook(new anchor.BN(amount))
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  /**
   * Claims stake earnings for a book.
   * @param bookPubKey - The public key of the book.
   * @returns A promise that resolves to the transaction signature.
   */
  async claimStakeEarnings(bookPubKey: PublicKey): Promise<string> {
    return this.program.methods
      .claimStakerEarnings()
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  /**
   * Creates a user collection.
   * @returns A promise that resolves to the transaction signature.
   */
  async createUserCollection(): Promise<string> {
    const collection = Keypair.generate();
    const userNFTAsset = Keypair.generate();
    console.log("Generated collection keypair:", collection.publicKey.toString());
    console.log("Generated user NFT keypair:", userNFTAsset.publicKey.toString());

    let tx = this.program.methods
      .createUserCollection()
      .accounts({
        signer: this.provider.wallet.publicKey,
        payer: this.provider.wallet.publicKey,
        collection: collection.publicKey,
        userNftAsset: userNFTAsset.publicKey,
      })
      .signers([collection, userNFTAsset])
      .rpc();

    this.collectionPubKey = new PublicKey(collection.publicKey);

    return tx;
  }

  /**
   * Creates a book asset (NFT).
   * @param bookPubKey - The public key of the book.
   * @param authorPubKey - The public key of the author.
   * @returns A promise that resolves to the transaction signature.
   */
  async createBookAsset(bookPubKey: PublicKey, authorPubKey: PublicKey): Promise<string> {
    if (!this.collectionPubKey) {
      throw new Error("Collection public key not set");
    }

    const bookAsset = Keypair.generate();
    console.log("Generated book asset keypair:", bookAsset.publicKey.toString());
    
    const tx = await this.program.methods
      .mintBookNft()
      .accounts({
        book: bookPubKey,
        buyer: this.provider.wallet.publicKey,
        author: authorPubKey,
        collection: this.collectionPubKey,
        bookNft: bookAsset.publicKey,
      })
      .signers([bookAsset])
      .rpc();

    console.log("Create Book Asset transaction:", tx);
    await this.provider.connection.confirmTransaction(tx);

    return tx;
  }

  /**
   * Fetches assets in a collection.
   * @returns A promise that resolves to an array of AssetV1 objects.
   */
  async fetchCollection(): Promise<AssetV1[]> {
    if (!this.collectionPubKey) {
      throw new Error("Collection public key not set");
    }

    const umi = createUmi('https://api.devnet.solana.com');
    //const umi = createUmi('http://127.0.0.1:8899')

    // Register Wallet Adapter to Umi
    umi.use(walletAdapterIdentity(this.provider.wallet));
    const collectionPublicKey = fromWeb3JsPublicKey(this.collectionPubKey);

    const assetsByCollection = await fetchAssetsByCollection(umi, collectionPublicKey, {
      skipDerivePlugins: false,
    });
    
    console.log("assetsByCollection", assetsByCollection);

    return assetsByCollection;
  }

  /**
   * Fetches the user's collection key.
   * @returns A promise that resolves to the user's collection key as a string.
   */
  async fetchUserCollectionKey(): Promise<string> {
    let assets = await this.fetchAllNFTByOwner(this.provider.wallet.publicKey);
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      if (asset.attributes) {
        const collectionIdAttribute = asset.attributes.attributeList.find(attr => attr.key === 'collection_id');
        if (collectionIdAttribute) {
          return collectionIdAttribute.value;
        }
      }
    }
    console.log("No asset with collection_id attribute found");
    return "";
  }

  /**
   * Finds the purchased book NFT for a given book.
   * @param bookPubKey - The public key of the book.
   * @returns A promise that resolves to the public key of the purchased book NFT as a string.
   */
  async findPurchasedBookNFT(
    bookPubKey: PublicKey
  ): Promise<string> {
    if (!this.collectionPubKey) {
      console.log("Collection public key not set");
      return "";
    }

    const userNftAssets = await this.fetchCollection();
    
    for (const asset of userNftAssets) {
      if (asset.attributes) {
        const bookAddressAttr = asset.attributes.attributeList.find(attr => attr.key === 'book_address');
        if (bookAddressAttr && bookAddressAttr.value === bookPubKey.toString()) {
          return asset.publicKey.toString();
        }
      }
    }

    console.log("No matching book NFT found");
    return "";
  }

  /**
   * Fetches all NFTs owned by a user.
   * @param owner - The public key of the owner.
   * @returns A promise that resolves to an array of AssetV1 objects.
   */
  async fetchAllNFTByOwner(owner: PublicKey): Promise<AssetV1[]> {
    const umi = createUmi('https://api.devnet.solana.com');
    //const umi = createUmi('http://127.0.0.1:8899')
    umi.use(walletAdapterIdentity(this.provider.wallet));

    const umiPublicKey = fromWeb3JsPublicKey(owner);

    const assetsByOwner = await fetchAssetsByOwner(umi, umiPublicKey, {
      skipDerivePlugins: false,
    });

    assetsByOwner.forEach((asset, index) => {
      
      // Check for collection_id in attributes
      if (asset.attributes) {
        const attributes = asset.attributes?.attributeList;
        const collectionIdAttribute = attributes.find(attr => attr.key === 'collection_id');
      }
      
    });

    return assetsByOwner;
  }
}
