# Handoff: «های مصالح» — Building-materials marketplace (PWA)

## Overview
A Persian (RTL) PWA connecting **customers** (personal buyers & contractors), **material suppliers** (مصالح‌فروش), **truck drivers** and an **admin/ops team**. Customers order materials; the system sends price inquiries to nearby suppliers (and our own warehouse), the customer compares landed-price offers and pays online (gateway or bank transfer), a driver is dispatched, and delivery is tracked through a digital waybill (**برگ حمل**). Admin configures fees, rewards/cashback, referrals, staff permissions, inventory, operational rules and site content.

The business rules are specified in **system-processes.docx** (the process document). This design follows it; where a number appears in the UI it is a default that admin can change.

## About the Design Files
The files here are **design references built in HTML** — prototypes that show intended look, copy and behavior. They are **not production code**. Recreate them in the target stack (recommended if none exists: Next.js/React + Tailwind, RTL, PWA; or the team's chosen framework) using its own patterns. Each `*.dc.html` opens directly in a browser (needs `support.js` beside it); logic lives in the `class Component` inside each file and shows the intended state & transitions. Demo data is hard-coded; persistence uses `localStorage` only to simulate the backend.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy and interactions are final. Recreate pixel-accurately.

## Global
- Direction `rtl`, language `fa`. Font **Vazirmatn** (400–900). Icons **Tabler Icons webfont 3.19** (`ti ti-*`).
- All numbers shown with Persian digits; inputs must accept Persian/Arabic/Latin digits and normalize.
- Money shown in words for low-literacy panels ("۸ میلیون و ۵۰۰ هزار تومان").
- PWA: `manifest.webmanifest`, `sw.js` (network-first for pages, cache-first for static). **The `CORE` list in sw.js is manual — update it when pages are added/removed.**

### Design tokens
- Brand orange `#FF5B0F` (hover/darker `#E4500A`, light tint `#FFF0E8`, `#FFF8F4`, accent text on dark `#FF8A4F`)
- Ink `#141414`, dark surface `#2A2A2A`, body text `#1a1a1a / #222 / #333`, muted `#555 #666 #777 #888 #999 #AAA #BBB`
- Backgrounds `#F4F4F5` (admin/panel), `#EDEDED`/`#F6F6F6` (simple panels), `#FAFAFA` fields, white cards
- Borders `#E2E2E2 #E6E6E6 #ECECEC #EFEFEF #F0F0F0 #F4F4F4`
- Success `#22A45D` / text `#178A48` / tint `#E6F6EC` `#F2FBF5`
- Warning `#E4A10A` / text `#B57F00 #7A5600` / tint `#FFF6E0`
- Danger `#C8341E` / tint `#FDECEA` `#FDF3F1`
- Info `#1E4FD8` / tint `#E8EFFD`
- Radii: 8, 10, 12, 14, 16, 18, 20, 22, 24, 26px; pills 999px
- Shadows: orange CTA `0 12px 26px rgba(255,91,15,.3)`; card `0 10px 30px rgba(0,0,0,.06)`; modal `0 30px 80px rgba(0,0,0,.3)`
- Motion: easing `cubic-bezier(.2,.8,.2,1)`; press scale `.96`; pane enter `opacity 0→1, translateY(16px)→0, .45s`; pulse ring on current step.

### Two UI densities
1. **Simple panels** (driver, supplier) for low-literacy users: max-width 560px, single column, huge buttons (56–96px tall, 17–24px text, weight 900), icon + word on everything, voice "say" text per step, fixed bottom tab bar, no tables.
2. **Pro panels** (customer, admin): sidebar 260px dark (`#141414`), content padding 24/32px, cards radius 20–22px, 14–17px text. Sidebar hides <1000px (bottom nav in customer panel).

## Shared components
| File | Purpose |
|---|---|
| `SiteHeader` / `SiteFooter` / `PageHero` | Public site chrome; header has mega-menu, mobile drawer, install-PWA button, «درخواست مشاوره». |
| `ConsultModal` | Consultation form, opened by `window.dispatchEvent(new CustomEvent('hm:consult',{detail:{topic, ctx}}))`. Fields: mobile (Persian digits OK, validated `^09\d{9}$` after normalize), topic chips (list from admin «قوانین عملیاتی › موضوع‌های درخواست مشاوره», fallback default list), optional note. Product «استعلام قیمت» passes `ctx` = product name (shown at top) and topic `استعلام قیمت`. Success: «درخواست ثبت شد؛ کارشناس ما تا ۲۴ ساعت … تماس می‌گیرد». Centered dialog ≥641px; **bottom sheet** ≤640px (radius 26 26 0 0, grip). Esc / backdrop closes; body scroll locked. |
| `RoleSwitch` | Always-visible role bar. Dark `#141414` bar, label «نقش من», one button per role (icon + short name: شخصی/پیمانکار/راننده/مصالح‌فروش/مدیریت), active role orange with check. Rendered **only if account has >1 role**. Tap → set active role → navigate to that role's panel. Placed: top of customer panel main, above header in driver & supplier panels, top of admin dashboard (staff with another role). Horizontally scrollable on narrow screens. |
| `WaybillCard` | Digital waybill (برگ حمل): number, status, tracking code, origin/destination, distance, rows (goods, weight, fare, payment = "paid to های مصالح — no cash"), driver, plate, notes, optional admin note. |
| `MapPicker` | Location picker (map + search + "my location"); after «همین‌جاست» shows a confirmation and returns to the form. Mobile & desktop. |
| `ReferCard` | Referral banner — collapsed by default (title + next reward + chevron); tap expands (grid-rows 0fr→1fr .45s) to show reward ladder, code, share (Web Share / WhatsApp / SMS), friends list, rules. Reads admin referral config. |

## Screens
**Public:** `index` (home), `products` (filterable grid; each card «استعلام قیمت» → ConsultModal with product), `categories`, `about`, `contact`.

**`login`** — mobile → 5-digit OTP (resend timer; after 7 sends → 5-min lock message). New user picks role: personal / contractor / driver / supplier. One mobile = one account with multiple roles (new role is **added**, not replaced). Driver → `driver-register`.

**`driver-register`** — step wizard: identity docs (national card), vehicle card, green sheet, home location (MapPicker), selfie video with reading script. If owner ≠ driver: owner's ID docs, relationship; non-first-degree relatives also need one of power of attorney / notarized consent / lease **or owner consent video**; both parties read a legal consent text on video.

**`panel` (customer)** — RoleSwitch; order list + detail. Timeline: ثبت سفارش → در انتظار قیمت → انتخاب پیشنهاد و پرداخت → تخصیص راننده → … → تحویل. Connector line black when the next step is reached. Offers sorted by landed price (goods + forecast fare), distance, ready time, our-warehouse badge; supplier phone hidden until paid. Payment: gateway (25-min hold) or bank transfer — transfer **registers the choice directly**, then shows IBAN + amount + 1-business-day deadline + receipt upload; finance approves. Large-order notice (call from expert). Fare difference: refund to wallet / 25-min top-up. Waybill shown only once issued. Confirm delivery / report shortage; auto-confirm after 24h. Referral banner. Free cancel before payment.

**`driver-panel`** — RoleSwitch, header (name, plate, online toggle). Tabs: load offers (accept/reject, fare in words), current trip (steps: go to load → count with supplier & photo, tarp, take waybill → deliver: count with receiver, signed waybill photo), «دیدن برگ حمل کامل» opens WaybillCard in a **bottom sheet** inside the panel, money (wallet; net after commission credited after delivery; no cash collection), referral, help.

**`supplier-panel`** — RoleSwitch, header (store, open/closed). Inquiry: «دارید؟» yes/no → price (warning if above competitive price, showing best price without competitor name) → ready time → send. Loading: plate check, «بار زدم». Money, location reminder, help.

**Admin** (sidebar on all): `admin` (dispatch, driver document review w/ reject reasons, own-warehouse offer alongside suppliers), `admin-ops` (fare table per vehicle, weather factor, auto fare bump & cap, all deadlines, late fines, driver cancel thresholds, OTP/bot limits, cancellation fee table, returnable categories, primary/backup SMS, supplier payout method, consultation topics), `admin-partners` (admin-created supplier without IBAN + SMS invite, license/IBAN/location checks, transfer-receipt approval, driver cancellations), `admin-finance` (commissions per category, wallet min withdrawal 1M, settlements), `admin-rewards` (bonus / cashback / preferential commission / goal campaigns for groups or individuals, SMS + in-panel), `admin-referral` (fixed / tiered / festival multiplier, trigger default = after 3rd successful trip, fraud flags), `admin-inventory` (own stock, reservation until payment deadline), `admin-team` (roles & per-module permissions), `admin-cms` (products, categories, pages).

## State (backend to replace localStorage)
`hm_user` {role, roles[], name, phone} · `hm_ops` (operational rules) · `hm_ref` (referral config) · `hm_consults` (consult requests) · finance/rewards/cms configs. All admin numbers are config, not constants.

## Assets
`assets/` — hero, category photos (c1–c5), CTA background, warehouse photo, logos (light/dark), PWA icons (192, 512, maskable). Photos are placeholders to be replaced with licensed imagery.

## Files
All `*.dc.html` above, plus `support.js` (runtime for viewing the prototypes only), `sw.js`, `manifest.webmanifest`.
