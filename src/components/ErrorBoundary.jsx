import { Component } from 'react'

/**
 * لو حصل خطأ غير متوقع وقت الرسم، بدل صفحة بيضا بنعرض رسالة واضحة وزر يرجّع الصفحة.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // مفيش أي إرسال لسيرفر — بس نسيب أثر في الـ console للي بيطوّر
    console.error('طريقي: خطأ غير متوقع', error, info?.componentStack)
  }

  reset = () => {
    // نرجع للصفحة من غير الرحلة اللي ممكن تكون سبب المشكلة
    window.location.assign(window.location.pathname)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-md rounded-2xl border-2 border-ink bg-card p-6 text-center shadow-[4px_4px_0_0_rgb(29_27_22/0.9)]"
        >
          <p className="text-4xl" aria-hidden="true">
            🚧
          </p>
          <h1 className="mt-3 text-xl font-bold">حصلت مشكلة غير متوقعة</h1>
          <p className="mt-2 text-ink-soft">
            حاجة وقفت وإحنا بنعرض الصفحة. جرّب تفتحها من الأول، ولو المشكلة فضلت بلّغنا على GitHub.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-xl border-2 border-ink bg-ink px-4 py-2 font-medium text-paper hover:bg-ink/85"
            >
              افتح الصفحة من الأول
            </button>
            <a
              href="https://github.com/elgendy2005/tareeqi/issues"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border-2 border-ink px-4 py-2 font-medium hover:bg-saffron/40"
            >
              بلّغ عن المشكلة
            </a>
          </div>
        </div>
      </div>
    )
  }
}
