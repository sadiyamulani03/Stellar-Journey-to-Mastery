import * as StellarSdk from '@stellar/stellar-sdk';

const { rpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Account, Networks: SDKNetworks } = StellarSdk;

// Load contract addresses from environment or fall back to Testnet defaults
export const PAYMENT_LOGGER_CONTRACT_ID = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'CCMQWEWUNR5LVWI6KSBCMILU66ZWCX3LVQDX7QB3OYFAZJZI7CDKLYDO';
export const LOYALTY_TOKEN_CONTRACT_ID = process.env.NEXT_PUBLIC_LOYALTY_CONTRACT_ID || 'CAW2DMDRTZRTZZC53TMW36HOD2J3CBF2VZILG5WCBIDKY4TASNO2KRU3';
export const PAYLOYAL_RESOLVER_CONTRACT_ID = process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ID || 'CCVWB6GUOCAWFWOXZJIMUW4H7FAWYO7IYCSN2RUIEOLPV5HQGT4EX3AQ';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export const rpcServer = new rpc.Server(RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

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
 * Fetch total streams count from contract.
 */
export const getStreamCount = async () => {
  try {
    const count = await simulateCall(PAYMENT_LOGGER_CONTRACT_ID, 'get_count');
    return count ? Number(count) : 0;
  } catch (e) {
    console.error('Failed to get stream count:', e);
    return 0;
  }
};

/**
 * Fetch a specific stream.
 */
export const fetchStream = async (id) => {
  try {
    const result = await simulateCall(
      PAYMENT_LOGGER_CONTRACT_ID,
      'fetch_stream',
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
      startTime: Number(result.start_time),
      endTime: Number(result.end_time),
      withdrawnAmount: Number(result.withdrawn_amount) / 1e7,
      status: Number(result.status),
      title: result.title || 'Wage Stream',
      lastPausedTime: Number(result.last_paused_time),
      totalPausedDuration: Number(result.total_paused_duration),
    };
  } catch (e) {
    console.error(`Failed to fetch stream ${id}:`, e);
    return null;
  }
};

/**
 * Fetch all streams.
 */
export const fetchAllStreams = async () => {
  const count = await getStreamCount();
  const list = [];
  for (let i = 1; i <= count; i++) {
    const item = await fetchStream(i);
    if (item) {
      list.push(item);
    }
  }
  return list;
};

/**
 * Fetch loyalty points balance for an address.
 */
export const getPoints = async (userAddress) => {
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
 * Fetch arbiter stake balance.
 */
export const getArbiterStake = async (arbiterAddress) => {
  try {
    const scValUser = nativeToScVal(StellarSdk.Address.fromString(arbiterAddress));
    const stake = await simulateCall(
      PAYLOYAL_RESOLVER_CONTRACT_ID,
      'get_arbiter_stake',
      scValUser
    );
    return stake ? Number(stake) / 1e7 : 0;
  } catch (e) {
    console.warn(`Unable to fetch arbiter stake for ${arbiterAddress}:`, e);
    return 0;
  }
};

/**
 * Fetch arbiter active votes count.
 */
export const getArbiterActiveVotes = async (arbiterAddress) => {
  try {
    const scValUser = nativeToScVal(StellarSdk.Address.fromString(arbiterAddress));
    const votes = await simulateCall(
      PAYLOYAL_RESOLVER_CONTRACT_ID,
      'get_arbiter_active_votes',
      scValUser
    );
    return votes ? Number(votes) : 0;
  } catch (e) {
    console.warn(`Unable to fetch active votes for ${arbiterAddress}:`, e);
    return 0;
  }
};

/**
 * Fetch a specific dispute.
 */
export const fetchDispute = async (id) => {
  try {
    const result = await simulateCall(
      PAYLOYAL_RESOLVER_CONTRACT_ID,
      'fetch_dispute',
      nativeToScVal(BigInt(id), { type: 'u64' })
    );

    if (!result || result.id === 0n || result.id === 0) {
      return null;
    }

    return {
      id: Number(result.id),
      streamId: Number(result.stream_id),
      employer: result.employer,
      contractor: result.contractor,
      amountLocked: Number(result.amount_locked) / 1e7,
      status: Number(result.status),
      employerVotes: Number(result.employer_votes),
      contractorVotes: Number(result.contractor_votes),
      endTime: Number(result.end_time),
      feeAmount: Number(result.fee_amount) / 1e7,
      escrowContract: result.escrow_contract,
    };
  } catch (e) {
    console.error(`Failed to fetch dispute ${id}:`, e);
    return null;
  }
};

/**
 * Fetch total disputes count.
 */
export const getDisputeCount = async () => {
  try {
    const count = await simulateCall(PAYLOYAL_RESOLVER_CONTRACT_ID, 'get_count');
    return count ? Number(count) : 0;
  } catch (e) {
    console.error('Failed to get dispute count:', e);
    return 0;
  }
};

/**
 * Fetch all disputes.
 */
export const fetchAllDisputes = async () => {
  const count = await getDisputeCount();
  const list = [];
  for (let i = 1; i <= count; i++) {
    const item = await fetchDispute(i);
    if (item) {
      list.push(item);
    }
  }
  return list;
};

/**
 * Sign and submit a transaction.
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
  } catch (err) {
    console.error(`Error executing ${functionName} on contract ${contractId}:`, err);
    throw err;
  }
};

/**
 * Employer creates a new payroll stream.
 */
export const createStreamOnChain = async (
  kit,
  employer,
  contractor,
  token,
  amount,
  durationSeconds,
  title
) => {
  const amountStroops = BigInt(Math.round(amount * 1e7));
  const scEmployer = nativeToScVal(StellarSdk.Address.fromString(employer));
  const scContractor = nativeToScVal(StellarSdk.Address.fromString(contractor));
  const scToken = nativeToScVal(StellarSdk.Address.fromString(token));
  const scAmount = nativeToScVal(amountStroops, { type: 'i128' });
  const scDuration = nativeToScVal(BigInt(durationSeconds), { type: 'u64' });
  const scTitle = nativeToScVal(title, { type: 'string' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'create_stream',
    [scEmployer, scContractor, scToken, scAmount, scDuration, scTitle]
  );
};

/**
 * Employer funds a stream.
 */
export const fundStreamOnChain = async (
  kit,
  employer,
  streamId
) => {
  const scId = nativeToScVal(BigInt(streamId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'fund_stream',
    [scId]
  );
};

/**
 * Employer pauses a stream.
 */
export const pauseStreamOnChain = async (
  kit,
  employer,
  streamId
) => {
  const scId = nativeToScVal(BigInt(streamId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'pause_stream',
    [scId]
  );
};

/**
 * Employer resumes a stream.
 */
export const resumeStreamOnChain = async (
  kit,
  employer,
  streamId
) => {
  const scId = nativeToScVal(BigInt(streamId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    employer,
    PAYMENT_LOGGER_CONTRACT_ID,
    'resume_stream',
    [scId]
  );
};

/**
 * Contractor claims/withdraws wages.
 */
export const withdrawWagesOnChain = async (
  kit,
  contractor,
  streamId
) => {
  const scId = nativeToScVal(BigInt(streamId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    contractor,
    PAYMENT_LOGGER_CONTRACT_ID,
    'withdraw_wages',
    [scId]
  );
};

/**
 * Employer or Contractor raises dispute.
 */
export const raiseDisputeOnChain = async (
  kit,
  callerAddress,
  streamId
) => {
  const scCaller = nativeToScVal(StellarSdk.Address.fromString(callerAddress));
  const scId = nativeToScVal(BigInt(streamId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    callerAddress,
    PAYMENT_LOGGER_CONTRACT_ID,
    'raise_dispute',
    [scCaller, scId]
  );
};

/**
 * Arbiter stakes security bond.
 */
export const stakeBondOnChain = async (
  kit,
  arbiterAddress,
  amount
) => {
  const amountStroops = BigInt(Math.round(amount * 1e7));
  const scArbiter = nativeToScVal(StellarSdk.Address.fromString(arbiterAddress));
  const scAmount = nativeToScVal(amountStroops, { type: 'i128' });

  return signAndSubmitTransaction(
    kit,
    arbiterAddress,
    PAYLOYAL_RESOLVER_CONTRACT_ID,
    'stake_bond',
    [scArbiter, scAmount]
  );
};

/**
 * Arbiter withdraws security bond.
 */
export const withdrawBondOnChain = async (
  kit,
  arbiterAddress,
  amount
) => {
  const amountStroops = BigInt(Math.round(amount * 1e7));
  const scArbiter = nativeToScVal(StellarSdk.Address.fromString(arbiterAddress));
  const scAmount = nativeToScVal(amountStroops, { type: 'i128' });

  return signAndSubmitTransaction(
    kit,
    arbiterAddress,
    PAYLOYAL_RESOLVER_CONTRACT_ID,
    'withdraw_bond',
    [scArbiter, scAmount]
  );
};

/**
 * Arbiter votes on dispute.
 */
export const voteOnDisputeOnChain = async (
  kit,
  arbiterAddress,
  disputeId,
  vote
) => {
  const scArbiter = nativeToScVal(StellarSdk.Address.fromString(arbiterAddress));
  const scId = nativeToScVal(BigInt(disputeId), { type: 'u64' });
  const scVote = nativeToScVal(vote, { type: 'u32' });

  return signAndSubmitTransaction(
    kit,
    arbiterAddress,
    PAYLOYAL_RESOLVER_CONTRACT_ID,
    'vote_on_dispute',
    [scArbiter, scId, scVote]
  );
};

/**
 * Resolves open dispute.
 */
export const resolveDisputeOnChain = async (
  kit,
  callerAddress,
  disputeId
) => {
  const scId = nativeToScVal(BigInt(disputeId), { type: 'u64' });

  return signAndSubmitTransaction(
    kit,
    callerAddress,
    PAYLOYAL_RESOLVER_CONTRACT_ID,
    'resolve_dispute',
    [scId]
  );
};
