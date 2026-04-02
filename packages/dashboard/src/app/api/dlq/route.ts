import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { buildListMap, resolveStepName } from '@/lib/step-names'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // SECURITY: explicit auth check — do not rely solely on middleware
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getAdminClient()
  const { searchParams } = new URL(request.url)
  const showAll = searchParams.get('showAll') === 'true'
  const stepName = searchParams.get('step_name')
  const runId = searchParams.get('run_id')

  let query = supabaseAdmin
    .from('dead_letter_queue')
    .select('*, workflow_runs!inner(trigger_payload, workflow_name, id)')
    .order('created_at', { ascending: false })

  if (!showAll) {
    query = query.is('resolved_at', null)
  }

  if (stepName) {
    query = query.eq('step_name', stepName)
  }

  if (runId) {
    query = query.eq('run_id', runId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For each DLQ entry, resolve step name using the run's fetch_subscriptions step
  const runIds = Array.from(new Set((data ?? []).map(d => d.run_id)))

  // Fetch fetch_subscriptions steps for all relevant runs
  const { data: fetchSteps } = await supabaseAdmin
    .from('step_states')
    .select('run_id, output')
    .in('run_id', runIds)
    .eq('step_name', 'fetch_subscriptions')

  const listMaps: Record<string, Record<string, string>> = {}
  for (const fs of fetchSteps ?? []) {
    listMaps[fs.run_id] = buildListMap(fs.output)
  }

  const entries = (data ?? []).map(d => {
    const run = d.workflow_runs as { trigger_payload: { email?: string }; workflow_name: string; id: string }
    const listMap = listMaps[d.run_id] ?? {}
    return {
      id: d.id,
      run_id: d.run_id,
      step_name: d.step_name,
      displayName: resolveStepName(d.step_name, listMap),
      error: d.error,
      input: d.input,
      attempts: d.attempts,
      created_at: d.created_at,
      resolved_at: d.resolved_at,
      resolved_by: d.resolved_by,
      email: run.trigger_payload?.email ?? '',
      workflow_name: run.workflow_name,
    }
  })

  return NextResponse.json(entries)
}
