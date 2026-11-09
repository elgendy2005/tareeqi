import { describe, expect, it } from 'vitest'
import { normalize, searchStations } from './search.js'

// محطات وهمية صغيرة عشان نختبر الترتيب نفسه، بعيد عن بيانات الشبكة
// (اختبارات البحث على البيانات الحقيقية في router.test.js)
const st = (id, ar, en, aliases) => ({ id, ar, en, aliases })
const SAMPLE = [
  st('a', 'باب الشعرية', 'Bab El Shaaria'),
  st('b', 'الشعراوي', 'El Shaarawy'),
  st('c', 'شبرا', 'Shubra'),
  st('d', 'المعرض', 'Fair Zone', ['أرض المعارض']),
  st('e', 'إمبابة', 'Imbaba'),
]
const ids = (q, limit) => searchStations(SAMPLE, q, limit).map((s) => s.id)

describe('normalize', () => {
  it('بيوحّد الهمزات والتاء المربوطة والياء والتشكيل والتطويل', () => {
    expect(normalize('إِمْبَابَة')).toBe('امبابه')
    expect(normalize('مـــترو')).toBe('مترو')
    expect(normalize('مصطفى')).toBe(normalize('مصطفي'))
    expect(normalize('مؤسسة')).toBe('موسسه')
  })

  it('بيشيل الرموز ويضغط المسافات ويصغّر الإنجليزي', () => {
    expect(normalize('  Fair   Zone! ')).toBe('fair zone')
    expect(normalize('حي R2')).toBe('حي r2')
  })

  it('بيتعامل مع قيمة فاضية أو مش نص', () => {
    expect(normalize()).toBe('')
    expect(normalize(42)).toBe('42')
  })
})

describe('searchStations', () => {
  it('من غير بحث بيرجّع أول المحطات لحد الحد', () => {
    expect(ids('', 3)).toEqual(['a', 'b', 'c'])
    expect(ids('   ')).toHaveLength(SAMPLE.length)
  })

  it('الترتيب: تطابق كامل ← يبدأ بـ ← كلمة بتبدأ بـ ← يحتوي', () => {
    // «شبرا» تطابق كامل، و«الشعراوي» بتحتوي «شعر»، و«باب الشعرية» فيها كلمة بتبدأ بـ «الشعر»
    expect(ids('شبرا')[0]).toBe('c')
    expect(ids('الشعر')).toEqual(['b', 'a']) // يبدأ بـ (الشعراوي) قبل كلمة بتبدأ بـ (باب الشعرية)
    expect(ids('عراوي')).toEqual(['b']) // يحتوي بس
  })

  it('نفس الدرجة بتترتّب أبجديًا بالعربي', () => {
    // «عر» في نص الكلمة في التلاتة (يحتوي بس): الشعراوي ← المعرض ← باب الشعرية
    expect(ids('عر')).toEqual(['b', 'd', 'a'])
  })

  it('بيدوّر في الأسماء البديلة والإنجليزي', () => {
    expect(ids('ارض المعارض')).toEqual(['d'])
    expect(ids('fair')).toEqual(['d'])
    expect(ids('zone')).toEqual(['d'])
  })

  it('مفيش نتايج = قايمة فاضية', () => {
    expect(ids('القمر')).toEqual([])
  })

  it('بيحترم الحد', () => {
    expect(ids('a', 2)).toHaveLength(2)
  })
})
