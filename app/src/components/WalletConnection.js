import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function WalletConnection() {
  const { connected } = useWallet();

  return (
    <div className="wallet-connection">
      <WalletMultiButton />
      {connected && <p>Connected to wallet</p>}
    </div>
  );
}

export default WalletConnection;
