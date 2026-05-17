import React, { useEffect, useState } from "react";
import type { Order } from "../types";

/** Fetches the PDF from the server and triggers a browser file download. */
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

export function OrdersPage({ walletAddress }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${walletAddress}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders); setLoading(false); })
      .catch(() => setLoading(false));
  }, [walletAddress]);

  if (loading) return <div style={s.center}>Loading orders…</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>My Orders</h2>
        <div style={s.addr}>
          {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📭</div>
          <div style={s.emptyText}>No purchases yet</div>
          <div style={s.emptySub}>Your completed orders will appear here after payment</div>
        </div>
      ) : (
        <div style={s.list}>
          {orders.map((order) => (
            <div key={order.id} style={s.card}>
              <div style={s.cardLeft}>
                <div style={s.bookIcon}>📖</div>
              </div>
              <div style={s.cardBody}>
                <div style={s.productName}>{order.product_name}</div>
                <div style={s.meta}>
                  <span style={s.category}>{order.category}</span>
                  <span style={s.date}>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.orderId}>Order {order.id.slice(0, 12)}…</div>
                {order.tx_id && (
                  <div style={s.txId}>
                    Tx: <a href={`https://lora.algokit.io/testnet/transaction/${order.tx_id}`} target="_blank" rel="noreferrer" style={{ color: "#22c55e", textDecoration: "none" }}>{order.tx_id.slice(0, 16)}…</a>
                  </div>
                )}
              </div>
              <div style={s.cardRight}>
                <div style={s.amount}>${order.amount_usdc.toFixed(2)}</div>
                <div style={s.currency}>USDC</div>
                <div style={s.status}>✅ {order.status}</div>
                <button
                  style={s.dlBtn}
                  onClick={() => triggerDownload(order.download_token, order.product_name)}
                >
                  📥 Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.networkNote}>
        All payments settled on Algorand Testnet via x402 · USDC (ASA 10458941)
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: "0 auto", padding: "32px 24px" },
  center: { textAlign: "center", padding: 80, color: "#5a5a72" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 600, color: "#e8e8f0" },
  addr: {
    background: "#0f2a1a",
    color: "#22c55e",
    border: "1px solid #1a4a2a",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 12,
    fontFamily: "monospace",
  },
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
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  cardLeft: {
    width: 48,
    height: 48,
    background: "#13131f",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookIcon: { fontSize: 24 },
  cardBody: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  productName: { fontSize: 14, fontWeight: 500, color: "#e8e8f0" },
  meta: { display: "flex", gap: 8, alignItems: "center" },
  category: {
    background: "#1a1830",
    color: "#a89ae8",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 11,
  },
  date: { fontSize: 11, color: "#5a5a72" },
  orderId: { fontSize: 11, color: "#3a3a4a", fontFamily: "monospace" },
  txId: { fontSize: 11, color: "#3a3a4a", fontFamily: "monospace", marginTop: 2 },
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 18, fontWeight: 700, color: "#e8e8f0" },
  currency: { fontSize: 11, color: "#5a5a72" },
  status: { fontSize: 11, color: "#22c55e" },
  dlBtn: {
    background: "#1a1830",
    color: "#a89ae8",
    border: "1px solid #2d2860",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 11,
    cursor: "pointer",
    marginTop: 4,
  },
  networkNote: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 11,
    color: "#3a3a4a",
  },
};
