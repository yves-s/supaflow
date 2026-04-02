import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // SECURITY: explicit auth check — do not rely solely on middleware
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getAdminClient()
  const [{ data: runs }, { count: dlqCount }] = await Promise.all([
    supabaseAdmin.from('workflow_runs')
      .select('status'),
    supabaseAdmin.from('dead_letter_queue')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null),
  ])

  const stats = { completed: 0, failed: 0, running: 0, dlq_open: dlqCount ?? 0 }
  for (const r of runs ?? []) {
    if (r.status === 'completed') stats.completed++
    else if (r.status === 'failed') stats.failed++
    else if (r.status === 'running') stats.running++
  }

  return NextResponse.json(stats)
}
