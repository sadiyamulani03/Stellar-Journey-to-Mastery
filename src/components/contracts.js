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
      console.warn(`Simulation failed for ${functionName} on ${contractId}: ${sim.error}`);
      return null;
    }

    if (sim.result && sim.result.retval) {
      return scValToNative(sim.result.retval);
    }
    return null;
  } catch (e) {
    console.warn(`Error in simulateCall for ${functionName} on ${contractId}:`, e);
    return null;
  }
};

/**
 * Helper to sign and submit a transaction.
 */
const signAndSubmitTransaction = async (
  kit,
  publicKey,
  contractId,
  functionName,
  args
) => {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const contract = new Contract(contractId);

    const rawTx = new TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(60)
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

    let retries = 15;
    while (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResp = await rpcServer.getTransaction(sendResponse.hash);
      
      if (statusResp.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return sendResponse.hash;
      } else if (statusResp.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction execution failed: ${statusResp.resultXdr}`);
      }
      retries--;
    }
    throw new Error('Transaction execution timed out.');
  } catch (err) {
    console.error(`Error executing ${functionName} on contract ${contractId}:`, err);
    throw err;
  }
};

/**
 * Fetch total payments/agreements logged on-chain.
 */
export const getPaymentCountFromChain = async () => {
  const count = await simulateCall(PAYMENT_LOGGER_CONTRACT_ID, 'get_count');
  return count ? Number(count) : 0;
};

/**
 * Fetch a specific agreement by its ID and map to the legacy payment shape.
 */
export const fetchPaymentFromChain = async (payId) => {
  const result = await simulateCall(
    PAYMENT_LOGGER_CONTRACT_ID,
    'fetch_agreement',
    nativeToScVal(BigInt(payId), { type: 'u64' })
  );

  if (!result || result.id === 0n || result.id === 0) {
    return null;
  }

  return {
    pay_id: Number(result.id),
    tx_hash: 'mock_tx_hash_' + Number(result.id),
    from: result.employer,
    to: result.contractor,
    amount: Number(result.amount) / 1e7,
  };
};

/**
 * Fetch loyalty points balance for a public key.
 */
export const getPointsFromChain = async (userKey) => {
  try {
    const scValUser = nativeToScVal(StellarSdk.Address.fromString(userKey));
    const points = await simulateCall(
      LOYALTY_TOKEN_CONTRACT_ID,
      'get_points',
      scValUser
    );
    return points ? Number(points) : 0;
  } catch (e) {
    console.warn('Unable to fetch loyalty points:', e);
    return 0;
  }
};

/**
 * Log a payment on-chain by calling create_agreement.
 */
export const logPaymentOnChain = async (kit, publicKey, txHash, from, to, amount) => {
  try {
    const amountStroops = BigInt(Math.round(amount * 1e7));
    const scEmployer = nativeToScVal(StellarSdk.Address.fromString(from));
    const scContractor = nativeToScVal(StellarSdk.Address.fromString(to));
    const defaultToken = 'CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2H2MWMCD42Y4AYQXSWGWHPQ2';
    const scToken = nativeToScVal(StellarSdk.Address.fromString(defaultToken));
    const scAmount = nativeToScVal(amountStroops, { type: 'i128' });
    const scTitle = nativeToScVal('Logged Payment ' + txHash.substring(0, 8), { type: 'string' });

    const hash = await signAndSubmitTransaction(
      kit,
      publicKey,
      PAYMENT_LOGGER_CONTRACT_ID,
      'create_agreement',
      [scEmployer, scContractor, scToken, scAmount, scTitle]
    );

    return {
      hash,
      payId: 1, // Simulated payId fallback
    };
  } catch (e) {
    console.error('Failed to log payment on-chain:', e);
    throw e;
  }
};

/**
 * Modern integration APIs to ensure complete parity with stellar.ts
 */
export const createAgreementOnChain = async (
  kit,
  employer,
  contractor,
  token,
  amount,
  title
) => {
  const amountStroops = BigInt(Math.round(amount * 1e7));
  const scEmployer = nativeToScVal(StellarSdk.Address.fromString(employer));
  const scContractor = nativeToScVal(StellarSdk.Address.fromString(contractor));
  const scToken = nativeToScVal(StellarSdk.Address.fromString(token));
  const scAmount = nativeToScVal(amountStroops, { type: 'i128' });
  const scTitle = nativeToScVal(title, { type: 'string' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'create_agreement',
    [scEmployer, scContractor, scToken, scAmount, scTitle]
  );
};

export const fundAgreementOnChain = async (kit, employer, agreementId) => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'fund_agreement',
    [scId]
  );
};

export const releasePaymentOnChain = async (kit, employer, agreementId) => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'release_payment',
    [scId]
  );
};

export const cancelAgreementOnChain = async (kit, employer, agreementId) => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'cancel_agreement',
    [scId]
  );
};
