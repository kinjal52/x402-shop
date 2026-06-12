import React, { useEffect, useState } from "react";
import type { Order } from "../types";

async function triggerDownload(token: string, productName: string) {
  try {
    const res = await fetch(`/api/download/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" })) as any;
      alert(err.error || "Download failed. Token may be invalid.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert("Download failed. Please try again.");
  }
}

interface Props {
  walletAddress: string;
}

export function BooksPage({ walletAddress }: Props) {
  const [books, setBooks] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${walletAddress}`)
      .then((r) => r.json())
      .then((d) => { setBooks(d.orders); setLoading(false); })
      .catch(() => setLoading(false));
  }, [walletAddress]);

  if (loading) return <div style={s.center}>Loading your books…</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>My Books</h2>
        <div style={s.count}>{books.length} book{books.length !== 1 ? "s" : ""} purchased</div>
      </div>

      {books.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📚</div>
          <div style={s.emptyText}>No books yet</div>
          <div style={s.emptySub}>Purchased books will appear here</div>
        </div>
      ) : (
        <div style={s.grid}>
          {books.map((book) => (
            <div key={book.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cover}>📖</div>
                <div style={s.bookName}>{book.product_name}</div>
                <div style={s.category}>{book.category}</div>
              </div>
              <div style={s.cardBottom}>
                <div>
                  <div style={s.priceLabel}>Paid</div>
                  <div style={s.price}>${book.amount_usdc.toFixed(2)}</div>
                  <div style={s.currency}>USDC</div>
                </div>
                <button
                  style={s.dlBtn}
                  onClick={() => triggerDownload(book.download_token, book.product_name)}
                >
                  📥 Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.note}>
        All payments settled on Algorand Testnet via x402 · USDC (ASA 10458941)
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: "0 auto", padding: "32px 24px" },
  center: { textAlign: "center", padding: 80, color: "#5a5a72" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 600, color: "#e8e8f0" },
  count: { fontSize: 13, color: "#5a5a72" },
  empty: {
    textAlign: "center",
    padding: 80,
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: 16,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 500, color: "#9090a8", marginBottom: 8 },
  emptySub: { fontSize: 13, color: "#5a5a72" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardTop: {
    padding: 20,
    textAlign: "center",
    borderBottom: "1px solid #2a2a35",
  },
  cover: { fontSize: 40, marginBottom: 12 },
  bookName: { fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 6 },
  category: {
    display: "inline-block",
    background: "#1a1830",
    color: "#a89ae8",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
  },
  cardBottom: {
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flex: 1,
  },
  priceLabel: { fontSize: 11, color: "#5a5a72", marginBottom: 2 },
  price: { fontSize: 20, fontWeight: 700, color: "#e8e8f0" },
  currency: { fontSize: 11, color: "#5a5a72" },
  dlBtn: {
    background: "#1a1830",
    color: "#a89ae8",
    border: "1px solid #2d2860",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    cursor: "pointer",
  },
  note: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 11,
    color: "#3a3a4a",
  },
};
