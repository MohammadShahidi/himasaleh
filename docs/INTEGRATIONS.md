# سرویس‌های بیرونی: مشخصات دریافت‌شده از مستندات

هر سرویس پشت یک آداپتور است ([`ARCHITECTURE.md`](ARCHITECTURE.md) بخش ۱۰). این فایل فقط آنچه از مستندات رسمی خوانده شده را نگه می‌دارد، تا هنگام نوشتن آداپتور حدس نزنیم. کلیدها فقط متغیر محیطی‌اند.

## نشان — مسیریابی (برای کرایه، فاز ۲)

منبع: <https://platform.neshan.org/docs/api/routing-category/routing/> (خوانده‌شده ۱۴۰۵/۰۷/۲۰)

- `GET https://api.neshan.org/v4/direction` با هدر `Api-Key: <کلید>`.
- پارامترها: `type` (`car` یا `motorcycle`، الزامی)، `origin` و `destination` به‌صورت `عرض,طول` (الزامی)، `waypoints` (نقاط میانی، جداشده با `|`)، `avoidTrafficZone`، `avoidOddEvenZone`، `alternative` (پیش‌فرض همه `false`)، `bearing` (۰ تا ۳۶۰).
- پاسخ: `routes[].legs[]` با `distance.value` (متر) و `duration.value` (ثانیه)، `summary`، `steps[]`؛ `routes[].overview_polyline.points` مسیر ساده‌شده (Encoded Polyline). **ترتیب مختصات:** ورودی عرض‌ابتدا، `steps[].start_location` طول‌ابتدا.
- خطاها: ۴۰۰ `INVALID_ARGUMENT`، ۴۷۰ `CoordinateParseError`، ۴۸۰ `KeyNotFound`، ۴۸۱ `LimitExceeded` (سهمیه)، ۴۸۲ `RateExceeded` (در دقیقه)، ۴۸۳ `ApiKeyTypeError`، ۴۸۴ `ApiWhiteListError`، ۴۸۵ `ApiServiceListError`، ۵۰۰ `GenericError`. مستندات عدد سهمیه یا نرخ دقیقه نمی‌دهد.
- **برای کد:** مسافت کرایه = `legs[0].distance.value / 1000` کیلومتر؛ نتیجهٔ هر جفت مبدا و مقصد چند ساعت کش می‌شود. اگر ۴۸۱ یا ۴۸۲ یا خطای شبکه آمد، طبق بخش ۴.۵ معماری مسافت خط مستقیم × ضریب جاده (`fare.roadFactor`) استفاده می‌شود و کارشناس هشدار می‌گیرد. کلید به دامنهٔ سایت محدود می‌شود (۴۸۴). کلید نقشهٔ نمایشی و کلید مسیریابی دو کلید جدا هستند (۴۸۳).
- هنوز ننوشته شده: `NESHAN_API_KEY` و آداپتور `RoutingProvider` با فاز ۲ می‌آید. کاشی نقشه همچنان OSM است (بخش ۳.۷)؛ نشانی کاشی نشان از همین مستند نیست و حدس زده نمی‌شود.

## شاهکار — جیبیت (راننده و مالک، فاز ۱)

منبع: <https://developers.jibit.ir/#/operations/ideMatchNationalCodeAndMobileNumber> (متن را مالک فرستاد، ۱۴۰۵/۰۷/۲۰)

- `GET https://napi.jibit.ir/ide/v1/services/matching?nationalCode=…&mobileNumber=…` — بررسی اینکه کد ملی و موبایل مال یک نفرند (پشتوانه: شاهکار).
- پارامترهای query (الزامی): `nationalCode` (۱۰ رقم معتبر)، `mobileNumber`.
- هدرها: `Authorization` (الزامی)، `X-TRACK-ID` (اختیاری؛ در پاسخ موفق برمی‌گردد).
- پاسخ `200`: `{ "matched": true | false }`.
- وقتی همهٔ ارائه‌دهنده‌های پشت آن بدون نتیجه بمانند، خطای `handler.too_many_requests` می‌دهد.
- **ننوشته در متن دریافتی:** نحوهٔ گرفتن مقدار `Authorization` (مثلاً توکن از کلید و رمز API) و کدهای خطای دیگر. آداپتور فعلاً مقدار کامل هدر را از `JIBIT_AUTHORIZATION` می‌خواند؛ اگر توکن منقضی می‌شود، باید مستند «گرفتن توکن» هم داده شود تا خودکار تمدید شود.
- **در کد:** `apps/api/src/identity` — `SHAHKAR_PROVIDER=jibit` و `JIBIT_AUTHORIZATION` (فقط روی سرور). با ارسال ثبت‌نام، تطابق موبایل ↔ کد ملی راننده (با موبایل حسابش) و مالک (با موبایلی که راننده نوشته) خودکار بررسی و در `shahkarResult` مدرک کارت ملی ذخیره می‌شود. خطا یا قطعی جلوی ثبت‌نام را نمی‌گیرد؛ کارشناس نتیجه (`matched`، `error`) را می‌بیند و می‌تواند دستی تصمیم بگیرد. بدون پیکربندی (`manual`) همه‌چیز دستی است.
