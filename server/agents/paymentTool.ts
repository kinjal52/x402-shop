import { toClientAvmSigner } from "@x402-avm/avm";
import { x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { wrapFetchWithPayment } from "@x402-avm/fetch";
import algosdk from "algosdk";

// Note: Ensure this environment variable is verified during startup
const mnemonic = process.env.AGENT_MNEMONIC || "";
const account = mnemonic ? algosdk.mnemonicToSecretKey(mnemonic.trim()) : null;

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
  }
};
