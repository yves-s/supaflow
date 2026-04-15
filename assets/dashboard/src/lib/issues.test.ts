import { describe, it, expect } from 'vitest'
import { computeErrorPattern, buildSparklineBuckets } from './issues'

describe('computeErrorPattern', () => {
  it('replaces 4+ digit sequences with <ID>', () => {
    expect(computeErrorPattern('Failed subscriptions: 680935167'))
      .toBe('Failed subscriptions: <ID>')
  })

  it('replaces multiple IDs in one message', () => {
    expect(computeErrorPattern('Failed subscriptions: 680935167, 416655910'))
      .toBe('Failed subscriptions: <ID>, <ID>')
  })

  it('does not replace 1-3 digit numbers', () => {
    expect(computeErrorPattern('Retry 3 of 10 failed'))
      .toBe('Retry 3 of 10 failed')
  })

  it('replaces UUID-format tokens', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(computeErrorPattern(`Record ${uuid} not found`))
      .toBe('Record <UUID> not found')
  })

  it('returns unchanged string when no IDs present', () => {
    expect(computeErrorPattern('Timeout: upstream service unreachable'))
      .toBe('Timeout: upstream service unreachable')
  })
})

describe('buildSparklineBuckets', () => {
  it('returns 9 buckets', () => {
    const now = Date.now()
    const buckets = buildSparklineBuckets([], now)
    expect(buckets).toHaveLength(9)
  })

  it('counts timestamps into correct buckets', () => {
    const now = new Date('2026-01-01T09:00:00Z').getTime()
    const oneHourAgo = now - 60 * 60 * 1000
    const buckets = buildSparklineBuckets([oneHourAgo], now)
    expect(buckets[8]).toBe(1)
    expect(buckets.slice(0, 8).every(b => b === 0)).toBe(true)
  })

  it('scales relative to max bucket', () => {
    const now = Date.now()
    const recent = now - 60 * 60 * 1000
    const buckets = buildSparklineBuckets([recent, recent, recent], now)
    expect(buckets[8]).toBe(3)
  })
})
