import { describe, expect, it, vi } from 'vitest';
import { NominatimProvider } from './geo.provider.js';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('NominatimProvider', () => {
  it('builds a short Persian address and caches nearby points', async () => {
    const f = vi.fn(async () => ok({ address: { city: 'تهران', suburb: 'ونک', road: 'ملاصدرا' } }));
    const p = new NominatimProvider('https://n.example', 'test-agent', f as unknown as typeof fetch);
    expect(await p.reverse(35.75711, 51.40999)).toBe('تهران، ونک، ملاصدرا');
    expect(await p.reverse(35.75712, 51.41001)).toBe('تهران، ونک، ملاصدرا');
    expect(f).toHaveBeenCalledOnce();
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['user-agent']).toBe('test-agent');
  });

  it('keeps at least one second between upstream calls', async () => {
    const times: number[] = [];
    const f = vi.fn(async () => { times.push(Date.now()); return ok([]); });
    const p = new NominatimProvider('https://n.example', 'ua', f as unknown as typeof fetch);
    await Promise.all([p.search('ونک'), p.search('پردیس')]);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(990);
  });
});
