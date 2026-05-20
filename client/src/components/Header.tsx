import React, { useEffect, useState } from "react";
import type { WalletState } from "../hooks/usePeraWallet";

interface Props {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  page: "shop" | "orders";
  onPageChange: (p: "shop" | "orders") => void;
}

export function Header({ wallet, onConnect, onDisconnect, page, onPageChange }: Props) {
  const shortAddr = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  const [balances, setBalances] = useState<{ algo: number; usdc: number } | null>(null);

  useEffect(() => {
    if (!wallet.address) {
      setBalances(null);
      return;
    }

    const fetchBalances = async () => {
      try {
        const res = await fetch(`https://testnet-api.algonode.cloud/v2/accounts/${wallet.address}`);
        const data = await res.json();
        
        const algo = (data.amount || 0) / 1e6;
        
        const assets = data.assets || data.account?.assets || [];
        const usdcAsset = assets.find((a: any) => a["asset-id"] === 10458941);
        const usdc = usdcAsset ? (usdcAsset.amount / 1e6) : 0;
        
        setBalances({ algo, usdc });
      } catch (err) {
        console.error("Failed to fetch balances", err);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [wallet.address]);

  return (
    <header style={s.header}>
      <div style={s.inner}>
        <div style={s.brand}>
          <span style={s.logo}>📚</span>
          <div>
            <div style={s.title}>x402 eBook Shop</div>
            <div style={s.subtitle}>Powered by Algorand Testnet · USDC payments</div>
          </div>
        </div>

        <nav style={s.nav}>
          <button
            style={{ ...s.navBtn, ...(page === "shop" ? s.navActive : {}) }}
            onClick={() => onPageChange("shop")}
          >
            Shop
          </button>
          <button
            style={{ ...s.navBtn, ...(page === "orders" ? s.navActive : {}) }}
            onClick={() => onPageChange("orders")}
            disabled={!wallet.connected}
          >
            My Orders
          </button>
        </nav>

        <div>
          {wallet.connected ? (
            <div style={s.walletRow}>
              <div style={s.walletBadge}>
                <span style={s.dot} />
                <span style={{ fontSize: 13, marginRight: 8 }}>{shortAddr}</span>
                {balances && (
                  <div style={s.balances}>
                    <span style={s.balanceItem}>{balances.algo.toFixed(2)} ALGO</span>
                    <span style={s.balanceItem}>{balances.usdc.toFixed(2)} USDC</span>
                  </div>
                )}
              </div>
              <button style={s.disconnectBtn} onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              style={s.connectBtn}
              onClick={onConnect}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting…" : "🦊 Connect Pera Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Testnet banner */}
      {/* <div style={s.banner}>
        ⚡ Demo mode — Algorand Testnet · USDC ASA 10458941 · GoPlausible facilitator
      </div> */}
    </header>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    background: "#13131a",
    borderBottom: "1px solid #2a2a35",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  brand: { display: "flex", alignItems: "center", gap: 12, flex: 1 },
  logo: { fontSize: 28 },
  title: { fontWeight: 600, fontSize: 16, color: "#e8e8f0" },
  subtitle: { fontSize: 11, color: "#5a5a72" },
  nav: { display: "flex", gap: 4 },
  navBtn: {
    background: "transparent",
    color: "#9090a8",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 14,
    border: "1px solid transparent",
    cursor: "pointer",
  },
  navActive: {
    background: "#1a1830",
    color: "#a89ae8",
    border: "1px solid #2d2860",
  },
  walletRow: { display: "flex", alignItems: "center", gap: 8 },
  walletBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#0f2a1a",
    border: "1px solid #1a4a2a",
    borderRadius: 8,
    padding: "6px 12px",
    color: "#22c55e",
    fontSize: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
  },
  balances: {
    display: "flex",
    gap: 8,
    borderLeft: "1px solid #1a4a2a",
    paddingLeft: 12,
  },
  balanceItem: {
    fontSize: 12,
    color: "#a89ae8",
    background: "#1a1830",
    padding: "2px 6px",
    borderRadius: 4,
  },
  disconnectBtn: {
    background: "transparent",
    color: "#5a5a72",
    border: "1px solid #2a2a35",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  connectBtn: {
    background: "#7c6fcd",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  banner: {
    background: "#0d0d18",
    borderTop: "1px solid #1e1e30",
    textAlign: "center",
    fontSize: 11,
    color: "#5a5a72",
    padding: "5px 24px",
  },
};
