// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { getAnalyticsSnapshot, trackProductEvent } from '../lib/monitoring';

describe('product analytics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and summarizes product events', () => {
    trackProductEvent('wallet_connected', { network: 'TESTNET' });
    trackProductEvent('stream_created', { title: 'Launch Sprint' });

    const snapshot = getAnalyticsSnapshot();

    expect(snapshot.totalEvents).toBe(2);
    expect(snapshot.events.wallet_connected).toBe(1);
    expect(snapshot.events.stream_created).toBe(1);
    expect(snapshot.recent[0].event).toBe('stream_created');
  });
});
