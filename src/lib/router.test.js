import { describe, it, expect } from 'vitest'
import { findRoute, fareFor, isInterchange, minutesPerStop, MIN_PER_TRANSFER } from './router.js'
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
        expect(r.stops).toBeGreaterThan(0)
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
