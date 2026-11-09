import { describe, it, expect } from 'vitest'
import {
  findRoute,
  fareFor,
  isInterchange,
  minutesPerStop,
  MIN_PER_TRANSFER,
  ticketPrice,
  routeFare,
} from './router.js'
import { SERVICES, STATIONS } from '../data/metro.js'
import { searchStations, normalize } from './search.js'

describe('بيانات الشبكة', () => {
  it('كل المحطات في الخدمات موجودة في STATIONS', () => {
    for (const s of SERVICES) for (const id of s.stations) expect(STATIONS[id], id).toBeTruthy()
  })
  it('الخط 1 = 35 محطة، الخط 2 = 20 محطة، الخط 3 = 34 محطة', () => {
    const n = (id) => SERVICES.find((s) => s.id === id).stations.length
    expect(n('1')).toBe(35)
    expect(n('2')).toBe(20)
    expect(
      new Set([
        ...SERVICES.find((s) => s.id === '3A').stations,
        ...SERVICES.find((s) => s.id === '3B').stations,
      ]).size,
    ).toBe(34)
  })
  it('محطات التبادل الخمسة', () => {
    for (const id of ['sadat', 'shohadaa', 'nasser', 'attaba', 'cairo-university'])
      expect(isInterchange(id), id).toBe(true)
    expect(isInterchange('maadi')).toBe(false)
    expect(isInterchange('kit-kat')).toBe(false) // تبديل قطار جوه نفس الخط، مش تبادل بين خطين
  })
})

describe('الأسعار (من 27 مارس 2026)', () => {
  it.each([
    [2, 10],
    [9, 10],
    [10, 12],
    [16, 12],
    [17, 15],
    [23, 15],
    [24, 20],
    [39, 20],
  ])('%i محطة في التذكرة = %i جنيه', (stations, price) =>
    expect(fareFor(stations).price).toBe(price),
  )

  it('عدد محطات التذكرة شامل محطة الركوب: 8 خطوات = 9 محطات = 10 جنيه', () => {
    const r = findRoute('helwan', 'sakanat-el-maadi') // حلوان … ثكنات المعادي
    expect(r.stops).toBe(9)
    expect(r.fareStations).toBe(10)
    expect(r.fare).toBe(12)
    const r8 = findRoute('helwan', 'tora-el-balad')
    expect(r8.stops).toBe(8)
    expect(r8.fareStations).toBe(9)
    expect(r8.fare).toBe(10)
  })

  it('أطول رحلة في الشبكة (حلوان → عدلي منصور) = 39 محطة بالظبط، جوه آخر شريحة', () => {
    const r = findRoute('helwan', 'adly-mansour')
    expect(r.fareStations).toBe(39)
    expect(r.fare).toBe(20)
    expect(r.fareOverMax).toBe(false)
  })

  it('مفيش رحلة في الشبكة أطول من آخر شريحة', () => {
    const ids = Object.keys(STATIONS)
    for (const a of ids)
      for (const b of ids)
        if (a !== b) expect(findRoute(a, b).fareOverMax, `${a}->${b}`).toBe(false)
  })
})

describe('الزمن: متظبط على أزمنة المشغّل المنشورة', () => {
  it.each([
    ['helwan', 'new-el-marg', 79], // الخط 1
    ['shubra-el-kheima', 'el-mounib', 38], // الخط 2
    ['adly-mansour', 'rod-el-farag-corridor', 60], // الخط 3 — فرع روض الفرج
    ['adly-mansour', 'cairo-university', 58], // الخط 3 — فرع جامعة القاهرة
  ])('%s → %s ≈ %i دقيقة', (a, b, published) => {
    const r = findRoute(a, b)
    expect(r.transfers).toBe(0)
    expect(r.minutes).toBe(published)
  })

  it('التحويلة بتزوّد زمن ثابت', () => {
    const r = findRoute('maadi', 'opera')
    const ride = r.legs.reduce(
      (m, l) => m + l.stops * minutesPerStop(SERVICES.find((s) => s.id === l.service)),
      0,
    )
    expect(r.minutes).toBe(Math.round(ride + MIN_PER_TRANSFER))
  })
})

