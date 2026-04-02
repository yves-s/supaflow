import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { buildListMap, resolveStepName } from '@/lib/step-names'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // SECURITY: explicit auth check — do not rely solely on middleware
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getAdminClient()
  const { id } = await params

  const [{ data: run }, { data: steps }] = await Promise.all([
    supabaseAdmin.from('workflow_runs').select('*').eq('id', id).single(),
    supabaseAdmin
      .from('step_states')
      .select('*')
      .eq('run_id', id)
      .order('started_at', { ascending: true })
      .order('step_name', { ascending: true }),
  ])

  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fetchStep = (steps ?? []).find(s => s.step_name === 'fetch_subscriptions')
  const listMap = fetchStep ? buildListMap(fetchStep.output) : {}

  const resolvedSteps = (steps ?? []).map(s => ({
    ...s,
    displayName: resolveStepName(s.step_name, listMap),
    duration_ms: s.completed_at
      ? Math.round(new Date(s.completed_at).getTime() - new Date(s.started_at).getTime())
      : null,
    // Strip stack traces: keep only the first line of the error message
    error: s.error ? s.error.split('\n')[0].trim() : s.error,
  }))

  return NextResponse.json({ run, steps: resolvedSteps })
}
