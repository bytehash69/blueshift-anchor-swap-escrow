import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorEscrow } from "../target/types/anchor_escrow";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddress,
  mintTo,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

describe("anchor_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorEscrow as Program<AnchorEscrow>;

  let mintA: anchor.web3.PublicKey;
  let mintB: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let makerAtaAccountA: anchor.web3.PublicKey;
  let takerAtaAccountA: anchor.web3.PublicKey;
  let makeAtaAccountB: anchor.web3.PublicKey;
  let takerAtaAccountB: anchor.web3.PublicKey;
  let escrow: anchor.web3.PublicKey;
  let taker: anchor.web3.Keypair;

  const seed = new anchor.BN(1);
  const amount = new anchor.BN(100);
  const receive = new anchor.BN(200);

  before(async () => {
    console.log("\n🔹 Creating mints...");
    mintA = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.publicKey,
      null,
      9
    );
    console.log(`✅ Mint A: ${mintA.toBase58()}`);

    mintB = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.publicKey,
      null,
      9
    );
    console.log(`✅ Mint B: ${mintB.toBase58()}`);

    makerAtaAccountA = await getAssociatedTokenAddress(
      mintA,
      provider.publicKey
    );
    console.log(`✅ Maker ATA (Mint A): ${makerAtaAccountA.toBase58()}`);

    makeAtaAccountB = await getAssociatedTokenAddress(
      mintB,
      provider.publicKey
    );
    console.log(`✅ Maker ATA (Mint B): ${makeAtaAccountB.toBase58()}`);

    taker = Keypair.generate();

    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: taker.publicKey,
          lamports: 100_000_000,
        })
      )
    );

    console.log(`✅ Airdropped SOL to taker: ${taker.publicKey.toBase58()}`);

    takerAtaAccountA = await getAssociatedTokenAddress(mintA, taker.publicKey);
    console.log(`✅ Taker ATA (Mint A): ${takerAtaAccountA.toBase58()}`);

    takerAtaAccountB = await getAssociatedTokenAddress(mintB, taker.publicKey);
    console.log(`✅ Taker ATA (Mint B): ${takerAtaAccountB.toBase58()}`);

    const [pda, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        provider.publicKey.toBuffer(),
        Buffer.from(seed.toArray("le", 8)),
      ],
      program.programId
    );
    escrow = pda;
    console.log(`✅ Escrow PDA: ${escrow.toBase58()}`);
    console.log(`✅ Escrow bump: ${bump}`);

    vault = await getAssociatedTokenAddress(mintA, escrow, true);
    console.log(`✅ Vault ATA (escrow, Mint A): ${vault.toBase58()}`);

    console.log(`\n🔹 Creating maker's ATAs...`);
    await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      provider.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      provider.publicKey
    );

    console.log(`🔹 Creating taker's ATAs...`);
    await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      taker.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      taker.publicKey
    );

    console.log(`\n🔹 Minting tokens...`);
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintA,
      makerAtaAccountA,
      provider.publicKey,
      500
    );
    console.log(`✅ Minted 500 tokens to ${makerAtaAccountA.toBase58()}`);

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintB,
      takerAtaAccountB,
      provider.publicKey,
      500
    );
    console.log(`✅ Minted 500 tokens to ${takerAtaAccountB.toBase58()}`);
  });

  it("🔹 Initializes escrow correctly and moves tokens into vault", async () => {
    console.log(`\n🚀 Sending 'make' transaction...`);
    const tx = await program.methods
      .make(seed, receive, amount)
      .accounts({
        maker: provider.publicKey,
        //@ts-ignore
        escrow: escrow,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaAccountA,
        vault: vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Transaction signature: ${tx}`);

    console.log(`\n🔹 Fetching escrow account data...`);
    const escrowAccount = await program.account.escrow.fetch(escrow);
    console.log(`✅ Escrow Account Data:
      - maker: ${escrowAccount.maker.toBase58()}
      - mintA: ${escrowAccount.mintA.toBase58()}
      - mintB: ${escrowAccount.mintB.toBase58()}
      - receive: ${escrowAccount.receive.toNumber()}
      - bump: ${escrowAccount.bump}
    `);

    console.log(`🔹 Fetching balances...`);
    const makeAtaAccountBalanceA = (
      await provider.connection.getTokenAccountBalance(makerAtaAccountA)
    ).value.amount;
    const vault_account_balance = (
      await provider.connection.getTokenAccountBalance(vault)
    ).value.amount;

    console.log(
      `✅ Maker ATA A Balance (should be 400): ${makeAtaAccountBalanceA}`
    );
    console.log(`✅ Vault Balance (should be 100): ${vault_account_balance}`);

    console.log(`\n🔹 Running assertions...`);
    expect(escrowAccount.mintA.toBase58()).to.equal(mintA.toBase58());
    expect(escrowAccount.maker.toBase58()).to.equal(
      provider.publicKey.toBase58()
    );
    expect(escrowAccount.mintB.toBase58()).to.equal(mintB.toBase58());
    expect(escrowAccount.receive.toNumber()).to.equal(receive.toNumber());
    expect(Number(makeAtaAccountBalanceA)).to.equal(500 - amount.toNumber());
    expect(Number(vault_account_balance)).to.equal(amount.toNumber());
    console.log(`✅ All assertions passed.\n`);
  });

  it("🔹Taker accepts the offer pays to payer and withdraws the amount from vault", async () => {
    const tx = await program.methods
      .take()
      .accounts({
        taker: taker.publicKey,
        //@ts-ignore
        maker: provider.publicKey,
        escrow: escrow,
        mintA: mintA,
        mintB: mintB,
        vault: vault,
        takerAtaA: takerAtaAccountA,
        takerAtaB: takerAtaAccountB,
        makerAtaA: makerAtaAccountA,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    console.log(`🔹 Fetching balances...`);
    const takerAtaAccountBalanceA = (
      await provider.connection.getTokenAccountBalance(takerAtaAccountA)
    ).value.amount;

    const takerAtaAccountBalanceB = (
      await provider.connection.getTokenAccountBalance(takerAtaAccountB)
    ).value.amount;

    const makeAtaAccountBalanceA = (
      await provider.connection.getTokenAccountBalance(makerAtaAccountA)
    ).value.amount;

    const makerAtaAccountBalanceB = (
      await provider.connection.getTokenAccountBalance(makeAtaAccountB)
    ).value.amount;

    console.log(
      `✅ Maker ATA A Balance (should be 400): ${makeAtaAccountBalanceA}`
    );
    console.log(
      `✅ Taker ATA B Balance (should be 300): ${takerAtaAccountBalanceB}`
    );
    console.log(
      `✅ Taker ATA A Balance (should be 100): ${takerAtaAccountBalanceA}`
    );
    console.log(
      `✅ Maker ATA B Balance (should be 200): ${makerAtaAccountBalanceB}`
    );

    console.log(`\n🔹 Running assertions...`);
    expect(Number(takerAtaAccountBalanceA)).to.equal(amount.toNumber());
    expect(Number(takerAtaAccountBalanceB)).to.equal(500 - receive.toNumber());
    expect(Number(makeAtaAccountBalanceA)).to.equal(500 - amount.toNumber());
    expect(Number(makerAtaAccountBalanceB)).to.equal(receive.toNumber());
    console.log(`✅ All assertions passed.\n`);
  });

  // it("🔹 Maker refunds back the amount and closes the escrow account", async () => {
  //   const tx = await program.methods
  //     .refund()
  //     .accounts({
  //       //@ts-ignore
  //       maker: provider.publicKey,
  //       escrow: escrow,
  //       mintA: mintA,
  //       vault: vault,
  //       makerAtaA: makerAtaAccountA,
  //       associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();
  // });
});
