import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Openshelf } from "../target/types/openshelf";

export const setup = async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Openshelf as Program<Openshelf>;

  const bookKeypair = anchor.web3.Keypair.generate();
  const author = anchor.web3.Keypair.generate();
  const reader1 = anchor.web3.Keypair.generate();
  const reader2 = anchor.web3.Keypair.generate();
  const staker1 = anchor.web3.Keypair.generate();
  const staker2 = anchor.web3.Keypair.generate();
  const platform = anchor.web3.Keypair.generate(); 

  const bookTitle = "The Great Gatsby";
  const description = "A good book!";
  const publish_date = Date.now();
  const genre = "Fiction";
  const image_url = "https://example.com/book-cover.jpg";
  // Adjust chapter prices to total 1 SOL
  const chapterPrices = [
    0.3 * anchor.web3.LAMPORTS_PER_SOL,
    0.3 * anchor.web3.LAMPORTS_PER_SOL,
    0.4 * anchor.web3.LAMPORTS_PER_SOL
  ].map(price => Math.floor(price)); // Ensure integer values

  // Airdrop SOL to all accounts
  const accounts = [author, reader1, reader2, staker1, staker2, platform];
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

  return {
    provider,
    program,
    bookKeypair,
    author,
    reader1,
    reader2,
    staker1,
    staker2,
    platform,
    bookTitle,
    description,
    publish_date,
    genre,
    image_url,
    chapterPrices,
  };
};