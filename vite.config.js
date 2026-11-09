import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' => works on GitHub Pages under /<repo>/ without extra config
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
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
