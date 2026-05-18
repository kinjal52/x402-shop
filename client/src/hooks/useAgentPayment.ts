import { useState, useCallback } from "react";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { toClientAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";
import type { Product } from "../types";

export interface AgentLog {
  id: number;
  type: "info" | "success" | "error" | "thinking" | "paying";
  message: string;
}

export interface AgentPurchase {
  productName: string;
  amountPaid: string;
  downloadToken: string;
  orderId: string;
}

export type AgentStatus = "idle" | "running" | "done" | "error";

export function useAgentPayment() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [purchases, setPurchases] = useState<AgentPurchase[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  const addLog = (type: AgentLog["type"], message: string) => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, message }]);
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runAgent = useCallback(async (allProducts: Product[]) => {
    setStatus("running");
    setLogs([]);
    setPurchases([]);
    setTotalSpent(0);

    const mnemonic = import.meta.env.VITE_AGENT_MNEMONIC as string;
    const budget = parseFloat(import.meta.env.VITE_AGENT_BUDGET || "50");

    if (!mnemonic) {
      addLog("error", "VITE_AGENT_MNEMONIC not set in client/.env");
      setStatus("error");
      return;
    }

    try {
      // Setup agent wallet
      addLog("info", "🤖 AI Agent initializing...");
      await sleep(500);

      const account = algosdk.mnemonicToSecretKey(mnemonic.trim());
      const agentAddress = account.addr.toString();
      const base64Key = btoa(Array.from(account.sk).map(b => String.fromCharCode(b)).join(""));
      addLog("info", `👛 Agent wallet: ${agentAddress.slice(0, 8)}...${agentAddress.slice(-6)}`);
      addLog("info", `💵 Budget: $${budget.toFixed(2)} USDC`);
      await sleep(600);

      // Setup x402 fetch
      const signer = toClientAvmSigner(base64Key);
      const client = new x402Client();
      registerExactAvmScheme(client, { signer });
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      // Agent decides what to buy
      addLog("thinking", "🤔 Analyzing products...");
      await sleep(800);

      let remaining = budget;
      const toBuy: Product[] = [];

      const sorted = [...allProducts]
        .filter(p => p.rating >= 4.8)
        .sort((a, b) => b.rating - a.rating);

      for (const product of sorted) {
        if (product.price_usd <= remaining) {
          toBuy.push(product);
          remaining -= product.price_usd;
          addLog("thinking", `   → Selected: ${product.name} ($${product.price_usd})`);
          await sleep(300);
        }
      }

      if (toBuy.length === 0) {
        addLog("info", "🤔 No products match agent criteria.");
        setStatus("done");
        return;
      }

      addLog("info", `\n🛒 Agent will buy ${toBuy.length} product(s) autonomously`);
      await sleep(600);

      // Buy each product
      const purchased: AgentPurchase[] = [];
      let spent = 0;

      for (const product of toBuy) {
        addLog("paying", `\n📤 Buying: ${product.name} — $${product.price_usd} USDC`);
        await sleep(400);

        addLog("paying", `   ⚡ Sending request...`);
        await sleep(300);

        addLog("paying", `   ⚡ Got HTTP 402 — auto-signing USDC transaction...`);
        await sleep(400);

        addLog("paying", `   ⚡ Sending to GoPlausible facilitator...`);

        try {
          const response = await (fetchWithPayment as typeof fetch)(
            `/api/buy/${product.id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ buyerAddress: agentAddress }),
            }
          );

          if (!response.ok) {
            const err = await response.json() as any;
            throw new Error(err.error || "Purchase failed");
          }

          const result = await response.json() as AgentPurchase & {
            message: string;
            downloadUrl: string;
          };

          const purchase: AgentPurchase = {
            productName: product.name,
            amountPaid: result.amountPaid || `$${product.price_usd.toFixed(2)} USDC`,
            downloadToken: result.downloadToken,
            orderId: result.orderId,
          };

          purchased.push(purchase);
          spent += product.price_usd;

          addLog("success", `   ✅ Confirmed on Algorand Testnet!`);
          addLog("success", `   📥 Token: ${result.downloadToken.slice(0, 16)}...`);

          setPurchases([...purchased]);
          setTotalSpent(spent);

          await sleep(800);
        } catch (err: any) {
          addLog("error", `   ❌ Failed: ${err.message}`);
          await sleep(500);
        }
      }

      addLog("info", `\n${"─".repeat(40)}`);
      addLog("success", `🎉 Agent run complete!`);
      addLog("success", `✅ Purchased: ${purchased.length} eBook(s)`);
      addLog("success", `💰 Total spent: $${spent.toFixed(2)} USDC`);

      setStatus("done");

    } catch (err: any) {
      addLog("error", `❌ Agent error: ${err.message}`);
      setStatus("error");
    }
  }, []);

  const reset = () => {
    setStatus("idle");
    setLogs([]);
    setPurchases([]);
    setTotalSpent(0);
  };

  return { runAgent, status, logs, purchases, totalSpent, reset };
}