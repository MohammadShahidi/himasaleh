export const GEO_PROVIDER = Symbol('GEO_PROVIDER');

export interface GeoPlace {
  title: string;
  lat: number;
  lng: number;
}

/** Search and reverse geocoding. Nominatim (OpenStreetMap) now; Neshan is added when its API key and docs arrive. */
export interface GeoProvider {
  readonly name: string;
  reverse(lat: number, lng: number): Promise<string>;
  search(q: string): Promise<GeoPlace[]>;
}

interface NominatimAddress {
  city?: string; town?: string; village?: string; county?: string;
  suburb?: string; neighbourhood?: string; quarter?: string; road?: string;
}

/**
 * Nominatim's usage policy: at most one request per second, and an identifying User-Agent.
 * Requests are serialized and results cached, so many map users do not multiply upstream calls.
 */
export class NominatimProvider implements GeoProvider {
  readonly name = 'nominatim';
  private chain: Promise<unknown> = Promise.resolve();
  private last = 0;
  private cache = new Map<string, unknown>();

  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async reverse(lat: number, lng: number): Promise<string> {
    // ~11 m grid: neighbours share a cache entry.
    const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const d = await this.get<{ display_name?: string; address?: NominatimAddress }>(
      key, `/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=fa`,
    );
    const a = d.address ?? {};
    const parts = [a.city || a.town || a.village || a.county, a.suburb || a.neighbourhood || a.quarter, a.road].filter(Boolean);
    return parts.length ? parts.join('، ') : (d.display_name ?? '');
  }

  async search(q: string): Promise<GeoPlace[]> {
    const d = await this.get<{ display_name: string; lat: string; lon: string }[]>(
      `s:${q}`, `/search?format=json&limit=5&countrycodes=ir&accept-language=fa&q=${encodeURIComponent(q)}`,
    );
    return d.map((x) => ({ title: x.display_name.split(',').slice(0, 3).join('،'), lat: Number(x.lat), lng: Number(x.lon) }));
  }

  private get<T>(key: string, path: string): Promise<T> {
    if (this.cache.has(key)) return Promise.resolve(this.cache.get(key) as T);
    const run = async () => {
      const wait = this.last + 1000 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: { 'user-agent': this.userAgent, accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`nominatim HTTP ${res.status}`);
      const body = (await res.json()) as T;
      if (this.cache.size > 2000) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, body);
      return body;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
}
