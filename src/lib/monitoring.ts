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

export function trackProductEvent(event: ProductEventName, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  const existing = window.localStorage.getItem(STORAGE_KEY);
  const records: ProductEventRecord[] = existing ? JSON.parse(existing) : [];
  records.push({ event, payload, timestamp: new Date().toISOString() });

  const trimmed = records.slice(-50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getAnalyticsSnapshot(): AnalyticsSnapshot {
  if (typeof window === 'undefined') {
    return {
      totalEvents: 0,
      events: emptyCounts(),
      recent: [],
    };
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  const records: ProductEventRecord[] = existing ? JSON.parse(existing) : [];

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
