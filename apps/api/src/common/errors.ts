import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Every API error carries a stable machine code and a Persian message the panels can show as-is.
 */
export class AppError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, extra?: Record<string, unknown>) {
    super({ code, message, ...extra }, status);
  }
}
