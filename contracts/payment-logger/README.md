Payment-Logger Soroban contract
================================

This contract provides a simple on-chain ledger of payments with three methods:

- `log_payment(tx_hash: String, from: String, to: String, amount: i128) -> u64` — stores a payment record and returns its id.
- `fetch_payment(pay_id: u64) -> Payment` — returns the stored payment details.
- `get_count() -> u64` — returns the number of stored payments.

Build and deploy
----------------

1. Build WASM (requires Rust + wasm target):

```bash
cd contracts/payment-logger
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
# output wasm at: target/wasm32-unknown-unknown/release/payment_logger.wasm
```

2. Deploy with `soroban` CLI (Testnet):

```bash
soroban contract deploy --source-account "secret:<YOUR_SECRET>" --wasm target/wasm32-unknown-unknown/release/payment_logger.wasm --network testnet
```

3. After deploy, record the contract ID and deploy transaction hash.
