import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Initialize StellarWalletsKit with default modules (supporting Freighter, Albedo, Hana, Lobstr, xBull, etc.)
StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: defaultModules(),
});

const kit = StellarWalletsKit;

/**
 * Open the StellarWalletsKit modal to connect a wallet.
 * Returns the public key address.
 */
const connectWallet = async () => {
  try {
    const { address } = await StellarWalletsKit.authModal();
    return address;
  } catch (e) {
    console.error('Wallet connection failed:', e);
    
    // Normalize and throw structured errors
    const errMsg = e?.message || String(e);
    if (errMsg.includes('closed') || errMsg.includes('dismissed')) {
      const err = new Error('Wallet connection cancelled by the user.');
      err.code = 'USER_REJECTED';
      throw err;
    }
    
    if (errMsg.includes('not found') || errMsg.includes('install')) {
      const err = new Error('Selected wallet not found. Please install the wallet extension to continue.');
      err.code = 'WALLET_NOT_FOUND';
      throw err;
    }

    throw e;
  }
};

/**
 * Disconnect the current wallet session.
 */
const disconnectWallet = async () => {
  try {
    await StellarWalletsKit.disconnect();
  } catch (e) {
    console.warn('Disconnect error:', e);
  }
};

/**
 * Retrieve the balance of the connected account.
 */
const getBalance = async (address) => {
  if (!address) return '0';
  try {
    const account = await server.loadAccount(address);
    const xlm = account.balances.find((b) => b.asset_type === 'native');
    return xlm?.balance || '0';
  } catch (e) {
    console.error('Failed to load account balance:', e);
    // If account doesn't exist on testnet yet, return '0'
    if (e?.response?.status === 404) {
      return '0';
    }
    throw e;
  }
};

/**
 * Send an XLM payment using the active wallet in the kit.
 */
const sendPayment = async (senderAddress, destination, amount) => {
  if (!senderAddress) {
    throw new Error('No wallet connected.');
  }

  // Pre-flight check: Load sender account
  let account;
  try {
    account = await server.loadAccount(senderAddress);
  } catch (e) {
    if (e?.response?.status === 404) {
      const err = new Error('Sender account does not exist or has not been funded. Fund your wallet on Testnet using Friendbot first.');
      err.code = 'INSUFFICIENT_BALANCE';
      throw err;
    }
    throw e;
  }

  // Pre-flight check: Destination account existence
  let destinationExists = true;
  try {
    await server.loadAccount(destination);
  } catch (e) {
    destinationExists = false;
  }

  // Reserve and balance check to prevent op_low_reserve
  const nativeBalEntry = account.balances.find((b) => b.asset_type === 'native');
  const nativeBalance = Number(nativeBalEntry?.balance || 0);
  const subentryCount = account.subentry_count || 0;

  let baseReserve = 0.5; // default fallback (XLM)
  try {
    const ledgerResp = await server.ledgers().order('desc').limit(1).call();
    const baseReserveInStroops = Number(ledgerResp.records?.[0]?.base_reserve_in_stroops || 5000000);
    baseReserve = baseReserveInStroops / 1e7;
  } catch (e) {
    console.warn('Unable to fetch base_reserve from Horizon, using fallback 0.5 XLM', e);
  }

  const minBalance = (2 + subentryCount) * baseReserve;
  const feeXLM = Number(StellarSdk.BASE_FEE || 100) / 1e7;
  const sendAmount = Number(amount);

  // If destination doesn't exist, we must use CreateAccount. Starting balance must cover new account minimum reserve.
  if (!destinationExists) {
    const minStarting = 2 * baseReserve;
    if (sendAmount < minStarting) {
      const err = new Error(`Starting balance too low for new account. Minimum required is ${minStarting} XLM.`);
      err.code = 'INSUFFICIENT_BALANCE';
      throw err;
    }
  }

  const requiredSenderBalance = minBalance + feeXLM + sendAmount;
  if (nativeBalance < requiredSenderBalance) {
    const needed = requiredSenderBalance - nativeBalance;
    const err = new Error(`Insufficient balance. Have ${nativeBalance.toFixed(2)} XLM. Need ${requiredSenderBalance.toFixed(2)} XLM (reserve: ${minBalance.toFixed(2)}, fee: ${feeXLM.toFixed(4)}, send: ${sendAmount.toFixed(2)}). You need ${needed.toFixed(2)} more XLM.`);
    err.code = 'INSUFFICIENT_BALANCE';
    throw err;
  }

  // Build the payment transaction
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });

  if (destinationExists) {
    txBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      }),
    );
  } else {
    txBuilder.addOperation(
      StellarSdk.Operation.createAccount({
        destination,
        startingBalance: amount.toString(),
      }),
    );
  }

  const transaction = txBuilder.setTimeout(30).build();

  try {
    // Sign transaction using the kit
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(transaction.toXDR(), {
      address: senderAddress,
    });

    const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      StellarSdk.Networks.TESTNET,
    );

    // Submit transaction to Horizon
    try {
      return await server.submitTransaction(signedTransaction);
    } catch (submitErr) {
      console.error('Horizon submit error:', submitErr);
      const details = submitErr?.response?.data || submitErr;
      const msg = typeof details === 'object' ? JSON.stringify(details) : String(details);
      throw new Error(`Horizon transaction submission failed: ${msg}`);
    }
  } catch (err) {
    console.error('sendPayment failed:', err);
    
    // Normalize user cancellation / rejection errors
    const errMsg = err?.message || String(err);
    if (errMsg.includes('reject') || errMsg.includes('cancel') || errMsg.includes('decline') || errMsg.includes('close')) {
      const rejectErr = new Error('Transaction signing was rejected by the user.');
      rejectErr.code = 'USER_REJECTED';
      throw rejectErr;
    }
    
    throw err;
  }
};

/**
 * Start a stream of payments for a given address.
 */
const startPaymentStream = (address, onMessage, onError) => {
  if (!address) return () => {};

  const stop = server
    .payments()
    .forAccount(address)
    .cursor('now')
    .stream({
      onmessage: (payment) => {
        try {
          onMessage && onMessage(payment);
        } catch (e) {
          console.error('payment stream onMessage handler failed', e);
        }
      },
      onerror: (err) => {
        console.error('payment stream error', err);
        onError && onError(err);
      },
    });

  return () => {
    try {
      stop();
    } catch (e) {
      console.warn('Failed to stop payment stream', e);
    }
  };
};

export {
  kit,
  connectWallet,
  disconnectWallet,
  getBalance,
  sendPayment,
  startPaymentStream,
};