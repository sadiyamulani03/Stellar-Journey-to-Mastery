// Helper functions to interact with the Stellar on-chain contract
import * as StellarSdk from '@stellar/stellar-sdk';

const { rpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Account, Networks } = StellarSdk;

const CONTRACT_ID = 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const rpcServer = new rpc.Server(RPC_URL);
const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Dummy account for read-only simulations
const DUMMY_PUBLIC_KEY = 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24';

/**
 * Helper to simulate a read-only contract call.
 */
const simulateCall = async (functionName, ...args) => {
  try {
    const dummyAccount = new Account(DUMMY_PUBLIC_KEY, '0');
    const contract = new Contract(CONTRACT_ID);
    
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const sim = await rpcServer.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    if (sim.result && sim.result.retval) {
      return scValToNative(sim.result.retval);
    }
    return null;
  } catch (e) {
    console.error(`Error in simulateCall for ${functionName}:`, e);
    throw e;
  }
};

/**
 * Fetch total payments logged on-chain.
 */
export const getPaymentCountFromChain = async () => {
  const count = await simulateCall('get_count');
  return count ? Number(count) : 0;
};

/**
 * Fetch a specific logged payment by its ID.
 */
export const fetchPaymentFromChain = async (payId) => {
  const result = await simulateCall('fetch_payment', nativeToScVal(BigInt(payId), { type: 'u64' }));
  if (!result || result.pay_id === 0n || result.pay_id === 0) {
    return null;
  }
  return {
    pay_id: Number(result.pay_id),
    tx_hash: result.tx_hash,
    from: result.from,
    to: result.to,
    amount: Number(result.amount) / 1e7, // convert stroops back to XLM
  };
};

/**
 * Log a payment on-chain by calling the contract.
 * @param {object} kit - StellarWalletsKit instance
 * @param {string} publicKey - User's public key
 * @param {string} txHash - Payment transaction hash
 * @param {string} from - Sender public key
 * @param {string} to - Recipient public key
 * @param {number} amount - XLM amount
 */
export const logPaymentOnChain = async (kit, publicKey, txHash, from, to, amount) => {
  try {
    // 1. Load account sequence using Horizon
    const account = await horizonServer.loadAccount(publicKey);
    
    // 2. Build transaction with operation to invoke contract
    const contract = new Contract(CONTRACT_ID);
    
    // amount in stroops (Soroban i128)
    const amountStroops = BigInt(Math.round(amount * 1e7));

    const rawTx = new TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'log_payment',
          nativeToScVal(txHash, { type: 'string' }),
          nativeToScVal(from, { type: 'string' }),
          nativeToScVal(to, { type: 'string' }),
          nativeToScVal(amountStroops, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    // 3. Prepare transaction (simulate and add footprint/fees)
    const preparedTx = await rpcServer.prepareTransaction(rawTx);

    // 4. Sign transaction via Wallet Kit
    const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
      address: publicKey,
    });

    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

    // 5. Submit transaction and poll status
    const sendResponse = await rpcServer.sendTransaction(signedTx);
    if (sendResponse.status !== 'PENDING') {
      throw new Error(`Contract transaction submission failed with status: ${sendResponse.status}`);
    }

    const finalStatus = await rpcServer.pollTransaction(sendResponse.hash);
    if (finalStatus.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Contract call failed on-chain. Status: ${finalStatus.status}`);
    }

    return {
      hash: sendResponse.hash,
      payId: finalStatus.returnValue ? scValToNative(finalStatus.returnValue) : null,
    };
  } catch (e) {
    console.error('Failed to log payment on-chain:', e);
    throw e;
  }
};
