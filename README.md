# های مصالح

بازار آنلاین مصالح ساختمانی: مشتری، مصالح‌فروش و راننده در یک سامانه.

- فرایندهای تاییدشده: [`docs/system-processes.docx`](docs/system-processes.docx)
- طراحی فنی: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- طراحی‌های Claude Design (فقط مرجع): [`design/`](design/)

## ساختار

| مسیر | محتوا |
|---|---|
| `apps/web` | Next.js — سایت، پنل‌ها، PWA |
| `apps/api` | NestJS + Prisma + pg-boss — API و کارهای زمان‌دار |
| `packages/shared` | اعتبارسنجی، فرمت پول و عدد فارسی، طرح‌های zod مشترک |
| `infra` | Docker Compose (توسعه و تولید)، Caddy، پشتیبان‌گیری |

## اجرای محلی

Node 22، pnpm 10 و Docker لازم است.

```sh
pnpm install
pnpm dev:infra                         # PostgreSQL + S3 (SeaweedFS) در Docker
cp apps/api/.env.example apps/api/.env
pnpm --filter @hm/shared build
pnpm --filter @hm/api dev:buckets      # ساخت دو bucket محلی
pnpm --filter @hm/api db:migrate
pnpm dev:api                           # http://localhost:4000/api
pnpm dev:web                           # http://localhost:3000
```

پیامک در توسعه شبیه‌سازی می‌شود: کد تایید در لاگ API چاپ می‌شود (`[primary] OTP → 0912…`).

## بررسی‌ها

```sh
pnpm -r typecheck
pnpm -r test
```

همین‌ها به‌علاوهٔ بررسی migrationها و ساخت ایمیج‌ها در GitHub Actions اجرا می‌شوند.

## استقرار

```sh
cp infra/.env.example infra/.env       # پر کردن مقادیر روی سرور
docker compose -f infra/docker-compose.yml up -d --build
# اگر S3 جدا ندارید:  --profile storage  و  infra/seaweedfs-s3.json
```

پشتیبان‌گیری شبانه: `infra/backup.sh` (توضیح داخل فایل).
