import { describe, it, expect, beforeAll } from 'vitest'

// Skip entire suite if no Supabase credentials configured
const hasCredentials = typeof import.meta.env !== 'undefined'
  && import.meta.env.VITE_SUPABASE_URL
  && import.meta.env.VITE_SUPABASE_ANON_KEY

const describeIntegration = hasCredentials ? describe : describe.skip

describeIntegration('queries (integration — requires .env with Supabase credentials)', () => {
  // Dynamic imports to avoid module-level errors when env is missing
  let queries: typeof import('./queries')

  beforeAll(async () => {
    queries = await import('./queries')
  })

  describe('fetchWorkflows', () => {
    it('returns at least one workflow', async () => {
      const workflows = await queries.fetchWorkflows()
      expect(workflows.length).toBeGreaterThan(0)
    })

    it('each workflow has required fields', async () => {
      const workflows = await queries.fetchWorkflows()
      for (const wf of workflows) {
        expect(wf.workflow_name).toBeTruthy()
        expect(typeof wf.total_runs).toBe('number')
        expect(typeof wf.success_rate).toBe('number')
        expect(wf.success_rate).toBeGreaterThanOrEqual(0)
        expect(wf.success_rate).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('fetchMetrics', () => {
    it('returns metrics with all fields', async () => {
      const metrics = await queries.fetchMetrics()
      expect(typeof metrics.totalRuns).toBe('number')
      expect(typeof metrics.successRate).toBe('number')
      expect(typeof metrics.avgDurationMs).toBe('number')
      expect(typeof metrics.dlqCount).toBe('number')
      expect(typeof metrics.runningCount).toBe('number')
    })

    it('success rate is between 0 and 100', async () => {
      const metrics = await queries.fetchMetrics()
      expect(metrics.successRate).toBeGreaterThanOrEqual(0)
      expect(metrics.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('fetchDlqForIssues', () => {
    it('returns array of FailedStepRaw entries', async () => {
      const entries = await queries.fetchDlqForIssues()
      expect(Array.isArray(entries)).toBe(true)
      for (const e of entries) {
        expect(e.runId).toBeTruthy()
        expect(e.workflowName).toBeTruthy()
        expect(e.stepName).toBeTruthy()
        expect(e.error).toBeTruthy()
        expect(typeof e.startedAt).toBe('number')
      }
    })
  })

  describe('fetchDlqEntries', () => {
    it('returns unresolved DLQ entries', async () => {
      const entries = await queries.fetchDlqEntries()
      expect(Array.isArray(entries)).toBe(true)
      for (const e of entries) {
        expect(e.resolved_at).toBeNull()
      }
    })
  })

  describe('fetchFailedStepsForIssues', () => {
    it('returns array of failed steps from recent runs', async () => {
      const steps = await queries.fetchFailedStepsForIssues()
      expect(Array.isArray(steps)).toBe(true)
      for (const s of steps) {
        expect(s.runId).toBeTruthy()
        expect(s.workflowName).toBeTruthy()
        expect(s.stepName).toBeTruthy()
        expect(s.error).toBeTruthy()
        expect(typeof s.startedAt).toBe('number')
      }
    })
  })

  describe('fetchIssueStatuses', () => {
    it('returns array of issue summaries', async () => {
      const statuses = await queries.fetchIssueStatuses()
      expect(Array.isArray(statuses)).toBe(true)
      for (const s of statuses) {
        expect(s.workflow_name).toBeTruthy()
        expect(s.step_name).toBeTruthy()
        expect(s.error_pattern).toBeTruthy()
        expect(['unresolved', 'resolved', 'ignored']).toContain(s.status)
      }
    })
  })

  // ─── Invariant tests ──────────────────────────────────────────────────────
  // These catch the exact bug type we had: header shows DLQ count but Issues tab is empty

  describe('invariants', () => {
    it('DLQ count > 0 implies fetchDlqForIssues returns entries', async () => {
      const metrics = await queries.fetchMetrics()
      if (metrics.dlqCount > 0) {
        const dlqIssues = await queries.fetchDlqForIssues()
        expect(dlqIssues.length).toBeGreaterThan(0)
      }
    })

    it('fetchMetrics().dlqCount matches fetchDlqForIssues().length', async () => {
      const metrics = await queries.fetchMetrics()
      const dlqIssues = await queries.fetchDlqForIssues()
      // dlqForIssues has a limit of 1000, so only assert if count is under that
      if (metrics.dlqCount <= 1000) {
        expect(dlqIssues.length).toBe(metrics.dlqCount)
      } else {
        expect(dlqIssues.length).toBe(1000)
      }
    })

    it('fetchMetrics().dlqCount matches fetchDlqEntries().length', async () => {
      const metrics = await queries.fetchMetrics()
      const dlqEntries = await queries.fetchDlqEntries()
      // fetchDlqEntries has no explicit limit in query but default Supabase limit
      expect(dlqEntries.length).toBe(metrics.dlqCount)
    })
  })
})
