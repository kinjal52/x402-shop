import React, { useEffect, useRef } from "react";
import type { AgentLog, AgentPurchase, AgentStatus } from "../hooks/useAgentPayment";

interface Props {
  status: AgentStatus;
  logs: AgentLog[];
  purchases: AgentPurchase[];
  totalSpent: number;
  onClose: () => void;
}

export function AgentPanel({ status, logs, purchases, totalSpent, onClose }: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const logColor = (type: AgentLog["type"]) => {
    switch (type) {
      case "success":  return "#22c55e";
      case "error":    return "#ef4444";
      case "thinking": return "#f59e0b";
      case "paying":   return "#a89ae8";
      default:         return "#9090a8";
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.robotIcon}>🤖</span>
            <div>
              <div style={s.title}>AI Agent</div>
              <div style={s.subtitle}>Autonomous x402 payments</div>
            </div>
          </div>
          <div style={s.headerRight}>
            {status === "running" && (
              <div style={s.runningBadge}>
                <div style={s.pulse} />
                Running
              </div>
            )}
            {status === "done" && (
              <div style={s.doneBadge}>✅ Done</div>
            )}
            {status === "error" && (
              <div style={s.errorBadge}>❌ Error</div>
            )}
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Live logs */}
        <div style={s.logsBox}>
          {logs.map(log => (
            <div key={log.id} style={{ ...s.logLine, color: logColor(log.type) }}>
              {log.message}
            </div>
          ))}
          {status === "running" && (
            <div style={s.cursor}>▋</div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Purchases summary */}
        {purchases.length > 0 && (
          <div style={s.summary}>
            <div style={s.summaryTitle}>Purchased by agent</div>
            {purchases.map((p, i) => (
              <div key={i} style={s.purchaseRow}>
                <span style={s.purchaseName}>📖 {p.productName}</span>
                <span style={s.purchaseAmount}>{p.amountPaid}</span>
              </div>
            ))}
            {status === "done" && (
              <div style={s.totalRow}>
                <span style={s.totalLabel}>Total spent</span>
                <span style={s.totalAmount}>${totalSpent.toFixed(2)} USDC</span>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <div style={s.footer}>
          No human approved any of these payments · x402 + Algorand Testnet
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  panel: {
    background: "#0d0d12",
    border: "1px solid #2a2a35",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    display: "flex",
    flexDirection: "column",
    gap: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e1e2a",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  robotIcon: { fontSize: 28 },
  title: { fontSize: 16, fontWeight: 600, color: "#e8e8f0" },
  subtitle: { fontSize: 11, color: "#5a5a72" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  runningBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#1a1830",
    border: "1px solid #2d2860",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    color: "#a89ae8",
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#7c6fcd",
    animation: "pulse 1s infinite",
  },
  doneBadge: {
    background: "#0f2a1a",
    border: "1px solid #1a4a2a",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    color: "#22c55e",
  },
  errorBadge: {
    background: "#2a0f0f",
    border: "1px solid #4a1a1a",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    color: "#ef4444",
  },
  closeBtn: {
    background: "transparent",
    color: "#5a5a72",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    padding: 4,
  },
  logsBox: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.8,
    padding: "16px 20px",
    background: "#080810",
    minHeight: 220,
    maxHeight: 300,
    overflowY: "auto" as const,
    whiteSpace: "pre-wrap" as const,
  },
  logLine: {
    display: "block",
  },
  cursor: {
    color: "#7c6fcd",
    animation: "blink 1s infinite",
    display: "inline",
  },
  summary: {
    padding: "16px 20px",
    borderTop: "1px solid #1e1e2a",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryTitle: { fontSize: 11, color: "#5a5a72", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 4 },
  purchaseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 },
  purchaseName: { color: "#c8c8e0" },
  purchaseAmount: { color: "#22c55e", fontWeight: 500 },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: "1px solid #1e1e2a",
    marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: 600, color: "#e8e8f0" },
  totalAmount: { fontSize: 16, fontWeight: 700, color: "#22c55e" },
  footer: {
    textAlign: "center" as const,
    fontSize: 10,
    color: "#2a2a3a",
    padding: "10px 20px",
    borderTop: "1px solid #1e1e2a",
  },
};