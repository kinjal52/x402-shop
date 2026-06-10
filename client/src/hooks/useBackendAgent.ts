import { useState } from "react";

export function useBackendAgent() {
  const [plan, setPlan] = useState<any>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPlan = async (prompt: string) => {
    setIsPlanning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");
      setPlan(data.plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPlanning(false);
    }
  };

  const approvePlan = async () => {
    if (!plan) return null;
    setIsExecuting(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: plan.productIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute payment");
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsExecuting(false);
    }
  };

  const reset = () => {
    setPlan(null);
    setError(null);
  };

  return { plan, isPlanning, isExecuting, error, requestPlan, approvePlan, reset };
}
