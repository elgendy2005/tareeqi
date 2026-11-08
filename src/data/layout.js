// تخطيط تخطيطي (schematic) للخريطة — مش خريطة جغرافية دقيقة.
// بنحدد "نقاط ارتكاز" لمحطات معينة، والباقي بيتوزع بالتساوي بينهم.
import { SERVICES, L3_TRUNK, BRANCH_A, BRANCH_B } from './metro.js'

export const VIEWBOX = { w: 1100, h: 940 }

// [stationId, x, y] — لازم محطات التبادل تتكرر بنفس الإحداثيات في كل خط
const ANCHORS = {
  1: [
    ['helwan', 700, 880], ['dar-el-salam', 700, 660], ['saad-zaghloul', 500, 520],
    ['sadat', 500, 480], ['nasser', 500, 440], ['shohadaa', 500, 370],
    ['manshiet-el-sadr', 590, 285], ['saray-el-qobba', 700, 220], ['el-matareyya', 830, 150],
    ['new-el-marg', 1010, 70],
  ],
  2: [
    ['el-mounib', 200, 880], ['faisal', 210, 600], ['cairo-university', 240, 520],
    ['dokki', 380, 490], ['sadat', 500, 480], ['attaba', 570, 440], ['shohadaa', 500, 370],
    ['masarra', 500, 325], ['shubra-el-kheima', 500, 80],
  ],
  '3T': [ // الجذع المشترك للخط 3
    ['adly-mansour', 1040, 240], ['el-nozha', 910, 330], ['heliopolis-square', 820, 380],
    ['abbassia', 700, 440], ['attaba', 570, 440], ['nasser', 500, 440], ['kit-kat', 380, 420],
  ],
  '3A': [['kit-kat', 380, 420], ['rod-el-farag-corridor', 160, 240]],
  '3B': [['kit-kat', 380, 420], ['cairo-university', 240, 520]],
}

function place(sequence, anchors) {
  const pos = {}
  const idx = Object.fromEntries(sequence.map((id, i) => [id, i]))
  const pts = anchors.map(([id, x, y]) => {
    if (!(id in idx)) throw new Error(`anchor ${id} not in sequence`)
    return { i: idx[id], x, y }
  })
  for (let a = 0; a < pts.length - 1; a++) {
    const p = pts[a], q = pts[a + 1]
    for (let i = p.i; i <= q.i; i++) {
      const t = (i - p.i) / (q.i - p.i)
      pos[sequence[i]] = [p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t]
    }
  }
  return pos
}

const s1 = SERVICES.find((s) => s.id === '1').stations
const s2 = SERVICES.find((s) => s.id === '2').stations

const posL1 = place(s1, ANCHORS[1])
const posL2 = place(s2, ANCHORS[2])
const posTrunk = place(L3_TRUNK, ANCHORS['3T'])
const posA = place(['kit-kat', ...BRANCH_A], ANCHORS['3A'])
const posB = place(['kit-kat', ...BRANCH_B], ANCHORS['3B'])

// موضع كل محطة (التبادل بيتاخد من أول تعريف؛ الاختبار بيتأكد إنهم متطابقين)
export const POSITIONS = { ...posL2, ...posL1, ...posTrunk, ...posA, ...posB }
export const POSITIONS_BY_SOURCE = { posL1, posL2, posTrunk, posA, posB }

const pts = (seq, ...maps) =>
  seq.map((id) => {
    for (const m of maps) if (m[id]) return m[id]
    throw new Error(`no position for ${id}`)
  })

// المسارات اللي بنرسمها كخطوط على الخريطة
export const LINE_PATHS = [
  { line: 1, points: pts(s1, posL1) },
  { line: 2, points: pts(s2, posL2) },
  { line: 3, points: pts([...L3_TRUNK, ...BRANCH_A], posTrunk, posA) },
  { line: 3, points: pts(['kit-kat', ...BRANCH_B], posB) },
]

export const toPath = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