describe('المسارات', () => {
  it('نفس المحطة أو محطة مجهولة = null', () => {
    expect(findRoute('maadi', 'maadi')).toBeNull()
    expect(findRoute('maadi', 'nowhere')).toBeNull()
  })

  it('رحلة على خط واحد بدون تحويل: حلوان → المرج الجديدة = 34 محطة', () => {
    const r = findRoute('helwan', 'new-el-marg')
    expect(r.transfers).toBe(0)
    expect(r.stops).toBe(34)
    expect(r.fare).toBe(20)
    expect(r.legs[0].direction).toBe('المرج الجديدة')
  })

  it('المسار عكسي: الاتجاه صح', () => {
    const r = findRoute('new-el-marg', 'helwan')
    expect(r.legs[0].direction).toBe('حلوان')
  })

  it('تحويل واحد: المعادي → الأوبرا (خط 1 ثم تحويل عند السادات)', () => {
    const r = findRoute('maadi', 'opera')
    expect(r.transfers).toBe(1)
    expect(r.legs.map((l) => l.line)).toEqual([1, 2])
    expect(r.legs[0].to).toBe('sadat')
    expect(r.legs[1].changeKind).toBe('line')
    expect(r.stops).toBe(8 + 1)
    expect(r.fareStations).toBe(10) // شامل محطة الركوب → الشريحة التانية
    expect(r.fare).toBe(12)
  })

  it('التحويل بين فرعي الخط 3: إمبابة → جامعة القاهرة بتغيير القطار في الكيت كات', () => {
    const r = findRoute('imbaba', 'cairo-university')
    // ممكن يمشي على الخط 3 مباشرة (بتغيير قطار) — ده أقصر من أي بديل
    expect(r.legs.map((l) => l.line)).toEqual([3, 3])
    expect(r.legs[0].to).toBe('kit-kat')
    expect(r.legs[1].changeKind).toBe('train')
    expect(r.stops).toBe(2 + 5)
  })

  it('اتجاه القطار غربًا قبل الكيت كات: مش بنحدد فرع', () => {
    const r = findRoute('adly-mansour', 'attaba')
    expect(r.transfers).toBe(0)
    expect(r.legs[0].direction).toBe('روض الفرج أو جامعة القاهرة')
    expect(r.stops).toBe(18)
  })

  it('اتجاه القطار شرقًا على الخط 3 = عدلي منصور', () => {
    expect(findRoute('attaba', 'adly-mansour').legs[0].direction).toBe('عدلي منصور')
  })

  it('بيفضّل مسار أقل تحويلات: الشهداء → عتبة مباشرة على الخط 2 (محطة واحدة)', () => {
    const r = findRoute('shohadaa', 'attaba')
    expect(r.stops).toBe(1)
    expect(r.legs[0].line).toBe(2)
  })

  it('مفيش تحويلات زيادة عن اللازم لأي زوج محطات (سلامة عامة)', () => {
    const ids = Object.keys(STATIONS)
    let max = 0
    for (const a of ids)
      for (const b of ids) {
        if (a === b) continue
        const r = findRoute(a, b)
        expect(r, `${a}->${b}`).not.toBeNull()
        max = Math.max(max, r.transfers)
        // يا إما فيه ركوب، يا إما الرحلة مشي بس بين محطتين جنب بعض (الإستاد ↔ إستاد القاهرة)
        expect(r.stops > 0 || r.walkAfter !== null, `${a}->${b}`).toBe(true)
      }
    expect(max).toBeLessThanOrEqual(3)
  })
})

describe('البحث', () => {
  it('بيوحّد الهمزات والتاء المربوطة', () => {
    expect(normalize('الأوبرا')).toBe(normalize('الاوبرا'))
    expect(normalize('مسرة')).toBe(normalize('مسره'))
  })
  it('بيلاقي بالعربي والإنجليزي', () => {
    const all = Object.values(STATIONS)
    expect(searchStations(all, 'اوبرا')[0].id).toBe('opera')
    expect(searchStations(all, 'maadi')[0].id).toBe('maadi')
    expect(searchStations(all, 'sadat')[0].id).toBe('sadat')
  })
  it('بيلاقي بالأسماء القديمة والإملاء البديل (aliases)', () => {
    const all = Object.values(STATIONS)
    expect(searchStations(all, 'جامعة حلوان')[0].id).toBe('helwan-university')
    expect(searchStations(all, 'جامعة العاصمة')[0].id).toBe('helwan-university')
    expect(searchStations(all, 'سانتا تريزا')[0].id).toBe('st-teresa')
    expect(searchStations(all, 'كوتسكا')[0].id).toBe('kozzika')
  })
})

