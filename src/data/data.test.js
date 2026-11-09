import { describe, it, expect } from 'vitest'
import { STATIONS, SERVICES, LINES, L3_TRUNK, BRANCH_A, BRANCH_B, TRANSFER_LINKS, FARE_SYSTEMS } from './metro.js'
import { isInterchange } from '../lib/router.js'
import { COORDS } from './coords.js'
import { haversineKm } from '../lib/geo.js'

// الأعداد المتوقعة موثّقة في docs/DATA.md (ويكيبيديا العربية والإنجليزية، مراجعة 9 نوفمبر 2026).
const svc = (id) => SERVICES.find((s) => s.id === id)
const isMonorail = (id) => id.startsWith('m-')
const isLrt = (id) => id.startsWith('l-')

describe('سلامة بيانات المترو', () => {
  it('عدد المحطات الفريدة: 84 مترو + 22 مونوريل + 12 LRT', () => {
    const ids = Object.keys(STATIONS)
    expect(ids.filter((id) => !isMonorail(id) && !isLrt(id))).toHaveLength(84)
    expect(ids.filter(isMonorail)).toHaveLength(22)
    expect(ids.filter(isLrt)).toHaveLength(12)
  })

  it('مفيش تكرار في الـ id، وكل مفتاح بيطابق الـ id بتاعه', () => {
    for (const [key, st] of Object.entries(STATIONS)) expect(st.id).toBe(key)
  })

  it('كل محطة ليها اسم عربي وإنجليزي', () => {
    for (const st of Object.values(STATIONS)) {
      expect(st.ar.trim()).not.toBe('')
      expect(st.en.trim()).not.toBe('')
    }
  })

  it('كل محطة في خدمة واحدة على الأقل، وكل محطة في خدمة معرّفة', () => {
    const used = new Set(SERVICES.flatMap((s) => s.stations))
    for (const id of Object.keys(STATIONS)) expect(used.has(id), id).toBe(true)
    for (const id of used) expect(STATIONS[id], id).toBeDefined()
  })

  it('مفيش محطة متكررة جوه نفس الخدمة', () => {
    for (const s of SERVICES) expect(new Set(s.stations).size, s.id).toBe(s.stations.length)
  })

  it('كل خدمة بتشاور على خط موجود', () => {
    for (const s of SERVICES) expect(LINES[s.line], s.id).toBeDefined()
  })

  it('أطوال الخطوط: الأول 35، التاني 20', () => {
    expect(svc('1').stations).toHaveLength(35)
    expect(svc('2').stations).toHaveLength(20)
  })

  it('محطات التبادل الخمسة بالظبط', () => {
    const interchanges = Object.keys(STATIONS).filter(isInterchange).sort()
    expect(interchanges).toEqual(['attaba', 'cairo-university', 'nasser', 'sadat', 'shohadaa'])
  })
})

describe('الخط الثالث (الأخضر)', () => {
  it('34 محطة: جذع 23 + فرع روض الفرج 6 + فرع جامعة القاهرة 5', () => {
    expect(L3_TRUNK).toHaveLength(23)
    expect(BRANCH_A).toHaveLength(6)
    expect(BRANCH_B).toHaveLength(5)
    const all = new Set([...svc('3A').stations, ...svc('3B').stations])
    expect(all.size).toBe(34)
  })

  it('الجذع بيبدأ بعدلي منصور وبينتهي بالكيت كات', () => {
    expect(L3_TRUNK[0]).toBe('adly-mansour')
    expect(L3_TRUNK.at(-1)).toBe('kit-kat')
  })

  it('3A و3B بيشتركوا في نفس الجذع بالظبط، وtrunkEnd بيشاور على الكيت كات', () => {
    for (const id of ['3A', '3B']) {
      const s = svc(id)
      expect(s.stations.slice(0, L3_TRUNK.length)).toEqual(L3_TRUNK)
      expect(s.stations[s.trunkEnd]).toBe('kit-kat')
    }
  })

  it('نهايات الفرعين', () => {
    expect(svc('3A').stations.at(-1)).toBe('rod-el-farag-corridor')
    expect(svc('3B').stations.at(-1)).toBe('cairo-university')
  })
})

