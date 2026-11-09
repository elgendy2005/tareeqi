import { describe, it, expect } from 'vitest'
import { STATIONS, SERVICES, LINES, L3_TRUNK, BRANCH_A, BRANCH_B } from './metro.js'
import { isInterchange } from '../lib/router.js'
import { COORDS } from './coords.js'
import { haversineKm } from '../lib/geo.js'

// الأعداد المتوقعة موثّقة في docs/DATA.md (ويكيبيديا العربية والإنجليزية، مراجعة 9 نوفمبر 2026).
const svc = (id) => SERVICES.find((s) => s.id === id)

describe('سلامة بيانات المترو', () => {
  it('عدد المحطات الفريدة = 84', () => {
    expect(Object.keys(STATIONS)).toHaveLength(84)
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
  const BOUNDS = { minLat: 29.8, maxLat: 30.25, minLng: 31.1, maxLng: 31.5 }

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

  it('المسافة بين أي محطتين جنب بعض معقولة (0.3–3.5 كم) — بيكشف ترتيب غلط أو node غلط', () => {
    for (const s of SERVICES)
      for (let i = 1; i < s.stations.length; i++) {
        const [a, b] = [s.stations[i - 1], s.stations[i]]
        const d = haversineKm(COORDS[a], COORDS[b])
        expect(d, `${s.id}: ${a} → ${b}`).toBeGreaterThan(0.3)
        expect(d, `${s.id}: ${a} → ${b}`).toBeLessThan(3.5)
      }
  })
})
