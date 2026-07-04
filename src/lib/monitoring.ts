import { readScopedJson, writeScopedJson } from './user-scope';

export type ProductEventName = 'wallet_connected' | 'wallet_disconnected' | 'stream_created' | 'stream_funded' | 'stream_paused' | 'stream_resumed' | 'stream_withdrawn' | 'dispute_raised' | 'dispute_resolved';

export interface ProductEventRecord {
  event: ProductEventName;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyticsSnapshot {
  totalEvents: number;
  events: Record<ProductEventName, number>;
  recent: ProductEventRecord[];
}

const STORAGE_KEY = 'payloyal_analytics';

const emptyCounts = (): Record<ProductEventName, number> => ({
  wallet_connected: 0,
  wallet_disconnected: 0,
  stream_created: 0,
  stream_funded: 0,
  stream_paused: 0,
  stream_resumed: 0,
  stream_withdrawn: 0,
  dispute_raised: 0,
  dispute_resolved: 0,
});

function readRecords(userId?: string | null): ProductEventRecord[] {
  if (typeof window === 'undefined' || !userId) {
    return [];
  }

  return readScopedJson<ProductEventRecord[]>(STORAGE_KEY, userId, []);
}

export function trackProductEvent(
  event: ProductEventName,
  payload?: Record<string, unknown>,
  userId?: string | null
) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  const records = readRecords(userId);
  records.push({ event, payload, timestamp: new Date().toISOString() });
  writeScopedJson(STORAGE_KEY, userId, records.slice(-50));
}

export function getAnalyticsSnapshot(userId?: string | null): AnalyticsSnapshot {
  const records = readRecords(userId);

  const counts = emptyCounts();
  for (const record of records) {
    counts[record.event] += 1;
  }

  return {
    totalEvents: records.length,
    events: counts,
    recent: records.slice(-10).reverse(),
  };
}
