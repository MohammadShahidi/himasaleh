const KEY = 'hm_device';

/** A random id per browser so the API can rate-limit per device behind shared mobile IPs. */
export function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
