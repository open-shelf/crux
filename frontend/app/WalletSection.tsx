import React, { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "./idl/openshelf.json";

// Assuming you have a type definition for your program
import { Openshelf } from "./types/openshelf";

const WalletSection: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [program, setProgram] = useState<Program<Openshelf> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookPublicKey, setBookPublicKey] = useState<string>("");
  const [bookDetails, setBookDetails] = useState<any>(null);
  const [chapterUrl, setChapterUrl] = useState<string>("");
  const [chapterPrice, setChapterPrice] = useState<string>("");
  const [purchaseChapterIndex, setPurchaseChapterIndex] = useState<string>("");
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [chapterIndex, setChapterIndex] = useState<string>("");
  const [chapterName, setChapterName] = useState<string>("");

  useEffect(() => {
    const initializeProgram = async () => {
      if (publicKey && signTransaction && signAllTransactions) {
        try {
          console.log("Initializing provider and program...");
          const wallet = {
            publicKey,
            signTransaction,
            signAllTransactions,
          };
          const provider = new AnchorProvider(
            connection,
            wallet,
            AnchorProvider.defaultOptions()
          );
          setProvider(provider);

          console.log("IDL address:", idl.address);

          let programId: PublicKey;
          try {
            programId = new PublicKey(idl.address);
          } catch (pubkeyError) {
            console.error("Error creating PublicKey:", pubkeyError);
            throw new Error(`Invalid program address: ${idl.address}`);
          }

          console.log("Program ID:", programId.toBase58());

          const program = new Program(idl as Idl, provider);

          console.log("Program initialized successfully");

          setProgram(program);
          setError(null);

          const endpoint = connection.rpcEndpoint;
          let network;
          if (endpoint.includes("devnet")) {
            network = "Devnet";
          } else if (endpoint.includes("testnet")) {
            network = "Testnet";
          } else if (endpoint.includes("mainnet")) {
            network = "Mainnet";
          } else if (
            endpoint.includes("localhost") ||
            endpoint.includes("127.0.0.1")
          ) {
            network = "Localhost";
          } else {
            network = "Unknown";
          }

          console.log(`Currently connected to: ${network}`);

          // Run tests
          // await runTests(program, provider);
        } catch (err: unknown) {
          console.error("Error initializing program:", err);
          setError(`Error initializing program: ${(err as Error).message}`);
        }
      }
    };

    initializeProgram();
  }, [publicKey, signTransaction, signAllTransactions, connection]);

  const runTests = async (
    program: Program<Openshelf>,
    provider: AnchorProvider
  ) => {
    try {
      console.log("Running tests...");

      // Test 1: Add a book
      const book = anchor.web3.Keypair.generate();
      const tx = await program.methods
        .addBook("Test Book", "https://example.com/test-book")
        .accounts({
          book: book.publicKey,
          author: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([book])
        .rpc();
      console.log(
        "Test 1 passed: Book added successfully. Transaction signature:",
        tx
      );

      // Test 2: Fetch the added book
      const fetchedBook = await program.account.book.fetch(book.publicKey);
      console.assert(
        fetchedBook.title === "Test Book",
        "Book title should match"
      );
      console.assert(
        fetchedBook.metaUrl === "https://example.com/test-book",
        "Book meta URL should match"
      );
      console.log("Test 2 passed: Book fetched and verified");

      // Test 3: Add a chapter
      const chapterTx = await program.methods
        .addChapter("https://example.com/chapter1", 0, new anchor.BN(1000000))
        .accounts({
          book: book.publicKey,
          author: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(
        "Test 3 passed: Chapter added successfully. Transaction signature:",
        chapterTx
      );

      // Add more tests as needed...
    } catch (error: unknown) {
      console.error("Error during tests:", error);
      setError(`Error during tests: ${(error as Error).message}`);
    }
  };

  const addBook = async () => {
    if (!program) {
      console.error("Program not initialized");
      return;
    }
    try {
      console.log("Adding book...");
      const book = anchor.web3.Keypair.generate();
      console.log("New book public key:", book.publicKey.toString());

      const tx = await program.methods
        .addBook("Test Book", "https://example.com/test-book")
        .accounts({
          book: book.publicKey,
          author: program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([book])
        .rpc();
      console.log("Transaction signature", tx);
    } catch (error: unknown) {
      console.error("Error adding book:", error);
      setError(`Error adding book: ${(error as Error).message}`);
    }
  };

  const fetchBook = async (pubKey: anchor.web3.PublicKey) => {
    if (!program) {
      throw new Error("Program not initialized");
    }

    try {
      const bookAccount = await program.account.book.fetch(pubKey);

      const formattedBookDetails = {
        author: bookAccount.author.toString(),
        title: bookAccount.title,
        meta_url: bookAccount.metaUrl,
        fullBookPrice: bookAccount.fullBookPrice.toNumber(),
        totalStake: bookAccount.totalStake.toNumber(),
        chapters: bookAccount.chapters.map((chapter: any, index: number) => ({
          index: chapter.index,
          is_purchased: false,
          name: `Chapter ${index + 1}`,
          url: chapter.url,
          price: chapter.price.toNumber(),
        })),
        stakes: bookAccount.stakes.map((stake: any) => ({
          staker: stake.staker.toString(),
          amount: stake.amount.toNumber(),
        })),
      };

      return formattedBookDetails;
    } catch (error) {
      console.error("Error fetching book details:", error);
      throw error;
    }
  };

  const handleFetchBook = async () => {
    try {
      const pubKey = new PublicKey(bookPublicKey);
      const details = await fetchBook(pubKey);
      setBookDetails(details);
      console.log("Fetched Book Details:", details);
    } catch (error) {
      console.error("Error fetching book:", error);
      setError(`Error fetching book: ${(error as Error).message}`);
    }
  };

  const addChapter = async () => {
    if (!program || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Adding chapter...");
      const tx = await program.methods
        .addChapter(
          chapterUrl,
          Number(chapterIndex),
          new anchor.BN(Number(chapterPrice) * LAMPORTS_PER_SOL),
          chapterName
        )
        .accounts({
          book: new PublicKey(bookPublicKey),
          author: program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error adding chapter:", error);
      setError(`Error adding chapter: ${(error as Error).message}`);
    }
  };

  const purchaseChapter = async () => {
    if (!program || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Purchasing chapter...");
      const tx = await program.methods
        .purchaseChapter(Number(purchaseChapterIndex))
        .accounts({
          book: new PublicKey(bookPublicKey),
          buyer: program.provider.publicKey,
          author: bookDetails.author,
          platform: new PublicKey(
            "DV5h5xRmWap6VwRVbXvvotgg41y1BZsHE3tEjMZhTL6L"
          ), // Replace with actual platform public key
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error purchasing chapter:", error);
      setError(`Error purchasing chapter: ${(error as Error).message}`);
    }
  };

  const purchaseFullBook = async () => {
    if (!program || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Purchasing full book...");
      const tx = await program.methods
        .purchaseFullBook()
        .accounts({
          book: new PublicKey(bookPublicKey),
          buyer: program.provider.publicKey,
          author: bookDetails.author,
          platform: new PublicKey(
            "DV5h5xRmWap6VwRVbXvvotgg41y1BZsHE3tEjMZhTL6L"
          ), // Replace with actual platform public key
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error purchasing full book:", error);
      setError(`Error purchasing full book: ${(error as Error).message}`);
    }
  };

  const stakeOnBook = async () => {
    if (!program || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Staking on book...");
      const tx = await program.methods
        .stakeOnBook(new anchor.BN(Number(stakeAmount) * LAMPORTS_PER_SOL))
        .accounts({
          book: new PublicKey(bookPublicKey),
          staker: program.provider.publicKey,
        })
        .rpc();
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error staking on book:", error);
      setError(`Error staking on book: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <WalletMultiButton />
      {publicKey && !error && (
        <>
          <button
            onClick={addBook}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          >
            Add Test Book
          </button>
          <div className="mt-4">
            <input
              type="text"
              value={bookPublicKey}
              onChange={(e) => setBookPublicKey(e.target.value)}
              placeholder="Enter Book Public Key"
              className="border border-gray-300 rounded-md p-2 mr-2"
            />
            <button
              onClick={handleFetchBook}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            >
              Fetch Book Details
            </button>
          </div>
          {bookDetails && (
            <div className="mt-4">
              <h3>Book Actions:</h3>
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={chapterUrl}
                    onChange={(e) => setChapterUrl(e.target.value)}
                    placeholder="Chapter URL"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <input
                    type="number"
                    value={chapterIndex}
                    onChange={(e) => setChapterIndex(e.target.value)}
                    placeholder="Chapter Index"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <input
                    type="number"
                    value={chapterPrice}
                    onChange={(e) => setChapterPrice(e.target.value)}
                    placeholder="Chapter Price (SOL)"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <input
                    type="text"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="Chapter Name"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <button
                    onClick={addChapter}
                    className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                  >
                    Add Chapter
                  </button>
                </div>
                <div>
                  <input
                    type="number"
                    value={purchaseChapterIndex}
                    onChange={(e) => setPurchaseChapterIndex(e.target.value)}
                    placeholder="Chapter Index"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <button
                    onClick={purchaseChapter}
                    className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                  >
                    Purchase Chapter
                  </button>
                </div>
                <div>
                  <button
                    onClick={purchaseFullBook}
                    className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                  >
                    Purchase Full Book
                  </button>
                </div>
                <div>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="Stake Amount (SOL)"
                    className="border border-gray-300 rounded-md p-2 mr-2"
                  />
                  <button
                    onClick={stakeOnBook}
                    className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                  >
                    Stake on Book
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {bookDetails && (
        <div className="mt-4">
          <h3>Fetched Book Details:</h3>
          <pre>{JSON.stringify(bookDetails, null, 2)}</pre>
        </div>
      )}
    </>
  );
};

export default WalletSection;
