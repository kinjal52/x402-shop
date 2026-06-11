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

  batchExecute: async ({ productIds, totalCost }: { productIds: string[]; totalCost: number }) => {
    if (!account) throw new Error("Agent wallet not configured on backend.");

    const payToAddress = getPayToAddress();
    if (!payToAddress) throw new Error("PAY_TO_ADDRESS not set.");
    if (productIds.length === 0) throw new Error("No products selected.");

    const microAmount = Math.round(totalCost * 1_000_000);
    if (microAmount <= 0) throw new Error("Invalid total cost.");

    console.log(`[AUDIT] Batch executing payment for ${productIds.length} products, total: ${totalCost} USDC`);

    const algodClient = new algosdk.Algodv2("", ALGOD_TESTNET);
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
