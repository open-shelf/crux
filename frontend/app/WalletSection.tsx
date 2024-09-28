import React, { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "./idl/openshelf.json";
import { ProgramUtils } from "./utils/programUtils";

// Assuming you have a type definition for your program
import { Openshelf } from "./types/openshelf";

const WalletSection: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [programUtils, setProgramUtils] = useState<ProgramUtils | null>(null);
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
          const utils = new ProgramUtils(connection, wallet);
          setProgramUtils(utils);
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

  const addBook = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }
    try {
      console.log("Adding book...");
      const tx = await programUtils.addBook(
        "Test Book",
        "https://example.com/test-book"
      );
      console.log("Transaction signature", tx);
    } catch (error: unknown) {
      console.error("Error adding book:", error);
      setError(`Error adding book: ${(error as Error).message}`);
    }
  };

  const handleFetchBook = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }
    try {
      const pubKey = new PublicKey(bookPublicKey);
      const details = await programUtils.fetchBook(pubKey);
      setBookDetails(details);
      console.log("Fetched Book Details:", details);
    } catch (error) {
      console.error("Error fetching book:", error);
      setError(`Error fetching book: ${(error as Error).message}`);
    }
  };

  const addChapter = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Adding chapter...");
      const tx = await programUtils.addChapter(
        new PublicKey(bookPublicKey),
        chapterUrl,
        Number(chapterIndex),
        Number(chapterPrice) * LAMPORTS_PER_SOL,
        chapterName
      );
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error adding chapter:", error);
      setError(`Error adding chapter: ${(error as Error).message}`);
    }
  };

  const purchaseChapter = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Purchasing chapter...");
      const tx = await programUtils.purchaseChapter(
        new PublicKey(bookPublicKey),
        bookDetails.author,
        Number(purchaseChapterIndex)
      );
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error purchasing chapter:", error);
      setError(`Error purchasing chapter: ${(error as Error).message}`);
    }
  };

  const purchaseFullBook = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Purchasing full book...");
      const tx = await programUtils.purchaseFullBook(
        new PublicKey(bookPublicKey),
        bookDetails.author
      );
      console.log("Transaction signature", tx);
      await handleFetchBook(); // Refresh book details
    } catch (error: unknown) {
      console.error("Error purchasing full book:", error);
      setError(`Error purchasing full book: ${(error as Error).message}`);
    }
  };

  const stakeOnBook = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Staking on book...");
      const tx = await programUtils.stakeOnBook(
        new PublicKey(bookPublicKey),
        Number(stakeAmount) * LAMPORTS_PER_SOL
      );
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
