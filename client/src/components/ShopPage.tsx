import React, { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import { PaymentModal } from "./PaymentModal";
import { useX402Payment } from "../hooks/useX402Payment";
import type { Product } from "../types";
import type { PeraWalletConnect } from "@perawallet/connect";

interface Props {
  walletAddress: string | null;
  walletConnected: boolean;
  peraWallet: PeraWalletConnect;
}

export function ShopPage({ walletAddress, walletConnected, peraWallet }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState("All");

  const { purchase, status, error: payError, result, reset } = useX402Payment();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products); setLoading(false); })
      .catch(() => { setError("Failed to load products"); setLoading(false); });
  }, []);

  const handleBuy = (product: Product) => {
    reset();
    setSelectedProduct(product);
  };

  // Pera Wallet signs the USDC transaction — no mnemonic ever needed
  const handleConfirmPayment = () => {
    if (!selectedProduct || !walletAddress) return;
    purchase(selectedProduct.id, walletAddress, peraWallet);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    reset();
  };

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = filter === "All" ? products : products.filter((p) => p.category === filter);

  if (loading) return <div style={s.center}>Loading products…</div>;
  if (error) return <div style={s.center}>{error}</div>;

  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroTag}>⚡ x402 Payments · Algorand Testnet · USDC</div>
        <h1 style={s.heroTitle}>Premium eBooks for Web3 Developers</h1>
        <p style={s.heroSub}>
          Pay instantly with USDC on Algorand. No credit card. No subscription.<br />
          Payments settle in ~2.8 seconds directly to the creator's wallet.
        </p>

        <div style={s.statRow}>
          <div style={s.stat}><span style={s.statVal}>{products.length}</span><span style={s.statLbl}>eBooks</span></div>
          <div style={s.statDiv} />
          <div style={s.stat}><span style={s.statVal}>~2.8s</span><span style={s.statLbl}>Settlement</span></div>
          <div style={s.statDiv} />
          <div style={s.stat}><span style={s.statVal}>$0</span><span style={s.statLbl}>Platform fee</span></div>
          <div style={s.statDiv} />
          <div style={s.stat}><span style={s.statVal}>USDC</span><span style={s.statLbl}>Token</span></div>
        </div>
      </div>

      {/* Filter */}
      <div style={s.filterRow}>
        {categories.map((cat) => (
          <button
            key={cat}
            style={{ ...s.filterBtn, ...(filter === cat ? s.filterActive : {}) }}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
        <span style={s.count}>{filtered.length} products</span>
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onBuy={handleBuy}
            walletConnected={walletConnected}
          />
        ))}
      </div>

      {!walletConnected && (
        <div style={s.connectHint}>
          🦊 Connect your Pera Wallet above to start purchasing with USDC
        </div>
      )}

      {/* Payment modal */}
      {selectedProduct && (
        <PaymentModal
          product={selectedProduct}
          buyerAddress={walletAddress!}
          status={status}
          error={payError}
          result={result}
          onConfirm={handleConfirmPayment}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "32px 24px" },
  center: { textAlign: "center", padding: 80, color: "#5a5a72" },
  hero: {
    textAlign: "center",
    padding: "48px 24px 40px",
    marginBottom: 32,
  },
  heroTag: {
    display: "inline-block",
    background: "#1a1830",
    color: "#a89ae8",
    border: "1px solid #2d2860",
    borderRadius: 20,
    padding: "4px 16px",
    fontSize: 12,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 36, fontWeight: 700, color: "#e8e8f0", marginBottom: 12, lineHeight: 1.3 },
  heroSub: { fontSize: 15, color: "#6a6a82", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 28px" },
  statRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 24 },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontWeight: 700, color: "#a89ae8" },
  statLbl: { fontSize: 11, color: "#5a5a72" },
  statDiv: { width: 1, height: 30, background: "#2a2a35" },
  filterRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 24, flexWrap: "wrap" as const },
  filterBtn: {
    background: "transparent",
    color: "#9090a8",
    border: "1px solid #2a2a35",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  filterActive: { background: "#1a1830", color: "#a89ae8", border: "1px solid #2d2860" },
  count: { marginLeft: "auto", fontSize: 12, color: "#5a5a72" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 20,
  },
  connectHint: {
    textAlign: "center",
    marginTop: 32,
    padding: 16,
    background: "#1a1830",
    border: "1px solid #2d2860",
    borderRadius: 12,
    fontSize: 14,
    color: "#a89ae8",
  },
};
