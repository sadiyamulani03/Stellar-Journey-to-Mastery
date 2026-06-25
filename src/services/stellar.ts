import * as StellarSdk from '@stellar/stellar-sdk';

const { rpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Account, Networks: SDKNetworks } = StellarSdk;

// Default contract addresses on Testnet. Can be changed if redeployed.
export const PAYMENT_LOGGER_CONTRACT_ID = 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ';
export const LOYALTY_TOKEN_CONTRACT_ID = 'CCIWJOKEYK623T4O72D6Q3W4H5LSPYCRQ6Z47VQDTRMEYV3JCPXU636F';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export const rpcServer = new rpc.Server(RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Dummy account for read-only simulations
const DUMMY_PUBLIC_KEY = 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24';

export interface AgreementData {
  id: number;
  employer: string;
  contractor: string;
  token: string;
  amount: number;
  status: number; // 0 = Created, 1 = Funded/Active, 2 = Completed, 3 = Cancelled
  title: string;
}

/**
 * Helper to simulate a read-only contract call.
 */
const simulateCall = async (contractId: string, functionName: string, ...args: any[]) => {
  try {
    const dummyAccount = new Account(DUMMY_PUBLIC_KEY, '0');
    const contract = new Contract(contractId);
    
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: SDKNetworks.TESTNET,
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
 * Fetch total agreements count from contract.
 */
export const getAgreementCount = async (): Promise<number> => {
  try {
    const count = await simulateCall(PAYMENT_LOGGER_CONTRACT_ID, 'get_count');
    return count ? Number(count) : 0;
  } catch (e) {
    console.error('Failed to get agreement count:', e);
    return 0;
  }
};

/**
 * Fetch a specific agreement.
 */
export const fetchAgreement = async (id: number): Promise<AgreementData | null> => {
  try {
    const result = await simulateCall(
      PAYMENT_LOGGER_CONTRACT_ID,
      'fetch_agreement',
      nativeToScVal(BigInt(id), { type: 'u64' })
    );

    if (!result || result.id === 0n || result.id === 0) {
      return null;
    }

    return {
      id: Number(result.id),
      employer: result.employer,
      contractor: result.contractor,
      token: result.token,
      amount: Number(result.amount) / 1e7,
      status: Number(result.status),
      title: result.title || 'Escrow Agreement',
    };
  } catch (e) {
    console.error(`Failed to fetch agreement ${id}:`, e);
    return null;
  }
};

/**
 * Fetch all agreements.
 */
export const fetchAllAgreements = async (): Promise<AgreementData[]> => {
  const count = await getAgreementCount();
  const list: AgreementData[] = [];
  for (let i = 1; i <= count; i++) {
    const item = await fetchAgreement(i);
    if (item) {
      list.push(item);
    }
  }
  return list;
};

/**
 * Fetch loyalty points balance for an address.
 */
export const getPoints = async (userAddress: string): Promise<number> => {
  try {
    const scValUser = nativeToScVal(StellarSdk.Address.fromString(userAddress));
    const points = await simulateCall(
      LOYALTY_TOKEN_CONTRACT_ID,
      'get_points',
      scValUser
    );
    return points ? Number(points) : 0;
  } catch (e) {
    console.warn(`Unable to fetch loyalty points for ${userAddress}:`, e);
    return 0;
  }
};

/**
 * Sign and submit a transaction using StellarWalletsKit.
 */
const signAndSubmitTransaction = async (
  kit: any,
  publicKey: string,
  contractId: string,
  functionName: string,
  args: any[]
): Promise<string> => {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const contract = new Contract(contractId);

    const rawTx = new TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: SDKNetworks.TESTNET,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(60)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(rawTx);

    const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
      address: publicKey,
    });

    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, SDKNetworks.TESTNET);

    const sendResponse = await rpcServer.sendTransaction(signedTx);
    if (sendResponse.status !== 'PENDING') {
      throw new Error(`Contract transaction submission failed: ${sendResponse.status}`);
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
  } catch (err: any) {
    console.error(`Error executing ${functionName} on contract ${contractId}:`, err);
    const errMsg = err?.message || String(err);
    if (errMsg.includes('reject') || errMsg.includes('cancel') || errMsg.includes('decline')) {
      const rejectErr = new Error('Transaction was rejected by user.');
      (rejectErr as any).code = 'USER_REJECTED';
      throw rejectErr;
    }
    throw err;
  }
};

/**
 * Employer creates a new payroll agreement.
 */
export const createAgreementOnChain = async (
  kit: any,
  employer: string,
  contractor: string,
  token: string,
  amount: number,
  title: string
): Promise<string> => {
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

/**
 * Employer funds an escrow agreement.
 */
export const fundAgreementOnChain = async (
  kit: any,
  employer: string,
  agreementId: number
): Promise<string> => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'fund_agreement',
    [scId]
  );
};

/**
 * Employer releases payment from escrow.
 */
export const releasePaymentOnChain = async (
  kit: any,
  employer: string,
  agreementId: number
): Promise<string> => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'release_payment',
    [scId]
  );
};

/**
 * Employer cancels an agreement.
 */
export const cancelAgreementOnChain = async (
  kit: any,
  employer: string,
  agreementId: number
): Promise<string> => {
  const scId = nativeToScVal(BigInt(agreementId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'cancel_agreement',
    [scId]
  );
};

export interface StellarEvent {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  data: any;
}

/**
 * Fetch recent contract events for activity feed.
 */
export const fetchRecentEvents = async (): Promise<StellarEvent[]> => {
  try {
    const latestLedger = await rpcServer.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 1000);

    const eventsResp = await rpcServer.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [PAYMENT_LOGGER_CONTRACT_ID, LOYALTY_TOKEN_CONTRACT_ID],
        },
      ],
    });

    return eventsResp.events.map((evt) => {
      let decodedData = null;
      try {
        decodedData = scValToNative(evt.value);
      } catch (err) {
        console.warn('Failed to parse event value:', err);
      }

      return {
        id: evt.id,
        contractId: evt.contractId,
        type: evt.topic.length > 1 ? scValToNative(evt.topic[1]) : 'unknown',
        timestamp: new Date().toLocaleTimeString(),
        data: decodedData,
      };
    }).reverse();
  } catch (e) {
    console.warn('Stellar RPC node is currently unreachable. Gracefully falling back to simulation data.', e);
    return [];
  }
};
