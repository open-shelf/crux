"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import idl from "./idl/openshelf.json";

export default function WalletSection() {
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey && wallet) {
      try {
        console.log("Initializing provider and program...");
        const provider = new AnchorProvider(
          connection,
          wallet as any,
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

        // Log the types defined in the IDL
        console.log(
          "IDL types:",
          idl.types?.map((t) => ({ name: t.name, kind: t.type.kind }))
        );

        const program = new Program(idl as Idl, provider);
        console.log("Program initialized successfully");

        // Log all instructions
        console.log(
          "Program Instructions:",
          program.idl.instructions.map((instr) => ({
            name: instr.name,
            args: instr.args.map((arg) => ({ name: arg.name, type: arg.type })),
          }))
        );

        // Log all accounts
        console.log(
          "Program Accounts:",
          program.idl.accounts?.map((account) => ({
            name: account.name,
            type: account.type,
          }))
        );

        // Log all types
        console.log(
          "Program Types:",
          program.idl.types?.map((type) => ({
            name: type.name,
            kind: type.type.kind,
            fields: type.type.fields,
          }))
        );

        setProgram(program);
        setError(null);
      } catch (err: unknown) {
        console.error("Error initializing program:", err);
        console.error(
          "Full error object:",
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        );
        setError(`Error initializing program: ${(err as Error).message}`);
      }
    }
  }, [publicKey, wallet, connection]);

  const addBook = async () => {
    if (!program) {
      console.error("Program not initialized");
      return;
    }
    try {
      console.log("Adding book...");
      console.log("Available methods:", Object.keys(program.methods));
      const tx = await program.methods
        .addBook({
          title: "Test Book",
          metaUrl: "Test Author",
        })
        .rpc();
      console.log("Transaction signature", tx);
    } catch (error: unknown) {
      console.error("Error adding book:", error);
      setError(`Error adding book: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <WalletMultiButton />
      {publicKey && !error && (
        <button
          onClick={addBook}
          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        >
          Add Test Book
        </button>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}
