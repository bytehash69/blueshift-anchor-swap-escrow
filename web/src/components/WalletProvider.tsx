"use client";
import React, { ReactNode, useMemo } from "react";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const endpoint = clusterApiUrl("devnet");
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]}>
        <WalletModalProvider>
          <WalletMultiButton />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;
