// Glue to the Android app (a Capacitor shell around this site, ARCHITECTURE §4.7). In a normal browser every function does nothing.
import { api } from './api';

interface PushPlugin {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  /** Android 8+: the channel must exist before a push names it (the server sends channel_id `loads` or `general`). */
  createChannel?(c: { id: string; name: string; description?: string; importance: number; visibility?: number; vibration?: boolean; lights?: boolean }): Promise<void>;
  addListener(event: string, cb: (data: never) => void): Promise<unknown>;
}
interface CapacitorGlobal { isNativePlatform?: () => boolean; Plugins?: { PushNotifications?: PushPlugin; App?: { getInfo(): Promise<{ build: string; version: string }> } } }

const cap = (): CapacitorGlobal | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor);

export const inNativeApp = () => !!cap()?.isNativePlatform?.();

let started = false;

/**
 * Registers this phone for push after sign-in: asks for permission, sends the FCM token to the server,
 * confirms each push that arrives (so no fallback SMS is needed) and opens the screen a tapped push points to.
 */
export async function initNativePush(open: (path: string) => void): Promise<void> {
  const push = cap()?.Plugins?.PushNotifications;
  if (!inNativeApp() || !push || started) return;
  started = true;
  try {
    let perm = await push.checkPermissions();
    if (perm.receive !== 'granted') perm = await push.requestPermissions();
    if (perm.receive !== 'granted') return;
    const info = await cap()?.Plugins?.App?.getInfo().catch(() => undefined);
    // `loads` rings loudly (importance 5 = max); everything else is a normal notification.
    await push.createChannel?.({ id: 'loads', name: 'بار جدید', description: 'اعلان بار جدید با صدای بلند', importance: 5, visibility: 1, vibration: true, lights: true }).catch(() => undefined);
    await push.createChannel?.({ id: 'general', name: 'اعلان‌های عمومی', importance: 3, visibility: 1 }).catch(() => undefined);
    await push.addListener('registration', ((t: { value: string }) => {
      void api('/devices', { method: 'POST', json: { token: t.value, ...(info ? { appVersion: info.version } : {}) } }).catch(() => undefined);
    }) as (d: never) => void);
    await push.addListener('pushNotificationReceived', ((n: { data?: { notificationId?: string } }) => {
      const id = n.data?.notificationId;
      if (id) void api(`/notifications/${id}/ack`, { method: 'POST' }).catch(() => undefined);
    }) as (d: never) => void);
    await push.addListener('pushNotificationActionPerformed', ((a: { notification?: { data?: { notificationId?: string; path?: string } } }) => {
      const d = a.notification?.data;
      if (d?.notificationId) void api(`/notifications/${d.notificationId}/ack`, { method: 'POST' }).catch(() => undefined);
      if (d?.path?.startsWith('/')) open(d.path);
    }) as (d: never) => void);
    await push.register();
  } catch {
    started = false; // try again next time the panel opens
  }
}

export interface AppUpdate { required: boolean; available: boolean; storeUrl: string }

/** Asks the server whether this app build is still allowed (public endpoint, so it works before sign-in). Null outside the app. */
export async function appUpdateStatus(): Promise<AppUpdate | null> {
  if (!inNativeApp()) return null;
  try {
    const info = await cap()?.Plugins?.App?.getInfo();
    const code = Number(info?.build ?? 0) || 0;
    const r = await api<{ updateRequired: boolean; updateAvailable: boolean; storeUrl: string }>(`/app/config?platform=android&versionCode=${code}`);
    return { required: r.updateRequired, available: r.updateAvailable, storeUrl: r.storeUrl };
  } catch {
    return null; // offline: never lock the driver out because the check failed
  }
}
