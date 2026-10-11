import { Logger } from '@nestjs/common';

export interface PushMessage {
  title: string;
  body: string;
  /** deep link the app opens when the notification is tapped, e.g. /driver/offers/abc */
  path?: string;
  /** our NotificationLog id; the app sends it back to confirm arrival */
  notificationId: string;
  /** Android channel: `loads` is loud and high priority, `general` is normal */
  channel: 'loads' | 'general';
}

export interface PushResult {
  ref?: string;
  /** the provider says this token will never work again; delete the device */
  invalidToken?: boolean;
}

/** One implementation per push service (FCM first; a domestic service would be another one). */
export interface PushProvider {
  readonly name: string;
  send(token: string, msg: PushMessage): Promise<PushResult>;
}

/** Development provider: writes the push to the log instead of sending it. */
export class FakePushProvider implements PushProvider {
  readonly name = 'fake';
  private readonly logger = new Logger('FakePush');

  async send(token: string, msg: PushMessage): Promise<PushResult> {
    this.logger.log(`push → ${token.slice(0, 8)}…: [${msg.channel}] ${msg.title} — ${msg.body} (${msg.path ?? '-'})`);
    return {};
  }
}
