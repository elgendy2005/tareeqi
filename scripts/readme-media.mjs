// صور الـ README: لقطة ديسكتوب، ولقطة موبايل، وGIF قصير لتجربة كاملة.
// التشغيل: npm run readme-media   (أو PW_CHANNEL=msedge npm run readme-media)
// بيشتغل على build الإنتاج. الـ GIF بيتعمل جوه المتصفح بـ gifenc، فمفيش حاجة لـ ffmpeg.
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium, devices } from '@playwright/test'

const DOCS = new URL('../docs/', import.meta.url)
const PORT = 4176
const BASE = `http://127.0.0.1:${PORT}/`

const server = spawn(`npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
})
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL })
const out = (name, data) => writeFile(new URL(name, DOCS), data).then(() => console.log('✓', name))

async function open(page, path) {
  for (let i = 0; ; i++) {
    try {
      await page.goto(BASE + path)
      break
    } catch (e) {
      if (i > 40) throw e
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  await page.evaluate(() => document.fonts.ready)
}
const settle = (page) => page.waitForTimeout(250)

try {
  // ---------- لقطة الديسكتوب ----------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })
    await open(page, '?from=attaba&to=m-justice-city')
    await page.getByText('إجمالي التذاكر').waitFor()
    await out('screenshot-desktop.png', await page.screenshot())
    await page.close()
  }

  // ---------- لقطة الموبايل ----------
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'ar-EG' })
    const page = await ctx.newPage()
    await open(page, '?from=maadi&to=opera')
    await page.getByText('سعر التذكرة', { exact: true }).waitFor()
    await out('screenshot-mobile.png', await page.screenshot())
    await ctx.close()
  }

  // ---------- GIF: رحلة كاملة (~13 ثانية) ----------
  const W = 1280
  const H = 760
  const page = await browser.newPage({ viewport: { width: W, height: H }, locale: 'ar-EG' })
  await open(page, '')
  const frames = []
  const snap = async (ms) => frames.push({ png: (await page.screenshot()).toString('base64'), ms })

  await snap(1400) // شاشة البداية
  const from = page.getByRole('combobox', { name: 'من محطة' })
  await from.click()
  await from.pressSequentially('معا', { delay: 40 })
  await settle(page)
  await snap(700)
  await from.pressSequentially('دي', { delay: 40 })
  await settle(page)
  await snap(900)
  await page.keyboard.press('Enter')
  await settle(page)
  await snap(700)

  const to = page.getByRole('combobox', { name: 'إلى محطة' })
  await to.click()
  await to.pressSequentially('اوب', { delay: 40 })
  await settle(page)
  await snap(900)
  await page.keyboard.press('Enter')
  await page.getByText('سعر التذكرة', { exact: true }).waitFor()
  await settle(page)
  await snap(2600) // النتيجة: السعر والتحويلة في السادات

  await page.getByRole('radio', { name: 'نص تذكرة' }).click()
  await settle(page)
  await snap(1800) // نص تذكرة

  await page.getByRole('radio', { name: 'عادية' }).click()
  // رحلة مترو + مونوريل من الخريطة: ضغطتين على محطتين
  const map = page.getByRole('img', { name: /خريطة تخطيطية/ })
  const station = (title) =>
    map
      .locator(`xpath=.//*[local-name()="title" and text()="${title}"]/..`)
      .locator('circle')
      .nth(1)
  await station('العتبة — Attaba').click({ force: true })
  await settle(page)
  await snap(1000)
  await station('مدينة العدالة — Justice City').click({ force: true })
  await page.getByText('إجمالي التذاكر').waitFor()
  await settle(page)
  await snap(3000) // تذكرتين ومشي في الإستاد

  // التصغير والترميز جوه المتصفح: canvas بيفك الـ PNG، وgifenc بيعمل الـ GIF
  const gifenc = await readFile(
    new URL('../node_modules/gifenc/dist/gifenc.esm.js', import.meta.url),
    'utf8',
  )
  const enc = await browser.newPage()
  const OUT_W = 960
  const OUT_H = Math.round((H * OUT_W) / W)
  const bytes = await enc.evaluate(
    async ({ gifenc, frames, w, h }) => {
      const url = URL.createObjectURL(new Blob([gifenc], { type: 'text/javascript' }))
      const { GIFEncoder, quantize, applyPalette } = await import(url)
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const gif = GIFEncoder()
      for (const f of frames) {
        const img = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${f.png}`)).blob(),
        )
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        const palette = quantize(data, 256)
        gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: f.ms })
      }
      gif.finish()
      return Array.from(gif.bytes())
    },
    { gifenc, frames, w: OUT_W, h: OUT_H },
  )
  const total = frames.reduce((s, f) => s + f.ms, 0)
  await out('demo.gif', Buffer.from(bytes))
  console.log(
    `  ${frames.length} لقطات، ${(total / 1000).toFixed(1)} ثانية، ${(bytes.length / 1024).toFixed(0)} KB`,
  )
} finally {
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  await browser.close()
}
