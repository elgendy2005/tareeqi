// توحيد النص العربي/الإنجليزي عشان البحث يلاقي "الاوبرا" و"الأوبرا" و"opera" زي بعض.
const DIACRITICS = /[ً-ٰٟـ]/g

export function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ترتيب النتايج: يبدأ بالكلمة > يحتوي الكلمة. بترجع أول `limit` محطة. */
export function searchStations(stations, query, limit = 8) {
  const q = normalize(query)
  if (!q) return stations.slice(0, limit)
  const scored = []
  for (const st of stations) {
    // الأسماء البديلة (أسماء قديمة / إملاء تاني) بتدخل في البحث بنفس الأولوية
    const names = [st.ar, st.en, ...(st.aliases || [])].map(normalize)
    let score = -1
    if (names.some((x) => x === q)) score = 0
    else if (names.some((x) => x.startsWith(q))) score = 1
    else if (names.some((x) => x.split(' ').some((w) => w.startsWith(q)))) score = 2
    else if (names.some((x) => x.includes(q))) score = 3
    if (score >= 0) scored.push({ st, score })
  }
  scored.sort((a, b) => a.score - b.score || a.st.ar.localeCompare(b.st.ar, 'ar'))
  return scored.slice(0, limit).map((x) => x.st)
}
