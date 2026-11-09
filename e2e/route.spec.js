import { expect, test } from '@playwright/test'

// القيم المتوقعة من البيانات (docs/DATA.md):
// المعادي ← السادات (الخط الأول) ← الأوبرا (الخط الثاني) = 10 محطات تذكرة، تحويلة واحدة.
// شرائح 27 مارس 2026: ≤16 محطة = 12 جنيه، ونص التذكرة = 6.
const result = (page) => page.getByRole('region', { name: 'نتيجة الرحلة' })
const announcer = (page) => page.locator('p[role="status"].sr-only')

test('الرابط ?from=maadi&to=opera بيعرض السعر والتحويلة', async ({ page }) => {
  await page.goto('./?from=maadi&to=opera')

  await expect(page.getByRole('combobox', { name: 'من محطة' })).toHaveValue('المعادي')
  await expect(page.getByRole('combobox', { name: 'إلى محطة' })).toHaveValue('الأوبرا')

  const r = result(page)
  await expect(r.getByText('سعر التذكرة')).toBeVisible()
  await expect(r.getByText('١٢ جنيه', { exact: true })).toBeVisible()
  await expect(r.getByText('غيّر في السادات للـالخط الثاني')).toBeVisible()
  await expect(r.getByText('اركب من المعادي وانزل في السادات')).toBeVisible()
  await expect(r.getByText('اركب من السادات وانزل في الأوبرا')).toBeVisible()

  // الملخص المسموع لقارئ الشاشة
  await expect(announcer(page)).toHaveText(/من المعادي لـ الأوبرا: ١٢ جنيه، تحويلة واحدة/)
})

test('نص التذكرة بيغيّر السعر لـ ٦ جنيه', async ({ page }) => {
  await page.goto('./?from=maadi&to=opera')
  await page.getByRole('radio', { name: 'نص تذكرة' }).click()
  await expect(result(page).getByText('٦ جنيه', { exact: true })).toBeVisible()
  await expect(announcer(page)).toHaveText(/٦ جنيه/)
})

test('اختيار المحطتين بالكتابة بيعمل رحلة ويحدّث الرابط', async ({ page }) => {
  await page.goto('./')
  const from = page.getByRole('combobox', { name: 'من محطة' })
  await from.click()
  await from.fill('معادي')
  await page.getByRole('option', { name: /^المعادي/ }).click()

  const to = page.getByRole('combobox', { name: 'إلى محطة' })
  await to.click()
  await to.fill('opera')
  await page.keyboard.press('Enter')

  await expect(result(page).getByText('١٢ جنيه', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\?from=maadi&to=opera$/)
})

test('الضغط على محطتين في الخريطة بيعمل رحلة', async ({ page }) => {
  await page.goto('./')
  const map = page.getByRole('img', { name: /خريطة تخطيطية/ })
  await map.scrollIntoViewIfNeeded()
  // الـ handler على الـ SVG كله وبيختار أقرب محطة، فبنضغط على مكان دايرة المحطة
  // الأب المباشر للـ <title> (مش أي g فيه title، لأن الـ g الخارجي بيلم كل المحطات).
  // دايرة رقم 2 هي الدايرة المرسومة (الأولى دايرة لمس شفافة).
  const station = (title) =>
    map
      .locator(`xpath=.//*[local-name()="title" and text()="${title}"]/..`)
      .locator('circle')
      .nth(1)

  await station('المعادي — Maadi').click({ force: true })
  await expect(page.getByRole('combobox', { name: 'من محطة' })).toHaveValue('المعادي')
  await station('الأوبرا — Opera').click({ force: true })
  await expect(page.getByRole('combobox', { name: 'إلى محطة' })).toHaveValue('الأوبرا')
  await expect(result(page).getByText('١٢ جنيه', { exact: true })).toBeVisible()
})

test('رحلة مترو + مونوريل: تذكرتين ومشي في الإستاد', async ({ page }) => {
  await page.goto('./?from=attaba&to=m-justice-city')
  const r = result(page)
  await expect(r.getByText('إجمالي التذاكر')).toBeVisible()
  await expect(r.getByRole('list', { name: 'التذاكر' }).getByRole('listitem')).toHaveCount(2)
  await expect(r.getByText(/امشي من محطة مترو الإستاد/)).toBeVisible()
  await expect(r.getByText('هتحتاج تذكرة مونوريل منفصلة.')).toBeVisible()
})
