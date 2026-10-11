import { Inject, Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ENV, type Env } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Timed work runs on pg-boss inside PostgreSQL — no Redis, no separate worker service.
 * Later phases register their own queues (inquiry close, payment deadlines, auto-confirm, ...).
 */
@Injectable()
export class JobsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  readonly boss: PgBoss;
  private markReady!: () => void;
  /** Resolves when the queue runner is up; other modules await it before registering their queues. */
  readonly ready = new Promise<void>((resolve) => { this.markReady = resolve; });

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: 'pgboss' });
    this.boss.on('error', (err: unknown) => this.logger.error(err));
  }

  async onModuleInit() {
    await this.boss.start();
    await this.boss.createQueue('auth.cleanup');
    await this.boss.schedule('auth.cleanup', '30 3 * * *');
    await this.boss.work('auth.cleanup', async () => this.cleanupAuth());
    this.markReady();
  }

  /** Handles one-off jobs of a queue (see `later`). */
  async onQueue<T extends object>(queue: string, handler: (data: T) => Promise<void>) {
    await this.ready;
    await this.boss.createQueue(queue);
    await this.boss.work<T>(queue, async (jobs) => {
      for (const j of jobs) await handler(j.data);
    });
  }

  /** Queues a one-off job to run after `afterSec` seconds. */
  async later(queue: string, data: object, afterSec: number) {
    await this.boss.send(queue, data, { startAfter: afterSec });
  }

  /** Registers a repeating job (cron) and its handler. Safe to call from any module's onModuleInit. */
  async every(queue: string, cron: string, handler: () => Promise<void>) {
    await this.ready;
    await this.boss.createQueue(queue);
    await this.boss.schedule(queue, cron);
    await this.boss.work(queue, async () => handler());
  }

  async onApplicationShutdown() {
    await this.boss.stop({ graceful: true });
  }

  /** Daily: drop old OTP codes and request logs, and expired blocks. */
  async cleanupAuth() {
    const day = new Date(Date.now() - 24 * 3600_000);
    const week = new Date(Date.now() - 7 * 24 * 3600_000);
    await this.prisma.otpCode.deleteMany({ where: { createdAt: { lt: day } } });
    await this.prisma.otpRequestLog.deleteMany({ where: { createdAt: { lt: week } } });
    await this.prisma.block.deleteMany({ where: { until: { lt: new Date() } } });
  }
}
