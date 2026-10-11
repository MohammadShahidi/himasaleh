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

منبع: <https://developers.jibit.ir/#/operations/ideMatchNationalCodeAndMobileNumber>

**هنوز خوانده نشد.** دامنهٔ `developers.jibit.ir` از ماشین توسعه باز نمی‌شود (اتصال TLS قطع می‌شود؛ `jibit.ir` باز است). برای نوشتن آداپتور لازم است متن همان صفحه (نشانی، روش احراز هویت و گرفتن توکن، بدنهٔ درخواست و پاسخ، کدهای خطا) یا فایل OpenAPI آن در مخزن گذاشته شود. تا آن موقع تطابق موبایل و کد ملی را کارشناس دستی تأیید می‌کند ([`DECISIONS.md`](DECISIONS.md) بند ۱۰).
