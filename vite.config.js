import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' => works on GitHub Pages under /<repo>/ without extra config
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // البيئة الافتراضية node (اختبارات المنطق). اختبارات المكوّنات بتطلب jsdom في أول سطر في الملف.
  test: { environment: 'node', setupFiles: ['./src/test/setup.js'] },
})
