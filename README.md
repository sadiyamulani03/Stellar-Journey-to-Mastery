# Stellar Connect Wallet — Stellar Journey to Mastery

This repository contains my submissions for both **Level 1 (White Belt)** and **Level 2 (Yellow Belt)** of the Stellar Journey to Mastery program.

---

## ⚪ Level 1: White Belt — Simple Payment dApp

The initial version of the application covers the core fundamentals of Stellar dApp development:
- **Freighter Connection:** Connect and disconnect the Freighter browser extension wallet.
- **Account Info:** Retrieve and display the public key and live XLM balance from the Stellar Testnet.
- **Payment Flow:** Send XLM payments directly to any recipient address.
- **Feedback:** Real-time transaction success or failure message including the transaction hash.

### 🛠️ Tech Stack (Level 1)
- **Frontend:** React (Create React App)
- **Styling:** Tailwind CSS / Vanilla CSS
- **Wallet Connection:** Freighter Wallet
- **Stellar Integration:** `@stellar/stellar-sdk`

---

## 🟡 Level 2: Yellow Belt — Stellar Payment Tracker & Soroban Logger

Level 2 extends the White Belt functionality to add advanced features, multi-wallet options, and Soroban smart contract logging:
- **Multi-Wallet Support:** Powered by `@creit.tech/stellar-wallets-kit` supporting Freighter, Albedo, Hana, and LOBSTR.
- **On-Chain Logging:** A custom Soroban Rust smart contract deployed on Testnet to record payment actions.
- **Frontend Invocation:** Invokes contract functions (`log_payment`, `fetch_payment`, `get_count`) directly from the browser.
- **State Synchronization:** Automatically polls the smart contract to render on-chain logs in real-time.
- **Error Handling:** Clean, user-friendly error normalization for **Wallet Not Found**, **Transaction Rejected**, and **Insufficient Balance** errors.

### 📋 Deployed Contract Information
- **Contract ID:** `CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ`
- **Deploy Transaction Hash:** `0752486cadc7647292643dc425b4dff462daf2ad78cf7b94e8ed4027d46dbdd7`
- **Verifiable Contract Call Hash:** `0e95ca7e83ecd2e58ffcd1055fbeef44db497a44f4a359cb8666ddf01a8b42af`

Both transactions are verifiable on the [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet).

---

## ⚙️ Setup & Running Locally

### Prerequisites
- Node.js v18+
- Freighter Wallet browser extension installed (configured to use Testnet)

### Installation & Run
1. **Clone the repository:**
   ```bash
   git clone https://github.com/sadiyamulani03/Stellar-Journey-to-Mastery.git
   cd stellar-connect-wallet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   Open [https://localhost:3000](https://localhost:3000) (CRA start script uses HTTPS).

---

## 📁 Directory Structure
```
stellar-connect-wallet/
├── contracts/            # Soroban Smart Contract (payment-logger)
├── public/               # Public assets
├── src/                  
│   ├── components/       
│   │   ├── Freighter.js  # Wallet kit & horizon transaction logic
│   │   ├── contracts.js  # Soroban read/write transaction handlers
│   │   └── Header.js     # Main dashboard interface
│   ├── App.js            # App entry component
│   └── index.js          # App root render
├── package.json          
└── README.md             
```
