// End-to-end check of phase 1 against a running API with the fake SMS provider (its log is read for OTP codes).
// Usage: see README.md in this folder. Env: API_URL, API_LOG (log file of the API process), PSQL (command that runs psql on the database).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API = (process.env.API_URL ?? 'http://localhost:4100') + '/api';
const LOG = process.env.API_LOG ?? 'api.log';
let failed = 0;
const ok = (c, msg, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}${extra ? '  ' + extra : ''}`); if (!c) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

class Client {
  constructor(name) { this.name = name; this.jar = new Map(); this.dev = `e2e-${name}-device-0001`; }
  async call(method, path, { json, form, raw } = {}) {
    const headers = { 'x-device-id': this.dev, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    let body;
    if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(API + path, { method, headers, body });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
    if (raw) return { status: res.status, data };
    return { status: res.status, data };
  }
  async login(phone, signup, role) {
    let r = await this.call('POST', '/auth/otp/request', { json: { phone } });
    if (r.status === 429 && r.data?.retryAfterSec) { await sleep((r.data.retryAfterSec + 1) * 1000); r = await this.call('POST', '/auth/otp/request', { json: { phone } }); }
    if (r.status >= 300) throw new Error('otp request ' + r.status + JSON.stringify(r.data));
    let code;
    for (let i = 0; i < 20 && !code; i++) {
      await sleep(250);
      const log = strip(readFileSync(LOG, 'utf8'));
      const re = new RegExp(`OTP → ${phone}: [^\\n]*?: (\\d{5})`, 'g');
      let m; while ((m = re.exec(log))) code = m[1];
    }
    if (!code) throw new Error('no otp in log for ' + phone);
    const v = await this.call('POST', '/auth/otp/verify', { json: { phone, code, ...(role ? { preferredRole: role } : {}), ...(signup ? { signup } : {}) } });
    if (v.status >= 300) throw new Error('verify ' + v.status + JSON.stringify(v.data));
    return v.data;
  }
  async upload(mime, name = 'f') {
    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from('fake-bytes-' + Math.random())], { type: mime }), name);
    const r = await this.call('POST', '/files', { form: fd });
    if (r.status >= 300) throw new Error('upload ' + r.status + JSON.stringify(r.data));
    return r.data.id;
  }
}

const PSQL = process.env.PSQL ?? 'docker exec hm-e2e-postgres-1 psql -U hm -d hm';
const psql = (sql) => execSync(`${PSQL} -t -A -c "${sql}"`, { encoding: 'utf8' }).trim();
const NID = '1234567891';
const profile = (over = {}) => ({
  firstName: 'حسن', lastName: 'کریمی', nationalId: NID,
  vehicle: { type: 'khavar', body: 'flatbed', plate1: '12', plateLetter: 'ع', plate2: '345', plate3: '67', capacityTon: 10, year: 1398 },
  owner: null, province: 'البرز', city: 'کرج', serviceCities: ['کرج'], address: 'کرج، فردیس، خیابان اول، پلاک ۱', lat: 35.72, lng: 50.97, ...over,
});
const SELF = ['national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet'];

// ───────── staff account (no UI creates one before phase 3) ─────────
const staffPhone = '09120000001';
psql(`INSERT INTO \\"User\\"(id,phone,\\"fullName\\",status,\\"updatedAt\\") VALUES ('staff1','${staffPhone}','کارشناس','active',now()) ON CONFLICT DO NOTHING; INSERT INTO \\"UserRole\\"(\\"userId\\",role) VALUES ('staff1','staff') ON CONFLICT DO NOTHING;`);

const staff = new Client('staff');
await staff.login(staffPhone, undefined, 'staff');
ok((await staff.call('GET', '/auth/me')).data?.activeRole === 'staff', 'staff signs in');

// ───────── driver A: self-owned vehicle ─────────
const A = new Client('a');
await A.login('09121110001', { role: 'driver', fullName: 'حسن کریمی' });
ok((await A.call('GET', '/drivers/me')).data?.profile === null, 'new driver has no registration yet');

let r = await A.call('PUT', '/drivers/me', { json: profile({ address: undefined, province: undefined, city: undefined, serviceCities: [] }) });
ok(r.status === 200 && r.data.profile.status === 'draft', 'save without the address step', String(r.status));
r = await A.call('POST', '/drivers/me/submit');
ok(r.status === 400 && r.data.code === 'INCOMPLETE', 'submit refuses an incomplete registration', r.data?.code);
r = await A.call('PUT', '/drivers/me', { json: profile() });
ok(r.status === 200, 'save with the address');

r = await A.call('POST', '/drivers/me/kyc', { json: { kind: 'green_sheet', fileId: await A.upload('video/mp4') } });
ok(r.status === 400 && r.data.code === 'FILE_TYPE', 'a video is refused for a photo document', r.data?.code);
for (const k of SELF) { r = await A.call('POST', '/drivers/me/kyc', { json: { kind: k, fileId: await A.upload('image/jpeg') } }); if (r.status !== 201) ok(false, 'attach ' + k, JSON.stringify(r.data)); }
r = await A.call('POST', '/drivers/me/submit');
ok(r.status === 400 && r.data.code === 'MISSING_DOCUMENTS' && r.data.missing.includes('selfie_video'), 'submit lists the missing video', JSON.stringify(r.data.missing));
r = await A.call('POST', '/drivers/me/kyc', { json: { kind: 'selfie_video', fileId: await A.upload('video/mp4'), scriptSnapshot: 'متن' } });
ok(r.status === 201, 'attach the identity video');
r = await A.call('POST', '/drivers/me/submit');
ok(r.status === 200 && r.data.profile.status === 'submitted', 'submit → under review');
r = await A.call('PUT', '/drivers/me', { json: profile({ firstName: 'دیگری' }) });
ok(r.status === 409 && r.data.code === 'DRIVER_LOCKED', 'registration is locked while under review');

// ───────── staff reviews: reject one, driver fixes it, approve ─────────
r = await staff.call('GET', '/kyc/queue');
const row = r.data.drivers.find((d) => d.nationalId === NID);
ok(!!row, 'driver appears in the review queue');
let det = (await staff.call('GET', `/kyc/drivers/${row.id}`)).data;
ok(det.items.length === 6 && det.rejectReasons.length === 5, 'detail has 6 items and the 5 fixed reasons');
const green = det.items.find((i) => i.kind === 'green_sheet');
r = await staff.call('POST', `/kyc/items/${green.id}/review`, { json: { decision: 'reject' } });
ok(r.status === 400, 'reject needs a reason', String(r.status));
r = await staff.call('POST', `/kyc/items/${green.id}/review`, { json: { decision: 'reject', reason: 'ناخوانا بودن' } });
ok(r.status === 200 && r.data.status === 'rejected', 'reject the green sheet with a fixed reason');
r = await staff.call('POST', `/kyc/drivers/${row.id}/finish`);
ok(r.status === 409 && r.data.code === 'REVIEW_INCOMPLETE', 'cannot finish while items are pending');
for (const i of det.items.filter((x) => x.id !== green.id)) await staff.call('POST', `/kyc/items/${i.id}/review`, { json: { decision: 'approve', ...(i.kind === 'national_id_front' ? { shahkarMatch: true } : {}) } });
r = await staff.call('POST', `/kyc/drivers/${row.id}/finish`);
ok(r.status === 200 && r.data.status === 'needs_fix', 'finish → needs_fix with the rejected item');
ok(psql(`SELECT count(*) FROM \\"SmsMessage\\" WHERE kind='driver_rejected'`) === '1', 'one rejection SMS was sent');

r = await A.call('GET', '/drivers/me');
ok(r.data.profile.status === 'needs_fix' && r.data.rejected[0].kind === 'green_sheet' && r.data.rejected[0].reason === 'ناخوانا بودن', 'driver sees what to fix');
r = await A.call('POST', '/drivers/me/kyc', { json: { kind: 'national_id_front', fileId: await A.upload('image/jpeg') } });
ok(r.status === 409 && r.data.code === 'NOT_REJECTED', 'only rejected items can be replaced');
r = await A.call('POST', '/drivers/me/kyc', { json: { kind: 'green_sheet', fileId: await A.upload('image/jpeg') } });
ok(r.status === 201, 'driver re-uploads the green sheet');
r = await A.call('POST', '/drivers/me/submit');
ok(r.status === 200 && r.data.profile.status === 'submitted', 'driver resubmits');
det = (await staff.call('GET', `/kyc/drivers/${row.id}`)).data;
const green2 = det.items.find((i) => i.kind === 'green_sheet');
ok(green2.status === 'pending' && green2.id !== green.id, 'the new upload is the one to review');
await staff.call('POST', `/kyc/items/${green2.id}/review`, { json: { decision: 'approve' } });
r = await staff.call('POST', `/kyc/drivers/${row.id}/finish`);
ok(r.status === 200 && r.data.status === 'approved', 'finish → approved');
ok(psql(`SELECT count(*) FROM \\"SmsMessage\\" WHERE kind='driver_approved'`) === '1', 'one approval SMS was sent');

// ───────── driver panel: offers and a trip ─────────
r = await A.call('PUT', '/driver/status', { json: { online: true } });
ok(r.status === 200 && r.data.online === true, 'driver goes on duty');
r = await staff.call('POST', '/dev/test-trips', { json: {} });
ok(r.status === 201 && r.data.offered === 1, 'staff makes a test load, offered to 1 online driver', JSON.stringify(r.data));
const tripId = r.data.tripId;
ok(psql(`SELECT count(*) FROM \\"NotificationLog\\" WHERE type='new_load' AND channel='push'`) === '1', 'a push was logged for the new load');
ok(psql(`SELECT count(*) FROM \\"SmsMessage\\" WHERE kind='new_load'`) === '1', 'fallback mode: no app registered → SMS sent at once');

r = await A.call('GET', '/driver/offers');
ok(r.data.offers.length === 1 && r.data.offers[0].feeBp === 800, 'driver sees the offer with the 8% share', r.data.offers[0]?.netWords);
ok(BigInt(r.data.offers[0].netRial) === 85_000_000n - 6_800_000n, 'net = fare minus 8%');
const offerId = r.data.offers[0].id;
r = await A.call('POST', `/driver/offers/${offerId}/accept`);
ok(r.status === 200 && r.data.tripId === tripId, 'driver accepts');
r = await A.call('GET', '/driver/trip');
ok(r.data.trip?.step === 1 && /^\d{8}-\d{4}$/.test(r.data.trip.waybillNo), 'current trip, step 1, Jalali waybill number', r.data.trip?.waybillNo);

const at = () => new Date().toISOString();
r = await A.call('PATCH', `/trips/${tripId}/progress`, { json: { step: 2, events: [{ step: 1, at: at(), lat: 35.7, lng: 51.4 }, { step: 2, at: at() }] } });
ok(r.status === 200 && r.data.step === 3 && r.data.status === 'in_transit', 'two offline steps arrive in one batch');
r = await A.call('PATCH', `/trips/${tripId}/progress`, { json: { step: 1, events: [{ step: 1, at: at() }] } });
ok(r.status === 200 && r.data.step === 3, 're-sending an old batch changes nothing');
r = await A.call('PATCH', `/trips/${tripId}/progress`, { json: { step: 4, events: [{ step: 3, at: at() }, { step: 4, at: at() }] } });
ok(r.status === 400 && r.data.code === 'PHOTO_REQUIRED', 'delivery without the signed-waybill photo is refused');
const photo = await A.upload('image/jpeg');
r = await A.call('PATCH', `/trips/${tripId}/progress`, { json: { step: 4, events: [{ step: 3, at: at() }, { step: 4, at: at(), photoFileId: photo }] } });
ok(r.status === 200 && r.data.status === 'delivered' && r.data.step === 5, 'delivery with the photo');
r = await A.call('GET', '/driver/wallet');
ok(BigInt(r.data.balanceRial) === 78_200_000n, 'wallet = fare − 8%', r.data.balanceWords);
ok(psql(`SELECT balance FROM (SELECT \\"balanceRial\\" balance FROM \\"AccountBalance\\" WHERE account='platform:revenue:fee') x`) === '6800000', 'platform fee booked in the ledger');
ok(psql(`SELECT coalesce(sum(\\"amountRial\\"),0) FROM \\"LedgerEntry\\"`) === '0', 'the whole ledger sums to zero');
r = await A.call('GET', '/driver/trip');
ok(r.data.trip === null, 'no active trip after delivery');

// ───────── second driver: first to accept wins; different owner flow ─────────
const B = new Client('b'); const C = new Client('c');
await B.login('09121110002', { role: 'driver', fullName: 'علی رضایی' });
await C.login('09121110003', { role: 'driver', fullName: 'رضا احمدی' });
const own = { firstName: 'حمید', lastName: 'کریمی', nationalId: '1234567891', phone: '09123334444', relation: 'partner' };
r = await B.call('PUT', '/drivers/me', { json: profile({ nationalId: '1234567891' }) });
ok(r.status === 409 && r.data.code === 'NATIONAL_ID_TAKEN', 'the same national id cannot register twice');
r = await B.call('PUT', '/drivers/me', { json: profile({ nationalId: '0499370899', owner: { ...own, nationalId: '0499370899', phone: '09123334444' } }) });
ok(r.status === 200 && r.data.profile.owner?.relation === 'partner', 'driver B registers with a different owner (partner)', String(r.status));
r = await B.call('POST', '/drivers/me/owner/video-link');
ok(r.status === 200 && /\/o\/[\w-]{8}$/.test(r.data.url), 'owner video link issued', r.data.url);
const token = r.data.path.split('/').pop();
r = await B.call('POST', '/drivers/me/owner/video-link');
const token2 = r.data.path.split('/').pop();
ok(token !== token2, 're-issuing makes a new link');
const pub = new Client('pub');
r = await pub.call('GET', `/owner-video/${token}`);
ok(r.status === 404, 'the old link is dead', String(r.status));
r = await pub.call('GET', `/owner-video/${token2}`);
ok(r.status === 200 && r.data.script.includes('حمید کریمی') && !JSON.stringify(r.data).includes('09123334444'), 'owner page shows the consent text, not the owner’s phone');
const fd = new FormData(); fd.append('file', new Blob([Buffer.from('v')], { type: 'video/mp4' }), 'o.mp4');
r = await pub.call('POST', `/owner-video/${token2}/video`, { form: fd });
ok(r.status === 201, 'owner uploads the video without signing in');
r = await pub.call('GET', `/owner-video/${token2}`);
ok(r.data.alreadySent === true, 'page now says it was received');
r = await pub.call('GET', '/owner-video/not-a-real-token');
ok(r.status === 404, 'an unknown token is 404');
ok(psql(`SELECT count(*) FROM \\"KycItem\\" WHERE kind='owner_video'`) === '1', 'the owner video is stored as a KYC item');

// ───────── push device + ack + app config ─────────
const devToken = 'fcm-token-' + 'x'.repeat(30);
r = await A.call('POST', '/devices', { json: { token: devToken, appVersion: '1.0.0' } });
ok(r.status === 204, 'device registered');
r = await staff.call('POST', '/dev/test-trips', { json: {} });
const t2 = r.data.tripId;
const nl = psql(`SELECT id FROM \\"NotificationLog\\" WHERE type='new_load' AND channel='push' ORDER BY \\"createdAt\\" DESC LIMIT 1`);
ok(psql(`SELECT count(*) FROM \\"SmsMessage\\" WHERE kind='new_load'`) === '1', 'with an app registered, the SMS waits for the fallback timer (not sent now)');
r = await A.call('POST', `/notifications/${nl}/ack`);
ok(r.status === 204 && psql(`SELECT \\"ackedAt\\" IS NOT NULL FROM \\"NotificationLog\\" WHERE id='${nl}'`) === 't', 'ack recorded');
r = await new Client('p2').call('GET', '/app/config?platform=android&versionCode=1');
ok(r.status === 200 && r.data.updateRequired === false, 'public app config answers', JSON.stringify(r.data));

// ───────── guards ─────────
r = await A.call('GET', '/kyc/queue');
ok(r.status === 403, 'a driver cannot open the review queue');
r = await new Client('anon').call('GET', '/driver/offers');
ok(r.status === 401, 'unauthenticated requests are refused');
r = await C.call('GET', '/driver/offers');
ok(r.status === 403 && r.data.code === 'DRIVER_NOT_APPROVED', 'an unapproved driver gets no offers');

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
