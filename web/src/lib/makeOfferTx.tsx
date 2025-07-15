import idl from "@/idl/anchor_escrow.json";
import type { AnchorEscrow } from "@/types/anchor_escrow";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";

interface MakeOffer {
  tokenMintA: PublicKey | undefined;
  tokenMintB: PublicKey | undefined;
  receive: number;
  amount: number;
  connection: Connection;
  wallet: AnchorWallet; // Use the correct type if you have it
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: any
  ) => Promise<string>;
}

export const makeOfferTx = async ({
  tokenMintA,
  tokenMintB,
  connection,
  wallet,
  amount,
  receive,
  sendTransaction,
}: MakeOffer) => {
  if (!wallet) {
    console.log("Connect wallet");
    return;
  }
  // Generate a random 64-bit seed
  const randomSeed = BigInt.asUintN(
    64,
    BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
  );
  const seed = new anchor.BN(randomSeed.toString());

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  if (!tokenMintA || !tokenMintB) {
    throw new Error("No tokenMints passed");
  }
  console.log("TokenMintA -> ", tokenMintA?.toBase58());
  console.log("TokenMintB -> ", tokenMintB?.toBase58());
  console.log("Recieve -> ", receive);
  console.log("Amount -> ", amount);

  const makerAtaAccountA = await getAssociatedTokenAddress(
    tokenMintA,
    provider.publicKey
  );

  const program = new anchor.Program(idl as AnchorEscrow);

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      provider.publicKey.toBuffer(),
      Buffer.from(seed.toArray("le", 8)),
    ],
    program.programId
  );
  const escrow = pda;

  const vault = await getAssociatedTokenAddress(tokenMintA, escrow, true);

  try {
    const ix1 = await program.methods
      .make(seed, receive, amount)
      .accounts({
        maker: provider.publicKey,
        escrow: escrow,
        mintA: tokenMintA,
        mintB: tokenMintB,
        makerAtaA: makerAtaAccountA,
        vault: vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.add(ix1);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signature = await sendTransaction(tx, connection);
    console.log(signature);
    return signature;
  } catch (e) {
    console.log(e);
  }
};
