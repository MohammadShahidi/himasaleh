// Checks that the new-load SMS fallback fires only after the timer when a push was not acknowledged. Same env as phase1.mjs; needs phase1.mjs to have run first (a registered device).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API = (process.env.API_URL ?? 'http://localhost:4100') + '/api';
const LOG = process.env.API_LOG ?? 'api.log';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const PSQL = process.env.PSQL ?? 'docker exec hm-e2e-postgres-1 psql -U hm -d hm';
const psql = (sql) => execSync(`${PSQL} -t -A -c "${sql}"`, { encoding: 'utf8' }).trim();
const jar = new Map();
const call = async (m, p, json) => {
  const res = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', 'x-device-id': 'e2e-fb-device-0001', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }, body: json ? JSON.stringify(json) : undefined });
  for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
  const t = await res.text();
  return { status: res.status, data: t ? JSON.parse(t) : undefined };
};
const SMS = `SELECT count(*) FROM \\"SmsMessage\\" WHERE kind='new_load'`;

const phone = '09120000001';
let r = await call('POST', '/auth/otp/request', { phone });
if (r.status === 429) { await sleep((r.data.retryAfterSec + 1) * 1000); r = await call('POST', '/auth/otp/request', { phone }); }
console.log('otp request', r.status);
let code;
for (let i = 0; i < 20 && !code; i++) {
  await sleep(250);
  const re = new RegExp(`OTP → ${phone}: [^\\n]*?: (\\d{5})`, 'g');
  let m; const log = strip(readFileSync(LOG, 'utf8'));
  while ((m = re.exec(log))) code = m[1];
}
r = await call('POST', '/auth/otp/verify', { phone, code, preferredRole: 'staff' });
console.log('verify', r.status, 'role', r.data?.activeRole);
const before = psql(SMS);
r = await call('POST', '/dev/test-trips', {});
console.log('test trip', r.status, JSON.stringify(r.data), '| new_load SMS before:', before);
await sleep(30000);
console.log('after 30 s (must still wait):', psql(SMS));
await sleep(45000);
console.log('after 75 s (fallback must have fired):', psql(SMS));
