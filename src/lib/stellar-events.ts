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

const EVENT_TYPE_ALIASES: Record<string, string> = {
  rsld: 'resolved',
  stkd: 'staked',
  with: 'withdrawn',
  regd: 'registered',
  auth_iss: 'issuer_authorized',
  deauth: 'issuer_deauthorized',
  set_admin: 'admin_changed',
  loy_set: 'loyalty_configured',
  res_set: 'resolver_configured',
};

export function normalizeEventType(type: string): string {
  const lower = type.toLowerCase();
  return EVENT_TYPE_ALIASES[lower] || lower;
}

function asEventArray(data: unknown): unknown[] | null {
  return Array.isArray(data) ? data : null;
}

function shortAddress(value: unknown): string {
  const address = String(value || '');
  return address.length > 6 ? `${address.substring(0, 6)}...` : address;
}

export function stroopsToXlm(value: unknown): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '0';
  }
  return (amount / 1e7).toFixed(2);
}

function formatLedgerTimestamp(ledgerClosedAt?: string): string {
  if (ledgerClosedAt) {
    const parsed = new Date(ledgerClosedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }
  return new Date().toLocaleTimeString();
}

export function formatEventDescription(evt: StellarEvent): string {
  const { data } = evt;
  const values = asEventArray(data);

  if (!values || values.length === 0) {
    return data ? JSON.stringify(data) : 'Event processed successfully.';
  }

  const variant = String(values[0]);

  try {
    switch (variant) {
      case 'StreamCreated': {
        const [, id, employer, contractor, amount, title] = values;
        return `Payroll Stream #${id} "${title}" created by Employer (${shortAddress(employer)}) for Contractor (${shortAddress(contractor)}) with value of ${stroopsToXlm(amount)} XLM.`;
      }
      case 'StreamFunded': {
        const [, id, employer] = values;
        return `Payroll Stream #${id} funded and started by Employer (${shortAddress(employer)}).`;
      }
      case 'StreamPaused': {
        const [, id] = values;
        return `Payroll Stream #${id} paused by Employer. Streaming progress frozen.`;
      }
      case 'StreamResumed': {
        const [, id] = values;
        return `Payroll Stream #${id} resumed by Employer. Streaming progress active.`;
      }
      case 'WagesWithdrawn': {
        const [, id, contractor, amount] = values;
        return `Wages claimed from Stream #${id}! ${stroopsToXlm(amount)} XLM transferred to Contractor (${shortAddress(contractor)}).`;
      }
      case 'DisputeRaised': {
        const [, id] = values;
        return `Dispute raised on Stream #${id}. Escrow locked. Arbiter evaluation active.`;
      }
      case 'StreamResolved': {
        const [, id, contractorPayout, employerRefund] = values;
        return `Stream #${id} resolved: Contractor paid ${stroopsToXlm(contractorPayout)} XLM, Employer refunded ${stroopsToXlm(employerRefund)} XLM.`;
      }
      case 'LoyaltyConfigured': {
        const [, address] = values;
        return `Loyalty token contract configured at ${shortAddress(address)}.`;
      }
      case 'ResolverConfigured': {
        const [, address] = values;
        return `Dispute resolver contract configured at ${shortAddress(address)}.`;
      }
      case 'ContractUpgraded':
        return 'Contract WASM upgraded to a new version.';
      case 'ArbiterStaked': {
        const [, arbiter, amount] = values;
        return `Arbiter (${shortAddress(arbiter)}) staked ${stroopsToXlm(amount)} XLM bond.`;
      }
      case 'ArbiterWithdrawn': {
        const [, arbiter, amount] = values;
        return `Arbiter (${shortAddress(arbiter)}) withdrew ${stroopsToXlm(amount)} XLM bond.`;
      }
      case 'DisputeRegistered': {
        const [, disputeId, streamId, employer, contractor, amountLocked] = values;
        return `Dispute #${disputeId} registered for Stream #${streamId} between Employer (${shortAddress(employer)}) and Contractor (${shortAddress(contractor)}). ${stroopsToXlm(amountLocked)} XLM locked.`;
      }
      case 'VoteCast': {
        const [, disputeId, arbiter, vote] = values;
        const side = Number(vote) === 0 ? 'Employer' : 'Contractor';
        return `Arbiter (${shortAddress(arbiter)}) voted for ${side} on Dispute #${disputeId}.`;
      }
      case 'DisputeResolved': {
        const [, disputeId, employerVotes, contractorVotes, totalVotes] = values;
        return `Dispute #${disputeId} resolved after ${totalVotes} votes (${employerVotes} employer, ${contractorVotes} contractor).`;
      }
      case 'Reward': {
        const [, user, points, balance] = values;
        return `Loyalty points issued: Contractor (${shortAddress(user)}) awarded +${points} LP (Total Balance: ${balance} LP).`;
      }
      case 'Burn': {
        const [, user, points, balance] = values;
        return `Loyalty points burned: ${points} LP removed from ${shortAddress(user)} (Balance: ${balance} LP).`;
      }
      case 'AdminChanged': {
        const [, oldAdmin, newAdmin] = values;
        return `Admin changed from ${shortAddress(oldAdmin)} to ${shortAddress(newAdmin)}.`;
      }
      case 'IssuerAuthorized': {
        const [, issuer] = values;
        return `Issuer authorized: ${shortAddress(issuer)}.`;
      }
      case 'IssuerDeauthorized': {
        const [, issuer] = values;
        return `Issuer deauthorized: ${shortAddress(issuer)}.`;
      }
    }
  } catch (err) {
    console.warn('Failed parsing event args:', err);
  }

  return JSON.stringify(data);
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

      return {
        id: evt.id,
        contractId: evt.contractId?.toString() || '',
        type: evt.topic.length > 1 ? String(scValToNative(evt.topic[1])) : 'unknown',
        timestamp: formatLedgerTimestamp(evt.ledgerClosedAt),
        data: serializeForJson(decodedData),
      };
    })
    .reverse();
}
