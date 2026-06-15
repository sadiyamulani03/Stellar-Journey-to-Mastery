⚪️ Simple Payment dApp — Stellar Journey to Mastery | Level 1: White Belt
📖 Project Description
This is my Level 1 (White Belt) submission for the Stellar Journey to Mastery program.

The app is a Simple Payment dApp built on the Stellar testnet. It covers all the core fundamentals of Stellar dApp development:

Connect and disconnect a Freighter browser wallet
View your Public Key and live XLM balance
Send XLM payments to any Stellar address on testnet
Real-time transaction feedback — success/failure state and transaction hash
🚀 Features
✅ Freighter wallet connect / disconnect
✅ Public key display after connection
✅ XLM balance fetch with manual refresh
✅ Send XLM to any recipient address with custom amount
✅ Transaction success/failure feedback with hash confirmation
✅ Clean two-panel UI built with Tailwind CSS
🛠️ Tech Stack
Frontend: React (Create React App)
Styling: Tailwind CSS
Wallet: Freighter Wallet (via @stellar/freighter-api)
Stellar SDK: @stellar/stellar-sdk
Network: Stellar Testnet
⚙️ Setup Instructions
Prerequisites
Node.js v18+
Freighter Wallet browser extension installed
Freighter configured to use Testnet (Settings → Network → Testnet)
Installation
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/stellar-connect-wallet.git
cd stellar-connect-wallet

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
Open http://localhost:3000 in your browser.

Getting Testnet XLM
Fund your testnet wallet using the official Stellar Friendbot:

https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
Or fund directly via Stellar Laboratory.

📸 Screenshots
Not Connected — Default State
image
Wallet Connected — Public Key & Balance Visible
image
Successful Testnet Transaction
image
Transaction Result Shown to User
image
📁 Project Structure
stellar-connect-wallet/
├── public/
├── src/
│   ├── components/
│   │   ├── Freighter.js      # Wallet connect / disconnect + transaction logic
│   │   └── Header.js         # App header
│   ├── App.js                # Main app layout
│   ├── App.css               # Global styles
│   ├── index.js              # React entry point
│   └── index.css             # Tailwind CSS imports
├── tailwind.config.js
├── package.json
└── README.md
Acknowledgements
Stellar Development Foundation
Freighter Wallet
Stellar Laboratory

# Stellar Connect Wallet — Level 2 (Yellow Belt)

A Level 2 Yellow Belt Stellar dApp built for the Stellar Testnet, featuring multi-wallet integration, Soroban smart contract deployment, on-chain state logging, real-time polling, and robust error handling.

## Project Overview

This application extends the White Belt functionality to satisfy all Level 2 requirements:
- **Multi-Wallet Support:** Powered by `@creit.tech/stellar-wallets-kit` supporting Freighter, Albedo, Hana, and LOBSTR.
- **On-chain Logging Contract:** A custom Soroban Rust smart contract deployed on Testnet to record payment actions.
- **Frontend Invocation:** Invokes contract functions (`log_payment`, `fetch_payment`, `get_count`) directly from the browser.
- **State Synchronization:** Automatically polls the smart contract to render on-chain logs in real-time.
- **Error Handling:** Gracefully handles **Wallet Not Found**, **Transaction Rejected**, and **Insufficient Balance** errors.

---

## Deployed Contract Information

- **Contract ID:** `CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ`
- **Deploy Transaction Hash:** `0752486cadc7647292643dc425b4dff462daf2ad78cf7b94e8ed4027d46dbdd7`
- **Verifiable Contract Call Hash:** `0e95ca7e83ecd2e58ffcd1055fbeef44db497a44f4a359cb8666ddf01a8b42af`

Both transactions are verifiable on the [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet).

---

## Setup & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the React development server:**
   ```bash
   npm start
   ```

3. **Browser Access:**
   Open [https://localhost:3000](https://localhost:3000) (requires HTTPS).

---

## How it Works

1. **Connection:** Click **Connect Wallet** to open the `StellarWalletsKit` options modal. Select your preferred wallet (e.g. Freighter or Albedo).
2. **Pre-flight Checks:** Before sending, the app checks the destination account, calculates fees/reserves, and ensures your wallet balance is sufficient to maintain the network reserve.
3. **Transaction Flow:** 
   - A standard XLM transaction is sent via Horizon.
   - Upon success, the app automatically triggers a contract invocation to log the payment details (`tx_hash`, `from`, `to`, `amount`) on-chain.
   - The UI shows separate feedback for both the payment and the contract logging steps.
4. **On-Chain Log Sync:** The UI automatically polls the Soroban contract every 12 seconds to fetch the latest logged transactions and displays them in a dedicated feed.

---

## Technical Features & Error Handling

1. **Wallet Not Found Handling:** If the selected wallet extension is not installed, the app prompts the user to download it.
2. **Transaction Rejection Handling:** Captures `USER_REJECTED` code signatures and cleanly notifies the user without breaking state.
3. **Insufficient Balance Handling:** Pre-flights the transaction size plus fees and reserves to alert the user of missing funds before invoking wallet popups.
4. **Commits:** Minimum of 2+ meaningful commits tracking the development lifecycle.
