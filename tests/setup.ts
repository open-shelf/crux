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
  const platform = anchor.web3.Keypair.generate(); // New platform account

  const bookTitle = "The Great Gatsby";
  const chapterPrices = [100000000, 200000000, 300000000]; // 0.1 SOL, 0.2 SOL, 0.3 SOL
  const fullBookPrice = new anchor.BN(500000000); // 0.5 SOL

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
    chapterPrices,
    fullBookPrice,
  };
};