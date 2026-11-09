# طريقي (Tareeqi) — سياق المشروع لـ Claude Code

مخطط مترو القاهرة (الخطوط 1 و2 و3): أقصر مسار، تحويلات، سعر التذكرة. واجهة عربية RTL.

**ابدأ دايمًا بقراءة `ROADMAP.md`** وكمّل من أول مهمة غير مكتملة. اتبع «قواعد العمل» اللي فيه.

## الأوامر

- `npm run dev` — تشغيل التطوير (Vite)
- `npm test` — اختبارات Vitest
- `npm run build` — build الإنتاج في `dist/`
- `npm run lint` — ESLint · `npm run format` — Prettier (`src/data/` مستثناة عمدًا عشان مصفوفات المحطات تفضل مضغوطة)
- قبل أي commit: `npm run lint && npm test && npm run build`

## الـ Stack

React 18 (JSX، مش TypeScript) · Vite · Tailwind CSS v4 · Vitest · خط IBM Plex Sans Arabic (@fontsource).

## الهيكل

- `src/data/metro.js` — المحطات والخطوط والأسعار (مصدر الحقيقة الوحيد للبيانات)
- `src/data/layout.js` — إحداثيات الخريطة **التخطيطية** (مش جغرافية)
- `src/lib/router.js` — Dijkstra على حالات `(محطة، خدمة)` + حساب السعر
- `src/lib/search.js` — توحيد وبحث النصوص العربية
- `src/components/` — StationPicker · MetroMap · RouteResult

## قرارات مهمة

- الخط الثالث بيتفرع عند الكيت كات، فمتمثّل كخدمتين `3A` و`3B` بجذع مشترك. الانتقال بينهم = «غيّر القطار».
- عدد محطات التذكرة = عدد الخطوات + 1 (محطة الركوب ومحطة النزول الاتنين محسوبين). المصدر في `docs/DATA.md`. `route.stops` = خطوات، و`route.fareStations` = محطات التذكرة.
- جزاء التحويل = 6 محطات في Dijkstra. الزمن: معدل لكل خدمة = `minutesEndToEnd` المنشور ÷ عدد الخطوات، + 4 د/تحويلة (تقدير).
- محطات التبادل: السادات، الشهداء، جمال عبدالناصر، العتبة، جامعة القاهرة.
- الـ SVG بياخد `direction: ltr` عشان `text-anchor` يشتغل صح داخل صفحة RTL.
- ماتستخدمش `setPointerCapture` عند `pointerdown` في الخريطة (بيخطف الـ click من المحطات). الـ capture بيبدأ بس لما السحب يبدأ.
- الأسعار سارية من 27 مارس 2026: ≤9 = 10، ≤16 = 12، ≤23 = 15، ≤39 = 20.

## ممنوعات

- ممنوع تألّف بيانات محطات أو أسعار أو إحداثيات. كل بيان لازم مصدر في `docs/DATA.md`.
- اسأل أحمد قبل إضافة backend أو خدمة مدفوعة أو تغيير الـ stack.
- حافظ على الواجهة RTL واستخدم خصائص Tailwind الـ logical (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`).
