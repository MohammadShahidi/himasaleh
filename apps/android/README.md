# اپ اندروید «های مصالح» (پوستهٔ Capacitor)

> وضعیت: **فقط راهنما و تنظیمات.** پروژهٔ بومی اندروید در این مخزن ساخته نشده، چون ساخت، امضا و آزمایش روی گوشی با Android Studio و دست مالک (یا کسی که اپ را نگه می‌دارد) است. طرح: [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) بخش ۴.۷؛ تصمیم‌ها: `DECISIONS.md` ف۱۵ تا ف۱۹.

اپ فقط یک WebView است که سایت منتشرشده را باز می‌کند (`server.url` در [`capacitor.config.json`](capacitor.config.json)). پس UI، کار آفلاین و منطق همان وب است و با هر استقرار وب، بی‌نیاز از بازبینی بازار، تازه می‌شود. بخش بومی فقط این‌هاست: دریافت اعلان FCM، کانال‌های صدا، باز شدن صفحهٔ درست با لمس اعلان، و شماره نسخه برای «به‌روزرسانی اجباری». کد وب این‌ها را از `apps/web/lib/native-bridge.ts` می‌خواند و فقط داخل اپ فعال می‌شود.

## ساخت (یک‌بار)

پیش‌نیاز: Node، Android Studio (SDK و JDK)، یک پروژهٔ Firebase.

```bash
mkdir -p /مسیر/دلخواه/himasaleh-android && cd /مسیر/دلخواه/himasaleh-android
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/push-notifications
cp <مخزن>/apps/android/capacitor.config.json .
mkdir www && echo '<!doctype html><title>های مصالح</title>' > www/index.html
npx cap add android
```

۱. در Firebase یک اپ اندروید با شناسهٔ `ir.himasaleh.app` بسازید، `google-services.json` را در `android/app/` بگذارید.
۲. نسخه (`versionCode` و `versionName`) در `android/app/build.gradle`: عدد `versionCode` همان است که سرور با `app.android.minVersionCode` و `latestVersionCode` مقایسه می‌کند.
۳. اپ را با کلید امضای خودتان (keystore) بسازید: `npx cap open android` ← Build ← Generate Signed Bundle / APK. **کلید امضا را جای امن و با پشتیبان نگه دارید؛ گم شدنش یعنی دیگر نمی‌شود اپ را به‌روز کرد.** آن را در مخزن و چت نگذارید.
۴. فایل را در کافه‌بازار منتشر کنید (حساب ناشر).

## سمت سرور

- `PUSH_PROVIDER=fcm` و `FCM_SERVICE_ACCOUNT_JSON` (محتوای کلید حساب سرویس Firebase) در `/srv/himasaleh/infra/.env`.
- تنظیمات ادمین: `app.android.storeUrl` (نشانی اپ در بازار)، `app.android.minVersionCode`، `app.android.latestVersionCode`.
- پیامک جایگزین بار جدید: `notify.newLoadSms.mode` (`off` / `fallback` / `always`) و `notify.smsFallbackAfterSec`.

## آزمایش لازم روی گوشی و اپراتور واقعی رانندگان

FCM به سرویس‌های گوگل وابسته است و در ایران ممکن است دیر برسد؛ این را فقط با گوشی واقعی می‌شود فهمید. موارد: رسیدن اعلان با برنامهٔ بسته، با صفحهٔ خاموش، بعد از چند ساعت، روی چند برند (شیائومی، سامسونگ، هوآوی) و اپراتور (همراه اول، ایرانسل). در بعضی برندها باید «شروع خودکار» و «بدون محدودیت باتری» روشن شود. تا نتیجهٔ این آزمایش، پنل باز (به‌روزرسانی هر ۲۰ ثانیه) و پیامک جایگزین حفظ می‌شود.
