import * as StellarSdk from '@stellar/stellar-sdk';

const { rpc, scValToNative } = StellarSdk;

const PAYMENT_LOGGER_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID ||
  'CCMQWEWUNR5LVWI6KSBCMILU66ZWCX3LVQDX7QB3OYFAZJZI7CDKLYDO';
const LOYALTY_TOKEN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_LOYALTY_CONTRACT_ID ||
  'CAW2DMDRTZRTZZC53TMW36HOD2J3CBF2VZILG5WCBIDKY4TASNO2KRU3';
const PAYLOYAL_RESOLVER_CONTRACT_ID =
  process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ID ||
  'CCVWB6GUOCAWFWOXZJIMUW4H7FAWYO7IYCSN2RUIEOLPV5HQGT4EX3AQ';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org';
const rpcServer = new rpc.Server(RPC_URL);

export interface StellarEvent {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  data: unknown;
}

function serializeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeForJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeForJson(entry)])
    );
  }
  return value;
}

export async function fetchRecentEventsFromRpc(): Promise<StellarEvent[]> {
  const latestLedger = await rpcServer.getLatestLedger();
  const startLedger = Math.max(1, latestLedger.sequence - 1000);

  const eventsResp = await rpcServer.getEvents({
    startLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [
          PAYMENT_LOGGER_CONTRACT_ID,
          LOYALTY_TOKEN_CONTRACT_ID,
          PAYLOYAL_RESOLVER_CONTRACT_ID,
        ],
      },
    ],
  });

  return eventsResp.events
    .map((evt) => {
      let decodedData: unknown = null;
      try {
        decodedData = scValToNative(evt.value);
      } catch (err) {
        console.warn('Failed to parse event value:', err);
      }

      const ledgerTime =
        typeof (evt as { ledgerClosedAt?: number }).ledgerClosedAt === 'number'
          ? new Date((evt as { ledgerClosedAt: number }).ledgerClosedAt * 1000).toLocaleString()
          : new Date().toLocaleTimeString();

      return {
        id: evt.id,
        contractId: evt.contractId?.toString() || '',
        type: evt.topic.length > 1 ? String(scValToNative(evt.topic[1])) : 'unknown',
        timestamp: ledgerTime,
        data: serializeForJson(decodedData),
      };
    })
    .reverse();
}
