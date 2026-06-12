import React, { useState } from "react";

interface Props {
  onClose: () => void;
  walletAddress?: string | null;
}

export function AgentPanel({ onClose, walletAddress }: Props) {
  const [prompt, setPrompt] = useState("Find me beginner AI books under $25");
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<"input" | "running" | "done" | "error">("input");
  const [txId, setTxId] = useState<string | null>(null);
  const [purchasedBooks, setPurchasedBooks] = useState<{ name: string; cost: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStart = async () => {
    setPhase("running");
    setErrorMessage(null);
    setLogs(["🤖 Agent received request"]);

    try {
      setLogs(prev => [...prev, "🧠 Processing your request..."]);

      const planRes = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || "Failed to generate plan");

      const plan = planData.plan;

      const bookNames = plan.products?.map((p: any) => p.name) || [];
      setPurchasedBooks(bookNames.map((n: string) => ({ name: n, cost: "" })));

      setLogs(prev => [
        ...prev,
        `📚 ${plan.products?.length || 0} books identified`,
        ...bookNames.map((n: string) => `   · ${n}`),
        `💰 Total price calculated: $${plan.totalCost?.toFixed(2)} USDC`,
        "💳 Agent account funding confirmed",
      ]);

      setLogs(prev => [...prev, "💸 Transferring payment from Agent Account to Merchant Account..."]);

      const approveRes = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: plan.productIds }),
      });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveData.error || "Failed to execute payment");

      if (approveData.success) {
        setTxId(approveData.txId);
        const books = approveData.products?.map((p: any) => ({ name: p.productName, cost: p.amountPaid })) || [];
        setPurchasedBooks(books);
        setLogs(prev => [
          ...prev,
          ...books.map((b: any) => `✅ Purchased: ${b.name} — ${b.cost}`),
          `🔗 Transaction ID: ${approveData.txId}`,
        ]);
        setPhase("done");
      } else {
        throw new Error(approveData.error || "Payment failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setLogs(prev => [...prev, `❌ ${err.message}`]);
      setPhase("error");
    }
  };

  const isRunning = phase === "running";

  return (
    <div style={s.overlay}>
      <div style={s.panel}>

        {/* Fixed header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.robotIcon}>🤖</span>
            <div>
              <div style={s.title}>AI Shopping Agent</div>
              <div style={s.subtitle}>Autonomous purchase orchestration</div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Scrollable body */}
        <div style={s.body}>

          {/* Input section */}
          {phase === "input" && (
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#a8a8b8', marginBottom: 5 }}>What do you want to buy?</label>
                <input
                  style={{ width: '100%', padding: '10px 12px', background: '#1a1a24', border: '1px solid #3a3a4a', color: '#fff', borderRadius: 6, boxSizing: 'border-box' }}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="E.g. find me the best react books under 10"
                />
              </div>
              <button
                style={{ width: '100%', padding: 12, background: '#7c6fcd', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={handleStart}
              >
                Ask Agent
              </button>
            </div>
          )}

          {/* Activity log */}
          {(phase === "running" || phase === "done" || phase === "error") && (
            <div style={{ padding: '16px 20px', background: '#080810', borderTop: '1px solid #1e1e2a', borderBottom: '1px solid #1e1e2a' }}>
              <div style={{ fontSize: 11, color: '#5a5a72', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>Activity Log</div>
              {logs.map((log, i) => (
                <div key={i} style={{ fontSize: 13, color: log.startsWith('❌') ? '#ef4444' : log.startsWith('✅') || log.startsWith('🔗') ? '#22c55e' : '#a89ae8', fontFamily: 'monospace', marginBottom: 6, lineHeight: 1.5 }}>
                  {log}
                </div>
              ))}
              {isRunning && (
                <div style={{ color: '#7c6fcd', animation: 'blink 1s infinite', display: 'inline', fontFamily: 'monospace', fontSize: 13 }}>▋</div>
              )}
            </div>
          )}

          {/* Done state */}
          {phase === "done" && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>All done!</div>
              <div style={{ fontSize: 12, color: '#a8a8b8', marginBottom: 16 }}>Your books have been purchased successfully.</div>

              {/* Purchased books list */}
              {purchasedBooks.length > 0 && (
                <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 8, padding: 16, textAlign: 'left', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Purchased Books</div>
                  {purchasedBooks.map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#e8e8f0' }}>{i + 1}. {b.name}</span>
                      {b.cost && <span style={{ color: '#22c55e', fontWeight: 500 }}>{b.cost}</span>}
                    </div>
                  ))}
                </div>
              )}

              {txId && (
                <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 8, padding: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: '#5a5a72', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>USDC Transfer Details</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#9090a8' }}>Total Book Cost</span>
                    <span style={{ color: '#e8e8f0', fontWeight: 500 }}>{logs.find(l => l.startsWith('💰'))?.replace('💰 Total price calculated: ', '') || ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#9090a8' }}>USDC Transferred</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{logs.find(l => l.startsWith('💰'))?.replace('💰 Total price calculated: ', '') || ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#9090a8' }}>From</span>
                    <span style={{ color: '#a89ae8', fontFamily: 'monospace', fontSize: 11, maxWidth: '55%', wordBreak: 'break-all', textAlign: 'right' }}>{walletAddress || 'Connected Wallet'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#9090a8' }}>To</span>
                    <span style={{ color: '#a89ae8', fontFamily: 'monospace', fontSize: 11, maxWidth: '55%', wordBreak: 'break-all', textAlign: 'right' }}>Agent Account</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                    <span style={{ color: '#9090a8' }}>Transaction ID</span>
                    <span style={{ color: '#7c6fcd', fontFamily: 'monospace', fontSize: 11, maxWidth: '55%', wordBreak: 'break-all', textAlign: 'right' }}>{txId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 12, borderTop: '1px solid #2a2a35' }}>
                    <span style={{ color: '#9090a8' }}>Status</span>
                    <span style={{ color: '#22c55e', fontWeight: 500 }}>✅ Completed</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {phase === "error" && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Unable to complete purchase</div>
              {errorMessage && (
                <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 8, padding: 16, textAlign: 'left', marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: '#e8e8f0', lineHeight: 1.5 }}>{errorMessage}</div>
                </div>
              )}
              <button
                style={{ marginTop: 20, background: '#1a1830', color: '#a89ae8', border: '1px solid #2d2860', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
                onClick={() => setPhase("input")}
              >
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Fixed footer */}
        <div style={s.footer}>
          x402 + Algorand Testnet · Fully Autonomous
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
    padding: 12,
  },
  panel: {
    background: "#0d0d12",
    border: "1px solid #2a2a35",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    maxHeight: "calc(100vh - 24px)",
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
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 },
  robotIcon: { fontSize: 28, flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 600, color: "#e8e8f0", whiteSpace: "nowrap" as const, overflow: "hidden" as const, textOverflow: "ellipsis" as const },
  subtitle: { fontSize: 11, color: "#5a5a72", whiteSpace: "nowrap" as const },
  closeBtn: {
    background: "transparent",
    color: "#a8a8b8",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    padding: "8px 10px",
    lineHeight: 1,
    flexShrink: 0,
  },
  body: {
    overflowY: "auto" as const,
    flex: 1,
    minHeight: 0,
  },
  footer: {
    textAlign: "center" as const,
    fontSize: 10,
    color: "#2a2a3a",
    padding: "10px 20px",
    borderTop: "1px solid #1e1e2a",
    flexShrink: 0,
  },
};
