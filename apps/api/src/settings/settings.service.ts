import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SETTING_DEFAULTS, type SettingKey, type SettingValue } from './defaults.js';

const CACHE_MS = 30_000;

@Injectable()
export class SettingsService {
  private cache = new Map<string, { value: unknown; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as SettingValue<K>;
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const value = (row?.value ?? SETTING_DEFAULTS[key]) as SettingValue<K>;
    this.cache.set(key, { value, at: Date.now() });
    return value;
  }

  async getMany<K extends SettingKey>(keys: readonly K[]): Promise<{ [P in K]: SettingValue<P> }> {
    const out = {} as { [P in K]: SettingValue<P> };
    for (const k of keys) out[k] = await this.get(k);
    return out;
  }

  async set<K extends SettingKey>(key: K, value: SettingValue<K>, actorId: string, ip?: string) {
    const before = await this.get(key);
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as never, updatedBy: actorId },
      update: { value: value as never, updatedBy: actorId },
    });
    this.cache.delete(key);
    await this.audit.log({ actorId, action: 'setting.update', entity: 'setting', entityId: key, before, after: value, ip });
  }
}
