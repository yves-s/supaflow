import { describe, it, expect } from 'vitest'
import { computeErrorPattern, buildSparklineBuckets, groupIntoIssues, type Issue } from './issues'

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

describe('groupIntoIssues', () => {
  const now = new Date('2026-04-16T12:00:00Z').getTime()

  it('groups step-based issues by (workflow, step, error)', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email: 123456789',
        startedAt: now - 1000,
      },
      {
        runId: 'run-2',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email: 987654321', // Same pattern after normalization
        startedAt: now - 2000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues).toHaveLength(1)
    expect(issues[0].errorPattern).toBe('Invalid email: <ID>')
    expect(issues[0].count).toBe(2)
    expect(issues[0].runIds).toEqual(['run-1', 'run-2'])
  })

  it('merges DLQ entries with step-based issues', () => {
    const steps = [
      {
        runId: 'step-run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email: 123456789',
        startedAt: now - 1000,
      },
    ]

    const dlqSteps = [
      {
        runId: 'dlq-run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email: 987654321', // Same pattern, same group
        startedAt: now - 2000,
      },
    ]

    const issues = groupIntoIssues([...steps, ...dlqSteps], [], now)

    expect(issues).toHaveLength(1)
    expect(issues[0].count).toBe(2)
    expect(issues[0].runIds).toContain('step-run-1')
    expect(issues[0].runIds).toContain('dlq-run-1')
  })

  it('separates issues by (workflow, step, error) pattern', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 1000,
      },
      {
        runId: 'run-2',
        workflowName: 'send-email',
        stepName: 'send', // Different step
        error: 'Invalid email',
        startedAt: now - 2000,
      },
      {
        runId: 'run-3',
        workflowName: 'notify-user', // Different workflow
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 3000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues).toHaveLength(3)
    const validateIssue = issues.find(i => i.stepName === 'validate' && i.workflowName === 'send-email')
    expect(validateIssue?.count).toBe(1)
  })

  it('applies stored status to grouped issues', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 1000,
      },
    ]

    const storedStatuses = [
      {
        id: 'status-1',
        workflow_name: 'send-email',
        step_name: 'validate',
        error_pattern: 'Invalid email',
        status: 'ignored' as const,
      },
    ]

    const issues = groupIntoIssues(steps, storedStatuses, now)

    expect(issues[0].status).toBe('ignored')
    expect(issues[0].statusId).toBe('status-1')
  })

  it('defaults to unresolved status if no stored status', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 1000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].status).toBe('unresolved')
    expect(issues[0].statusId).toBeNull()
  })

  it('deduplicates run IDs when merging sources', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 1000,
      },
      {
        runId: 'run-1', // Same run ID (different source)
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: now - 1000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].runIds).toEqual(['run-1'])
    expect(issues[0].count).toBe(1) // count is runIds.length
  })

  it('tracks firstSeenAt and lastSeenAt correctly', () => {
    const baseTime = now
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: baseTime - 10000, // Oldest
      },
      {
        runId: 'run-2',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid email',
        startedAt: baseTime - 5000, // Newest
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].firstSeenAt).toBe(baseTime - 10000)
    expect(issues[0].lastSeenAt).toBe(baseTime - 5000)
  })

  it('handles unknown step name gracefully', () => {
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: '(unknown)', // From DLQ with null step_name
        error: 'Timeout',
        startedAt: now - 1000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].stepName).toBe('(unknown)')
    expect(issues).toHaveLength(1)
  })

  it('sorts issues by lastSeenAt descending', () => {
    const baseTime = now
    const steps = [
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Error A',
        startedAt: baseTime - 10000,
      },
      {
        runId: 'run-2',
        workflowName: 'send-email',
        stepName: 'send',
        error: 'Error B',
        startedAt: baseTime, // Most recent
      },
      {
        runId: 'run-3',
        workflowName: 'notify',
        stepName: 'log',
        error: 'Error C',
        startedAt: baseTime - 5000,
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].stepName).toBe('send')
    expect(issues[1].stepName).toBe('log')
    expect(issues[2].stepName).toBe('validate')
  })

  it('calculates trend as increasing', () => {
    const baseTime = now
    const steps = [
      // Old errors (first 3 buckets avg)
      {
        runId: 'run-1',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid',
        startedAt: baseTime - 20 * 60 * 60 * 1000, // ~20 hours ago
      },
      // Recent errors (last 3 buckets avg)
      {
        runId: 'run-2',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid',
        startedAt: baseTime - 1 * 60 * 60 * 1000, // 1 hour ago
      },
      {
        runId: 'run-3',
        workflowName: 'send-email',
        stepName: 'validate',
        error: 'Invalid',
        startedAt: baseTime - 30 * 60 * 1000, // 30 min ago
      },
    ]

    const issues = groupIntoIssues(steps, [], now)

    expect(issues[0].trend).toBe('increasing')
  })
})
