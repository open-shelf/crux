import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/openshelf.json";
import { Openshelf } from "../types/openshelf";

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

  async addBook(title: string, metaUrl: string): Promise<string> {
    const book = anchor.web3.Keypair.generate();
    console.log("New book public key:", book.publicKey.toString());

    const tx = await this.program.methods
      .addBook(title, metaUrl)
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
    return {
      author: bookAccount.author.toString(),
      title: bookAccount.title,
      metaUrl: bookAccount.metaUrl,
      fullBookPrice: bookAccount.fullBookPrice.toNumber(),
      totalStake: bookAccount.totalStake.toNumber(),
      chapters: bookAccount.chapters.map((chapter: any, index: number) => ({
        index: chapter.index,
        isPurchased: false,
        name: `Chapter ${index + 1}`,
        url: chapter.url,
        price: chapter.price.toNumber(),
      })),
      stakes: bookAccount.stakes.map((stake: any) => ({
        staker: stake.staker.toString(),
        amount: stake.amount.toNumber(),
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
        platform: new PublicKey("DV5h5xRmWap6VwRVbXvvotgg41y1BZsHE3tEjMZhTL6L"),
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
        platform: new PublicKey("DV5h5xRmWap6VwRVbXvvotgg41y1BZsHE3tEjMZhTL6L"),
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
}