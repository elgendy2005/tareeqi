import { expect, test } from '@playwright/test'

const SITE = 'https://elgendy2005.github.io/tareeqi/'
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

test('robots.txt بيسمح بالفهرسة', async ({ request }) => {
  const res = await request.get('robots.txt')
  expect(res.ok()).toBe(true)
  expect(await res.text()).toMatch(/User-agent: \*\s+Allow: \//)
})
