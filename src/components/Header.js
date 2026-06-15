import React, { useState, useEffect, useRef } from "react";
import { connectWallet, disconnectWallet, getBalance, sendPayment, startPaymentStream, kit } from "./Freighter";
import { logPaymentOnChain, fetchPaymentFromChain, getPaymentCountFromChain } from "./contracts";
import TransactionList from "./TransactionList";

const walletProviders = [
  {
    id: "stellar-wallets-kit",
    label: "Stellar Wallets Kit",
    description: "Connect via Freighter, Albedo, Hana, LOBSTR, and more using a unified selector.",
    status: "supported",
  },
];

const Header = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txResult, setTxResult] = useState(null);
  const [contractTxStatus, setContractTxStatus] = useState(null);
  const [txList, setTxList] = useState([]);
  const [contractLogs, setContractLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [monitorAccount, setMonitorAccount] = useState("");
  const [monitoredAccount, setMonitoredAccount] = useState("");
  const monitorStopRef = useRef(null);
  const streamStopRef = useRef(null);

  const refreshBalance = async () => {
    if (!publicKey) return;
    try {
      const bal = await getBalance(publicKey);
      setBalance(Number(bal).toFixed(2));
    } catch (e) {
      console.error(e);
      setError("Unable to refresh balance. Check console for details.");
    }
  };

  const connectWalletHandler = async () => {
    try {
      setError("");
      setTxResult(null);
      setContractTxStatus(null);
      
      const key = await connectWallet();
      const bal = await getBalance(key);

      setPublicKey(key);
      setBalance(Number(bal).toFixed(2));
      setConnected(true);

      // Start listening for incoming/outgoing payments for this account
      try {
        if (streamStopRef.current) {
          streamStopRef.current();
          streamStopRef.current = null;
        }

        streamStopRef.current = startPaymentStream(key, (payment) => {
          const item = {
            id: payment.id || `srv-${Date.now()}`,
            hash: payment.transaction_hash || payment.transactionId || null,
            type: payment.type,
            from: payment.from,
            to: payment.to || payment.account || null,
            amount: payment.amount || null,
            asset_type: payment.asset_type || (payment.asset && payment.asset.type) || 'native',
            created_at: payment.created_at || new Date().toISOString(),
            status: 'success',
          };
          setTxList((s) => [item, ...s]);
        }, (err) => {
          console.warn('Stream error:', err);
        });
      } catch (e) {
        console.warn('Unable to start payment stream', e);
      }
    } catch (e) {
      console.error('Connection handler failed:', e);
      if (e.code === 'USER_REJECTED') {
        setError('Wallet connection cancelled by user.');
      } else if (e.code === 'WALLET_NOT_FOUND') {
        setError(e.message);
      } else {
        setError(e.message || "Unable to connect wallet.");
      }
    }
  };

  const startMonitorStream = (account) => {
    if (!account) return;
    try {
      if (monitorStopRef.current) {
        monitorStopRef.current();
        monitorStopRef.current = null;
      }

      monitorStopRef.current = startPaymentStream(account, (payment) => {
        const item = {
          id: payment.id || `srv-${Date.now()}`,
          hash: payment.transaction_hash || payment.transactionId || null,
          type: payment.type,
          from: payment.from,
          to: payment.to || payment.account || null,
          amount: payment.amount || null,
          asset_type: payment.asset_type || (payment.asset && payment.asset.type) || 'native',
          created_at: payment.created_at || new Date().toISOString(),
          status: 'success',
          monitored: true,
        };
        setTxList((s) => [item, ...s]);
      }, (err) => {
        console.warn('Monitor stream error:', err);
      });

      setMonitoredAccount(account);
    } catch (e) {
      console.warn('Failed to start monitor stream', e);
    }
  };

  const stopMonitorStream = () => {
    try {
      if (monitorStopRef.current) {
        monitorStopRef.current();
        monitorStopRef.current = null;
      }
      setMonitoredAccount("");
    } catch (e) {
      console.warn('Failed to stop monitor stream', e);
    }
  };

  const disconnectWalletHandler = async () => {
    await disconnectWallet();
    setConnected(false);
    setPublicKey("");
    setBalance("0");
    setError("");
    setDestination("");
    setAmount("");
    setTxResult(null);
    setContractTxStatus(null);
    try {
      if (streamStopRef.current) {
        streamStopRef.current();
        streamStopRef.current = null;
      }
    } catch (e) {
      console.warn('Failed to stop stream on disconnect', e);
    }
  };

  const handleSendPayment = async () => {
    if (!destination || !amount) {
      setError("Enter destination and amount before sending.");
      return;
    }

    setError("");
    setTxResult(null);
    setContractTxStatus(null);
    setIsSubmitting(true);

    const localId = `local-${Date.now()}`;
    const localEntry = {
      id: localId,
      status: 'pending',
      from: publicKey,
      to: destination,
      amount,
      localTime: new Date().toISOString(),
    };
    setTxList((s) => [localEntry, ...s]);

    try {
      // 1. Send transaction via Horizon
      const result = await sendPayment(publicKey, destination, amount);
      
      setTxList((s) => s.map((t) => (t.id === localId ? { ...t, status: 'success', hash: result.hash } : t)));
      setTxResult({
        status: "success",
        hash: result.hash,
        message: "Payment sent successfully on Stellar testnet!",
      });

      await refreshBalance();

      // 2. Log payment on-chain via smart contract invocation
      setContractTxStatus({ status: 'pending', message: 'Logging transaction on-chain via smart contract...' });
      
      try {
        const logResult = await logPaymentOnChain(kit, publicKey, result.hash, publicKey, destination, Number(amount));
        setContractTxStatus({
          status: 'success',
          hash: logResult.hash,
          message: `On-chain logging verified! Log ID: ${logResult.payId || 'Success'}`
        });
        // Reload contract history
        await loadContractLogs();
      } catch (contractErr) {
        console.error('Contract logging error:', contractErr);
        setContractTxStatus({
          status: 'error',
          message: `Failed to log payment on-chain: ${contractErr.message || contractErr}`
        });
      }

      setDestination("");
      setAmount("");
    } catch (e) {
      console.error(e);
      
      setTxList((s) => s.map((t) => (t.id === localId ? { ...t, status: 'failed', message: e.message } : t)));

      // Structured error reporting
      let userMsg = e.message || "Transaction failed.";
      if (e.code === 'USER_REJECTED') {
        userMsg = "Transaction was rejected in your wallet extension.";
      } else if (e.code === 'INSUFFICIENT_BALANCE') {
        userMsg = e.message;
      }

      setTxResult({
        status: "error",
        message: userMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadContractLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const count = await getPaymentCountFromChain();
      const logs = [];
      // Fetch up to the last 5 logs for performance
      const start = Math.max(1, count - 4);
      for (let i = count; i >= start; i--) {
        const log = await fetchPaymentFromChain(i);
        if (log) {
          logs.push(log);
        }
      }
      setContractLogs(logs);
    } catch (e) {
      console.error("Failed to load contract logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Synchronize contract state on mount and update periodically
  useEffect(() => {
    loadContractLogs();
    const interval = setInterval(() => {
      loadContractLogs();
    }, 12000); // poll every 12 seconds
    return () => clearInterval(interval);
  }, []);

  // Load and save local tx list
  useEffect(() => {
    try {
      const saved = localStorage.getItem('txList');
      if (saved) {
        setTxList(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load txList from localStorage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('txList', JSON.stringify(txList));
    } catch (e) {
      console.warn('Failed to persist txList to localStorage', e);
    }
  }, [txList]);

  // cleanup
  useEffect(() => {
    return () => {
      try {
        if (streamStopRef.current) {
          streamStopRef.current();
        }
        if (monitorStopRef.current) {
          monitorStopRef.current();
        }
      } catch (e) {
        // noop
      }
    };
  }, []);

  return (
    <header className="dashboard-header">
      <div className="dashboard-wrapper">
        <div className="dashboard-container">
          <div className="dashboard-grid">
            <div className="dashboard-panel">
              <span className="section-title">
                <b>Stellar Payment Tracker</b>
              </span>

              <p className="hero-copy">
                Connect via Freighter, Albedo, LOBSTR, or Hana. Send XLM payments and log details on-chain using our Soroban Smart Contract.
              </p>

              <div className="mt-10 wallet-grid">
                {walletProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="group flex flex-col justify-between rounded-3xl border border-cyan-400 bg-sky-500/10 px-5 py-6 text-left shadow-[0_20px_80px_-40px_rgba(56,189,248,0.35)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-white">{provider.label}</span>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                          Unified Kit
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{provider.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* On-Chain Logs Section */}
              <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">On-Chain Contract Logs (Real-time)</h3>
                  <button onClick={loadContractLogs} className="text-xs text-sky-400 hover:text-sky-300">Refresh</button>
                </div>

                {isLoadingLogs && contractLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">Querying Soroban contract state...</p>
                ) : contractLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No payment logs found on-chain yet.</p>
                ) : (
                  <div className="space-y-4">
                    {contractLogs.map((log) => (
                      <div key={log.pay_id} className="rounded-2xl bg-slate-900/50 p-4 border border-slate-800 text-xs">
                        <div className="flex justify-between items-center text-slate-400 mb-2">
                          <span className="font-bold text-sky-400">Log #{log.pay_id}</span>
                          <span>{log.amount} XLM</span>
                        </div>
                        <p className="truncate text-slate-300"><span className="text-slate-500">From:</span> {log.from}</p>
                        <p className="truncate text-slate-300"><span className="text-slate-500">To:</span> {log.to}</p>
                        <p className="truncate text-slate-400 mt-1">
                          <span className="text-slate-500">Tx Hash:</span>{' '}
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${log.tx_hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-cyan-400 hover:underline"
                          >
                            {log.tx_hash.substring(0, 10)}...{log.tx_hash.substring(log.tx_hash.length - 10)}
                          </a>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Wallet status</p>
                  <p className="mt-2 text-2xl font-semibold status-text">{connected ? "Connected" : "Not connected"}</p>
                </div>
                {connected && (
                  <div className="rounded-3xl bg-slate-800 px-4 py-2 text-sm font-semibold provider-label">
                    Active
                  </div>
                )}
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
                      {isSubmitting ? "Processing..." : "Send Payment"}
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
                        Horizon Hash:{' '}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline"
                        >
                          {txResult.hash}
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {contractTxStatus && (
                  <div className={`rounded-3xl border px-5 py-4 ${contractTxStatus.status === "success" ? "border-sky-500/30 bg-sky-500/10 text-sky-200" : contractTxStatus.status === "pending" ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-200 animate-pulse" : "border-red-500/20 bg-red-500/10 text-red-200"}`}>
                    <p className="text-sm font-semibold uppercase tracking-[0.26em]">
                      {contractTxStatus.status === "success" ? "Soroban On-Chain Logged" : contractTxStatus.status === "pending" ? "Soroban Logging Pending" : "Soroban Logging Failed"}
                    </p>
                    <p className="mt-3 text-sm leading-6">{contractTxStatus.message}</p>
                    {contractTxStatus.hash && (
                      <p className="mt-3 break-all text-sm text-slate-200">
                        Soroban Hash:{' '}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${contractTxStatus.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline"
                        >
                          {contractTxStatus.hash}
                        </a>
                      </p>
                    )}
                  </div>
                )}
                
                <div className="mt-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Recent Horizon activity</p>
                  <div className="mt-3">
                    <div className="mb-4">
                      <label className="block text-xs text-slate-400">Monitor account (G...)</label>
                      <div className="flex gap-2 mt-2">
                        <input value={monitorAccount} onChange={(e) => setMonitorAccount(e.target.value)} placeholder="Paste public key to monitor" className="dashboard-input" />
                        {!monitoredAccount ? (
                          <button onClick={() => startMonitorStream(monitorAccount)} className="button-primary">Start</button>
                        ) : (
                          <button onClick={stopMonitorStream} className="button-secondary">Stop</button>
                        )}
                      </div>
                      {monitoredAccount && <p className="text-xs text-slate-400 mt-2">Monitoring: {monitoredAccount}</p>}
                    </div>

                    <TransactionList items={txList} />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {!connected ? (
                  <button
                    onClick={connectWalletHandler}
                    className="inline-flex w-full items-center justify-center rounded-3xl px-6 py-4 text-sm font-semibold text-white transition duration-200 sm:w-auto button-primary"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={disconnectWalletHandler}
                    className="inline-flex w-full items-center justify-center rounded-3xl border border-slate-700 bg-slate-950 px-6 py-4 text-sm font-semibold text-slate-200 transition duration-200 hover:border-slate-500 hover:bg-slate-900 sm:w-auto"
                  >
                    Disconnect
                  </button>
                )}
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
