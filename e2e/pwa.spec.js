import { expect, test } from '@playwright/test'

test('الـ manifest فيه الاسم والاتجاه والأيقونات', async ({ page, request }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const res = await request.get(href)
  expect(res.ok()).toBe(true)
  const m = await res.json()
  expect(m).toMatchObject({ short_name: 'طريقي', lang: 'ar', dir: 'rtl', display: 'standalone' })
  const sizes = m.icons.map((i) => `${i.sizes}:${i.purpose}`)
  expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']))
  for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true)
})

test('بعد أول زيارة الموقع بيفتح أوفلاين، حتى برابط رحلة', async ({ page, context }) => {
  await page.goto('./')
  // نستنى الـ service worker يتفعّل ويخزّن الملفات
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return reg.active?.state
  })
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).length), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await context.setOffline(true)
  await page.goto('./?from=maadi&to=opera')
  const result = page.getByRole('region', { name: 'نتيجة الرحلة' })
  await expect(result.getByText('١٢ جنيه', { exact: true })).toBeVisible()
  await context.setOffline(false)
})
