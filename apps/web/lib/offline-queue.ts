// The driver's steps survive a lost connection (ARCHITECTURE §3.6): each tap is saved on the phone at once, with its own time and
// position, and sent in one PATCH when the network is back. Photos are shrunk and kept as blobs until they can be uploaded.
import { ApiError, api } from './api';
import { shrinkImage, uploadFile } from './upload';

export interface QueuedStep {
  key: string;
  tripId: string;
  step: number;
  at: string;
  lat?: number;
  lng?: number;
  photo?: Blob;
  photoName?: string;
  photoFileId?: string;
}

const DB = 'hm-driver';
const STORE = 'steps';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'key' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

export async function queueStep(rec: { tripId: string; step: number; lat?: number | undefined; lng?: number | undefined; photo?: File | undefined }): Promise<void> {
  const photo = rec.photo ? await shrinkImage(rec.photo) : undefined;
  const row: QueuedStep = {
    key: `${rec.tripId}:${rec.step}`, tripId: rec.tripId, step: rec.step, at: new Date().toISOString(),
    ...(rec.lat !== undefined ? { lat: rec.lat } : {}), ...(rec.lng !== undefined ? { lng: rec.lng } : {}),
    ...(photo ? { photo, photoName: photo.name } : {}),
  };
  await tx('readwrite', (s) => s.put(row));
}

export async function pendingSteps(): Promise<QueuedStep[]> {
  try {
    return (await tx('readonly', (s) => s.getAll() as IDBRequest<QueuedStep[]>)).sort((a, b) => a.step - b.step);
  } catch {
    return [];
  }
}

async function drop(keys: string[]) {
  for (const k of keys) await tx('readwrite', (s) => s.delete(k));
}

export interface SyncResult { sent: number; dropped: string[]; waiting: number }

let running: Promise<SyncResult> | null = null;

/** Sends everything queued. Safe to call often: one run at a time, and a re-sent batch is harmless on the server. */
export function syncQueue(): Promise<SyncResult> {
  running ??= doSync().finally(() => { running = null; });
  return running;
}

async function doSync(): Promise<SyncResult> {
  const all = await pendingSteps();
  const byTrip = new Map<string, QueuedStep[]>();
  for (const r of all) byTrip.set(r.tripId, [...(byTrip.get(r.tripId) ?? []), r]);
  let sent = 0;
  const dropped: string[] = [];

  for (const [tripId, steps] of byTrip) {
    try {
      for (const r of steps) {
        if (r.photo && !r.photoFileId) {
          const up = await uploadFile(new File([r.photo], r.photoName ?? 'photo.jpg', { type: r.photo.type || 'image/jpeg' }));
          r.photoFileId = up.id;
          await tx('readwrite', (s) => s.put(r)); // a retry must not upload the photo again
        }
      }
      await api(`/trips/${tripId}/progress`, {
        method: 'PATCH',
        json: {
          step: Math.max(...steps.map((r) => r.step)),
          events: steps.map((r) => ({ step: r.step, at: r.at, ...(r.lat !== undefined ? { lat: r.lat } : {}), ...(r.lng !== undefined ? { lng: r.lng } : {}), ...(r.photoFileId ? { photoFileId: r.photoFileId } : {}) })),
          clientSeq: Date.now() % 2_000_000_000,
        },
      });
      await drop(steps.map((r) => r.key));
      sent += steps.length;
    } catch (e) {
      // The trip was cancelled or reassigned, or the batch can never be accepted: keeping it would retry forever.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429) {
        await drop(steps.map((r) => r.key));
        dropped.push(tripId);
      }
      // Anything else (no network, server down) leaves the queue for the next attempt.
    }
  }
  return { sent, dropped, waiting: (await pendingSteps()).length };
}
