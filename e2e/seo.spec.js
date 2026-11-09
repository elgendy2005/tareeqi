import { expect, test } from '@playwright/test'

const SITE = 'https://tareeqi.ahmedelgendy.dev/'
const meta = (page, attr, name) => page.locator(`meta[${attr}="${name}"]`).getAttribute('content')

test('العنوان والوصف والـ canonical', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/طريقي/)
  expect((await meta(page, 'name', 'description')).length).toBeGreaterThan(50)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('بطاقة المعاينة (Open Graph وTwitter) وصورتها موجودة بالمقاس الصح', async ({
  page,
  request,
}) => {
  await page.goto('./')
  const image = await meta(page, 'property', 'og:image')
  expect(image).toBe(`${SITE}og-image.png`) // لازم رابط كامل
  expect(await meta(page, 'property', 'og:url')).toBe(SITE)
  expect(await meta(page, 'property', 'og:title')).toContain('طريقي')
  expect(await meta(page, 'property', 'og:image:alt')).toBeTruthy()
  expect(await meta(page, 'name', 'twitter:card')).toBe('summary_large_image')
  expect(await meta(page, 'name', 'twitter:image')).toBe(image)

  // نفس الملف موجود في الـ build المحلي، ومقاسه 1200×630 (من هيدر الـ PNG)
  const res = await request.get('og-image.png')
  expect(res.ok()).toBe(true)
  const png = await res.body()
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
})

test('الأيقونات: favicon.ico (16/32/48) وsvg وapple-touch-icon 180', async ({ page, request }) => {
  await page.goto('./')
  const href = (sel) => page.locator(sel).getAttribute('href')

  const ico = await (await request.get(await href('link[rel="icon"][href$=".ico"]'))).body()
  expect(ico.readUInt16LE(2)).toBe(1) // نوع الملف: أيقونة
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico.readUInt8(6 + 16 * i))
  expect(sizes).toEqual([16, 32, 48])

  expect((await request.get(await href('link[rel="icon"][type="image/svg+xml"]'))).ok()).toBe(true)

  const apple = await (await request.get(await href('link[rel="apple-touch-icon"]'))).body()
  expect([apple.readUInt32BE(16), apple.readUInt32BE(20)]).toEqual([180, 180])
})

test('robots.txt بيسمح بالفهرسة', async ({ request }) => {
  const res = await request.get('robots.txt')
  expect(res.ok()).toBe(true)
  expect(await res.text()).toMatch(/User-agent: \*\s+Allow: \//)
})
