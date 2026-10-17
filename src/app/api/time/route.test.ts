import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/time', () => {
  it("answers with the server's clock, never cached", async () => {
    const res = GET();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as { now: number };
    expect(Math.abs(body.now - Date.now())).toBeLessThan(1000);
  });
});
