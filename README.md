# Stellar Connect Wallet

A Level 1 White Belt Stellar dApp built for Stellar Testnet using Freighter.

## Project Overview

This app demonstrates the core White Belt requirements:

- Freighter wallet setup on Stellar Testnet
- Wallet connect and disconnect functionality
- Fetch and display the connected wallet's native XLM balance
- Send XLM transactions on the Stellar testnet
- Show transaction feedback with success/error and transaction hash

## Features

- Wallet connect + disconnect
- Native XLM balance display
- Send payments with destination and amount input
- Transaction result card showing status and hash
- Tailwind CSS-powered header UI

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Start the application:

```bash
npm start
```

3. Open the app in your browser:

```text
http://localhost:3000
```

4. Install the Freighter wallet extension and switch to Stellar Testnet.

## How to use

1. Select `Freighter` as the wallet provider.
2. Click `Connect Freighter` and approve access.
3. Confirm your public key and balance appear in the header.
4. Enter a recipient address and XLM amount.
5. Click `Send Payment`.
6. View transaction feedback and hash after submission.

## Notes for White Belt Submission

- The app is configured for Stellar Testnet.
- Only Freighter is supported in this version.
- The transaction flow uses Freighter's sign transaction API.
- The balance and transaction result are displayed clearly in the UI.

## Screenshots

Include screenshots showing:

- Wallet connected state
- Balance displayed
- Successful testnet transaction result

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.

### `npm test`

Launches the test runner.

### `npm run build`

Builds the app for production.

## Submission Checklist

- [ ] Public GitHub repository available
- [ ] README includes project description
- [ ] README includes setup instructions
- [ ] README includes screenshots for wallet connected state, balance display, and transaction result
- [ ] App supports wallet connect/disconnect
- [ ] App displays XLM balance
- [ ] App sends a testnet XLM transaction
- [ ] App shows transaction feedback
