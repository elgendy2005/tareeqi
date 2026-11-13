// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetroMap from './MetroMap.jsx'
import { findRoute } from '../lib/router.js'
import { POSITIONS } from '../data/layout.js'

// لافتات المحطات جوه الـ SVG (متلفوفة بـ RLI…PDI)
const labels = (name) =>
  [...screen.getByRole('img', { name: /خريطة تخطيطية/ }).querySelectorAll('text')].filter(
    (t) => t.textContent.replace(/[⁧⁩]/g, '') === name,
  )

const renderMap = (from = null, to = null) =>
  render(
    <MetroMap
      route={from && to ? findRoute(from, to) : null}
      from={from}
      to={to}
      onStationClick={() => {}}
    />,
  )

describe('MetroMap — اللافتات', () => {
  it('محطتين منفصلتين بنفس الاسم بيظهرلهم لافتة واحدة في العرض العام', () => {
    renderMap()
    expect(labels('عدلي منصور')).toHaveLength(1)
    expect(labels('مدينة الفنون والثقافة')).toHaveLength(1)
    // المحطات اللي أساميها مختلفة بتفضل لافتتين
    expect(labels('الإستاد')).toHaveLength(1)
    expect(labels('إستاد القاهرة')).toHaveLength(1)
  })

  it('رحلة فيها مشي في عدلي منصور: لافتة واحدة برضه', () => {
    const route = findRoute('l-obour', 'haykestep')
    expect(route.legs.some((l) => l.walkBefore)).toBe(true)
    renderMap('l-obour', 'haykestep')
    expect(labels('عدلي منصور')).toHaveLength(1)
  })

  it('لو الرحلة بتبدأ من محطة الـ LRT وبتمشي للمترو، لافتة الـ LRT (البداية) هي اللي بتظهر', () => {
    // الاتنين على الرحلة (نقطة مشي)، فالاتنين عايزين لافتة: البداية هي اللي تكسب
    const route = findRoute('l-adly-mansour', 'haykestep')
    expect(route.legs[0].walkBefore ?? route.walkAfter).toBeTruthy()
    renderMap('l-adly-mansour', 'haykestep')
    const [label] = labels('عدلي منصور')
    expect(labels('عدلي منصور')).toHaveLength(1)
    // الاسمين متطابقين، فبنعرف المحطة من مكان دايرتها على الخريطة
    const cx = Number(label.closest('g').querySelector('circle').getAttribute('cx'))
    expect(cx).toBe(POSITIONS['l-adly-mansour'][0])
    expect(cx).not.toBe(POSITIONS['adly-mansour'][0])
  })
})

describe('MetroMap — الحركة', () => {
  const layer = () => screen.getByRole('img', { name: /خريطة تخطيطية/ }).querySelector(':scope > g')

  it('من غير رحلة الخريطة في العرض الكامل', () => {
    renderMap()
    expect(layer().style.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('مع رحلة الخريطة بتقرّب عليها', () => {
    renderMap('maadi', 'opera')
    const k = Number(layer().style.transform.match(/scale\(([\d.]+)\)/)[1])
    expect(k).toBeGreaterThan(1)
  })

  it('المسار بيترسم، والقطر بيظهر بس لو الحركة مش مقفولة', () => {
    renderMap('maadi', 'opera')
    expect(document.querySelectorAll('.route-draw').length).toBeGreaterThan(0)
    expect(screen.getByTestId('route-train')).toBeInTheDocument()
  })

  it('مع prefers-reduced-motion مفيش قطر متحرك', () => {
    const original = window.matchMedia
    window.matchMedia = (query) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })
    try {
      renderMap('maadi', 'opera')
      expect(screen.queryByTestId('route-train')).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })
})
