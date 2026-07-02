import { describe, expect, it } from 'vitest';
import { POST as loginPost } from '../app/api/auth/login/route';
import { POST as registerPost } from '../app/api/auth/register/route';

describe('auth API routes', () => {
  it('returns a JSON error for malformed login payloads', async () => {
    const response = await loginPost(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json',
    }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({ error: 'Invalid JSON payload.' });
  });

  it('returns a JSON error for malformed register payloads', async () => {
    const response = await registerPost(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json',
    }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({ error: 'Invalid JSON payload.' });
  });
});
