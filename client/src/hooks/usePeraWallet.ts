import { useState, useCallback, useRef, useEffect } from "react";
import { PeraWalletConnect } from "@perawallet/connect";

export interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export function usePeraWallet() {
  const peraWallet = useRef(
    new PeraWalletConnect({
      network: "testnet",
      shouldShowSignTxnToast: true,
    })
  );

  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    connecting: false,
    error: null,
  });

  // ── Reconnect session on page refresh ──────────────────────────────────────
  useEffect(() => {
    const pera = peraWallet.current;
    pera
      .reconnectSession()
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          // Re-register disconnect listener after reconnect
          pera.connector?.on("disconnect", () => {
            setWallet({ address: null, connected: false, connecting: false, error: null });
          });
          setWallet({ address, connected: true, connecting: false, error: null });
        }
      })
      .catch(() => {
        // No prior session — stay disconnected, this is normal
      });
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setWallet((w) => ({ ...w, connecting: true, error: null }));
    try {
      const accounts = await peraWallet.current.connect();
      const address = accounts[0];

      peraWallet.current.connector?.on("disconnect", () => {
        setWallet({ address: null, connected: false, connecting: false, error: null });
      });

      setWallet({ address, connected: true, connecting: false, error: null });
    } catch (e: any) {
      if (e?.data?.type === "CONNECT_MODAL_CLOSED") {
        setWallet((w) => ({ ...w, connecting: false, error: null }));
      } else {
        setWallet((w) => ({
          ...w,
          connecting: false,
          error: e?.message || "Connection failed",
        }));
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    await peraWallet.current.disconnect();
    setWallet({ address: null, connected: false, connecting: false, error: null });
  }, []);

  const getPeraInstance = useCallback(() => peraWallet.current, []);

  return { wallet, connect, disconnect, getPeraInstance };
}
