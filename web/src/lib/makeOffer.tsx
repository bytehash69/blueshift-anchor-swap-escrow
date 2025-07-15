"use client";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { makeOfferTx } from "./makeOfferTx";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import Link from "next/link";

export function MakeOffer() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  
  const [receive, setReceive] = useState<BN>();
  const [amount, setAmount] = useState<BN>();
  const [tokenMintA, setTokenMintA] = useState<PublicKey | undefined>(
    undefined
  );
  const [tokenMintB, setTokenMintB] = useState<PublicKey | undefined>(
    undefined
  );
  const [signature, setSignature] = useState<string | null>(null);

  const onClick = async () => {
    if (!wallet) {
      throw new Error("Connect wallet");
    }
    const signature = await makeOfferTx({
      tokenMintA,
      tokenMintB,
      amount,
      receive,
      connection,
      wallet,
      sendTransaction,
    });
    if (typeof signature === "string") {
      setSignature(signature);
    } else {
      setSignature(null);
    }
  };

  return (
    <div className="flex flex-col">
      <input
        value={tokenMintA?.toBase58()}
        onChange={(e) => setTokenMintA(new PublicKey(e.target.value))}
        placeholder="tokenMintA"
      />
      <input
        value={tokenMintB?.toBase58()}
        onChange={(e) => setTokenMintB(new PublicKey(e.target.value))}
        placeholder="tokenMintB"
      />
      <input
        value={receive}
        onChange={(e) => setReceive(new BN(e.target.value))}
        placeholder="recieve"
      />
      <input
        onChange={(e) => setAmount(new BN(e.target.value))}
        placeholder="amount"
      />
      <div>
        <button onClick={onClick}>Make offer</button>
      </div>
      <p>Signature = {signature}</p>
      <p>
        Check it out on explorer -
        <Link
          href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
        >
          https://explorer.solana.com/tx/{signature}
          ?cluster=devnet
        </Link>
      </p>
    </div>
  );
}
