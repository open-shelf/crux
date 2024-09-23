import "./App.css";
import { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  useWallet,
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import idl from "./idl.json";

console.log("IDL:", idl);
console.log("Metadata address:", idl.metadata?.address);

require("@solana/wallet-adapter-react-ui/styles.css");

window.Buffer = Buffer;

const wallets = [new PhantomWalletAdapter()];

const { SystemProgram, Keypair } = web3;
const baseAccount = Keypair.generate();
const opts = {
  preflightCommitment: "processed",
};
const PROGRAM_ID = "6sPkjZEfevcJVmUVzvvW57QAZnu3Q8mvLg1CcJLZyaL4"; // Replace with your actual program ID
const programID = new PublicKey(PROGRAM_ID);

console.log("Using program ID:", PROGRAM_ID);
function App() {
  const [books, setBooks] = useState([]);
  const wallet = useWallet();

  async function getProvider() {
    const network = "http://127.0.0.1:8899";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new AnchorProvider(
      connection,
      wallet,
      opts.preflightCommitment
    );
    return provider;
  }

  async function createBook() {
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    try {
      const title = "Sample Book"; // Ensure this matches the expected type in the IDL
      await program.rpc.createBook(title, provider.wallet.publicKey, {
        accounts: {
          book: baseAccount.publicKey, // Ensure this is initialized correctly
          author: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount], // Ensure baseAccount is correctly initialized
      });

      const account = await program.account.book.fetch(baseAccount.publicKey);
      console.log("book: ", account);
      setBooks([...books, account]);
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  if (!wallet.connected) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "100px",
        }}
      >
        <WalletMultiButton />
      </div>
    );
  } else {
    return (
      <div className="App">
        <div>
          <button onClick={createBook}>Create Book</button>
          {books.map((book, index) => (
            <div key={index}>
              <h3>{book.title}</h3>
              <p>Author: {book.author.toString()}</p>
              <p>Chapters: {book.chapterCount.toString()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);

export default AppWithProvider;
