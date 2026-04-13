-- Supaflow Schema

-- 1. Idempotency keys: prevents duplicate webhook execution
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz not null default now()
);

-- 2. Workflow runs: one record per trigger invocation
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  trigger_type text not null,
  trigger_payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms int,
  error text,
  metadata jsonb
);

-- 3. Step states: every logical step within a run
create table if not exists step_states (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  step_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  attempt int not null default 1,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms int,
  "order" int not null default 0
);

-- 4. Dead letter queue: permanently failed steps
create table if not exists dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  step_name text not null,
  input jsonb,
  error text not null,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

-- Indexes
create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_workflow_runs_name on workflow_runs(workflow_name);
create index if not exists idx_step_states_run_id on step_states(run_id);
create index if not exists idx_step_states_order on step_states(run_id, "order");
create index if not exists idx_dead_letter_queue_run_id on dead_letter_queue(run_id);
create index if not exists idx_dead_letter_queue_unresolved
  on dead_letter_queue(resolved_at) where resolved_at is null;

-- RLS
alter table workflow_runs enable row level security;
alter table step_states enable row level security;
alter table dead_letter_queue enable row level security;
alter table idempotency_keys enable row level security;

-- Read access for dashboard (anon key)
create policy "anon read workflow_runs" on workflow_runs for select using (true);
create policy "anon read step_states" on step_states for select using (true);
create policy "anon read dead_letter_queue" on dead_letter_queue for select using (true);

-- Write access for edge functions (service role)
create policy "service insert workflow_runs" on workflow_runs for insert with check (true);
create policy "service update workflow_runs" on workflow_runs for update using (true);
create policy "service insert step_states" on step_states for insert with check (true);
create policy "service update step_states" on step_states for update using (true);
create policy "service insert dead_letter_queue" on dead_letter_queue for insert with check (true);
create policy "service update dead_letter_queue" on dead_letter_queue for update using (true);
create policy "service insert idempotency_keys" on idempotency_keys for insert with check (true);
create policy "service read idempotency_keys" on idempotency_keys for select using (true);
