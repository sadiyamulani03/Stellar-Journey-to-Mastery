import {signTransaction, setAllowed, getAddress} from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

const checkConnection = async () => {
  return await setAllowed();
};

const retrievePublicKey = async () => {
  const { address } = await getAddress();
  return address;
};

const getBalance = async () => {
  await setAllowed();

  const { address } = await getAddress();
  const account = await server.loadAccount(address);
  const xlm = account.balances.find((b) => b.asset_type === 'native');

  return xlm?.balance || '0';
};

const sendPayment = async (destination, amount) => {
  await setAllowed();

  const { address } = await getAddress();
  const account = await server.loadAccount(address);

  // Preflight: check whether destination account exists on the network
  let destinationExists = true;
  try {
    await server.loadAccount(destination);
  } catch (e) {
    destinationExists = false;
  }

  // Compute reserves and available balance to avoid op_low_reserve failures.
  // Fetch current base_reserve_in_stroops from Horizon (most recent ledger).
  const nativeBalEntry = account.balances.find((b) => b.asset_type === 'native');
  const nativeBalance = Number(nativeBalEntry?.balance || 0);
  const subentryCount = account.subentry_count || 0;

  let baseReserve = 0.5; // fallback (XLM)
  try {
    const ledgerResp = await server.ledgers().order('desc').limit(1).call();
    const baseReserveInStroops = Number(ledgerResp.records?.[0]?.base_reserve_in_stroops || 5000000);
    baseReserve = baseReserveInStroops / 1e7;
  } catch (e) {
    console.warn('Unable to fetch base_reserve from Horizon, using fallback 0.5 XLM', e);
  }

  const minBalance = (2 + subentryCount) * baseReserve;
  const feeXLM = Number(StellarSdk.BASE_FEE || 100) / 1e7;
  const availableForSend = nativeBalance - minBalance - feeXLM;

  console.debug('Reserve check:', { nativeBalance, subentryCount, minBalance, feeXLM, baseReserve, destinationExists });

  // For CreateAccount the starting balance must cover at least the minimum reserve for a new account
  if (!destinationExists) {
    const minStarting = 2 * baseReserve;
    if (Number(amount) < minStarting) {
      const err = new Error(`Starting balance too low for CreateAccount. Minimum: ${minStarting} XLM`);
      err.horizon = { extras: { result_codes: { transaction: 'tx_failed', operations: ['op_low_reserve'] } } };
      throw err;
    }
  }

  // For CreateAccount: sender must have enough to send the starting balance AND maintain own reserve
  // For Payment: sender must have enough to send amount AND maintain own reserve
  const sendAmount = Number(amount);
  const requiredSenderBalance = minBalance + feeXLM + sendAmount;

  if (nativeBalance < requiredSenderBalance) {
    const needed = requiredSenderBalance - nativeBalance;
    const err = new Error(`Insufficient balance. Have ${nativeBalance.toFixed(7)} XLM. Need ${requiredSenderBalance.toFixed(7)} XLM (reserve: ${minBalance.toFixed(7)}, fee: ${feeXLM.toFixed(7)}, send: ${sendAmount.toFixed(7)}). Add ${needed.toFixed(7)} XLM to proceed.`);
    err.horizon = { extras: { result_codes: { transaction: 'tx_failed', operations: ['op_low_reserve'] } } };
    throw err;
  }

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
    // Destination doesn't exist — create it with `CreateAccount` using the provided amount
    txBuilder.addOperation(
      StellarSdk.Operation.createAccount({
        destination,
        startingBalance: amount.toString(),
      }),
    );
  }

  const transaction = txBuilder.setTimeout(30).build();

  try {
    // Freighter returns an object with the signed XDR (commonly `signedTxXdr`)
    const signed = await signTransaction(transaction.toXDR(), {
      networkPassphrase: StellarSdk.Networks.TESTNET,
      accountToSign: address,
    });

    console.debug('Freighter signed response:', signed);

    // support a few possible response shapes
    const signedXdr = signed?.signedTxXdr || signed?.signedXdr || signed;

    const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      StellarSdk.Networks.TESTNET,
    );

    try {
      return await server.submitTransaction(signedTransaction);
    } catch (submitErr) {
      // Try to surface Horizon error details when available
      const details = submitErr?.response?.data || submitErr?.data || submitErr?.message || submitErr;
      console.error('Horizon submit error:', details, submitErr);
      const msg = typeof details === 'object' ? JSON.stringify(details) : String(details);
      const err = new Error(`Horizon submit failed: ${msg}`);
      // attach parsed horizon details for upstream handling
      try {
        err.horizon = typeof details === 'string' ? JSON.parse(details) : details;
      } catch (parseErr) {
        err.horizon = details;
      }
      throw err;
    }
  } catch (err) {
    console.error('sendPayment failed:', err);
    throw err;
  }
};

export {checkConnection, retrievePublicKey, getBalance, sendPayment};