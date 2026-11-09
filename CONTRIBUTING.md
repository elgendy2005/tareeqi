# المساهمة في طريقي

شكرًا إنك عايز تساعد! أسهل وأهم مساهمة هي **تصحيح البيانات**، لأن الشبكة بتتغيّر: محطات بتفتح، وأسعار بتزيد.

## لقيت بيان غلط؟

افتح [بلاغ تصحيح بيانات](https://github.com/elgendy2005/tareeqi/issues/new?template=data-correction.yml) ومعاك **رابط المصدر**. من غير مصدر مش هنقدر نعدّل، حتى لو المعلومة صح، لأن كل بيان في المشروع لازم يبقى قابل للتحقق.

## القاعدة الأساسية: مفيش بيانات من غير مصدر

- كل محطة وسعر وزمن وإحداثية ليها مصدر مكتوب في [`docs/DATA.md`](docs/DATA.md)، ومعاه تاريخ المراجعة.
- لو مش متأكد، اكتب `TODO(verify)` جنب البيان، واذكره في قسم «افتراضات لازم تعرفها» في الـ README. **ماتخمّنش.**
- الخطوط اللي تحت الإنشاء بتترسم بس (`PLANNED_LINES`)، ومابتدخلش في التوجيه غير لما تتشغّل رسميًا.

## تشغيل المشروع

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest
npm run test:e2e       # Playwright (أول مرة: npx playwright install chromium)
```

## قبل ما تفتح Pull Request

```bash
npm run lint && npm run format:check && npm run test:coverage && npm run build
npm run test:e2e
```

الـ CI بيشغّل نفس الأوامر دي. و`test:coverage` بيفشل لو أي ملف في `src/lib` نزل عن 90%.

## فين إيه؟

| عايز تعدّل…             | الملف                                   | ومعاه                                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------------------ |
| محطة أو ترتيب خط        | `src/data/metro.js`                     | `src/data/layout.js` (مكانها على الخريطة) و`coords.js` |
| الأسعار أو الشرائح      | `FARE_SYSTEMS` في `src/data/metro.js`   | اختبارات الأسعار في `src/lib/router.test.js`           |
| مشي بين محطتين منفصلتين | `TRANSFER_LINKS` في `src/data/metro.js` | `WALK_PATHS` في `layout.js`                            |
| محرك المسارات           | `src/lib/router.js`                     | `router.test.js`                                       |

وفي كل الحالات: حدّث المصدر وتاريخ المراجعة في `docs/DATA.md`. وأي عدد ثابت في الاختبارات (عدد المحطات، أو سعر رحلة معيّنة) لازم يتعدّل معاه.

## الكود

- React 18 بـ JSX (مش TypeScript)، وTailwind v4.
- الواجهة **عربي RTL**. استخدم خصائص Tailwind الـ logical (`ms-` و`me-` و`ps-` و`pe-` و`start-` و`end-`) بدل `left`/`right`.
- نصوص الواجهة بالعربي المصري البسيط، وبنفس نبرة النصوص الموجودة.
- أي مكوّن جديد لازم يشتغل بالكيبورد ومع قارئ الشاشة.
- رسائل الـ commit بصيغة [Conventional Commits](https://www.conventionalcommits.org/): `feat:` و`fix:` و`docs:` و`test:` و`chore:`.
- `src/data/` مستثناة من Prettier عمدًا، عشان مصفوفات المحطات تفضل مضغوطة وسهلة المراجعة.

## أفكار أكبر

حاجات زي الميكروباص أو حسابات المستخدمين محتاجة backend وقرارات منتج. افتح Issue للنقاش الأول قبل ما تبدأ فيها. شوف قسم «بعد v1.0» في [`ROADMAP.md`](ROADMAP.md).
