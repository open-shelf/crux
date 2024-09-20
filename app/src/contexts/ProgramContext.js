import React, { createContext, useContext, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@project-serum/anchor";

import idl from "../idl.json";

const ProgramContext = createContext();

export function ProgramProvider({ children }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(
    () => new AnchorProvider(connection, wallet, {}),
    [connection, wallet]
  );

  const program = useMemo(
    () => new Program(idl, idl.metadata.address, provider),
    [provider]
  );

  return (
    <ProgramContext.Provider value={{ program }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  return useContext(ProgramContext);
}
