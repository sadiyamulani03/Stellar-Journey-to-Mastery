import { describe, expect, it } from 'vitest';
import { parseJsonResponse } from '../lib/api';

describe('parseJsonResponse', () => {
  it('returns the fallback for empty responses', async () => {
    const response = new Response('', { status: 200 });
    await expect(parseJsonResponse(response, { ok: false })).resolves.toEqual({ ok: false });
  });

  it('parses valid JSON payloads', async () => {
    const response = new Response(JSON.stringify({ user: { id: '1' } }), { status: 200 });
    await expect(parseJsonResponse(response, null)).resolves.toEqual({ user: { id: '1' } });
  });
});
