import { HttpStatus, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppError } from './errors.js';

export class ZodPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    const r = this.schema.safeParse(value);
    if (!r.success) {
      const issue = r.error.issues[0];
      throw new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION', issue?.message ?? 'ورودی نامعتبر است', {
        path: issue?.path.join('.'),
      });
    }
    return r.data;
  }
}
