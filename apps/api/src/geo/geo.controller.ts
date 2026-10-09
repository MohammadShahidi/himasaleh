import { Controller, Get, HttpStatus, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../common/errors.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { GEO_PROVIDER, type GeoProvider } from './geo.provider.js';

const coords = z.object({ lat: z.coerce.number().min(24).max(40.5), lng: z.coerce.number().min(44).max(63.5) });
const query = z.object({ q: z.string().trim().min(2).max(100) });

/** Behind auth: the map picker is used inside panels and registration, not on the public site. */
@Controller('geo')
export class GeoController {
  constructor(@Inject(GEO_PROVIDER) private readonly geo: GeoProvider) {}

  @Get('reverse')
  async reverse(@Query(new ZodPipe(coords)) c: z.output<typeof coords>) {
    try {
      return { address: await this.geo.reverse(c.lat, c.lng) };
    } catch {
      // The pin still counts without a text address; the panel shows the coordinates.
      return { address: '' };
    }
  }

  @Get('search')
  async search(@Query(new ZodPipe(query)) { q }: z.output<typeof query>) {
    try {
      return { results: await this.geo.search(q) };
    } catch {
      throw new AppError(HttpStatus.BAD_GATEWAY, 'GEO_UNAVAILABLE', 'جستجو الان ممکن نیست. نقشه را دستی بکشید.');
    }
  }
}
