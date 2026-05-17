import React, { useState } from "react";
import { Header } from "./components/Header";
import { ShopPage } from "./components/ShopPage";
import { OrdersPage } from "./components/OrdersPage";
import { usePeraWallet } from "./hooks/usePeraWallet";

export default function App() {
  const { wallet, connect, disconnect, getPeraInstance } = usePeraWallet();
  const [page, setPage] = useState<"shop" | "orders">("shop");

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
      `}</style>

      <Header
        wallet={wallet}
        onConnect={connect}
        onDisconnect={disconnect}
        page={page}
        onPageChange={setPage}
      />

      <main>
        {page === "shop" && (
          <ShopPage
            walletAddress={wallet.address}
            walletConnected={wallet.connected}
            peraWallet={getPeraInstance()}
          />
        )}
        {page === "orders" && wallet.address && (
          <OrdersPage walletAddress={wallet.address} />
        )}
      </main>
    </div>
  );
}
