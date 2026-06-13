import React, { useState } from "react";
import { checkConnection, retrievePublicKey, getBalance, sendPayment } from "./Freighter";

const walletProviders = [
  {
    id: "freighter",
    label: "Freighter",
    description: "Browser extension wallet for Stellar.",
    status: "supported",
  },
];

const Header = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [selectedWallet, setSelectedWallet] = useState("freighter");
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txResult, setTxResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProvider = walletProviders.find((provider) => provider.id === selectedWallet);
  const isSupportedProvider = selectedProvider?.status === "supported";

  const refreshBalance = async () => {
    try {
      const bal = await getBalance();
      setBalance(Number(bal).toFixed(2));
    } catch (e) {
      console.error(e);
      setError("Unable to refresh balance. Check console for details.");
    }
  };

  const connectWallet = async () => {
    try {
      if (!isSupportedProvider) {
        setError("Selected wallet provider is not supported yet.");
        return;
      }

      setError("");
      const allowed = await checkConnection();

      if (!allowed) {
        setError("Permission denied. Please allow access in your wallet.");
        return;
      }

      const key = await retrievePublicKey();
      const bal = await getBalance();

      setPublicKey(key);
      setBalance(Number(bal).toFixed(2));
      setConnected(true);
      setTxResult(null);
    } catch (e) {
      console.error(e);
      setError("Unable to connect wallet. Check console for details.");
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setPublicKey("");
    setBalance("0");
    setError("");
    setDestination("");
    setAmount("");
    setTxResult(null);
  };

  const handleSendPayment = async () => {
    if (!destination || !amount) {
      setError("Enter destination and amount before sending.");
      return;
    }

    setError("");
    setTxResult(null);
    setIsSubmitting(true);

    try {
      const result = await sendPayment(destination, amount);
      setTxResult({
        status: "success",
        hash: result.hash,
        message: "Payment sent successfully on testnet.",
      });
      await refreshBalance();
      setDestination("");
      setAmount("");
    } catch (e) {
      console.error(e);
      // Prefer structured Horizon error details when available
      let message = e?.message || "Transaction failed. Check console.";
      if (e?.horizon?.extras?.result_codes) {
        const codes = e.horizon.extras.result_codes;
        const txCode = codes.transaction || null;
        const opCodes = codes.operations ? codes.operations.join(", ") : null;
        message = `Horizon error: ${txCode || "failed"}${opCodes ? ` — ops: ${opCodes}` : ""}`;

        // Provide actionable suggestion for common op errors
        if (opCodes && opCodes.includes("op_no_destination")) {
          message += " — Destination account does not exist. This app will create the account using CreateAccount when you send, or you can fund it via Friendbot on Testnet.";
        }

        if (opCodes && opCodes.includes("op_low_reserve")) {
          message += " — Insufficient funds to meet the network reserve after this operation. Increase the amount or top up your wallet (Testnet: use Friendbot).";
        }
      }

      setTxResult({
        status: "error",
        message,
        raw: e?.horizon || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-wrapper">
        <div className="dashboard-container">
          <div className="dashboard-grid">
            <div className="dashboard-panel">
              <span className="section-title">
                <b>Simple Payment dApp</b>
              </span>

              <p className="hero-copy">
                Connect Freighter, see your XLM balance, and send testnet payments directly.
              </p>

              <div className="mt-10 wallet-grid">
                {walletProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedWallet(provider.id)}
                    className={`group flex flex-col justify-between rounded-3xl border px-5 py-6 text-left transition duration-200 ${
                      selectedWallet === provider.id
                        ? "border-cyan-400 bg-sky-500/10 shadow-[0_20px_80px_-40px_rgba(56,189,248,0.35)]"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-white">{provider.label}</span>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                          {provider.status === "supported" ? "Supported" : "Coming soon"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{provider.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Wallet status</p>
                  <p className="mt-2 text-2xl font-semibold status-text">{connected ? "Connected" : "Not connected"}</p>
                </div>
                <div className="rounded-3xl bg-slate-800 px-4 py-2 text-sm font-semibold provider-label">
                  {selectedProvider?.label}
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="wallet-panel-box rounded-3xl border border-slate-800 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Public key</p>
                  <p className="mt-3 break-all text-sm text-slate-200">
                    {publicKey || "No wallet connected yet."}
                  </p>
                </div>

                <div className="balance-panel rounded-3xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Balance</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{connected ? `${balance} XLM` : "—"}</p>
                    </div>
                    <button
                      onClick={refreshBalance}
                      disabled={!connected}
                      className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {connected ? "Connected wallet balance on Testnet." : "Connect to view your balance."}
                  </p>
                </div>

                <div className="send-panel rounded-3xl border border-slate-800 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Send XLM</p>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm text-slate-300">
                      Recipient address
                      <input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="G..."
                        className="dashboard-input"
                      />
                    </label>

                    <label className="block text-sm text-slate-300">
                      Amount (XLM)
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                        type="number"
                        min="0"
                        step="0.0000001"
                        className="dashboard-input"
                      />
                    </label>

                    <button
                      onClick={handleSendPayment}
                      disabled={!connected || isSubmitting}
                      className={`dashboard-input button-primary ${
                        connected ? "shadow-lg shadow-sky-500/15" : "opacity-60 cursor-not-allowed"
                      } ${isSubmitting ? "opacity-70 cursor-wait" : ""}`}
                    >
                      {isSubmitting ? "Sending..." : "Send Payment"}
                    </button>
                  </div>
                </div>

                {txResult && (
                  <div className={`rounded-3xl border px-5 py-4 ${txResult.status === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"}`}>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em]">
                      {txResult.status === "success" ? "Transaction success" : "Transaction failed"}
                    </p>
                    <p className="mt-3 text-sm leading-6">{txResult.message}</p>
                    {txResult.hash && (
                      <p className="mt-3 break-all text-sm text-slate-200">
                        Hash: {txResult.hash}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={connectWallet}
                  disabled={connected || !isSupportedProvider}
                  className={`inline-flex w-full items-center justify-center rounded-3xl px-6 py-4 text-sm font-semibold text-white transition duration-200 sm:w-auto ${
                    connected
                      ? "bg-emerald-500/90 hover:bg-emerald-500 cursor-not-allowed"
                      : "button-primary"
                  } ${!isSupportedProvider ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {connected ? "Connected" : `Connect ${selectedProvider?.label}`}
                </button>

                <button
                  onClick={disconnectWallet}
                  disabled={!connected}
                  className="inline-flex w-full items-center justify-center rounded-3xl border border-slate-700 bg-slate-950 px-6 py-4 text-sm font-semibold text-slate-200 transition duration-200 hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Disconnect
                </button>
              </div>

              {error && (
                <div className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
