import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, ConfirmedSignatureInfo } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/openshelf.json";
import { Openshelf } from "../types/openshelf";
import { PROGRAM_ADDRESS as metaplexProgramId } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { useWallet } from '@solana/wallet-adapter-react'
import { AssetV1, fetchAssetsByOwner } from '@metaplex-foundation/mpl-core'
import { publicKey } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

export class ProgramUtils {
  private program: Program<Openshelf>;
  private provider: AnchorProvider;
  private lastAddedBookPubKey: PublicKey | null = null;

  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    setProvider(this.provider);

    const programId = new PublicKey(idl.address);
    this.program = new Program(idl as Idl, this.provider) as Program<Openshelf>;
  }

  async addBook(title: string, description: string, genre: string, image_url: string): Promise<string> {
    const book = anchor.web3.Keypair.generate();
    console.log("New book public key:", book.publicKey.toString());

    const tx = await this.program.methods
      .addBook(
        title,
        description,
        genre,
        image_url
      )
      .accounts({
        book: book.publicKey,
        author: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([book])
      .rpc();

    this.lastAddedBookPubKey = book.publicKey;
    return tx;
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
      bookPurchased: bookAccount.readers.some(
        (reader) => reader.toString() === user.toString()
      ),
      chapters: bookAccount.chapters.map((chapter: any, index: number) => ({
        index: chapter.index,
        isPurchased: chapter.readers.some(
          (reader) => reader.toString() === user.toString()
        ),
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
    const tx = await this.program.methods
      .addChapter(url, index, new anchor.BN(price), name)
      .accounts({
        book: bookPubKey,
        author: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    return tx;
  }

  async purchaseChapter(bookPubKey: PublicKey, authorPubKey: PublicKey, chapterIndex: number): Promise<string> {
    const tx = await this.program.methods
      .purchaseChapter(chapterIndex)
      .accounts({
        book: bookPubKey,
        buyer: this.provider.wallet.publicKey,
        author: authorPubKey,
        platform: new PublicKey("6TRrKrkZENEVQyRmMc6NRgU1SYjWPRwQZqeVVmfr7vup"),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    return tx;
  }

  async purchaseFullBook(bookPubKey: PublicKey, authorPubKey: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .purchaseFullBook()
      .accounts({
        book: bookPubKey,
        buyer: this.provider.wallet.publicKey,
        author: authorPubKey,
        platform: new PublicKey("6TRrKrkZENEVQyRmMc6NRgU1SYjWPRwQZqeVVmfr7vup"),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    return tx;
  }

  async stakeOnBook(bookPubKey: PublicKey, amount: number): Promise<string> {
    const tx = await this.program.methods
      .stakeOnBook(new anchor.BN(amount))
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  // New method to claim stake earnings
  async claimStakeEarnings(bookPubKey: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .claimStakerEarnings()
      .accounts({
        book: bookPubKey,
        staker: this.provider.wallet.publicKey,
      })
      .rpc();
    return tx;
  }

  async getLastAddedBookPubKey(): Promise<PublicKey | null> {
    return this.lastAddedBookPubKey;
  }

  async createUserCollection(): Promise<string> {
    const collection = Keypair.generate();
    console.log("Generated collection keypair:", collection.publicKey.toString());
    const tx = await this.program.methods
      .createUserCollection()
      .accounts({
        signer: this.provider.wallet.publicKey,
        payer: this.provider.wallet.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([collection])
      .rpc();
    return tx;
  }

  async createBookAsset(bookPubKey: PublicKey, collectionKey: PublicKey): Promise<string> {
    const bookAsset = Keypair.generate();
    console.log("Generated book asset keypair:", bookAsset.publicKey.toString());
    
    const tx = await this.program.methods
      .createBookAsset()
      .accounts({
        signer: this.provider.wallet.publicKey,
        payer: this.provider.wallet.publicKey,
        asset: bookAsset.publicKey,
        collection: collectionKey,
        book: bookPubKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bookAsset])
      .rpc();

    console.log("Create Book Asset transaction:", tx);
    await this.provider.connection.confirmTransaction(tx);

    return tx;
  }

  async createChapterAsset(bookPubKey: PublicKey, chapterIndex: number, collectionKey: PublicKey): Promise<string> {
    const chapterAsset = Keypair.generate();
    console.log("Generated chapter asset keypair:", chapterAsset.publicKey.toString());
    const tx = await this.program.methods
      .createChapterAsset(new anchor.BN(chapterIndex))
      .accounts({
        signer: this.provider.wallet.publicKey,
        payer: this.provider.wallet.publicKey,
        asset: chapterAsset.publicKey,
        book: bookPubKey,
        collection: collectionKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([chapterAsset])
      .rpc();

    console.log("Create Chapter Asset transaction:", tx);
    await this.provider.connection.confirmTransaction(tx);

    return tx;
  }


  async fetchCollection(collectionId: PublicKey): Promise<AssetV1[]> {

    const umi = createUmi('http://127.0.0.1:8899')

    // Register Wallet Adapter to Umi
    umi.use(walletAdapterIdentity(this.provider.wallet))

    const umiPublicKey = fromWeb3JsPublicKey(this.provider.wallet.publicKey);

    const assetsByOwner = await fetchAssetsByOwner(umi, umiPublicKey, {
      skipDerivePlugins: false,
    })
    
    console.log(assetsByOwner)

    return assetsByOwner;
  }


}