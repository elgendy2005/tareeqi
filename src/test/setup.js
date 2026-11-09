// إعداد اختبارات المكوّنات. بيشتغل مع كل ملفات الاختبار، بس الجزء الخاص بالمتصفح
// بيشتغل بس في الملفات اللي عليها `// @vitest-environment jsdom`.
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')

  afterEach(() => {
    cleanup()
    localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  // jsdom مافيهوش ResizeObserver ولا matchMedia (الخريطة والـ scroll بيستخدموهم)
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
  Element.prototype.scrollIntoView ??= () => {}
}
