import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // SECURITY: explicit auth check — do not rely solely on middleware
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getAdminClient()
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  let query = supabaseAdmin
    .from('workflow_runs')
    .select('id, trigger_payload, workflow_name, status, started_at, completed_at')
    .order('started_at', { ascending: false })

  if (email) {
    query = query.ilike('trigger_payload->>email', `%${email}%`)
  } else {
    query = query.limit(50)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const runs = (data ?? []).map(r => ({
    id: r.id,
    email: r.trigger_payload?.email ?? '',
    workflow_name: r.workflow_name,
    status: r.status,
    started_at: r.started_at,
    duration_ms: r.completed_at
      ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()))
      : Math.round(Date.now() - new Date(r.started_at).getTime()),
  }))

  return NextResponse.json(runs)
}
