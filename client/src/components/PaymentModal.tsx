import React from "react";
import type { Product } from "../types";
import type { PaymentStatus } from "../hooks/useX402Payment";
import type { PurchaseResult } from "../types";

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
  product: Product;
  buyerAddress: string;
  status: PaymentStatus;
  error: string | null;
  result: PurchaseResult | null;
  onConfirm: () => void;
  onClose: () => void;
}

const STEPS: { key: PaymentStatus; label: string; desc: string }[] = [
  { key: "waiting_wallet", label: "Wallet ready", desc: "Pera Wallet connected" },
  { key: "signing", label: "Signing tx", desc: "Signing USDC transaction" },
  { key: "verifying", label: "Verifying", desc: "GoPlausible facilitator check" },
  { key: "settling", label: "Settling", desc: "Broadcasting to Algorand" },
  { key: "done", label: "Confirmed", desc: "Payment complete!" },
];

const ORDER: PaymentStatus[] = ["waiting_wallet", "signing", "verifying", "settling", "done"];

export function PaymentModal({ product, buyerAddress, status, error, result, onConfirm, onClose }: Props) {

  const currentIdx = ORDER.indexOf(status);
  const isProcessing = status !== "idle" && status !== "done" && status !== "error";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div style={s.overlay} onClick={isDone || isError ? onClose : undefined}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>Complete purchase</div>
            <div style={s.subtitle}>{product.name}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Product summary */}
        <div style={s.summary}>
          <div style={s.summaryRow}>
            <span style={s.label}>Product</span>
            <span style={s.val}>{product.name}</span>
          </div>
          <div style={s.summaryRow}>
            <span style={s.label}>Price</span>
            <span style={{ ...s.val, color: "#a89ae8", fontWeight: 700 }}>
              ${product.price_usd.toFixed(2)} USDC
            </span>
          </div>
          <div style={s.summaryRow}>
            <span style={s.label}>Network</span>
            <span style={s.val}>Algorand Testnet</span>
          </div>
          <div style={s.summaryRow}>
            <span style={s.label}>Token</span>
            <span style={s.val}>USDC (ASA 10458941)</span>
          </div>
          <div style={s.summaryRow}>
            <span style={s.label}>Your wallet</span>
            <span style={{ ...s.val, color: "#22c55e", fontSize: 12 }}>
              {buyerAddress.slice(0, 8)}…{buyerAddress.slice(-6)}
            </span>
          </div>
        </div>

        {/* x402 flow steps */}
        {isProcessing && (
          <div style={s.steps}>
            <div style={s.stepsTitle}>x402 payment flow</div>
            {STEPS.map((step, i) => {
              const done = currentIdx > i;
              const active = currentIdx === i;
              return (
                <div key={step.key} style={s.step}>
                  <div style={{
                    ...s.stepDot,
                    background: done ? "#22c55e" : active ? "#7c6fcd" : "#2a2a35",
                    border: active ? "2px solid #a89ae8" : "2px solid transparent",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: active || done ? "#e8e8f0" : "#5a5a72" }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a5a72" }}>{step.desc}</div>
                  </div>
                  {active && <div style={s.spinner} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Success state */}
        {isDone && result && (
          <div style={s.success}>
            <div style={s.successIcon}>✅</div>
            <div style={s.successTitle}>Payment confirmed!</div>
            <div style={s.successSub}>Settled on Algorand Testnet in ~2.8 seconds</div>
            <div style={s.successDetails}>
              <div style={s.summaryRow}>
                <span style={s.label}>Amount paid</span>
                <span style={{ ...s.val, color: "#22c55e" }}>{result.amountPaid}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.label}>Order ID</span>
                <span style={{ ...s.val, fontSize: 11 }}>{result.orderId.slice(0, 16)}…</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.label}>Download token</span>
                <span style={{ ...s.val, fontSize: 11, color: "#a89ae8" }}>
                  {result.downloadToken.slice(0, 16)}…
                </span>
              </div>
              {result.txId && (
                <div style={s.summaryRow}>
                  <span style={s.label}>Transaction ID</span>
                  <a 
                    href={`https://lora.algokit.io/testnet/transaction/${result.txId}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ ...s.val, fontSize: 11, color: "#22c55e", textDecoration: "underline" }}
                  >
                    {result.txId.slice(0, 16)}…
                  </a>
                </div>
              )}
            </div>
            <button
              style={s.downloadBtn}
              onClick={() => triggerDownload(result.downloadToken, product.name)}
            >
              📥 Download {product.name}
            </button>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div style={s.errorBox}>
            <div style={s.errorIcon}>⚠️</div>
            <div style={s.errorText}>{error}</div>
          </div>
        )}

        {/* Action buttons */}
        {!isProcessing && !isDone && (
          <div style={s.actions}>
            <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              style={s.payBtn}
              onClick={() => onConfirm()}
            >
              Pay ${product.price_usd.toFixed(2)} USDC →
            </button>
          </div>
        )}

        {isDone && (
          <button style={s.closeFullBtn} onClick={onClose}>Close</button>
        )}

        <div style={s.poweredBy}>
          Powered by x402 · Algorand Testnet · USDC
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#18181b",
    border: "1px solid #2a2a35",
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 18, fontWeight: 600, color: "#e8e8f0" },
  subtitle: { fontSize: 12, color: "#5a5a72", marginTop: 2 },
  closeBtn: {
    background: "transparent",
    color: "#5a5a72",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
  },
  summary: {
    background: "#13131a",
    border: "1px solid #2a2a35",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, color: "#5a5a72" },
  val: { fontSize: 13, color: "#e8e8f0" },
  steps: {
    background: "#13131a",
    border: "1px solid #2a2a35",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  stepsTitle: { fontSize: 11, color: "#5a5a72", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  step: { display: "flex", alignItems: "center", gap: 12 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
    transition: "all 0.3s",
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid #2a2a35",
    borderTop: "2px solid #7c6fcd",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginLeft: "auto",
  },
  success: {
    background: "#0f2a1a",
    border: "1px solid #1a4a2a",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    textAlign: "center",
  },
  successIcon: { fontSize: 36 },
  successTitle: { fontSize: 18, fontWeight: 600, color: "#22c55e" },
  successSub: { fontSize: 12, color: "#5a5a72" },
  successDetails: { width: "100%", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 },
  downloadBtn: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 8,
    width: "100%",
  },
  errorBox: {
    background: "#2a0f0f",
    border: "1px solid #4a1a1a",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  errorIcon: { fontSize: 20 },
  errorText: { fontSize: 13, color: "#ef4444", lineHeight: 1.5 },
  devSection: { display: "flex", flexDirection: "column", gap: 8 },
  devToggle: {
    background: "transparent",
    color: "#5a5a72",
    border: "1px solid #2a2a35",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "left",
  },
  mnemonicInput: {
    background: "#13131a",
    border: "1px solid #2a2a35",
    borderRadius: 8,
    padding: 10,
    color: "#e8e8f0",
    fontSize: 12,
    width: "100%",
    resize: "vertical",
    fontFamily: "monospace",
  },
  actions: { display: "flex", gap: 10 },
  cancelBtn: {
    flex: 1,
    background: "transparent",
    color: "#9090a8",
    border: "1px solid #2a2a35",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    cursor: "pointer",
  },
  payBtn: {
    flex: 2,
    background: "#7c6fcd",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  closeFullBtn: {
    background: "#2a2a35",
    color: "#e8e8f0",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  },
  poweredBy: {
    textAlign: "center",
    fontSize: 10,
    color: "#3a3a4a",
  },
};
