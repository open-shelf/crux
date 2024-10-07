import React, { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "./idl/openshelf.json";
import { ProgramUtils } from "./utils/programUtils";
import Image from "next/image";

// Assuming you have a type definition for your program
import { Openshelf } from "./types/openshelf";

// New ErrorPopup component
const ErrorPopup: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <p>{message}</p>
      <button onClick={onClose} className="absolute top-1 right-2 text-white">
        &times;
      </button>
    </div>
  );
};

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
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [bookUrl, setBookUrl] = useState<string>("");
  const [jsonInput, setJsonInput] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string>("");
  const [collectionSymbol, setCollectionSymbol] = useState<string>("");
  const [bookNftName, setBookNftName] = useState<string>("");
  const [bookNftSymbol, setBookNftSymbol] = useState<string>("");
  const [chapterNftName, setChapterNftName] = useState<string>("");
  const [chapterNftSymbol, setChapterNftSymbol] = useState<string>("");
  const [chapterNftIndex, setChapterNftIndex] = useState<string>("");
  const [collectionPublicKey, setCollectionPublicKey] = useState<string>("");
  const [collectionMints, setCollectionMints] = useState<string[]>([]);
  const [bookDescription, setBookDescription] = useState<string>("");
  const [bookGenre, setBookGenre] = useState<string>("");
  const [collectionAssets, setCollectionAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

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

    const fetchUserBalance = async () => {
      if (publicKey && connection) {
        const balance = await connection.getBalance(publicKey);
        setUserBalance(balance / LAMPORTS_PER_SOL);
      }
    };

    fetchUserBalance();
  }, [publicKey, signTransaction, signAllTransactions, connection]);

  const addBook = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }
    if (
      !bookTitle.trim() ||
      !bookDescription.trim() ||
      !bookGenre.trim() ||
      !bookUrl.trim()
    ) {
      setError("Please enter all book details");
      return;
    }
    try {
      console.log("Adding book...");
      const tx = await programUtils.addBook(
        bookTitle,
        bookDescription,
        bookGenre,
        bookUrl
      );
      console.log("Transaction signature", tx);
      // After adding a book, fetch its details
      const newBookPubKey = await programUtils.getLastAddedBookPubKey();
      if (newBookPubKey) {
        setBookPublicKey(newBookPubKey.toString());
        await updateBookAndBalance();
      } else {
        setError("Failed to get the public key of the newly added book");
      }
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
    if (!bookPublicKey || bookPublicKey.trim() === "") {
      setHint("Please enter a valid book public key");
      return;
    }
    setHint(null);
    try {
      let pubKey: PublicKey;
      try {
        pubKey = new PublicKey(bookPublicKey);
      } catch (err) {
        setError("Invalid public key format");
        return;
      }
      const details = await programUtils.fetchBook(pubKey);
      setBookDetails(details);
      console.log("Fetched Book Details:", details);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error fetching book:", error);
      setError(`Error fetching book: ${(error as Error).message}`);
      setBookDetails(null); // Clear book details on error
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
      await updateBookAndBalance();
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
      await updateBookAndBalance();
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
      await updateBookAndBalance();
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
      await updateBookAndBalance();
    } catch (error: unknown) {
      console.error("Error staking on book:", error);
      setError(`Error staking on book: ${(error as Error).message}`);
    }
  };

  const claimStakeEarnings = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    try {
      console.log("Claiming stake earnings...");
      const tx = await programUtils.claimStakeEarnings(
        new PublicKey(bookPublicKey)
      );
      console.log("Transaction signature", tx);
      await updateBookAndBalance();
    } catch (error: unknown) {
      console.error("Error claiming stake earnings:", error);
      setError(`Error claiming stake earnings: ${(error as Error).message}`);
    }
  };

  const updateBookAndBalance = async () => {
    await handleFetchBook();
    if (publicKey && connection) {
      const balance = await connection.getBalance(publicKey);
      setUserBalance(balance / LAMPORTS_PER_SOL);
    }
  };

  const clearError = () => setError(null);

  const handleJsonSubmit = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }

    try {
      const bookData = JSON.parse(jsonInput);

      // Add the book
      const addBookTx = await programUtils.addBook(
        bookData.title,
        bookData.description,
        bookData.genre,
        bookData.image_url
      );
      console.log("Add book transaction signature", addBookTx);

      // Get the newly added book's public key
      const newBookPubKey = await programUtils.getLastAddedBookPubKey();
      if (!newBookPubKey) {
        throw new Error("Failed to get the public key of the newly added book");
      }

      // Add chapters
      for (const chapter of bookData.chapters) {
        const addChapterTx = await programUtils.addChapter(
          newBookPubKey,
          chapter.url,
          chapter.index,
          chapter.price * LAMPORTS_PER_SOL,
          chapter.name
        );
        console.log(
          `Add chapter ${chapter.index} transaction signature`,
          addChapterTx
        );
      }

      setBookPublicKey(newBookPubKey.toString());
      await updateBookAndBalance();
      setJsonError(null);
      setError(null);
    } catch (error: unknown) {
      console.error("Error processing JSON input:", error);
      setJsonError(`Error processing JSON input: ${(error as Error).message}`);
    }
  };

  const createCollection = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }
    try {
      console.log("Creating collection...");
      const tx = await programUtils.createUserCollection();
      console.log("Transaction signature", tx);
      setError(null);
    } catch (error: unknown) {
      console.error("Error creating collection:", error);
      setError(`Error creating collection: ${(error as Error).message}`);
    }
  };

  const mintBookNft = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    if (!collectionPublicKey) {
      setError("Please enter a collection public key");
      return;
    }
    try {
      console.log("Minting Book NFT...");
      const tx = await programUtils.createBookAsset(
        new PublicKey(bookPublicKey),
        new PublicKey(collectionPublicKey)
      );
      console.log("Transaction signature", tx);
      await updateBookAndBalance();
    } catch (error: unknown) {
      console.error("Error minting Book NFT:", error);
      setError(`Error minting Book NFT: ${(error as Error).message}`);
    }
  };

  const mintChapterNft = async () => {
    if (!programUtils || !bookDetails) {
      console.error("Program not initialized or book not fetched");
      return;
    }
    if (!collectionPublicKey) {
      setError("Please enter a collection public key");
      return;
    }
    try {
      console.log("Minting Chapter NFT...");
      const tx = await programUtils.createChapterAsset(
        new PublicKey(bookPublicKey),
        Number(chapterNftIndex),
        new PublicKey(collectionPublicKey)
      );
      console.log("Transaction signature", tx);
      await updateBookAndBalance();
    } catch (error: unknown) {
      console.error("Error minting Chapter NFT:", error);
      setError(`Error minting Chapter NFT: ${(error as Error).message}`);
    }
  };

  const fetchCollection = async () => {
    if (!programUtils) {
      console.error("Program not initialized");
      return;
    }
    if (!collectionPublicKey || collectionPublicKey.trim() === "") {
      setHint("Please enter a valid collection public key");
      return;
    }
    setHint(null);
    try {
      let pubKey: PublicKey;
      try {
        pubKey = new PublicKey(collectionPublicKey);
      } catch (err) {
        setError("Invalid public key format");
        return;
      }
      const assetsV1 = await programUtils.fetchCollection(pubKey);
      setCollectionAssets(assetsV1);

      // Fetch metadata for all assets
      const metadataPromises = assetsV1.map(async (asset) => {
        if (asset.uri) {
          const response = await fetch(asset.uri);
          return await response;
        }
        return null;
      });

      const metadataResults = await Promise.all(metadataPromises);
      setCollectionAssets(
        assetsV1.map((asset, index) => ({
          ...asset,
          metadata: metadataResults[index],
        }))
      );

      setSelectedAsset(0); // Select the first asset by default
      setError(null);
    } catch (error) {
      console.error("Error fetching collection:", error);
      setError(`Error fetching collection: ${(error as Error).message}`);
      setCollectionAssets([]);
      setSelectedAsset(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-100 text-gray-800">
      {error && <ErrorPopup message={error} onClose={clearError} />}

      <div className="md:w-1/2 space-y-6">
        <div className="flex justify-between items-center">
          <WalletMultiButton />
          {userBalance !== null && (
            <div className="text-sm font-medium">
              Balance: {userBalance.toFixed(4)} SOL
            </div>
          )}
        </div>

        {/* Add Book and Chapter */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Add Book and Chapter</h3>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Enter Book Title"
            className="input-field w-full mb-2"
          />
          <textarea
            value={bookDescription}
            onChange={(e) => setBookDescription(e.target.value)}
            placeholder="Enter Book Description"
            className="input-field w-full mb-2"
            rows={3}
          />
          <input
            type="text"
            value={bookGenre}
            onChange={(e) => setBookGenre(e.target.value)}
            placeholder="Enter Book Genre"
            className="input-field w-full mb-2"
          />
          <input
            type="text"
            value={bookUrl}
            onChange={(e) => setBookUrl(e.target.value)}
            placeholder="Enter Book Image URL"
            className="input-field w-full mb-2"
          />
          <button onClick={addBook} className="btn-primary w-full mb-6">
            Add Book
          </button>
          <div className="relative">
            <input
              type="text"
              value={bookPublicKey}
              onChange={(e) => setBookPublicKey(e.target.value)}
              placeholder="Enter Book Public Key"
              className="input-field w-full mb-2"
            />
            {hint && (
              <p className="text-sm text-blue-600 absolute -bottom-6 left-0">
                {hint}
              </p>
            )}
          </div>
          <button
            onClick={handleFetchBook}
            className="btn-secondary w-full mb-6"
          >
            Fetch Book Details
          </button>
          {bookDetails && (
            <>
              <input
                type="text"
                value={chapterUrl}
                onChange={(e) => setChapterUrl(e.target.value)}
                placeholder="Chapter URL"
                className="input-field w-full mb-2"
              />
              <input
                type="number"
                value={chapterIndex}
                onChange={(e) => setChapterIndex(e.target.value)}
                placeholder="Chapter Index"
                className="input-field w-full mb-2"
              />
              <input
                type="number"
                value={chapterPrice}
                onChange={(e) => setChapterPrice(e.target.value)}
                placeholder="Chapter Price (SOL)"
                className="input-field w-full mb-2"
              />
              <input
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="Chapter Name"
                className="input-field w-full mb-2"
              />
              <button onClick={addChapter} className="btn-primary w-full">
                Add Chapter
              </button>
            </>
          )}
        </div>

        {/* Purchase Chapter and Book */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Purchase Chapter and Book</h3>
          <input
            type="number"
            value={purchaseChapterIndex}
            onChange={(e) => setPurchaseChapterIndex(e.target.value)}
            placeholder="Chapter Index"
            className="input-field w-full mb-2"
          />
          <button onClick={purchaseChapter} className="btn-primary w-full mb-2">
            Purchase Chapter
          </button>
          <button onClick={purchaseFullBook} className="btn-secondary w-full">
            Purchase Full Book
          </button>
        </div>

        {/* Stake and Claim Stake */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Stake and Claim Stake</h3>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Stake Amount (SOL)"
            className="input-field w-full mb-2"
          />
          <button onClick={stakeOnBook} className="btn-primary w-full mb-2">
            Stake on Book
          </button>
          <button onClick={claimStakeEarnings} className="btn-secondary w-full">
            Claim Stake Earnings
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">
            Add Book and Chapters from JSON
          </h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Enter book and chapters JSON"
            className="input-field w-full h-48 mb-2"
          />
          <button onClick={handleJsonSubmit} className="btn-primary w-full">
            Submit JSON
          </button>
          {jsonError && (
            <p className="text-red-500 text-sm mt-2">{jsonError}</p>
          )}
        </div>

        {/* Create Collection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">
            Create and Fetch Collection
          </h3>
          <button
            onClick={createCollection}
            className="btn-primary w-full mb-4"
          >
            Create Collection
          </button>
          <input
            type="text"
            value={collectionPublicKey}
            onChange={(e) => setCollectionPublicKey(e.target.value)}
            placeholder="Enter Collection Public Key"
            className="input-field w-full mb-2"
          />
          <button onClick={fetchCollection} className="btn-secondary w-full">
            Fetch Collection Details
          </button>
        </div>

        {/* Collection Public Key Input */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Collection Public Key</h3>
          <input
            type="text"
            value={collectionPublicKey}
            onChange={(e) => setCollectionPublicKey(e.target.value)}
            placeholder="Enter Collection Public Key"
            className="input-field w-full mb-2"
          />
        </div>

        {/* Mint Book NFT */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Mint Book NFT</h3>
          <button onClick={mintBookNft} className="btn-primary w-full">
            Mint Book NFT
          </button>
        </div>

        {/* Mint Chapter NFT */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Mint Chapter NFT</h3>
          <input
            type="number"
            value={chapterNftIndex}
            onChange={(e) => setChapterNftIndex(e.target.value)}
            placeholder="Chapter Index"
            className="input-field w-full mb-2"
          />
          <button onClick={mintChapterNft} className="btn-primary w-full">
            Mint Chapter NFT
          </button>
        </div>
      </div>

      {/* Book Details */}
      <div className="md:w-1/2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Book Details</h3>
          {bookDetails ? (
            <pre className="whitespace-pre-wrap overflow-x-auto text-black">
              {JSON.stringify(bookDetails, null, 2)}
            </pre>
          ) : (
            <p className="text-black">
              No book details available. Please fetch a book.
            </p>
          )}
        </div>
      </div>

      {/* Collection Details */}
      <div className="md:w-1/2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Collection Details</h3>
          {collectionAssets.length > 0 ? (
            <div>
              <p>
                <strong>Number of assets:</strong> {collectionAssets.length}
              </p>
              <div className="mb-4">
                <label htmlFor="assetSelect" className="block mb-2">
                  Select Asset:
                </label>
                <select
                  id="assetSelect"
                  value={selectedAsset !== null ? selectedAsset : ""}
                  onChange={(e) => setSelectedAsset(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {collectionAssets.map((asset, index) => (
                    <option key={index} value={index}>
                      Asset {index + 1}
                    </option>
                  ))}
                </select>
              </div>
              {selectedAsset !== null && (
                <div>
                  <p>
                    <strong>Public Key:</strong>{" "}
                    {collectionAssets[selectedAsset].publicKey.toString()}
                  </p>
                  <p>
                    <strong>URI:</strong> {collectionAssets[selectedAsset].uri}
                  </p>
                  {collectionAssets[selectedAsset].metadata && (
                    <div>
                      <h4 className="text-lg font-semibold mt-4 mb-2">
                        Metadata
                      </h4>
                      <p>
                        <strong>Name:</strong>{" "}
                        {collectionAssets[selectedAsset].metadata.name}
                      </p>
                      <p>
                        <strong>Symbol:</strong>{" "}
                        {collectionAssets[selectedAsset].metadata.symbol}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {collectionAssets[selectedAsset].metadata.description}
                      </p>
                      {collectionAssets[selectedAsset].metadata.image && (
                        <div className="mt-4">
                          <Image
                            src={collectionAssets[selectedAsset].metadata.image}
                            alt={
                              collectionAssets[selectedAsset].metadata.name ||
                              "NFT Image"
                            }
                            width={300}
                            height={300}
                            className="rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-black">
              No collection details available. Please fetch a collection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletSection;
