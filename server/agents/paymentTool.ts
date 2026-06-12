import { toClientAvmSigner } from "@x402-avm/avm";
import { x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { wrapFetchWithPayment } from "@x402-avm/fetch";
import algosdk from "algosdk";

const ALGOD_TESTNET = "https://testnet-api.algonode.cloud";
const USDC_ASA_ID = 10458941;

const mnemonic = process.env.AGENT_MNEMONIC || "";
const account = mnemonic ? algosdk.mnemonicToSecretKey(mnemonic.trim()) : null;

function getPayToAddress(): string {
  return process.env.PAY_TO_ADDRESS || "";
}

export function getAgentAddress(): string {
  if (!account) throw new Error("Agent wallet not configured on backend.");
  return String(account.addr);
}

const algodClient = new algosdk.Algodv2("", ALGOD_TESTNET);

async function getUsdcBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`${ALGOD_TESTNET}/v2/accounts/${address}`);
    if (!res.ok) return 0;
    const data = await res.json() as any;
    const assets = data.assets || data.account?.assets || [];
    const usdcAsset = assets.find((a: any) => a["asset-id"] === USDC_ASA_ID);
    return usdcAsset ? (usdcAsset.amount / 1_000_000) : 0;
  } catch {
    return 0;
  }
}

export const paymentTool = {
  name: "executeX402Payment",
  description: "Executes an autonomous x402 payment on Algorand for a specific product ID.",
  execute: async ({ productId }: { productId: string }) => {
    if (!account) throw new Error("Agent wallet not configured on backend.");

    const base64Key = Buffer.from(account.sk).toString("base64");
    const signer = toClientAvmSigner(base64Key);
    const client = new x402Client();
    registerExactAvmScheme(client, { signer });
    
    const fetchWithPayment = wrapFetchWithPayment(fetch, client) as typeof fetch;

    console.log(`[AUDIT] Executing x402 payment for product: ${productId}`);
    
    // Call the local server route using an absolute path (since we are on the backend now)
    const port = process.env.PORT || 3001;
    const response = await fetchWithPayment(`http://127.0.0.1:${port}/api/buy/${productId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerAddress: account.addr.toString() }),
    });

    if (!response.ok) throw new Error(`Payment failed with status ${response.status}`);
    
    const data = await response.json() as any;
    console.log(`[AUDIT] Success. TxId: ${data.tx_id}`);
    return { success: true, txId: data.tx_id };
  },

  batchExecute: async ({ products, totalCost }: { products: { id: string; name: string; price_usd: number }[]; totalCost: number }) => {
    if (!account) throw new Error("Agent wallet not configured on backend.");

    const payToAddress = getPayToAddress();
    if (!payToAddress) throw new Error("PAY_TO_ADDRESS not set.");
    if (!products || products.length === 0) throw new Error("No products selected.");

    const microAmount = Math.round(totalCost * 1_000_000);
    if (microAmount <= 0) throw new Error("Invalid total cost.");

    const balance = await getUsdcBalance(String(account.addr));
    if (balance < totalCost) {
      const bookList = products.map(p => `"${p.name}" ($${p.price_usd.toFixed(2)} USDC)`).join(", ");
      throw new Error(
        `Insufficient balance to complete this purchase. ${products.length === 1 ? "This book costs" : "These books cost"} approximately ${bookList} totaling $${totalCost.toFixed(2)} USDC, but your wallet currently holds ${balance.toFixed(2)} USDC. Please add more USDC to your wallet and try again.`
      );
    }

    console.log(`[AUDIT] Batch executing payment for ${products.length} books, total: ${totalCost} USDC (balance: ${balance} USDC)`);

    const suggestedParams = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: payToAddress,
      amount: microAmount,
      assetIndex: USDC_ASA_ID,
      suggestedParams,
    });

    const signedTxn = txn.signTxn(account.sk);
    let txid;
    try {
      const result = await algodClient.sendRawTransaction(signedTxn).do();
      txid = result.txid;
      console.log(`[AUDIT] Transaction broadcast. TxId: ${txid}`);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("below min")) {
        throw new Error(
          `Agent wallet (${account.addr}) has insufficient ALGO to cover the transaction fee. ` +
          `Current balance cannot sustain the minimum balance requirement (account holds ${msg.match(/\((\d+) assets\)/)?.[1] || "multiple"} assets). ` +
          `Please add at least 0.01 test ALGO to the agent wallet from the Pera Wallet app or a TestNet faucet.`
        );
      }
      throw new Error(`Failed to broadcast transaction: ${msg}`);
    }

    await algosdk.waitForConfirmation(algodClient, txid, 4);
    console.log(`[AUDIT] Transaction confirmed. TxId: ${txid}`);

    return { success: true, txId: txid, buyerAddress: account.addr };
  }
};
