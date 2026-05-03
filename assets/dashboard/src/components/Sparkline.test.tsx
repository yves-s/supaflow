import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Sparkline from './Sparkline'
import Icon from './Icon'

/**
 * Lightweight render checks: confirm the new primitives mount without React
 * warnings (covers the "no console warnings" AC) and emit the expected SVG
 * shape for representative inputs.
 *
 * Uses renderToStaticMarkup instead of ReactDOM.render to keep the suite
 * dependency-free (no @testing-library/react needed) while still exercising
 * the full render path React normally validates props on.
 */

describe('Sparkline', () => {
  // Vitest's spy types are generic and friction-prone across versions;
  // `any` here is intentional and scoped to a 2-line spy ledger.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let warnSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorSpy: any

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('renders an SVG with line and area paths for a normal series', () => {
    const html = renderToStaticMarkup(
      <Sparkline data={[1, 4, 2, 8, 3, 9, 5]} color="#1d4ed8" />,
    )
    expect(html).toContain('<svg')
    expect(html).toContain('linearGradient')
    // Two paths: area (gradient fill) and line (stroke)
    expect((html.match(/<path/g) || []).length).toBe(2)
  })

  it('omits the gradient when fill is false', () => {
    const html = renderToStaticMarkup(
      <Sparkline data={[1, 2, 3, 4]} fill={false} />,
    )
    expect(html).not.toContain('linearGradient')
    expect((html.match(/<path/g) || []).length).toBe(1)
  })

  it('renders an empty SVG (no path) for a single data point', () => {
    const html = renderToStaticMarkup(<Sparkline data={[42]} />)
    expect(html).toContain('<svg')
    expect(html).not.toContain('<path')
  })

  it('honours height and width overrides', () => {
    const html = renderToStaticMarkup(
      <Sparkline data={[1, 2, 3]} height={48} width={120} />,
    )
    expect(html).toContain('width="120"')
    expect(html).toContain('height="48"')
    expect(html).toContain('viewBox="0 0 120 48"')
  })
})

describe('Icon', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let warnSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorSpy: any

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  const allNames = [
    'home', 'flow', 'alert', 'list', 'cog', 'search', 'bell', 'play',
    'check', 'x', 'chev-r', 'chev-d', 'filter', 'refresh', 'spark',
    'code', 'clock', 'pulse', 'users', 'db', 'git', 'plus', 'more',
  ] as const

  it('renders every icon name in the design set', () => {
    for (const name of allNames) {
      const html = renderToStaticMarkup(<Icon name={name} size={14} />)
      expect(html).toContain('<svg')
      expect(html).toContain('width="14"')
      expect(html).toContain('height="14"')
    }
  })

  it('respects custom size', () => {
    const html = renderToStaticMarkup(<Icon name="bell" size={20} />)
    expect(html).toContain('width="20"')
    expect(html).toContain('height="20"')
  })

  it('marks the icon aria-hidden by default and exposes label when given', () => {
    const hidden = renderToStaticMarkup(<Icon name="search" />)
    expect(hidden).toContain('aria-hidden="true"')
    const labelled = renderToStaticMarkup(
      <Icon name="search" aria-label="Search" />,
    )
    expect(labelled).toContain('aria-label="Search"')
    expect(labelled).not.toContain('aria-hidden')
  })
})
