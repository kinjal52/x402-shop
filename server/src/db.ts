import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../shop.db");

export const db = new Database(DB_PATH);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_usd REAL NOT NULL,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      pages INTEGER,
      rating REAL DEFAULT 4.8,
      reviews INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      amount_usdc REAL NOT NULL,
      tx_id TEXT,
      status TEXT DEFAULT 'pending',
      download_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number };
  if (count.c === 0) {
    seedProducts();
  }
}

function seedProducts() {
  const insert = db.prepare(`
    INSERT INTO products (id, name, description, price_usd, category, file_name, pages, rating, reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    [
      "ebook-001",
      "Algorand DeFi Development Guide",
      "A complete 120-page guide covering smart contracts, ASAs, DeFi protocols, and building production dApps on Algorand. Includes 18 real-world code examples and step-by-step tutorials.",
      4.99,
      "eBook",
      "algorand-defi-guide.pdf",
      120,
      4.9,
      142,
    ],
    [
      "ebook-002",
      "Web3 Smart Contract Patterns",
      "Master advanced smart contract design patterns used in production DeFi protocols. Covers security, gas optimization, upgradeability, and auditing with 200+ code snippets.",
      3.99,
      "eBook",
      "web3-smart-contracts.pdf",
      180,
      4.8,
      98,
    ],
    [
      "ebook-003",
      "Crypto Trading Strategies 2025",
      "Evidence-based algorithmic trading strategies for crypto markets. Covers technical analysis, on-chain data signals, portfolio management, and risk frameworks.",
      2.99,
      "eBook",
      "crypto-trading-2025.pdf",
      95,
      4.7,
      213,
    ],
    [
      "ebook-004",
      "Building AI Agents on Blockchain",
      "The definitive guide to building autonomous AI agents that interact with blockchains. Covers x402 agentic payments, MCP integration, and real-world deployment.",
      4.99,
      "eBook",
      "ai-agents-blockchain.pdf",
      240,
      5.0,
      67,
    ],
    [
      "ebook-005",
      "NFT Creator Masterclass",
      "From concept to marketplace — everything you need to create, mint, and sell NFTs. Covers art generation, smart contracts, metadata standards, and marketing.",
      1.99,
      "eBook",
      "nft-creator-masterclass.pdf",
      150,
      4.6,
      178,
    ],
    [
      "ebook-006",
      "Zero Knowledge Proofs Explained",
      "A practical introduction to ZK proofs without heavy math. Learn zk-SNARKs, zk-STARKs, and how to build privacy-preserving apps from scratch.",
      3.49,
      "eBook",
      "zero-knowledge-proofs.pdf",
      130,
      4.9,
      89,
    ],
  ];

  for (const p of products) {
    insert.run(...p);
  }
  console.log("✅ Database seeded with", products.length, "products");
}