import { POSITIONS, POSITIONS_BY_SOURCE as P } from '../data/layout.js'
describe('تخطيط الخريطة', () => {
  it('كل محطة ليها إحداثيات', () => {
    for (const id of Object.keys(STATIONS)) expect(POSITIONS[id], id).toBeTruthy()
  })
  it('محطات التبادل متطابقة الإحداثيات بين الخطوط', () => {
    const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5
    expect(same(P.posL1.sadat, P.posL2.sadat)).toBe(true)
    expect(same(P.posL1.shohadaa, P.posL2.shohadaa)).toBe(true)
    expect(same(P.posL1.nasser, P.posTrunk.nasser)).toBe(true)
    expect(same(P.posL2.attaba, P.posTrunk.attaba)).toBe(true)
    expect(same(P.posL2['cairo-university'], P.posB['cairo-university'])).toBe(true)
  })
})

describe('المونوريل والمشي والتذاكر المنفصلة', () => {
  it('مترو → مونوريل: مشي في الإستاد وتذكرتين', () => {
    const r = findRoute('attaba', 'm-justice-city')
    expect(r.legs.map((l) => l.line)).toEqual([3, 'ENM'])
    expect(r.legs[0].to).toBe('stadium')
    expect(r.legs[1].changeKind).toBe('walk')
    expect(r.legs[1].walkBefore).toEqual({ from: 'stadium', to: 'm-stadium', minutes: 5 })
    expect(r.tickets.map((t) => [t.mode, t.stations, t.price])).toEqual([
      ['metro', 7, 10],
      ['monorail', 22, 80],
    ])
    expect(r.fare).toBe(90)
    expect(r.fareStations).toBeNull() // أكتر من تذكرة
  })

  it('الخط كله على المونوريل = 22 محطة = 80 جنيه = 60 دقيقة', () => {
    const r = findRoute('m-stadium', 'm-justice-city')
    expect(r.fareStations).toBe(22)
    expect(r.fare).toBe(80)
    expect(r.minutes).toBe(60)
  })

  it.each([
    [2, 20],
    [5, 20],
    [6, 40],
    [10, 40],
    [11, 55],
    [15, 55],
    [16, 80],
    [22, 80],
  ])('مونوريل: %i محطة = %i جنيه', (stations, price) =>
    expect(fareFor(stations, 'monorail').price).toBe(price),
  )

  it('الرحلة بتبدأ بمشي: من مترو الإستاد لمونوريل المشير طنطاوي', () => {
    const r = findRoute('stadium', 'm-tantawi')
    expect(r.legs).toHaveLength(1)
    expect(r.legs[0].walkBefore?.from).toBe('stadium')
    expect(r.transfers).toBe(0)
    expect(r.minutes).toBe(Math.round(6 * (60 / 21) + 5))
  })

  it('الرحلة بتخلص بمشي: من المونوريل لمحطة مترو الإستاد', () => {
    const r = findRoute('m-cbd', 'stadium')
    expect(r.legs.map((l) => l.line)).toEqual(['ENM'])
    expect(r.walkAfter).toEqual({ from: 'm-stadium', to: 'stadium', minutes: 5 })
  })

  it('المحطتين جنب بعض: مشي بس، من غير تذكرة', () => {
    const r = findRoute('stadium', 'm-stadium')
    expect(r.legs).toEqual([])
    expect(r.walkAfter?.minutes).toBe(5)
    expect(r.fare).toBe(0)
  })

  it('«هشام بركات» مونوريل → «هشام بركات» مترو: مش نفس المحطة، الرحلة بتعدّي على الإستاد', () => {
    const r = findRoute('m-hesham-barakat', 'hesham-barakat')
    expect(r.legs.map((l) => l.line)).toEqual(['ENM', 3])
    expect(r.tickets).toHaveLength(2)
  })

  it('رحلات المترو لوحدها ماتأثرتش', () => {
    const r = findRoute('maadi', 'opera')
    expect(r.tickets).toEqual([
      { mode: 'metro', stations: 10, price: 12, overMax: false, effective: '27 مارس 2026' },
    ])
    expect(r.walkAfter).toBeNull()
    expect(r.legs.every((l) => !l.walkBefore)).toBe(true)
  })
})

