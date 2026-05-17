import React from "react";
import type { Product } from "../types";

interface Props {
  product: Product;
  onBuy: (product: Product) => void;
  walletConnected: boolean;
}

export function ProductCard({ product, onBuy, walletConnected }: Props) {
  const stars = "★".repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? "½" : "");

  return (
    <div style={s.card}>
      {/* Book cover */}
      <div style={s.cover}>
        <div style={s.bookIcon}>📖</div>
        <div style={s.pdfBadge}>PDF</div>
      </div>

      <div style={s.body}>
        <div style={s.categoryRow}>
          <span style={s.category}>{product.category}</span>
          <span style={s.pages}>{product.pages} pages</span>
        </div>

        <h3 style={s.name}>{product.name}</h3>
        <p style={s.desc}>{product.description}</p>

        <div style={s.meta}>
          <span style={s.stars}>{stars}</span>
          <span style={s.rating}>{product.rating.toFixed(1)}</span>
          <span style={s.reviews}>({product.reviews} reviews)</span>
        </div>

        <div style={s.footer}>
          <div style={s.priceBlock}>
            <span style={s.price}>${product.price_usd.toFixed(2)}</span>
            <span style={s.currency}>USDC</span>
          </div>
          <button
            style={walletConnected ? s.buyBtn : s.buyBtnDisabled}
            onClick={() => onBuy(product)}
            disabled={!walletConnected}
            title={!walletConnected ? "Connect Pera Wallet to purchase" : ""}
          >
            {walletConnected ? "Buy with USDC" : "Connect wallet"}
          </button>
        </div>

        <div style={s.features}>
          <span style={s.feat}>⚡ Instant delivery</span>
          <span style={s.feat}>🔒 Secure payment</span>
          <span style={s.feat}>♾️ Lifetime access</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.2s, transform 0.2s",
  },
  cover: {
    background: "#13131f",
    height: 140,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderBottom: "1px solid #2a2a35",
  },
  bookIcon: { fontSize: 56 },
  pdfBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "#1a1830",
    color: "#a89ae8",
    border: "1px solid #2d2860",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  body: { padding: "16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  categoryRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  category: {
    background: "#1a1830",
    color: "#a89ae8",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 500,
  },
  pages: { fontSize: 11, color: "#5a5a72" },
  name: { fontSize: 15, fontWeight: 600, color: "#e8e8f0", lineHeight: 1.4 },
  desc: { fontSize: 12, color: "#6a6a82", lineHeight: 1.6, flex: 1 },
  meta: { display: "flex", alignItems: "center", gap: 4 },
  stars: { color: "#f59e0b", fontSize: 12 },
  rating: { fontSize: 12, fontWeight: 600, color: "#e8e8f0" },
  reviews: { fontSize: 11, color: "#5a5a72" },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  priceBlock: { display: "flex", alignItems: "baseline", gap: 4 },
  price: { fontSize: 22, fontWeight: 700, color: "#e8e8f0" },
  currency: { fontSize: 12, color: "#5a5a72" },
  buyBtn: {
    background: "#7c6fcd",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  buyBtnDisabled: {
    background: "#1e1e24",
    color: "#5a5a72",
    border: "1px solid #2a2a35",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "not-allowed",
    whiteSpace: "nowrap" as const,
  },
  features: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  feat: { fontSize: 10, color: "#5a5a72" },
};
