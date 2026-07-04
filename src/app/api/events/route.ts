import { NextResponse } from 'next/server';
import { fetchRecentEventsFromRpc } from '@/lib/stellar-events';

export async function GET() {
  try {
    const events = await fetchRecentEventsFromRpc();
    return NextResponse.json(events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contract events.';
    console.warn('Activity feed RPC error:', error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
