import { useState } from "react";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import algosdk from "algosdk";
import type { PeraWalletConnect } from "@perawallet/connect";
import type { PurchaseResult } from "../types";

export type PaymentStatus =
  | "idle"
  | "waiting_wallet"
  | "signing"
  | "verifying"
  | "settling"
  | "done"
  | "error";

interface UseX402PaymentOptions {
  onSuccess?: (result: PurchaseResult) => void;
  onError?: (error: string) => void;
}

export function useX402Payment(opts?: UseX402PaymentOptions) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);

  /**
   * purchase — initiates the x402 payment flow using Pera Wallet.
   *
   * The flow:
   *  1. User clicks "Pay" → Pera Wallet QR/deeplink opens automatically when
   *     the x402 client calls our signer with the unsigned transaction bytes.
   *  2. User approves in Pera Wallet app on their phone.
   *  3. Signed tx is submitted; facilitator verifies it on Algorand Testnet.
   *  4. Server responds 200 with the order confirmation.
   */
  const purchase = async (
    productId: string,
    buyerAddress: string,
    peraWallet: PeraWalletConnect
  ) => {
    setStatus("idle");
    setError(null);
    setResult(null);

    try {
      setStatus("waiting_wallet");
      await sleep(300);

      // ── Pre-flight: verify USDC opt-in and balance ───────────────────────
      const USDC_ASA_ID = 10458941;
      const ALGOD_TESTNET = "https://testnet-api.algonode.cloud";
      try {
        const acctRes = await fetch(`${ALGOD_TESTNET}/v2/accounts/${buyerAddress}`);
        const acctData = await acctRes.json() as any;
        // AlgoNode v2 API returns assets at the root level, not nested under .account
        const assets: any[] = acctData?.assets ?? acctData?.account?.assets ?? [];
        console.log("[x402] Account assets:", assets);
        const usdcAsset = assets.find((a: any) => a["asset-id"] === USDC_ASA_ID);

        if (!usdcAsset) {
          throw new Error(
            "Your wallet is not opted-in to USDC (ASA 10458941) on Algorand Testnet.\n" +
            "Please opt-in to USDC in your Pera Wallet first, then get some testnet USDC from the Pera Wallet app or a faucet."
          );
        }

        // USDC has 6 decimals; price is in dollars ($7.99 → 7_990_000 micro-USDC)
        const usdcBalance = usdcAsset.amount as number;
        console.log(`[x402] USDC balance: ${(usdcBalance / 1e6).toFixed(6)} USDC`);
        if (usdcBalance < 1_000_000) {
          throw new Error(
            `Insufficient USDC balance. You have ${(usdcBalance / 1e6).toFixed(2)} USDC on testnet.\n` +
            "Get testnet USDC from the Pera Wallet app or a dispenser."
          );
        }
      } catch (e: any) {
        // Only rethrow our own errors (opt-in/balance checks), not network errors
        if (e.message?.includes("opted-in") || e.message?.includes("Insufficient")) throw e;
        console.warn("[x402] Pre-flight check failed (network issue), proceeding:", e.message);
      }
      // ─────────────────────────────────────────────────────────────────────

      // Build an AVM-compatible signer backed by Pera Wallet.
      // When called, it opens Pera's sign prompt (QR or deeplink).
      const signer = buildPeraSigner(buyerAddress, peraWallet);

      const client = new x402Client();
      registerExactAvmScheme(client, { signer });

      // Use relative URL — goes through Vite proxy to avoid CORS issues with raw 402 responses
      const fetchWithPayment = wrapFetchWithPayment(fetch, client) as typeof fetch;

      setStatus("signing");
      console.log("[x402] Starting payment for product", productId, "buyer:", buyerAddress);

      const response = await fetchWithPayment(
        `/api/buy/${productId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerAddress }),
        }
      );

      console.log("[x402] Final response status:", response.status);
      console.log("[x402] Final response headers:", Object.fromEntries(response.headers.entries()));

      setStatus("verifying");
      await sleep(400);

      if (!response.ok) {
        // Clone to read body safely
        const responseClone = response.clone();
        let bodyText = "";
        try { bodyText = await responseClone.text(); } catch {}
        console.error("[x402] Payment rejected. Status:", response.status, "Body:", bodyText);

        // Try to extract a meaningful error message
        let errMsg = `Payment rejected by server (HTTP ${response.status})`;
        if (bodyText) {
          try {
            const parsed = JSON.parse(bodyText);
            const detail = parsed?.error || parsed?.message || parsed?.reason
              || parsed?.details || JSON.stringify(parsed);
            if (detail && detail !== "{}") errMsg = detail;
          } catch {
            if (bodyText.trim()) errMsg = bodyText.trim();
          }
        }

        // Also check X-PAYMENT-RESPONSE header for facilitator error details
        const paymentResponse = response.headers.get("X-PAYMENT-RESPONSE") || response.headers.get("PAYMENT-RESPONSE");
        if (paymentResponse) {
          try {
            const pr = JSON.parse(atob(paymentResponse));
            console.error("[x402] Facilitator response:", pr);
            if (pr?.error) errMsg = `Facilitator error: ${pr.error}`;
          } catch {}
        }

        throw new Error(errMsg);
      }

      setStatus("settling");
      await sleep(600);

      const data = (await response.json()) as PurchaseResult;
      setResult(data);
      setStatus("done");
      opts?.onSuccess?.(data);
    } catch (e: any) {
      // Pera Wallet modal closed by user
      if (e?.data?.type === "SIGN_TRANSACTIONS_CANCELLED" || e?.message?.includes("cancelled")) {
        setError("Transaction signing was cancelled.");
      } else {
        setError(e?.message || "Payment failed");
      }
      setStatus("error");
      opts?.onError?.(e?.message || "Payment failed");
    }
  };

  const reset = () => {
    setStatus("idle");
    setError(null);
    setResult(null);
  };

  return { purchase, status, error, result, reset };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * buildPeraSigner — returns a ClientAvmSigner backed by Pera Wallet.
 *
 * The ClientAvmSigner interface (from @x402-avm/avm) requires:
 *   signTransactions(txns: Uint8Array[], indexesToSign?: number[]): Promise<(Uint8Array | null)[]>
 *
 * Key facts about Pera's signTransaction:
 *  - SignerTransaction.txn must be an algosdk.Transaction object (not raw bytes)
 *  - signers: [] means "skip this tx" (signed by someone else in the group)
 *  - Returns a FLAT array of only the signed Uint8Arrays (no nulls for skipped slots)
 *    so we must track a separate index into signedResults.
 */
function buildPeraSigner(address: string, peraWallet: PeraWalletConnect) {
  return {
    address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[]
    ): Promise<(Uint8Array | null)[]> => {
      // Which indexes this client needs to sign (default: all)
      const toSign = indexesToSign ?? txns.map((_, i) => i);
      const toSignSet = new Set(toSign);

      // Decode raw bytes → algosdk.Transaction objects that Pera expects
      // signers: [address] = sign this tx; signers: [] = skip (fee payer slot, etc.)
      const txnGroup: { txn: ReturnType<typeof algosdk.decodeUnsignedTransaction>; signers: string[] }[] = txns.map(
        (txnBytes, i) => ({
          txn: algosdk.decodeUnsignedTransaction(txnBytes),
          signers: toSignSet.has(i) ? [address] : [],
        })
      );

      // Send entire group to Pera in ONE call → single approval prompt
      // Pera returns a FLAT array of only the signed txns (skipped slots omitted)
      const peraResults = await peraWallet.signTransaction([txnGroup]);

      // Reassemble into the full-length result array expected by x402-avm.
      // Iterate through results only for positions that were signed.
      let signedIdx = 0;
      return txns.map((_, i) => {
        if (toSignSet.has(i)) {
          const signed = peraResults[signedIdx++] ?? null;
          return signed;
        }
        return null;
      });
    },
  };
}
