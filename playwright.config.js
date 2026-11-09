import { defineConfig, devices } from '@playwright/test'

// اختبارات E2E على build الإنتاج (vite preview) — نفس اللي بيتنشر على GitHub Pages.
// Chromium بس عشان الـ CI يفضل خفيف: مرة بشاشة ديسكتوب ومرة بشاشة موبايل.
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    locale: 'ar-EG',
    trace: 'retain-on-failure',
  },
  // PW_CHANNEL=msedge (أو chrome) بيشغّل على متصفح متثبّت بدل Chromium بتاع Playwright
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    // دايمًا build جديد: لو فيه سيرفر قديم شغال على البورت، الأحسن يفشل بوضوح بدل ما يختبر نسخة قديمة
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
