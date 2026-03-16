-- 1. idempotency_keys: Verhindert doppelte Ausführung bei Webhook-Retries
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz not null default now()
);

-- 2. workflow_runs: Jeder Trigger = ein Run
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  trigger_type text not null,
  trigger_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  metadata jsonb
);

-- 3. step_states: Jeder logische Schritt wird getrackt
create table if not exists step_states (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  step_name text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  attempt int not null default 1,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 4. dead_letter_queue: Endgültig fehlgeschlagene Steps
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
create index if not exists idx_step_states_run_id on step_states(run_id);
create index if not exists idx_dead_letter_queue_run_id on dead_letter_queue(run_id);
create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_dead_letter_queue_resolved on dead_letter_queue(resolved_at) where resolved_at is null;

-- RLS: Public read for demo (allow anon to read all tables)
alter table workflow_runs enable row level security;
alter table step_states enable row level security;
alter table dead_letter_queue enable row level security;
alter table idempotency_keys enable row level security;

create policy "public read workflow_runs" on workflow_runs for select using (true);
create policy "public read step_states" on step_states for select using (true);
create policy "public read dead_letter_queue" on dead_letter_queue for select using (true);

-- Service role full access (edge functions use service role key)
create policy "service insert workflow_runs" on workflow_runs for insert with check (true);
create policy "service update workflow_runs" on workflow_runs for update using (true);
create policy "service insert step_states" on step_states for insert with check (true);
create policy "service update step_states" on step_states for update using (true);
create policy "service insert dead_letter_queue" on dead_letter_queue for insert with check (true);
create policy "service update dead_letter_queue" on dead_letter_queue for update using (true);
create policy "service insert idempotency_keys" on idempotency_keys for insert with check (true);
create policy "service read idempotency_keys" on idempotency_keys for select using (true);
