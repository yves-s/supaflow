-- Supaflow schema reconciliation
-- Safe to run on any Supaflow installation, any number of times.
-- Applied automatically by /supaflow:init when updating.
-- Every schema change ever made gets an entry here.

-- ── v1.1 ──────────────────────────────────────────────────────────────────────
-- Add workflow_name to dead_letter_queue for direct filtering (was join-only before)

ALTER TABLE IF EXISTS dead_letter_queue
  ADD COLUMN IF NOT EXISTS workflow_name text;

UPDATE dead_letter_queue dlq
SET workflow_name = wr.workflow_name
FROM workflow_runs wr
WHERE dlq.run_id = wr.id
  AND dlq.workflow_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_workflow
  ON dead_letter_queue(workflow_name);
