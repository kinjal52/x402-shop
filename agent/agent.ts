import "dotenv/config";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { toClientAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";

const SHOP_URL = process.env.SHOP_URL || "http://localhost:3001";
const AGENT_MNEMONIC = process.env.AGENT_MNEMONIC!;
const AGENT_BUDGET = parseFloat(process.env.AGENT_BUDGET || "50");

// ── Setup agent wallet & x402 client ─────────────────────────────────────────

function createAgentFetch() {
  // Convert mnemonic → base64 private key (same fix as your useX402Payment.ts)
  const account = algosdk.mnemonicToSecretKey(AGENT_MNEMONIC.trim());
  const base64Key = Buffer.from(account.sk).toString("base64");

  const signer = toClientAvmSigner(base64Key);
  const client = new x402Client();
  registerExactAvmScheme(client, { signer });

  // This fetch auto-pays any 402 it receives — no human needed
  return wrapFetchWithPayment(fetch, client);
}

// ── Agent logic ───────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price_usd: number;
  category: string;
  pages: number;
  rating: number;
}

async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${SHOP_URL}/api/products`);
  const data = await res.json() as { products: Product[] };
  return data.products;
}

function decideWhatToBuy(products: Product[], budget: number): Product[] {
  // Agent's buying logic — customize this however you want
  // This agent buys:
  // 1. Only books rated 4.8 or above
  // 2. Only if price fits within budget
  // 3. Sorted by rating — best first

  let remaining = budget;
  const toBuy: Product[] = [];

  const sorted = [...products]
    .filter(p => p.rating >= 4.8)
    .sort((a, b) => b.rating - a.rating);

  for (const product of sorted) {
    if (product.price_usd <= remaining) {
      toBuy.push(product);
      remaining -= product.price_usd;
      console.log(`🤖 Agent decided to buy: ${product.name} ($${product.price_usd})`);
    }
  }

  console.log(`💰 Total spend: $${(budget - remaining).toFixed(2)} USDC`);
  return toBuy;
}

async function buyProduct(
  fetchWithPayment: typeof fetch,
  product: Product,
  agentAddress: string
) {
  console.log(`\n📤 Buying: ${product.name} — $${product.price_usd} USDC`);
  console.log(`   Calling POST ${SHOP_URL}/api/buy/${product.id}`);

  try {
    // This single line handles the ENTIRE x402 payment flow:
    // 1. Makes the request
    // 2. Gets 402 back
    // 3. Signs USDC transaction automatically
    // 4. Sends to facilitator for verification
    // 5. Retries with payment proof
    // 6. Gets 200 back with download token
    // NO HUMAN INVOLVEMENT AT ANY STEP
    const response = await fetchWithPayment(
      `${SHOP_URL}/api/buy/${product.id}`,
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

    const result = await response.json() as {
      orderId: string;
      productName: string;
      amountPaid: string;
      downloadToken: string;
      downloadUrl: string;
    };

    console.log(`✅ Payment confirmed on Algorand Testnet!`);
    console.log(`   Order ID:       ${result.orderId}`);
    console.log(`   Amount paid:    ${result.amountPaid}`);
    console.log(`   Download token: ${result.downloadToken}`);

    return result;

  } catch (err: any) {
    console.error(`❌ Failed to buy ${product.name}: ${err.message}`);
    return null;
  }
}

// ── Main agent loop ───────────────────────────────────────────────────────────

async function runAgent() {
  console.log("🤖 x402 AI Agent starting...");
  console.log(`🏪 Shop: ${SHOP_URL}`);
  console.log(`💵 Budget: $${AGENT_BUDGET} USDC\n`);

  // Get agent wallet address from mnemonic
  const account = algosdk.mnemonicToSecretKey(AGENT_MNEMONIC.trim());
  const agentAddress = account.addr.toString();
  console.log(`👛 Agent wallet: ${agentAddress}\n`);

  // Create payment-enabled fetch
  const fetchWithPayment = createAgentFetch();

  // Step 1 — browse the shop
  console.log("📚 Browsing shop products...");
  const products = await getProducts();
  console.log(`   Found ${products.length} products\n`);

  // Step 2 — agent decides what to buy
  const toBuy = decideWhatToBuy(products, AGENT_BUDGET);

  if (toBuy.length === 0) {
    console.log("🤔 Agent decided not to buy anything.");
    return;
  }

  // Step 3 — agent buys each product automatically
  console.log(`\n🛒 Agent will buy ${toBuy.length} products autonomously...\n`);

  const purchased = [];
  for (const product of toBuy) {
    const result = await buyProduct(fetchWithPayment, product, agentAddress);
    if (result) purchased.push(result);

    // Small delay between purchases
    await new Promise(r => setTimeout(r, 1000));
  }

  // Step 4 — summary
  console.log("\n" + "=".repeat(50));
  console.log("🤖 Agent run complete!");
  console.log(`✅ Successfully purchased: ${purchased.length} eBooks`);
  console.log(`📥 Download tokens saved:`);
  purchased.forEach(p => {
    console.log(`   ${p.productName}: ${p.downloadToken}`);
  });
  console.log("=".repeat(50));
}

runAgent().catch(console.error);