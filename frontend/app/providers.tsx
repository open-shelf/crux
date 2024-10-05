"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // // Local network endpoint
  // const endpoint = useMemo(() => "http://127.0.0.1:8899", []);

  // Local network endpoint
  const endpoint = useMemo(() => "https://api.devnet.solana.com", []);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
