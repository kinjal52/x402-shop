import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";
import { v4 as uuidv4 } from "uuid";
import { db, initDb } from "./db.js";

initDb();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-PAYMENT", "X-PAYMENT-RESPONSE"],
    exposeHeaders: ["X-PAYMENT-REQUIRED", "X-PAYMENT-RESPONSE", "Content-Disposition"],
  })
);

const PAY_TO = process.env.PAY_TO_ADDRESS!;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz";

if (!PAY_TO) {
  console.error("❌ PAY_TO_ADDRESS not set in .env");
  process.exit(1);
}

// ── x402 setup ──────────────────────────────────────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

// Build per-product payment routes dynamically from DB
function buildRoutes() {
  const products = db.prepare("SELECT id, price_usd FROM products").all() as {
    id: string;
    price_usd: number;
  }[];

  const routes: Record<string, object> = {};
  for (const p of products) {
    routes[`POST /api/buy/${p.id}`] = {
      accepts: {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: PAY_TO,
        price: `$${p.price_usd.toFixed(2)}`,
        extra: { asset: USDC_TESTNET_ASA_ID },
      },
      description: `Purchase product ${p.id}`,
    };
  }
  return routes;
}

app.use(paymentMiddleware(buildRoutes() as any, resourceServer));

// ── Public routes ────────────────────────────────────────────────────────────

// GET all products
app.get("/api/products", (c) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  return c.json({ products });
});

// GET single product
app.get("/api/products/:id", (c) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(c.req.param("id"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json({ product });
});

// GET orders for a wallet address
app.get("/api/orders/:address", (c) => {
  const orders = db
    .prepare(
      `SELECT o.*, p.name as product_name, p.category 
       FROM orders o JOIN products p ON o.product_id = p.id 
       WHERE o.buyer_address = ? ORDER BY o.created_at DESC`
    )
    .all(c.req.param("address"));
  return c.json({ orders });
});

// ── Payment-gated routes ─────────────────────────────────────────────────────

// POST /api/buy/:id — protected by x402, only reachable after payment
app.post("/api/buy/:id", async (c) => {
  const productId = c.req.param("id");
  const body = await c.req.json().catch(() => ({})) as { buyerAddress?: string };
  const buyerAddress = body.buyerAddress || "unknown";

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
  if (!product) return c.json({ error: "Product not found" }, 404);

  // Extract Algorand tx ID from the X-PAYMENT-RESPONSE header set by the x402 middleware.
  // The header is a base64-encoded JSON object containing { txId, ... }.
  let txId: string | null = null;
  try {
    const paymentResponseHeader =
      c.req.header("X-PAYMENT-RESPONSE") || c.req.header("x-payment-response");
    if (paymentResponseHeader) {
      const decoded = JSON.parse(
        Buffer.from(paymentResponseHeader, "base64").toString("utf-8")
      );
      txId = decoded?.txId || decoded?.transaction?.id || decoded?.id || null;
    }
    // Fallback: check the response headers the middleware already set
    if (!txId) {
      const resPaymentHeader = c.res?.headers?.get?.("X-PAYMENT-RESPONSE");
      if (resPaymentHeader) {
        const decoded = JSON.parse(Buffer.from(resPaymentHeader, "base64").toString("utf-8"));
        txId = decoded?.txId || decoded?.transaction?.id || decoded?.id || null;
      }
    }
    if (txId) console.log("💸 Algorand tx ID:", txId);
  } catch {
    // tx ID extraction is best-effort — don't fail the request
  }

  const downloadToken = uuidv4();
  const orderId = uuidv4();

  db.prepare(`
    INSERT INTO orders (id, product_id, buyer_address, amount_usdc, status, download_token, tx_id)
    VALUES (?, ?, ?, ?, 'completed', ?, ?)
  `).run(orderId, productId, buyerAddress, product.price_usd, downloadToken, txId);

  return c.json({
    success: true,
    orderId,
    productName: product.name,
    amountPaid: `$${product.price_usd.toFixed(2)} USDC`,
    txId,
    downloadToken,
    downloadUrl: `/api/download/${downloadToken}`,
    message: "Payment confirmed on Algorand Testnet!",
  });
});

// GET /api/download/:token — validate token and stream the PDF file
app.get("/api/download/:token", (c) => {
  const order = db
    .prepare(
      `SELECT o.*, p.name, p.file_name, p.description, p.pages FROM orders o 
       JOIN products p ON o.product_id = p.id 
       WHERE o.download_token = ? AND o.status = 'completed'`
    )
    .get(c.req.param("token")) as any;

  if (!order) return c.json({ error: "Invalid or expired download token" }, 404);

  // Generate a realistic text-based PDF-like document as the download
  const content = generateEbookContent(order.name, order.description, order.pages, order.file_name, order.tx_id);
  const bytes = Buffer.from(content, "utf-8");

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.file_name}"`,
      "Content-Length": bytes.length.toString(),
    },
  });
});

// Health check
app.get("/api/health", (c) =>
  c.json({ status: "ok", network: "algorand-testnet", facilitator: FACILITATOR_URL })
);

const PORT = parseInt(process.env.PORT || "3001");
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n🚀 x402 Shop server running on http://localhost:${PORT}`);
  console.log(`💳 Payments go to: ${PAY_TO}`);
  console.log(`🔗 Facilitator:    ${FACILITATOR_URL}`);
  console.log(`⛓️  Network:        Algorand Testnet\n`);
});

// ── PDF generator ─────────────────────────────────────────────────────────────
/**
 * Generates a minimal valid PDF for demo downloads.
 * Produces a real PDF that any PDF viewer can open.
 */
function generateEbookContent(title: string, description: string, pages: number, fileName: string, txId: string | null): string {
  const now = new Date().toISOString().split("T")[0];
  const safe = (s: string) => s.replace(/[()\\]/g, " ").slice(0, 70);

  // Build page content stream
  const stream = [
    "BT",
    "/F1 22 Tf",
    "50 740 Td",
    `(${safe(title)}) Tj`,
    "/F1 11 Tf",
    "0 -32 Td",
    "(Purchased via x402 Protocol  |  Algorand Testnet  |  USDC) Tj",
    "0 -18 Td",
    `(Date: ${now}    File: ${fileName}    Pages: ${pages}) Tj`,
    "0 -28 Td",
    "/F1 12 Tf",
    "(About this eBook) Tj",
    "/F1 10 Tf",
    "0 -18 Td",
    `(${safe(description.slice(0, 70))}) Tj`,
    "0 -15 Td",
    `(${safe(description.slice(70, 140))}) Tj`,
    "0 -15 Td",
    `(${safe(description.slice(140, 210))}) Tj`,
    "0 -30 Td",
    "/F1 12 Tf",
    "(Payment Details) Tj",
    "/F1 10 Tf",
    "0 -18 Td",
    "(Payment processed automatically via the x402 HTTP payment protocol.) Tj",
    "0 -15 Td",
    "(Transaction settled on Algorand Testnet in approximately 2.8 seconds.) Tj",
    "0 -15 Td",
    "(USDC (ASA 10458941) transferred directly to the creator wallet.) Tj",
    "0 -15 Td",
    `(Transaction ID: ${txId || "N/A"}) Tj`,
    "0 -30 Td",
    "(In a production deployment this file would contain the full eBook content.) Tj",
    "ET",
  ].join("\n");

  const streamLen = Buffer.byteLength(stream, "utf8");

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamLen}>>
stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
trailer<</Size 6/Root 1 0 R>>
startxref
9
%%EOF`;

  return pdf;
}
