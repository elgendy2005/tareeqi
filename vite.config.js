import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const PAPER = '#f4eee1'

// PWA: الموقع يتثبّت ويشتغل أوفلاين. كل البيانات (المحطات والأسعار) جوه الـ JS، فتخزين الـ assets كفاية.
// الأيقونات في public/ ومتولّدة بـ npm run assets.
const pwa = VitePWA({
  registerType: 'autoUpdate', // نسخة جديدة بتتفعّل لوحدها في الزيارة اللي بعدها
  injectRegister: 'script',
  includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    id: './',
    name: 'طريقي — مترو القاهرة',
    short_name: 'طريقي',
    description: 'مترو القاهرة والمونوريل والقطار الخفيف: أقصر مسار، التحويلات، وسعر التذكرة.',
    lang: 'ar',
    dir: 'rtl',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: PAPER,
    theme_color: PAPER,
    categories: ['travel', 'navigation'],
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // woff2 بس: أي متصفح فيه service worker بيدعم woff2، فملفات woff القديمة مالهاش لازمة أوفلاين
    globPatterns: [
      '**/*.{js,css,html,svg,ico,woff2}',
      'pwa-*.png',
      'maskable-*.png',
      'apple-touch-icon.png',
    ],
    // اللاتيني الممتد عمره ما بيتنزّل (unicode-range)، ومش محتاجينه أوفلاين
    globIgnores: ['**/*latin-ext*'],
    // أي رابط (حتى بـ ?from=&to=) بيفتح الـ index.html المتخزّن
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
})

// base: './' => works on GitHub Pages under /<repo>/ without extra config
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), pwa],
  // البيئة الافتراضية node (اختبارات المنطق). اختبارات المكوّنات بتطلب jsdom في أول سطر في الملف.
  // e2e/ بيتشغّل بـ Playwright (npm run test:e2e)، مش Vitest.
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // npm run test:coverage — بيفشل لو أي ملف في src/lib نزل عن 90%
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['**/*.test.*'],
      reporter: ['text', 'html'],
      thresholds: { perFile: true, statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
})
