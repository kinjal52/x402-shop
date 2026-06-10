import React, { useState, useEffect } from "react";

interface Props {
  plan: any;
  isPlanning: boolean;
  isExecuting: boolean;
  error: string | null;
  requestPlan: (prompt: string) => Promise<void>;
  approvePlan: () => Promise<any>;
  onClose: () => void;
}

export function AgentPanel({ plan, isPlanning, isExecuting, error, requestPlan, approvePlan, onClose }: Props) {
  const [prompt, setPrompt] = useState("Find me beginner AI books under $25");
  const [paymentResult, setPaymentResult] = useState<any[] | null>(null);
  
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isPlanning) {
      setSimulatedLogs(["🚀 Initializing Shopping Orchestrator..."]);
      const t1 = setTimeout(() => setSimulatedLogs(l => [...l, "🧠 Calling Intent Agent to parse natural language..."]), 800);
      const t2 = setTimeout(() => setSimulatedLogs(l => [...l, "🔎 Calling Recommendation Agent to analyze catalog..."]), 2000);
      const t3 = setTimeout(() => setSimulatedLogs(l => [...l, "🛡️ Calling Budget Guard to validate hard constraints..."]), 3500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else if (plan) {
      setSimulatedLogs(l => [...l, "✅ Plan successfully generated."]);
    }
  }, [isPlanning, plan]);

  const handleApprove = async () => {
    const res = await approvePlan();
    if (res?.results) {
      setPaymentResult(res.results);
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
              <div style={s.title}>AI Shopping Agent</div>
              <div style={s.subtitle}>Secure backend orchestration</div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#a8a8b8', marginBottom: 5 }}>What do you want to buy?</label>
            <input 
              style={{ width: '100%', padding: '10px 12px', background: '#1a1a24', border: '1px solid #3a3a4a', color: '#fff', borderRadius: 6 }} 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              placeholder="E.g. find me the best react books under 10" 
              disabled={isPlanning || isExecuting}
            />
          </div>
          <button 
            style={{ width: '100%', padding: 12, background: isPlanning ? '#555' : '#7c6fcd', color: '#fff', borderRadius: 6, border: 'none', cursor: isPlanning ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            onClick={() => requestPlan(prompt)}
            disabled={isPlanning || isExecuting}
          >
            {isPlanning ? "Agent is thinking..." : "Ask Agent"}
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 20px', color: '#ef4444', fontSize: 13, background: '#2a0f0f', borderTop: '1px solid #4a1a1a' }}>
            {error}
          </div>
        )}

        {(isPlanning || simulatedLogs.length > 0) && !paymentResult && (
          <div style={{ padding: '10px 20px', background: '#080810', minHeight: 120, borderTop: '1px solid #1e1e2a', borderBottom: '1px solid #1e1e2a' }}>
            <div style={{ fontSize: 11, color: '#5a5a72', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>Agent Execution Trail</div>
            {simulatedLogs.map((log, i) => (
              <div key={i} style={{ fontSize: 13, color: '#a89ae8', fontFamily: 'monospace', marginBottom: 4 }}>
                {log}
              </div>
            ))}
            {isPlanning && <div style={{ color: '#7c6fcd', animation: 'blink 1s infinite', display: 'inline', fontFamily: 'monospace' }}>▋</div>}
          </div>
        )}

        {plan && !paymentResult && (
          <div style={s.summary}>
            <div style={s.summaryTitle}>Generated Plan</div>
            <div style={{ fontSize: 12, color: '#a8a8b8', marginBottom: 10 }}>
              <strong>Extracted Intent:</strong> Topics: {plan.intent.topics?.join(", ") || "Any"} · Budget: ${plan.intent.budget}
            </div>
            {plan.products?.map((p: any, i: number) => (
              <div key={i} style={s.purchaseRow}>
                <span style={s.purchaseName}>📖 {p.name}</span>
                <span style={s.purchaseAmount}>${p.price_usd}</span>
              </div>
            ))}
            
            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total Estimated Cost</span>
              <span style={s.totalAmount}>${plan.totalCost?.toFixed(2)} USDC</span>
            </div>

            <button 
              style={{ width: '100%', padding: 12, background: isExecuting ? '#555' : '#22c55e', color: '#fff', borderRadius: 6, border: 'none', cursor: isExecuting ? 'not-allowed' : 'pointer', fontWeight: 600, marginTop: 15 }}
              onClick={handleApprove}
              disabled={isExecuting}
            >
              {isExecuting ? "Executing x402 Payments..." : "Approve & Pay"}
            </button>
          </div>
        )}

        {paymentResult && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e', marginBottom: 5 }}>Payment Successful</div>
            <div style={{ fontSize: 13, color: '#a8a8b8', marginBottom: 20 }}>The x402 Payment Tool executed your approved transaction automatically.</div>
            
            <div style={{ background: '#1a1a24', padding: 15, borderRadius: 8, textAlign: 'left' }}>
              {paymentResult.map((res: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#5a5a72' }}>Item {idx + 1}</div>
                  <div style={{ fontSize: 13, color: res.success ? '#22c55e' : '#ef4444' }}>
                    {res.success ? "✅ Paid via Algorand Testnet" : `❌ Error: ${res.error}`}
                  </div>
                  {res.txId && (
                    <div style={{ fontSize: 11, color: '#7c6fcd', marginTop: 4, fontFamily: 'monospace' }}>
                      TxID: {res.txId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div style={s.footer}>
          x402 + Algorand Testnet · Requires Human Approval
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