describe('القطار الكهربائي الخفيف LRT', () => {
  it('مترو → LRT: مشي في عدلي منصور وتذكرتين', () => {
    const r = findRoute('attaba', 'l-capital-airport')
    expect(r.legs.map((l) => l.line)).toEqual([3, 'LRT'])
    expect(r.legs[1].walkBefore).toEqual({ from: 'adly-mansour', to: 'l-adly-mansour', minutes: 5 })
    expect(r.tickets.map((t) => [t.mode, t.stations, t.price])).toEqual([
      ['metro', 19, 15],
      ['lrt', 9, 20],
    ])
  })

  it('فرع العاشر مكوكي: من عدلي منصور لمدينة المعرفة = تغيير قطار في بدر، تذكرة LRT واحدة', () => {
    const r = findRoute('l-adly-mansour', 'l-knowledge-city')
    expect(r.legs.map((l) => l.service)).toEqual(['LRT', 'LRT-R'])
    expect(r.legs[1].from).toBe('l-badr')
    expect(r.legs[1].changeKind).toBe('train')
    expect(r.legs[1].direction).toBe('مدينة المعرفة')
    expect(r.tickets).toHaveLength(1)
    expect(r.tickets[0]).toMatchObject({ mode: 'lrt', stations: 8, price: 20 })
  })

  it.each([
    [2, 10],
    [3, 10],
    [4, 15],
    [7, 15],
    [8, 20],
    [10, 20],
  ])('LRT: %i محطة = %i جنيه', (stations, price) =>
    expect(fareFor(stations, 'lrt').price).toBe(price),
  )

  it('LRT ↔ مونوريل في مدينة الفنون والثقافة: مشي 10 دقايق (تقدير)', () => {
    const r = findRoute('l-capital-airport', 'm-misr-mosque')
    expect(r.legs.map((l) => l.line)).toEqual(['LRT', 'ENM'])
    expect(r.legs[1].walkBefore).toEqual({
      from: 'l-arts-culture',
      to: 'm-arts-culture',
      minutes: 10,
    })
    expect(r.tickets.map((t) => t.mode)).toEqual(['lrt', 'monorail'])
  })

  it('الزمن: 4.8 دقيقة لكل محطة على LRT (عدلي منصور ← بدر = 24 دقيقة منشورة)', () => {
    expect(findRoute('l-adly-mansour', 'l-badr').minutes).toBe(24)
  })
})

describe('الفئات الخاصة (نص تذكرة / ذوي الهمم)', () => {
  const t = (mode, stations) => ({ mode, stations })
  it.each([
    [9, 5],
    [10, 6],
    [16, 6],
    [17, 8],
    [23, 8],
    [24, 10],
    [39, 10],
  ])('مترو نص تذكرة: %i محطة = %i جنيه', (stations, price) =>
    expect(ticketPrice(t('metro', stations), 'senior')).toEqual({ price, discounted: true }),
  )

  it('مترو ذوي الهمم: 5 جنيه موحدة لأي عدد محطات', () => {
    for (const s of [2, 9, 16, 39]) expect(ticketPrice(t('metro', s), 'disabled').price).toBe(5)
  })

  it.each([
    [5, 10],
    [10, 20],
    [15, 30],
    [22, 40],
  ])('مونوريل نص تذكرة / ذوي الهمم: %i محطة = %i جنيه', (stations, price) => {
    expect(ticketPrice(t('monorail', stations), 'senior').price).toBe(price)
    expect(ticketPrice(t('monorail', stations), 'disabled').price).toBe(price)
  })

  it('LRT مالوش خصم معلن: السعر العادي و discounted = false', () => {
    expect(ticketPrice(t('lrt', 9), 'senior')).toEqual({ price: 20, discounted: false })
  })

  it('العادي = نفس fareFor', () => {
    expect(ticketPrice(t('metro', 10))).toEqual({ price: 12, discounted: false })
  })

  it('routeFare: رحلة مترو + مونوريل بنص تذكرة', () => {
    const r = findRoute('attaba', 'm-justice-city') // مترو 7 محطات + مونوريل 22
    expect(routeFare(r).total).toBe(90)
    const s = routeFare(r, 'senior')
    expect(s.tickets.map((x) => x.price)).toEqual([5, 40])
    expect(s.total).toBe(45)
    expect(s.missingDiscount).toBe(false)
  })

  it('routeFare: فيه LRT → missingDiscount', () => {
    const r = findRoute('attaba', 'l-capital-airport')
    expect(routeFare(r, 'disabled')).toMatchObject({ total: 5 + 20, missingDiscount: true })
  })
})
