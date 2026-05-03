import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fmt, fmtPct, fmtMs, timeAgo } from './format'

describe('fmt', () => {
  it('returns em dash for null/undefined/NaN', () => {
    expect(fmt(null)).toBe('—')
    expect(fmt(undefined)).toBe('—')
    expect(fmt(Number.NaN)).toBe('—')
  })

  it('formats raw integers under 1k', () => {
    expect(fmt(0)).toBe('0')
    expect(fmt(42)).toBe('42')
    expect(fmt(999)).toBe('999')
  })

  it('scales to k between 1_000 and 999_999', () => {
    expect(fmt(1_000)).toBe('1k')
    expect(fmt(1_500)).toBe('1.5k')
    expect(fmt(12_345)).toBe('12.3k')
    expect(fmt(999_499)).toBe('999.5k')
  })

  it('scales to M at 1_000_000+', () => {
    expect(fmt(1_000_000)).toBe('1.0M')
    expect(fmt(1_200_000)).toBe('1.2M')
  })

  it('preserves the sign for negatives', () => {
    expect(fmt(-50)).toBe('-50')
    expect(fmt(-2_300)).toBe('-2.3k')
  })
})

describe('fmtPct', () => {
  it('returns em dash for null/undefined/NaN', () => {
    expect(fmtPct(null)).toBe('—')
    expect(fmtPct(undefined)).toBe('—')
    expect(fmtPct(Number.NaN)).toBe('—')
  })

  it('uses one decimal for values below 10', () => {
    expect(fmtPct(0)).toBe('0.0%')
    expect(fmtPct(7.3)).toBe('7.3%')
    expect(fmtPct(9.95)).toBe('10.0%') // rounds to 10.0 → still one decimal layer
  })

  it('rounds to integer for values 10 and above', () => {
    expect(fmtPct(82)).toBe('82%')
    expect(fmtPct(99.4)).toBe('99%')
    expect(fmtPct(100)).toBe('100%')
  })
})

describe('fmtMs', () => {
  it('returns em dash for null/undefined/NaN', () => {
    expect(fmtMs(null)).toBe('—')
    expect(fmtMs(undefined)).toBe('—')
    expect(fmtMs(Number.NaN)).toBe('—')
  })

  it('renders raw ms below 1_000', () => {
    expect(fmtMs(0)).toBe('0 ms')
    expect(fmtMs(950)).toBe('950 ms')
    expect(fmtMs(999)).toBe('999 ms')
  })

  it('renders seconds with two decimals between 1_000 and 60_000', () => {
    expect(fmtMs(1_000)).toBe('1.00 s')
    expect(fmtMs(1_500)).toBe('1.50 s')
    expect(fmtMs(59_999)).toBe('60.00 s')
  })

  it('renders minutes with one decimal at 60_000+', () => {
    expect(fmtMs(60_000)).toBe('1.0 m')
    expect(fmtMs(150_000)).toBe('2.5 m')
  })
})

describe('timeAgo', () => {
  // Freeze "now" at a known instant so the unit math is deterministic.
  const now = new Date('2026-05-03T12:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for null/undefined/future/invalid', () => {
    expect(timeAgo(null)).toBe('just now')
    expect(timeAgo(undefined)).toBe('just now')
    expect(timeAgo(now + 5_000)).toBe('just now')
    expect(timeAgo('not-a-date')).toBe('just now')
  })

  it('renders seconds under one minute', () => {
    expect(timeAgo(now - 1_000)).toBe('1s ago')
    expect(timeAgo(now - 12_000)).toBe('12s ago')
    expect(timeAgo(now - 59_000)).toBe('59s ago')
  })

  it('renders minutes under one hour', () => {
    expect(timeAgo(now - 60_000)).toBe('1m ago')
    expect(timeAgo(now - 5 * 60_000)).toBe('5m ago')
    expect(timeAgo(now - 59 * 60_000)).toBe('59m ago')
  })

  it('renders hours under one day', () => {
    expect(timeAgo(now - 60 * 60_000)).toBe('1h ago')
    expect(timeAgo(now - 3 * 60 * 60_000)).toBe('3h ago')
    expect(timeAgo(now - 23 * 60 * 60_000)).toBe('23h ago')
  })

  it('renders days for 24h+', () => {
    expect(timeAgo(now - 24 * 60 * 60_000)).toBe('1d ago')
    expect(timeAgo(now - 4 * 24 * 60 * 60_000)).toBe('4d ago')
  })

  it('accepts Date and ISO string inputs', () => {
    expect(timeAgo(new Date(now - 30_000))).toBe('30s ago')
    expect(timeAgo(new Date(now - 30_000).toISOString())).toBe('30s ago')
  })
})
