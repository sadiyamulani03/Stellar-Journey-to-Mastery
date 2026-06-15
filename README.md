# 🌟 Stellar Journey to Mastery

> A hands-on Stellar journey through 7 belts — from first wallet connection to launching on Mainnet.
---

🚀 Project is live at https://stellar-journey-to-mastery.vercel.app/

---

## ⚪️ Level 1 — White Belt: Simple Payment dApp

### 📖 Overview

A beginner-friendly Stellar dApp covering the core fundamentals:
- Connect and disconnect a **Freighter** browser wallet
- View your **Public Key** and live **XLM balance**
- Send **XLM payments** to any Stellar address on testnet
- Real-time **transaction feedback** — success/failure + transaction hash

### 🚀 Features

- ✅ Freighter wallet connect / disconnect
- ✅ Public key display after connection
- ✅ XLM balance fetch with manual refresh
- ✅ Send XLM to any recipient address with custom amount
- ✅ Transaction success/failure feedback with hash confirmation
- ✅ Clean two-panel UI built with Tailwind CSS

### 🛠️ Tech Stack

| | |
|---|---|
| **Frontend** | React (Create React App) |
| **Styling** | Tailwind CSS |
| **Wallet** | Freighter (`@stellar/freighter-api`) |
| **Stellar SDK** | `@stellar/stellar-sdk` |
| **Network** | Stellar Testnet |

### 📸 Screenshots

#### Not Connected — Default State
<img width="1911" height="917" alt="Screenshot 2026-06-13 203341" src="https://github.com/user-attachments/assets/cbde329e-4ba5-4b21-b820-425ee37604dc" />

#### Wallet Connected — Public Key & Balance Visible
<img width="1496" height="923" alt="Screenshot 2026-06-13 211731" src="https://github.com/user-attachments/assets/a222e5ca-aebc-45d2-8f9f-20f7c1d3221a" />

#### Successful Testnet Transaction
<img width="1581" height="887" alt="Screenshot 2026-06-13 212038" src="https://github.com/user-attachments/assets/59a57cbb-fd44-4ea8-8971-e1f93e44c590" />

#### Transaction Result Shown to User
<img width="1313" height="895" alt="Screenshot 2026-06-13 212115" src="https://github.com/user-attachments/assets/e9ecc168-a9c1-49e0-b90e-964c55241df4" />


### ✅ Level 1 Checklist

- [x] Freighter wallet connect + disconnect
- [x] Public key displayed after connection
- [x] XLM balance fetched and displayed (with refresh)
- [x] Send XLM transaction on Stellar testnet
- [x] Transaction feedback — success/failure + transaction hash

---

---

## 🟡 Level 2 — Yellow Belt: Payment Tracker & Soroban Logger

### 📖 Overview

Level 2 extends the White Belt functionality with multi-wallet support, a deployed Soroban smart contract, and real-time on-chain state synchronization:

- **Multi-Wallet Support** — Powered by `@creit.tech/stellar-wallets-kit`, supporting Freighter, Albedo, Hana, and LOBSTR
- **On-Chain Logging** — A custom Soroban Rust smart contract deployed on Testnet to record payment actions
- **Frontend Invocation** — Calls contract functions (`log_payment`, `fetch_payment`, `get_count`) directly from the browser
- **State Synchronization** — Automatically polls the smart contract to render on-chain logs in real-time
- **Error Handling** — Clean, user-friendly error normalization for Wallet Not Found, Transaction Rejected, and Insufficient Balance

### 🚀 Features

- ✅ Multi-wallet support (Freighter, Albedo, Hana, LOBSTR)
- ✅ Soroban smart contract deployed on testnet
- ✅ Contract functions called from frontend (`log_payment`, `fetch_payment`, `get_count`)
- ✅ Real-time on-chain log polling & state sync
- ✅ 3 error types handled — Wallet Not Found, Transaction Rejected, Insufficient Balance
- ✅ Transaction status tracking (pending / success / fail)

### 🛠️ Tech Stack

| | |
|---|---|
| **Frontend** | React (Create React App) |
| **Styling** | Tailwind CSS |
| **Wallet Kit** | `@creit.tech/stellar-wallets-kit` |
| **Smart Contract** | Soroban (Rust) |
| **Stellar SDK** | `@stellar/stellar-sdk` |
| **Network** | Stellar Testnet |

### 📋 Deployed Contract Information

| | |
|---|---|
| **Contract ID** | `CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ` |
| **Deploy Transaction Hash** | `0752486cadc7647292643dc425b4dff462daf2ad78cf7b94e8ed4027d46dbdd7` |
| **Contract Call Hash** | `0e95ca7e83ecd2e58ffcd1055fbeef44db497a44f4a359cb8666ddf01a8b42af` |
| **Explorer** | [View on Stellar Expert Testnet](https://stellar.expert/explorer/testnet) |

### 📁 Project Structure

```
stellar-connect-wallet/
├── contracts/                  # Soroban Smart Contract (payment-logger)
├── public/                     # Public assets
├── src/
│   ├── components/
│   │   ├── Freighter.js        # Wallet kit & Horizon transaction logic
│   │   ├── contracts.js        # Soroban read/write transaction handlers
│   │   └── Header.js           # Main dashboard interface
│   ├── App.js                  # App entry component
│   └── index.js                # App root render
├── package.json
└── README.md
```

### ⚙️ Setup Instructions

#### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Freighter Wallet](https://www.freighter.app/) browser extension (configured to **Testnet**)

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sadiyamulani03/Stellar-Journey-to-Mastery.git
cd stellar-connect-wallet

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

#### Getting Testnet XLM

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

Or fund via [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test).

### ✅ Level 2 Checklist

- [x] Public GitHub repository
- [x] Multi-wallet support (Freighter, Albedo, Hana, LOBSTR)
- [x] Soroban smart contract deployed on testnet
- [x] Contract called from frontend
- [x] 3 error types handled
- [x] Transaction status visible (pending / success / fail)
- [x] Real-time state synchronization
- [x] Minimum 2+ meaningful commits
- [x] Deployed contract address included
- [x] Verifiable transaction hash included

---

## 🙏 Acknowledgements

- [Stellar Development Foundation](https://stellar.org/)
- [Freighter Wallet](https://www.freighter.app/)
- [Stellar Wallets Kit](https://github.com/creit-tech/stellar-wallets-kit)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Stellar Expert Explorer](https://stellar.expert/)
