// Checks the test console end to end with NO database access and NO log reading: only HTTP. This is exactly what a tester does on the test server.
// Needs the API started with ENABLE_DEV_TOOLS=true, SMS_TEST_PREFIX=0900000, STAFF_BOOTSTRAP_PHONES=09000000001. Env: API_URL (default http://localhost:4100).
// Creates and then deletes test drivers (09000000011–13); do not run against a database with real users on those numbers.
const API = (process.env.API_URL ?? 'http://localhost:4100') + '/api';
let failed = 0;
const ok = (c, m, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${x ? '  ' + x : ''}`); if (!c) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class C {
  constructor(n) { this.jar = new Map(); this.dev = `con-${n}-device-0001`; }
  async call(method, path, { json, form } = {}) {
    const headers = { 'x-device-id': this.dev, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    let body; if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); } if (form) body = form;
    const res = await fetch(API + path, { method, headers, body });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const t = await res.text(); let d; try { d = t ? JSON.parse(t) : undefined; } catch { d = t; }
    return { status: res.status, data: d };
  }
  // sign in with a TEST number: the code comes from /dev/test-sms, not from any log
  async login(phone, signup, role) {
    let r = await this.call('POST', '/auth/otp/request', { json: { phone } });
    if (r.status === 429) { await sleep((r.data.retryAfterSec + 1) * 1000); r = await this.call('POST', '/auth/otp/request', { json: { phone } }); }
    if (r.status >= 300) throw new Error('otp ' + r.status + JSON.stringify(r.data));
    let code; for (let i = 0; i < 20 && !code; i++) { await sleep(200); const m = await new C('p').call('GET', `/dev/test-sms?phone=${phone}`); code = m.data?.messages?.find((x) => x.kind === 'otp')?.code; }
    const v = await this.call('POST', '/auth/otp/verify', { json: { phone, code, ...(role ? { preferredRole: role } : {}), ...(signup ? { signup } : {}) } });
    if (v.status >= 300) throw new Error('verify ' + v.status + JSON.stringify(v.data));
    return v.data;
  }
  async up(mime) { const fd = new FormData(); fd.append('file', new Blob([Buffer.from('x' + Math.random())], { type: mime }), 'f'); return (await this.call('POST', '/files', { form: fd })).data.id; }
}

const staff = new C('staff');
await staff.login('09000000001', undefined, 'staff');
ok((await staff.call('GET', '/auth/me')).data?.activeRole === 'staff', 'bootstrapped staff signs in with a test number (code from /dev/test-sms)');

let r = await new C('x').call('GET', '/dev/test-sms?phone=09121234567');
ok(r.status === 404, 'a REAL number is not readable through /dev/test-sms', String(r.status));
r = await new C('x').call('GET', '/dev/test-sms?phone=09000000077');
ok(r.status === 200 && r.data.messages.length === 0, 'a test number with no messages gives an empty list');

const drv = new C('d');
await drv.login('09000000011', { role: 'driver', fullName: 'حسن کریمی' });
const own = null;
const prof = { firstName: 'حسن', lastName: 'کریمی', nationalId: '0012345679', vehicle: { type: 'khavar', body: 'flatbed', plate1: '12', plateLetter: 'ع', plate2: '345', plate3: '67' }, owner: own, province: 'البرز', city: 'کرج', serviceCities: ['کرج'], address: 'کرج، فردیس، خیابان اول، پلاک ۱' };
await drv.call('PUT', '/drivers/me', { json: prof });
for (const k of ['national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet']) await drv.call('POST', '/drivers/me/kyc', { json: { kind: k, fileId: await drv.up('image/jpeg') } });
await drv.call('POST', '/drivers/me/kyc', { json: { kind: 'selfie_video', fileId: await drv.up('video/mp4') } });
r = await drv.call('POST', '/drivers/me/submit');
ok(r.status === 200, 'test driver registers and submits');

r = await staff.call('GET', '/dev/state');
ok(r.status === 200 && r.data.flags.smsTestPrefix === '0900000', 'console state: flags show the test prefix');
const d = r.data.drivers.find((x) => x.nationalId === '0012345679');
ok(!!d && d.status === 'submitted', 'console lists the driver');
ok(r.data.ledger.sumRial === '0', 'console: ledger sum is 0');

// review → approve everything (as the tester would in /admin)
const det = (await staff.call('GET', `/kyc/drivers/${d.id}`)).data;
for (const i of det.items) await staff.call('POST', `/kyc/items/${i.id}/review`, { json: { decision: 'approve' } });
r = await staff.call('POST', `/kyc/drivers/${d.id}/finish`);
ok(r.data?.status === 'approved', 'driver approved');
let m = await new C('x').call('GET', '/dev/test-sms?phone=09000000011');
ok(m.data.messages.some((x) => x.kind === 'driver_approved' && x.text.includes('"NAME"')), 'the approval SMS is readable at /dev/test-sms (no real SMS)');
r = await staff.call('GET', '/dev/state');
ok(r.data.sms.some((x) => x.kind === 'driver_approved' && x.provider === 'test'), 'console: SMS row says provider=test');

// settings from the console instead of SQL
r = await staff.call('PUT', '/dev/settings', { json: { key: 'dispatch.offerTtlMin', value: 'abc' } });
ok(r.status === 400, 'setting: text for a number is refused', r.data?.message);
r = await staff.call('PUT', '/dev/settings', { json: { key: 'notify.newLoadSms.mode', value: 'x' } });
ok(r.status === 400, 'setting: bad mode refused', r.data?.message);
r = await staff.call('PUT', '/dev/settings', { json: { key: 'notify.newLoadSms.mode', value: 'always' } });
ok(r.status === 200, 'setting: mode=always applied');
r = await staff.call('PUT', '/dev/settings', { json: { key: 'fee.driver.defaultBp', value: 1000 } });
ok(r.status === 200, 'setting: fee 10% applied');
r = await staff.call('PUT', '/dev/settings', { json: { key: 'jwt.secret', value: 'x' } });
ok(r.status === 400, 'setting: a key outside the whitelist is refused');
r = await staff.call('GET', '/dev/state');
ok(r.data.overrides.some((o) => o.key === 'fee.driver.defaultBp' && o.value === 1000), 'console: override listed');

// test load for ONE driver, accept, expire/cancel
await drv.call('PUT', '/driver/status', { json: { online: true } });
r = await staff.call('POST', '/dev/test-trips', { json: { driverId: d.id } });
ok(r.status === 201 && r.data.offered === 1, 'test load offered to the chosen driver only');
const offers = (await drv.call('GET', '/driver/offers')).data.offers;
ok(offers.length === 1 && offers[0].feeBp === 1000, 'driver sees the offer with the 10% share set from the console', offers[0]?.netWords);
m = await new C('x').call('GET', '/dev/test-sms?phone=09000000011');
ok(m.data.messages.some((x) => x.kind === 'new_load'), 'mode=always: the new-load SMS is readable for the test number');
r = await staff.call('POST', '/dev/expire-offers');
ok(r.status === 200 && r.data.count === 1, 'console: expire open offers');
r = await drv.call('GET', '/driver/offers');
ok(r.data.offers.length === 0, 'driver: the offer is gone');
r = await staff.call('POST', '/dev/test-trips', { json: { driverId: d.id } });
const o2 = (await drv.call('GET', '/driver/offers')).data.offers[0];
await drv.call('POST', `/driver/offers/${o2.id}/accept`);
r = await staff.call('POST', '/dev/cancel-trips');
ok(r.status === 200 && r.data.count === 1, 'console: cancel trips in progress');
r = await drv.call('PATCH', `/trips/${r.data ? (await staff.call('GET', '/dev/state')).data.trips[0].id : ''}/progress`, { json: { step: 1, events: [{ step: 1, at: new Date().toISOString() }] } });
ok(r.status === 409 && r.data.code === 'TRIP_CHANGED', 'a step for a cancelled trip is refused with 409');

r = await staff.call('POST', '/dev/driver-status', { json: { driverId: d.id, status: 'blocked' } });
r = await drv.call('GET', '/driver/offers');
ok(r.status === 403 || r.data?.offers?.length === 0, 'blocked driver gets no offers', String(r.status));
await staff.call('POST', '/dev/driver-status', { json: { driverId: d.id, status: 'approved' } });

// reminders without waiting for the cron
const b = new C('b');
await b.login('09000000012', { role: 'driver', fullName: 'علی رضایی' });
await b.call('PUT', '/drivers/me', { json: { ...prof, nationalId: '0023456787', owner: { firstName: 'حمید', lastName: 'کریمی', nationalId: '0034567895', phone: '09000000099', relation: 'partner' } } });
await b.call('POST', '/drivers/me/owner/video-link');
await staff.call('PUT', '/dev/settings', { json: { key: 'kyc.ownerVideoReminderHours', value: 0 } });
r = await staff.call('POST', '/dev/run-reminders');
ok(r.status === 200 && r.data.sent === 1, 'console: run the owner-video reminder now', JSON.stringify(r.data));
m = await new C('x').call('GET', '/dev/test-sms?phone=09000000012');
ok(m.data.messages.some((x) => x.kind === 'owner_video_reminder'), 'reminder SMS readable for the driver’s test number');
r = await staff.call('POST', '/dev/run-reminders');
ok(r.data.sent === 0, 'the reminder is sent once');

// limits + reset
r = await staff.call('POST', '/dev/clear-otp-limits');
ok(r.status === 200, 'console: clear OTP limits');
r = await staff.call('DELETE', '/dev/test-data');
ok(r.status === 200 && r.data.users === 2, 'reset deletes the 2 test drivers', JSON.stringify(r.data));
r = await staff.call('GET', '/dev/state');
ok(r.data.drivers.length === 0 && r.data.trips.every((t) => !t.isTest), 'after reset: no drivers, no test trips');
ok(r.data.ledger.sumRial === '0', 'after reset: ledger still sums to 0 (and is kept)');
ok((await staff.call('GET', '/auth/me')).data?.activeRole === 'staff', 'staff survives the reset');
await staff.call('PUT', '/dev/settings', { json: { key: 'fee.driver.defaultBp' } });
await staff.call('PUT', '/dev/settings', { json: { key: 'notify.newLoadSms.mode' } });
await staff.call('PUT', '/dev/settings', { json: { key: 'kyc.ownerVideoReminderHours' } });
r = await staff.call('GET', '/dev/state');
ok(r.data.overrides.length === 0, 'settings reset to defaults');

// guards
const anon = new C('anon');
ok((await anon.call('GET', '/dev/state')).status === 401, 'console: anonymous 401');
const driver2 = new C('d2'); await driver2.login('09000000013', { role: 'driver', fullName: 'رضا احمدی' });
ok((await driver2.call('GET', '/dev/state')).status === 403, 'console: a driver gets 403');
ok((await driver2.call('DELETE', '/dev/test-data')).status === 403, 'reset: a driver gets 403');

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
