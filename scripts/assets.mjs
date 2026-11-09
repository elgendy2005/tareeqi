// بيولّد أيقونات الـ PWA وfavicon.ico وصورة المعاينة (og-image) من favicon.svg ومن الموقع نفسه.
// التشغيل: npm run assets   (أو PW_CHANNEL=msedge npm run assets لو Chromium بتاع Playwright مش متنزّل)
// الصور الناتجة في public/ ومتسجّلة في git، فالسكريبت ده مش جزء من الـ build.
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PUBLIC = new URL('../public/', import.meta.url)
const INK = '#1d1b16'
const svg = await readFile(new URL('favicon.svg', PUBLIC), 'utf8')

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL })

/** بيرسم الأيقونة في مربع size×size. `scale` < 1 = هامش حوالين الرسمة، و`bg` = لون الخلفية (أو شفاف) */
async function renderIcon(size, { scale = 1, bg = 'transparent' } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const inner = Math.round(size * scale)
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg}">
       <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
     </body>`,
  )
  const png = await page.screenshot({ omitBackground: bg === 'transparent' })
  await page.close()
  return png
}

/** ICO فيه صور PNG جاهزة (مدعوم في كل المتصفحات من Windows Vista) */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // نوع: أيقونة
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4) // planes
    header.writeUInt16LE(32, e + 6) // bits per pixel
    header.writeUInt32LE(png.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((i) => i.png)])
}

const out = (name, data) =>
  writeFile(new URL(name, PUBLIC), data).then(() => console.log('✓', name))

// أيقونات عادية (الركن المدوّر شفاف زي الـ favicon)
await out('pwa-192x192.png', await renderIcon(192))
await out('pwa-512x512.png', await renderIcon(512))
// maskable: النظام بيقص الأيقونة دايرة أو شكل تاني، فالرسمة لازم تبقى جوه الـ 80% اللي في النص
await out('maskable-512x512.png', await renderIcon(512, { scale: 0.8, bg: INK }))
// iOS بيدوّر الركن بنفسه ومابيدعمش الشفافية: خلفية كاملة
await out('apple-touch-icon.png', await renderIcon(180, { scale: 0.9, bg: INK }))
await out(
  'favicon.ico',
  ico([
    { size: 16, png: await renderIcon(16) },
    { size: 32, png: await renderIcon(32) },
    { size: 48, png: await renderIcon(48) },
  ]),
)

// صورة المعاينة: لقطة حقيقية من build الإنتاج لرحلة فيها تحويلة
const PORT = 4175
const server = spawn(`npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
})
// بنصوّر بشاشة أكبر بنفس النسبة (1440×756) وبعدين نصغّر لـ 1200×630، عشان التذكرة كلها تبان
const OG = { width: 1200, height: 630 }
const SHOT = { width: 1440, height: 756 }
try {
  const url = `http://127.0.0.1:${PORT}/?from=maadi&to=opera`
  const page = await browser.newPage({ viewport: SHOT, locale: 'ar-EG' })
  for (let i = 0; ; i++) {
    try {
      await page.goto(url)
      break
    } catch (e) {
      if (i > 40) throw e
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  await page.getByText('سعر التذكرة', { exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  const shot = await page.screenshot()
  const resize = await browser.newPage({ viewport: OG })
  await resize.setContent(
    `<body style="margin:0"><img style="display:block;width:${OG.width}px;height:${OG.height}px" src="data:image/png;base64,${shot.toString('base64')}"></body>`,
  )
  await resize.locator('img').evaluate((img) => img.decode())
  await out('og-image.png', await resize.screenshot())
} finally {
  server.kill()
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  await browser.close()
}
