// Helper functions to interact with the Stellar on-chain contract
import * as StellarSdk from '@stellar/stellar-sdk';

const { rpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Account, Networks } = StellarSdk;

// Default contract addresses on Testnet. Can be changed if redeployed.
export const PAYMENT_LOGGER_CONTRACT_ID = 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ';
export const LOYALTY_TOKEN_CONTRACT_ID = 'CCIWJOKEYK623T4O72D6Q3W4H5LSPYCRQ6Z47VQDTRMEYV3JCPXU636F';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

const rpcServer = new rpc.Server(RPC_URL);
const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Dummy account for read-only simulations
const DUMMY_PUBLIC_KEY = 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24';

/**
 * Helper to simulate a read-only contract call.
 */
const simulateCall = async (contractId, functionName, ...args) => {
  try {
    const dummyAccount = new Account(DUMMY_PUBLIC_KEY, '0');
    const contract = new Contract(contractId);
    
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
    console.error(`Error in simulateCall for ${functionName} on ${contractId}:`, e);
    throw e;
  }
};

/**
 * Fetch total payments logged on-chain.
 */
export const getPaymentCountFromChain = async () => {
  const count = await simulateCall(PAYMENT_LOGGER_CONTRACT_ID, 'get_count');
  return count ? Number(count) : 0;
};

/**
 * Fetch a specific logged payment by its ID.
 */
export const fetchPaymentFromChain = async (payId) => {
  const result = await simulateCall(PAYMENT_LOGGER_CONTRACT_ID, 'fetch_payment', nativeToScVal(BigInt(payId), { type: 'u64' }));
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
 * Fetch loyalty points balance for a public key.
 */
export const getPointsFromChain = async (userKey) => {
  try {
    const points = await simulateCall(
      LOYALTY_TOKEN_CONTRACT_ID,
      'get_points',
      nativeToScVal(userKey, { type: 'string' })
    );
    return points ? Number(points) : 0;
  } catch (e) {
    console.warn('Unable to fetch loyalty points:', e);
    return 0;
  }
};

/**
 * Log a payment on-chain by calling the contract.
 */
export const logPaymentOnChain = async (kit, publicKey, txHash, from, to, amount) => {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const contract = new Contract(PAYMENT_LOGGER_CONTRACT_ID);
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

    const preparedTx = await rpcServer.prepareTransaction(rawTx);

    const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
      address: publicKey,
    });

    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

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
