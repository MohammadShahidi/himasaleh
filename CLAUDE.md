# CLAUDE.md

Building-materials marketplace «های مصالح»: customers order, suppliers quote, drivers deliver, the platform takes a commission. Persian, RTL, PWA.

## Read first

| File | What it holds |
|---|---|
| `docs/system-processes.docx` | **Approved business processes** (the spec). Every rule in code traces to it. |
| `docs/ARCHITECTURE.md` | Technical design (Persian). Section numbers are referenced from code comments. |
| `docs/DECISIONS.md` | Why each decision was made, assumptions awaiting the owner's confirmation, accepted risks. |
| `docs/STATUS.md` | What is built, what inputs are still owed by the owner, what is next. Update it when a phase moves. |
| `design/project/` | Claude Design handoff — high-fidelity, final. `design/project/README.md` lists tokens and per-screen notes. |

## Working agreements with the owner

- **Talk to the owner in Persian.** Be direct and critical: name contradictions, risks and weak assumptions; don't just agree.
- Order of work: process doc → owner approval → technical design → approval → code. Ask before architecturally significant changes.
- One branch + PR per phase into `main`; the owner reviews before the next phase starts.
- New design exports **replace `design/project` entirely**; list what changed and what does not match the process doc.
- Never put secrets in chat or the repo. Real keys go in the environment's variables.
- When the owner answers questions in the Word doc, diff it against the previous version and merge the answers; record new decisions in `docs/DECISIONS.md`.

## Layout

```
apps/web        Next.js 16 (App Router) + Serwist PWA. Components in apps/web/components.
apps/api        NestJS 12 + Prisma 7 + pg-boss. One module per domain (architecture §4.2).
packages/shared zod schemas, Persian digit/money formatting, validators — used by both apps.
infra           compose files (dev, demo, prod), Caddyfile, Dockerfiles, backup script.
```

## Commands

```sh
pnpm install
pnpm dev:infra                       # postgres + SeaweedFS (S3) in Docker
cp apps/api/.env.example apps/api/.env
pnpm --filter @hm/shared build       # web and api import the built package
pnpm --filter @hm/api dev:buckets
pnpm --filter @hm/api db:migrate     # prisma migrate dev
pnpm dev:api                         # :4000/api
pnpm dev:web                         # :3000 (proxies /api to :4000)
pnpm -r typecheck && pnpm -r test    # what CI runs, plus migration drift check and builds
docker compose -f infra/docker-compose.demo.yml up --build   # whole app on localhost:3000
```

SMS is faked in development: the OTP is printed in the API log (`[primary] OTP → 0912…`).
Component preview without real pages: `/dev/components` (404 in production).

## Conventions

- **ESM everywhere** (`"type": "module"`). In `apps/api` and `packages/shared`, relative imports end in `.js`.
- **No business number in code.** Deadlines, percentages, limits live in `apps/api/src/settings/defaults.ts` and are read through `SettingsService`; admins override them in the `Setting` table.
- **Money is `bigint` rials**, rates are integer basis points (`applyBp` in shared). Toman only when displaying (`formatToman`, `formatTomanWords`).
- **Snapshot what a party was shown** (commission rate, quoted price, fare) on the record at that moment; lock it after they act.
- **API errors:** throw `AppError(status, CODE, 'Persian message')`; panels show `message` as-is.
- Validate input with the shared zod schemas through `ZodPipe`. Persian/Arabic digits are normalized there.
- Every endpoint needs auth unless marked `@Public()`. Staff permission matrix arrives in phase 3.
- Audit sensitive actions (`AuditService.log`) with before/after values.
- **UI fidelity:** components port the design's inline styles as React `style` objects and keep the design's `data-*` hooks; the hover/media rules from the designs' `<style>` blocks live in `apps/web/components/ui.css`. Tailwind tokens in `app/globals.css` for anything new.
- Icons: Tabler as SVG via `components/icon.tsx` — a registry of only the icons used. Add a name there when a design uses a new `ti-*` icon (`IconFooBar` from `@tabler/icons-react`).
- Isolate LTR fragments inside RTL text (`<bdi dir="ltr">`) — phone numbers, waybill numbers, coordinates.
- Commit messages end with the attribution lines the session provides.

## Gotchas found while building

- **Next.js resolves `rewrites()` at build time.** The `/api` proxy target is the `API_INTERNAL_URL` *build arg* of `infra/web.Dockerfile`, not a runtime env.
- **Prisma 7:** datasource URL lives in `apps/api/prisma.config.ts`; the client uses `@prisma/adapter-pg`; the generated client is in `apps/api/src/generated` (gitignored) — run `prisma generate` (the `build`/`typecheck` scripts do).
- In ESM Nest modules, keep DI tokens (`Symbol`s) out of the module file that imports the controller, or the controller sees them in the temporal dead zone (see `geo/geo.provider.ts`).
- **MinIO no longer publishes community Docker images**; SeaweedFS is the S3 server for dev/demo and the fallback in production.
- Nominatim requires ≤1 request/second and a real User-Agent; `NominatimProvider` serializes and caches. Map tiles are OSM until the Neshan key arrives — don't guess Neshan's tile URL, wait for its docs.
- `next build` prerenders `/dev/components` as a 404 in production by design.
- Iranian mobile carriers put many users behind one IP: OTP bot detection prefers the device id (`x-device-id`) and uses IP only without it.

### Claude Code cloud sandbox only

- `dockerd` may not be running: start it with `setsid dockerd > /tmp/dockerd.log 2>&1 &`.
- Docker builds can't see the proxy CA: build from a scratch copy of the Dockerfile that copies `/root/.ccr/ca-bundle.crt` and sets `NODE_EXTRA_CA_CERTS`, `HTTPS_PROXY` (`--network host --build-context ca=/root/.ccr`). Never commit that.
- Docker Hub may answer 429: pull from `mirror.gcr.io/library/<image>` and tag locally.
- `pkill -f <pattern>` can kill your own shell when the pattern appears in the command line; kill by PID.
- Chromium for UI checks: Playwright with `executablePath: '/opt/pw-browsers/chromium'`. External map tiles don't load there.
