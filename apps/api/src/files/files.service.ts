import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { HttpStatus, Injectable } from '@nestjs/common';
import busboy from 'busboy';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/errors.js';
import type { AuthUser } from '../common/request.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { maxBytesFor } from './file-rules.js';
import { StorageService, type Visibility } from './storage.service.js';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Streams one multipart file straight to storage, enforcing type and size while it streams. */
  upload(req: Request, ownerId: string, visibility: Visibility) {
    return new Promise<{ id: string; mime: string; size: number }>((resolve, reject) => {
      let bb: busboy.Busboy;
      try {
        bb = busboy({ headers: req.headers, limits: { files: 1, fields: 0 } });
      } catch {
        return reject(new AppError(HttpStatus.BAD_REQUEST, 'NO_FILE', 'فایلی ارسال نشد.'));
      }
      let handled = false;
      bb.on('file', (_name, stream, info) => {
        handled = true;
        const max = maxBytesFor(info.mimeType);
        if (!max) {
          stream.resume();
          return reject(new AppError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'FILE_TYPE', 'نوع فایل مجاز نیست.'));
        }
        const now = new Date();
        const key = `${visibility}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}`;
        const body = new PassThrough();
        let size = 0;
        let tooBig = false;
        stream.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > max && !tooBig) {
            tooBig = true;
            body.destroy(new Error('too big'));
            stream.resume();
          }
        });
        stream.pipe(body);
        this.storage
          .put(visibility, key, body, info.mimeType)
          .then(async () => {
            const row = await this.prisma.fileObject.create({ data: { ownerId, visibility, key, mime: info.mimeType, size } });
            resolve({ id: row.id, mime: row.mime, size: row.size });
          })
          .catch(() =>
            reject(
              tooBig
                ? new AppError(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE', 'حجم فایل بیشتر از حد مجاز است.')
                : new AppError(HttpStatus.BAD_GATEWAY, 'STORAGE', 'ذخیرهٔ فایل ممکن نشد. دوباره امتحان کنید.'),
            ),
          );
      });
      bb.on('close', () => {
        if (!handled) reject(new AppError(HttpStatus.BAD_REQUEST, 'NO_FILE', 'فایلی ارسال نشد.'));
      });
      bb.on('error', () => reject(new AppError(HttpStatus.BAD_REQUEST, 'UPLOAD', 'ارسال فایل ناقص ماند.')));
      req.pipe(bb);
    });
  }

  /** Owners see their own files; staff see any file, and every staff view of a private file is audited. */
  async url(id: string, user: AuthUser, ip: string) {
    const f = await this.prisma.fileObject.findUnique({ where: { id } });
    const isStaff = user.role === 'staff';
    if (!f || (f.ownerId !== user.id && !isStaff)) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'فایل پیدا نشد.');
    if (f.visibility === 'public') return { url: this.storage.publicUrl(f.key) };
    if (isStaff && f.ownerId !== user.id) await this.audit.log({ actorId: user.id, action: 'file.view', entity: 'file', entityId: f.id, ip });
    return { url: await this.storage.signedUrl(f.key), expiresInSec: 300 };
  }
}
