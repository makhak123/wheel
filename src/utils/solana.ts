import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js"
import bs58 from "bs58"
import { config } from "./config.js"

let connection: Connection | null = null
let wallet: Keypair | null = null

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.solanaRpcUrl, "confirmed")
  }
  return connection
}

export function getWallet(): Keypair {
  if (!wallet) {
    const secretKey = bs58.decode(config.walletPrivateKey)
    wallet = Keypair.fromSecretKey(secretKey)
  }
  return wallet
}

export function getPublicKey(): string {
  return getWallet().publicKey.toBase58()
}

export async function signAndSendTransaction(serializedTx: string): Promise<string> {
  const conn = getConnection()
  const keypair = getWallet()

  // Decode the base58 serialized transaction
  const txBuffer = bs58.decode(serializedTx)
  const transaction = Transaction.from(txBuffer)

  // Sign and send
  const signature = await sendAndConfirmTransaction(conn, transaction, [keypair], {
    commitment: "confirmed",
  })

  return signature
}

export async function getBalance(): Promise<number> {
  const conn = getConnection()
  const balance = await conn.getBalance(getWallet().publicKey)
  return balance / 1e9 // Convert lamports to SOL
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1e9
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9)
}
