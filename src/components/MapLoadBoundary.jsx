import { Component } from 'react'

/**
 * الخريطة الجغرافية بتتحمّل لما تتطلب، فممكن تفشل (مثلًا أوفلاين قبل ما تتخزّن).
 * بدل ما الصفحة كلها تقع، بنعرض رسالة وزرار يرجّع للخريطة التخطيطية (اللي شغالة أوفلاين).
 */
export default class MapLoadBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('طريقي: الخريطة الجغرافية ماتحمّلتش', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink/40 p-6 text-center"
      >
        <p>معرفناش نحمّل الخريطة الجغرافية. غالبًا النت فاصل.</p>
        <button
          type="button"
          onClick={this.props.onFail}
          className="btn-lift rounded-xl border-2 border-ink px-4 py-2 font-medium hover:bg-saffron/40"
        >
          ارجع للخريطة التخطيطية
        </button>
      </div>
    )
  }
}
