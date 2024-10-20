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
  fetchAllBooks(): Promise<Book[]>;
  fetchBook(pubKey: PublicKey): Promise<Book>;

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
  createUserCollectionWithUni(univ: string, course: string): Promise<string>;
  fetchCollection(): Promise<AssetV1[]>;
  fetchUserCollectionKey(): Promise<string>;
  fetchUserNFT(): Promise<AssetV1 | null>;

  // NFT Operations
  createBookAsset(bookPubKey: PublicKey, authorPubKey: PublicKey): Promise<string>;
  findPurchasedBookNFT(bookPubKey: PublicKey): Promise<string>;
  fetchAllNFTByOwner(owner: PublicKey): Promise<AssetV1[]>;

  // Asset Management
  getAssets(): AssetV1[];
}

// New interfaces to handle book data
export interface MetaData {
  description: string;
  publishDate: number; // i64 in Rust becomes number in TypeScript
  genre: string;
  imageUrl: string;
}

export interface Chapter {
  price: number; // u64 becomes number
  url: string;
  name: string;
  index: number; // u8 becomes number
  readers: string[]; // Pubkey becomes string in TypeScript
}

export interface Stake {
  staker: string; // Pubkey becomes string
  amount: number; // u64 becomes number
  earnings: number; // u64 becomes number
  totalEarning: number; // u64 becomes number
}

export interface UserOwnership {
  bookPurchased: boolean;
  chaptersPurchased: number[];
  amount: number; // u64 becomes number
  earnings: number; // u64 becomes number
  totalEarning: number; // u64 becomes number
}

export interface Book {
  author: string; // Pubkey becomes string
  title: string;
  metadata: MetaData;
  fullBookPrice: number; // u64 becomes number
  totalStake: number; // u64 becomes number
  chapters: Chapter[];
  stakes: Stake[];
  readers: string[]; // Vec<Pubkey> becomes string[]
  bookPubKey: string;
  userOwnership: UserOwnership;
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
   * @returns A promise that resolves to an array of Book objects.
   */
  async fetchAllBooks(): Promise<Book[]> {
    const bookPubKeys = await this.program.account.book.all();
    
    const fetchedBooks: Book[] = [];
    for (const book of bookPubKeys) {
      const bookPubKey = new PublicKey(book.publicKey);
      const bookData = await this.fetchBook(bookPubKey);
      fetchedBooks.push(bookData);
    }

    console.log(fetchedBooks);

    return fetchedBooks;
  }

  /**
   * Fetches a specific book's details.
   * @param pubKey - The public key of the book to fetch.
   * @returns A promise that resolves to a Book object.
   */
  async fetchBook(pubKey: PublicKey): Promise<Book> {
    const bookAccount = await this.program.account.book.fetch(pubKey);
    const user = this.provider.wallet.publicKey;

    const userOwnership: UserOwnership = {
      bookPurchased: bookAccount.readers.some((reader: PublicKey) => reader.equals(user)),
      chaptersPurchased: bookAccount.chapters.map((chapter: any, index: number) => 
        chapter.readers.some((reader: PublicKey) => reader.equals(user)) ? index : -1
      ).filter((index: number) => index !== -1),
      amount: 0,
      earnings: 0,
      totalEarning: 0
    };

    // Check if user has staked
    const userStake = bookAccount.stakes.find((stake: any) => stake.staker.equals(user));
    if (userStake) {
      userOwnership.amount = userStake.amount.toNumber();
      userOwnership.earnings = userStake.earnings.toNumber();
      userOwnership.totalEarning = userStake.totalEarning.toNumber();
    }

    return {
      bookPubKey: pubKey.toString(),
      author: bookAccount.author.toString(),
      title: bookAccount.title,
      metadata: {
        description: bookAccount.metadata.description,
        publishDate: bookAccount.metadata.publishDate.toNumber(),
        genre: bookAccount.metadata.genre,
        imageUrl: bookAccount.metadata.imageUrl,
      },
      fullBookPrice: bookAccount.fullBookPrice.toNumber(),
      totalStake: bookAccount.totalStake.toNumber(),
      chapters: bookAccount.chapters.map((chapter: any): Chapter => ({
        price: chapter.price.toNumber(),
        url: chapter.url,
        name: chapter.name,
        index: chapter.index,
        readers: chapter.readers.map((reader: PublicKey) => reader.toString()),
      })),
      stakes: bookAccount.stakes.map((stake: any): Stake => ({
        staker: stake.staker.toString(),
        amount: stake.amount.toNumber(),
        earnings: stake.earnings.toNumber(),
        totalEarning: stake.totalEarning.toNumber(),
      })),
      readers: bookAccount.readers.map((reader: PublicKey) => reader.toString()),
      userOwnership,
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
    const tx = await this.program.methods
      .addChapter(url, index, new anchor.BN(price), name)
      .accounts({
        book: bookPubKey,
      })
      .rpc();

    // Fetch the updated book details
    const updatedBook = await this.fetchBook(bookPubKey);
    console.log("Updated book details:", updatedBook);

    return tx;
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

      // Fetch the updated book details
      const updatedBook = await this.fetchBook(bookPubKey);
      console.log("Updated book details after chapter purchase:", updatedBook);

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

      // Fetch the updated book details
      const updatedBook = await this.fetchBook(bookPubKey);
      console.log("Updated book details after full book purchase:", updatedBook);

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
    const tx = await this.program.methods
      .stakeOnBook(new anchor.BN(amount))
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();

    // Fetch the updated book details
    const updatedBook = await this.fetchBook(bookPubKey);
    console.log("Updated book details after staking:", updatedBook);

    return tx;
  }

  /**
   * Claims stake earnings for a book.
   * @param bookPubKey - The public key of the book.
   * @returns A promise that resolves to the transaction signature.
   */
  async claimStakeEarnings(bookPubKey: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .claimStakerEarnings()
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();

    // Fetch the updated book details
    const updatedBook = await this.fetchBook(bookPubKey);
    console.log("Updated book details after claiming earnings:", updatedBook);

    return tx;
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
      .createUserCollection(null, null)
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
   * Creates a user collection.
   * @returns A promise that resolves to the transaction signature.
   */
  async createUserCollectionWithUni(univ: string, course: string): Promise<string> {
    const collection = Keypair.generate();
    const userNFTAsset = Keypair.generate();
    console.log("Generated collection keypair:", collection.publicKey.toString());
    console.log("Generated user NFT keypair:", userNFTAsset.publicKey.toString());

    let tx = this.program.methods
      .createUserCollection(univ, course)
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
    let userNFT = await this.fetchUserNFT();
    if (userNFT && userNFT.attributes) {
      const collectionIdAttribute = userNFT.attributes.attributeList.find((attr: { key: string; }) => attr.key === 'collection_id');
      if (collectionIdAttribute) {
        return collectionIdAttribute.value;
      }
    }
    console.log("No asset with collection_id attribute found");
    return "";
  }

  /**
   * Fetches the user's collection key.
   * @returns A promise that resolves to the user's collection key as a string.
   */
  async fetchUserNFT(): Promise<AssetV1 | null> {
    let assets = await this.fetchAllNFTByOwner(this.provider.wallet.publicKey);
    for (const asset of assets) {
      if (asset.attributes) {
        const collectionIdAttribute = asset.attributes.attributeList.find(attr => attr.key === 'collection_id');
        if (collectionIdAttribute) {
          return asset;
        }
      }
    }
    console.log("No asset with collection_id attribute found");
    return null;
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
