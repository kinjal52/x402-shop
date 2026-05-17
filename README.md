# x402 eBook Shop — Algorand Testnet

A fullstack ecommerce demo using the **x402 payment standard** on **Algorand Testnet**
with **USDC** payments. No Stripe, no payment processor — payments go directly to your wallet.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Hono (Node.js) + TypeScript |
| Database | SQLite (better-sqlite3) |
| Payment | x402 (`@x402-avm/hono`, `@x402-avm/fetch`) |
| Network | Algorand Testnet |
| Token | USDC (ASA ID: 10458941) |
| Wallet | Pera Wallet (simulated in demo) |
| Facilitator | GoPlausible (https://facilitator.goplausible.xyz) |

## Project Structure

```
x402-shop/
├── server/
│   ├── src/
│   │   ├── index.ts      ← Hono server + x402 payment middleware
│   │   └── db.ts         ← SQLite DB setup + seed products
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── PaymentModal.tsx   ← shows x402 flow steps live
│   │   │   ├── ShopPage.tsx
│   │   │   └── OrdersPage.tsx
│   │   ├── hooks/
│   │   │   ├── useX402Payment.ts  ← core payment logic
│   │   │   └── usePeraWallet.ts   ← Pera Wallet connection
│   │   └── types.ts
│   └── package.json
└── README.md
```

## Setup — Step by Step

### 1. Get Testnet ALGO and USDC

```bash
# Get free testnet ALGO from faucet
open https://bank.testnet.algorand.network/
```

For testnet USDC (ASA 10458941):
- Open Pera Wallet → opt-in to ASA 10458941
- Request from GoPlausible Discord or testnet dispenser

### 2. Set up server environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```env
PAY_TO_ADDRESS=YOUR_58_CHAR_ALGORAND_TESTNET_ADDRESS
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=3001
```

### 3. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 4. Run the app

**Terminal 1 — Server:**
```bash
cd server
npm run dev
# → Server running on http://localhost:3001
# → Database seeded with 6 products
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev
# → Frontend running on http://localhost:5173
```

### 5. Use the app

1. Open http://localhost:5173
2. Click "Connect Pera Wallet" → enter your testnet address
3. Browse products — click "Buy with USDC"
4. In the payment modal, expand "Dev mode" and enter your 25-word testnet mnemonic
5. Click "Pay $X.XX USDC →"
6. Watch the x402 flow: sign → verify → settle → confirmed!
7. Check "My Orders" tab for your purchases

## How x402 Payment Works Here

```
Frontend (React)          Server (Hono)              Algorand Testnet
     |                         |                           |
     |── POST /api/buy/:id ──> |                           |
     |                         |── HTTP 402 ──────────────>|
     |<── 402 Payment Required |  (pay $9.99 USDC)        |
     |                         |                           |
     |  [wrapFetchWithPayment] |                           |
     |  signs USDC transaction |                           |
     |                         |                           |
     |── POST /api/buy/:id ──> |                           |
     |   X-PAYMENT: <signed>   |── facilitator verify ──> |
     |                         |<── verified ─────────────|
     |                         |── broadcast tx ─────────>|
     |                         |<── confirmed (~2.8s) ─────|
     |<── 200 + download token |                           |
```

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List all products |
| GET | `/api/products/:id` | Public | Single product |
| POST | `/api/buy/:id` | x402 (USDC) | Purchase product |
| GET | `/api/orders/:address` | Public | Orders by wallet |
| GET | `/api/download/:token` | Public | Download with token |
| GET | `/api/health` | Public | Health check |

## Upgrade to Production

1. Replace `.env` testnet values with mainnet:
   ```env
   PAY_TO_ADDRESS=YOUR_MAINNET_ADDRESS
   ```
2. Change `USDC_TESTNET_ASA_ID` → `USDC_MAINNET_ASA_ID` in `server/src/index.ts`
3. Change `ALGORAND_TESTNET_CAIP2` → `ALGORAND_MAINNET_CAIP2`
4. Replace prompt-based wallet with full `@perawallet/connect` integration
5. Serve actual PDF files from storage (S3, Cloudflare R2, etc.)
6. Replace SQLite with PostgreSQL

## Resources

- [x402 on Algorand](https://dev.algorand.co/resources/x402-on-algorand/)
- [GoPlausible Facilitator](https://facilitator.goplausible.xyz/docs)
- [Algorand Testnet Faucet](https://bank.testnet.algorand.network/)
- [x402 Demo Repo](https://github.com/algorandfoundation/x402-demo)