describe('الإحداثيات الجغرافية (OpenStreetMap)', () => {
  // حدود تقريبية للقاهرة الكبرى (حلوان جنوبًا ← المرج شمالًا، الجيزة غربًا ← عدلي منصور شرقًا)
  // (المونوريل بيوصل للعاصمة الجديدة شرقًا ~31.77)
  // (والـ LRT بيوصل لحدائق العاصمة ~31.81)
  const BOUNDS = { minLat: 29.8, maxLat: 30.25, minLng: 31.1, maxLng: 31.85 }

  it('كل محطة ليها إحداثيات ورقم node من OSM، ومفيش إحداثيات لمحطة مش موجودة', () => {
    expect(Object.keys(COORDS).sort()).toEqual(Object.keys(STATIONS).sort())
    for (const [id, c] of Object.entries(COORDS)) expect(Number.isInteger(c.osm), id).toBe(true)
  })

  it('كل الإحداثيات جوه حدود القاهرة الكبرى', () => {
    for (const [id, { lat, lng }] of Object.entries(COORDS)) {
      expect(lat, id).toBeGreaterThan(BOUNDS.minLat)
      expect(lat, id).toBeLessThan(BOUNDS.maxLat)
      expect(lng, id).toBeGreaterThan(BOUNDS.minLng)
      expect(lng, id).toBeLessThan(BOUNDS.maxLng)
    }
  })

  it('المسافة بين أي محطتين جنب بعض معقولة — بيكشف ترتيب غلط أو node غلط', () => {
    // مترو: 0.3–3.5 كم · مونوريل (محطات أبعد في العاصمة الجديدة): 0.5–4.5 كم
    for (const s of SERVICES) {
      // LRT قطار إقليمي: المحطات على بعد كيلومترات (1–9 كم)
      const [min, max] =
        s.mode === 'monorail' ? [0.5, 4.5] : s.mode === 'lrt' ? [1, 9] : [0.3, 3.5]
      for (let i = 1; i < s.stations.length; i++) {
        const [a, b] = [s.stations[i - 1], s.stations[i]]
        const d = haversineKm(COORDS[a], COORDS[b])
        expect(d, `${s.id}: ${a} → ${b}`).toBeGreaterThan(min)
        expect(d, `${s.id}: ${a} → ${b}`).toBeLessThan(max)
      }
    }
  })

  it('كل رابط مشي بين محطتين موجودتين وقريبين فعلًا (أقل من 800 متر)', () => {
    for (const { a, b, walkMinutes } of TRANSFER_LINKS) {
      expect(STATIONS[a], a).toBeDefined()
      expect(STATIONS[b], b).toBeDefined()
      expect(haversineKm(COORDS[a], COORDS[b]), `${a} ↔ ${b}`).toBeLessThan(0.8)
      expect(walkMinutes).toBeGreaterThan(0)
    }
  })
})

describe('مونوريل شرق النيل', () => {
  it('22 محطة، من إستاد القاهرة لمدينة العدالة', () => {
    const s = svc('ENM')
    expect(s.mode).toBe('monorail')
    expect(s.stations).toHaveLength(22)
    expect(s.stations[0]).toBe('m-stadium')
    expect(s.stations[6]).toBe('m-tantawi') // آخر محطات المرحلة التانية + أول المرحلة الأولى
    expect(s.stations.at(-1)).toBe('m-justice-city')
  })

  it('«هشام بركات» في المونوريل محطة منفصلة عن «هشام بركات» في المترو (حوالي 9 كم)', () => {
    expect(STATIONS['m-hesham-barakat']).toBeDefined()
    expect(haversineKm(COORDS['m-hesham-barakat'], COORDS['hesham-barakat'])).toBeGreaterThan(5)
  })

  it('محطات المونوريل مش متشاركة مع أي خدمة مترو', () => {
    const metro = new Set(SERVICES.filter((s) => s.mode !== 'monorail').flatMap((s) => s.stations))
    for (const id of svc('ENM').stations) expect(metro.has(id), id).toBe(false)
  })

  it('آخر شريحة في كل نظام تسعير بتغطي أطول رحلة على نفس الوسيلة', () => {
    expect(FARE_SYSTEMS.monorail.brackets.at(-1).maxStations).toBe(svc('ENM').stations.length)
  })
})

