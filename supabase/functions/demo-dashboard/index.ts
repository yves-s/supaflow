// Demo Dashboard — EdgeFlow visual runner
// Serves a full observability dashboard for the Klaviyo → HubSpot Unsubscribe Sync demo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://xxaozubvzgqavrgydohm.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YW96dWJ2emdxYXZyZ3lkb2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTcwMjMsImV4cCI6MjA4OTI3MzAyM30.YQiOxzuhI-g0QadmghqBYhSVnozm9Ipc67ostGhwuT8";
const KLAVIYO_FUNCTION_URL = Deno.env.get("KLAVIYO_FUNCTION_URL") || "http://localhost:8000";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "dc3cb30dfe1614cc61933efcd8ede51314d65f4c58e6e1b3";
const PORT = parseInt(Deno.env.get("PORT") || "8001");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname.endsWith("/api/metrics")) {
    return await proxyMetrics();
  }
  if (url.pathname.endsWith("/api/runs")) {
    return await proxyRuns();
  }
  if (url.pathname.endsWith("/api/dlq")) {
    return await proxyDLQ();
  }
  if (url.pathname.endsWith("/api/trigger") && req.method === "POST") {
    return await proxyTrigger(req);
  }

  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

async function proxyMetrics(): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [{ data: runs }, { data: dlq }] = await Promise.all([
    supabase.from("workflow_runs").select("status, started_at, completed_at"),
    supabase.from("dead_letter_queue").select("id").is("resolved_at", null),
  ]);
  const total = runs?.length ?? 0;
  const completed = runs?.filter((r: any) => r.status === "completed").length ?? 0;
  const failed = runs?.filter((r: any) => r.status === "failed").length ?? 0;
  const dlqCount = dlq?.length ?? 0;
  const durations = (runs ?? [])
    .filter((r: any) => r.completed_at && r.started_at)
    .map((r: any) => new Date(r.completed_at).getTime() - new Date(r.started_at).getTime());
  const avgMs = durations.length
    ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
    : 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return json({ total, completed, failed, dlqCount, avgMs, successRate });
}

async function proxyRuns(): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*, step_states(*)")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) return jsonError(error.message, 500);
  return json(data);
}

async function proxyDLQ(): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from("dead_letter_queue")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return json(data);
}

const ALLOWED_SCENARIOS = new Set(["happy", "partial_failure", "total_failure", "slow", "duplicate"]);

async function proxyTrigger(req: Request): Promise<Response> {
  let body: { email?: unknown; scenario?: unknown; timestamp?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  // Input validation
  if (!body.email || typeof body.email !== "string") {
    return jsonError("Missing or invalid field: email", 400);
  }
  if (body.scenario !== undefined && !ALLOWED_SCENARIOS.has(body.scenario as string)) {
    return jsonError("Invalid scenario value", 400);
  }

  const res = await fetch(KLAVIYO_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 200) };
  }
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EdgeFlow Demo Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0c10;
    --surface: #13161e;
    --surface2: #1c2030;
    --border: #252836;
    --text: #e2e8f0;
    --muted: #64748b;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #f59e0b;
    --orange: #f97316;
    --blue: #3b82f6;
    --purple: #8b5cf6;
    --mono: 'SF Mono', 'Fira Code', monospace;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  /* Header */
  .header {
    padding: 14px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--surface);
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .logo { font-size: 16px; font-weight: 700; letter-spacing: -0.4px; color: var(--text); }
  .badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .badge-blue { background: rgba(59,130,246,.2); color: var(--blue); border: 1px solid rgba(59,130,246,.3); }
  .badge-purple { background: rgba(139,92,246,.2); color: var(--purple); border: 1px solid rgba(139,92,246,.3); }
  .header-subtitle { color: var(--muted); font-size: 12px; }
  .header-note { color: var(--muted); font-size: 11px; }

  /* Metrics */
  .metrics-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border-bottom: 1px solid var(--border);
  }
  .metric-card {
    padding: 20px 24px;
    border-right: 1px solid var(--border);
  }
  .metric-card:last-child { border-right: none; }
  .metric-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1;
    margin-bottom: 6px;
    font-variant-numeric: tabular-nums;
  }
  .metric-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    font-weight: 500;
  }
  .val-white { color: var(--text); }
  .val-green { color: var(--green); }
  .val-yellow { color: var(--yellow); }
  .val-red { color: var(--red); }
  .val-orange { color: var(--orange); }
  .val-blue { color: var(--blue); }
  .val-muted { color: var(--muted); }

  /* Trigger panel */
  .trigger-panel {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .trigger-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  input[type="email"], select {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 7px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: var(--mono);
    outline: none;
    transition: border-color 0.15s;
  }
  input[type="email"] { width: 220px; }
  select { cursor: pointer; }
  input[type="email"]:focus, select:focus { border-color: var(--blue); }
  .btn {
    padding: 7px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .btn:hover { opacity: 0.85; }
  .btn:active { opacity: 0.7; transform: scale(0.98); }
  .btn-blue { background: var(--blue); color: #fff; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .trigger-response {
    margin-top: 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    white-space: pre-wrap;
    word-break: break-all;
    display: none;
    max-height: 100px;
    overflow: auto;
  }
  .trigger-response.visible { display: block; }

  /* Main content */
  .main { padding: 0 24px 40px; }

  /* Tab bar */
  .tab-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
  }
  .tabs { display: flex; gap: 0; }
  .tab {
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--blue); }
  .tab-badge {
    display: inline-block;
    background: rgba(249,115,22,.2);
    color: var(--orange);
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    margin-left: 5px;
  }
  .refresh-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--muted);
    padding-bottom: 8px;
  }
  .refresh-controls label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .refresh-controls input[type="checkbox"] { width: 14px; height: 14px; cursor: pointer; }
  .last-refreshed { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }

  /* Tables */
  .tab-content { padding-top: 1px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--border);
  }
  td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .run-row { cursor: pointer; transition: background 0.1s; }
  .run-row:hover td { background: rgba(255,255,255,.02); }
  .run-row.expanded td { background: rgba(59,130,246,.04); }
  .mono { font-family: var(--mono); font-size: 12px; }
  .text-muted { color: var(--muted); }

  /* Status badges */
  .status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .status-completed { background: rgba(34,197,94,.12); color: var(--green); }
  .status-failed { background: rgba(239,68,68,.12); color: var(--red); }
  .status-running { background: rgba(245,158,11,.12); color: var(--yellow); }
  .status-pending { background: rgba(100,116,139,.12); color: var(--muted); }
  .status-skipped { background: rgba(100,116,139,.12); color: var(--muted); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .status-running { animation: pulse 1.5s ease-in-out infinite; }

  /* Expanded run / step timeline */
  .expand-row td { padding: 0; }
  .expand-inner {
    padding: 16px 24px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .expand-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted);
    margin-bottom: 12px;
  }

  /* Step timeline — horizontal cards */
  .step-timeline {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 0;
  }
  .step-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    min-width: 140px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .step-card:hover { border-color: var(--blue); background: rgba(59,130,246,.05); }
  .step-card.active { border-color: var(--blue); background: rgba(59,130,246,.07); }
  .step-card.failed-card { border-color: rgba(239,68,68,.4); }
  .step-name {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
    font-weight: 600;
    margin-bottom: 6px;
    white-space: nowrap;
  }
  .step-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .step-duration { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .attempt-badge {
    font-size: 9px;
    font-weight: 700;
    background: rgba(249,115,22,.15);
    color: var(--orange);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .step-error-inline {
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--red);
    background: rgba(239,68,68,.07);
    border-radius: 4px;
    padding: 6px 8px;
    border-left: 2px solid var(--red);
    word-break: break-all;
    white-space: pre-wrap;
  }

  /* JSON inspector */
  .json-inspector {
    margin-top: 16px;
    display: none;
  }
  .json-inspector.visible { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .json-col-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .json-block {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 14px;
    font-family: var(--mono);
    font-size: 11px;
    color: #a5b4fc;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 220px;
    overflow: auto;
    line-height: 1.6;
  }
  .json-block .key { color: #7dd3fc; }
  .json-block .str { color: #86efac; }
  .json-block .num { color: #fca5a5; }
  .json-block .bool { color: var(--orange); }
  .json-error-block {
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.25);
    border-radius: 6px;
    padding: 12px 14px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--red);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 220px;
    overflow: auto;
  }

  /* DLQ */
  .dlq-empty {
    padding: 48px 24px;
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .dlq-empty-icon {
    font-size: 28px;
    margin-bottom: 4px;
  }
  .dlq-empty-title { color: var(--green); font-weight: 600; }
  .error-cell {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--red);
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: help;
  }

  /* Empty / loading */
  .empty-state {
    padding: 48px 24px;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
  }
  .loading-state {
    padding: 32px 24px;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
  }
</style>
</head>
<body>

<header class="header">
  <div class="header-left">
    <span class="logo">EdgeFlow</span>
    <span class="badge badge-blue">DEMO</span>
    <span class="header-subtitle">Klaviyo &rarr; HubSpot Unsubscribe Sync</span>
  </div>
  <div class="header-right">
    <span class="badge badge-purple">&#9889; Built with Claude in ~30s</span>
    <span class="header-note">Supabase Edge Functions &middot; No n8n &middot; <span style="color:var(--green)">Retries, DLQ &amp; idempotency — no workflow builder needed</span></span>
  </div>
</header>

<div class="metrics-row" id="metrics-row">
  <div class="metric-card">
    <div class="metric-value val-white" id="m-total">—</div>
    <div class="metric-label">Total Runs</div>
  </div>
  <div class="metric-card">
    <div class="metric-value val-muted" id="m-rate">—</div>
    <div class="metric-label">Success Rate</div>
  </div>
  <div class="metric-card">
    <div class="metric-value val-muted" id="m-failed">—</div>
    <div class="metric-label">Failed</div>
  </div>
  <div class="metric-card">
    <div class="metric-value val-muted" id="m-dlq">—</div>
    <div class="metric-label">In DLQ</div>
  </div>
  <div class="metric-card">
    <div class="metric-value val-blue" id="m-avg">—</div>
    <div class="metric-label">Avg Duration</div>
  </div>
</div>

<div class="trigger-panel">
  <div class="trigger-row">
    <input type="email" id="email-input" value="test@example.com" placeholder="email@example.com" />
    <select id="scenario-select">
      <option value="happy">Happy Path</option>
      <option value="partial_failure">Partial Failure</option>
      <option value="total_failure">Total Failure</option>
      <option value="slow">Slow (2s delay)</option>
      <option value="duplicate">Duplicate Webhook</option>
    </select>
    <button class="btn btn-blue" onclick="triggerSelected()">Trigger Workflow</button>
    <button class="btn btn-ghost" onclick="refreshAll()">Refresh</button>
  </div>
  <div class="trigger-response" id="trigger-response"></div>
</div>

<div class="main">
  <div class="tab-bar">
    <div class="tabs">
      <button class="tab active" id="tab-btn-runs" onclick="switchTab('runs', this)">Workflow Runs</button>
      <button class="tab" id="tab-btn-dlq" onclick="switchTab('dlq', this)">Dead Letter Queue</button>
    </div>
    <div class="refresh-controls">
      <span class="last-refreshed" id="last-refreshed"></span>
      <label>
        <input type="checkbox" id="auto-refresh-chk" checked onchange="toggleAutoRefresh()" />
        Auto-refresh
      </label>
    </div>
  </div>

  <div class="tab-content" id="tab-runs-content">
    <div class="loading-state">Loading...</div>
  </div>
  <div class="tab-content" id="tab-dlq-content" style="display:none">
    <div class="loading-state">Loading...</div>
  </div>
</div>

<script>
(function() {

var BASE = window.location.origin + window.location.pathname.replace(/\\/$/, '');
var expandedRun = null;
var expandedStep = null;
var autoTimer = null;
var currentTab = 'runs';
var dlqCount = 0;

// Step name display map
var STEP_NAMES = {
  'extract_email': 'Extract Email',
  'fetch_subscriptions': 'Fetch Subscriptions',
  'unsubscribe_sub_001': 'Unsub: Marketing Newsletter',
  'unsubscribe_sub_002': 'Unsub: Product Updates',
  'unsubscribe_sub_003': 'Unsub: Partner Offers'
};

function stepLabel(name) {
  return STEP_NAMES[name] || name.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
}

function fmtId(id) {
  return id ? '<span class="mono">' + id.slice(0, 8) + '</span>' : '-';
}

function fmtTime(ts) {
  if (!ts) return '-';
  return '<span class="mono">' + new Date(ts).toLocaleTimeString() + '</span>';
}

function fmtDuration(start, end) {
  if (!start || !end) return '<span class="text-muted">—</span>';
  var ms = new Date(end).getTime() - new Date(start).getTime();
  var val = ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
  return '<span class="mono">' + val + '</span>';
}

function fmtDurationMs(ms) {
  if (!ms) return '<span class="text-muted">—</span>';
  var val = ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
  return val;
}

function statusBadge(s) {
  var cls = 'status-' + (s || 'pending');
  return '<span class="status ' + cls + '">' + (s || 'pending') + '</span>';
}

// Very small JSON syntax highlighter
function highlight(json) {
  return json
    .replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(?=\\s*:))/g, '<span class="key">$1</span>')
    .replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*")(?!\\s*:)/g, '<span class="str">$1</span>')
    .replace(/\\b(\\d+\\.?\\d*)\\b/g, '<span class="num">$1</span>')
    .replace(/\\b(true|false|null)\\b/g, '<span class="bool">$1</span>');
}

function prettyJson(val) {
  try {
    var obj = (typeof val === 'string') ? JSON.parse(val) : val;
    return highlight(JSON.stringify(obj, null, 2));
  } catch (e) {
    return String(val);
  }
}

// ── Metrics ──────────────────────────────────────────────

async function loadMetrics() {
  try {
    var res = await fetch(BASE + '/api/metrics');
    var m = await res.json();
    document.getElementById('m-total').textContent = m.total;
    var rateEl = document.getElementById('m-rate');
    rateEl.textContent = m.total > 0 ? m.successRate + '%' : '—';
    rateEl.className = 'metric-value ' + (m.successRate > 80 ? 'val-green' : m.successRate > 50 ? 'val-yellow' : m.total > 0 ? 'val-red' : 'val-muted');
    var failEl = document.getElementById('m-failed');
    failEl.textContent = m.failed;
    failEl.className = 'metric-value ' + (m.failed > 0 ? 'val-red' : 'val-muted');
    var dlqEl = document.getElementById('m-dlq');
    dlqEl.textContent = m.dlqCount;
    dlqEl.className = 'metric-value ' + (m.dlqCount > 0 ? 'val-orange' : 'val-muted');
    document.getElementById('m-avg').textContent = m.avgMs ? fmtDurationMs(m.avgMs) : '—';
  } catch (e) { /* silent */ }
}

// ── Runs ──────────────────────────────────────────────────

async function loadRuns() {
  var container = document.getElementById('tab-runs-content');
  try {
    var res = await fetch(BASE + '/api/runs');
    var runs = await res.json();

    if (!runs || runs.length === 0) {
      container.innerHTML = '<div class="empty-state">No workflow runs yet — trigger one above</div>';
      return;
    }

    var html = '<table><thead><tr>' +
      '<th>ID</th><th>Status</th><th>Scenario</th><th>Email</th><th>Started</th><th>Duration</th><th>Steps</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      var email = (run.trigger_payload && run.trigger_payload.email) ? run.trigger_payload.email : '-';
      var scenario = (run.trigger_payload && run.trigger_payload.scenario) ? run.trigger_payload.scenario : '-';
      var stepCount = run.step_states ? run.step_states.length : 0;
      var isExp = expandedRun === run.id;
      var rowCls = 'run-row' + (isExp ? ' expanded' : '');

      html += '<tr class="' + rowCls + '" onclick="toggleRun(\'' + run.id + '\')">' +
        '<td>' + fmtId(run.id) + '</td>' +
        '<td>' + statusBadge(run.status) + '</td>' +
        '<td><span class="mono text-muted">' + scenario + '</span></td>' +
        '<td><span class="mono">' + email + '</span></td>' +
        '<td>' + fmtTime(run.started_at) + '</td>' +
        '<td>' + fmtDuration(run.started_at, run.completed_at) + '</td>' +
        '<td><span class="mono text-muted">' + stepCount + '</span></td>' +
        '</tr>';

      if (isExp) {
        html += '<tr class="expand-row"><td colspan="7">' + buildTimeline(run) + '</td></tr>';
      }
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="empty-state" style="color:var(--red)">Error loading runs</div>';
  }
}

function buildTimeline(run) {
  if (!run.step_states || run.step_states.length === 0) {
    return '<div class="expand-inner"><span style="color:var(--muted);font-size:12px">No step data</span></div>';
  }

  var steps = run.step_states.slice().sort(function(a, b) {
    return new Date(a.started_at || 0).getTime() - new Date(b.started_at || 0).getTime();
  });

  var cards = '';
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var key = run.id + '|' + step.step_name;
    var isActive = expandedStep === key;
    var isFailed = step.status === 'failed';
    var cardCls = 'step-card' + (isActive ? ' active' : '') + (isFailed ? ' failed-card' : '');

    var durationStr = '';
    if (step.started_at && step.completed_at) {
      var ms = new Date(step.completed_at).getTime() - new Date(step.started_at).getTime();
      durationStr = ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
    }

    var attemptHtml = '';
    if (step.attempt && step.attempt > 1) {
      var maxAttempts = 3;
      attemptHtml = '<span class="attempt-badge">Attempt ' + step.attempt + '/' + maxAttempts + '</span>';
    }

    var errorHtml = '';
    if (isFailed && step.error) {
      errorHtml = '<div class="step-error-inline">' + esc(step.error) + '</div>';
    }

    cards += '<div class="' + cardCls + '" onclick="toggleStep(event, \'' + esc(run.id) + '\', \'' + esc(step.step_name) + '\')">' +
      '<div class="step-name">' + esc(stepLabel(step.step_name)) + '</div>' +
      '<div class="step-meta">' + statusBadge(step.status) +
        (durationStr ? '<span class="step-duration">' + durationStr + '</span>' : '') +
        attemptHtml +
      '</div>' +
      errorHtml +
      '</div>';
  }

  // JSON inspector (hidden until a step card is clicked)
  var inspectorId = 'inspector-' + run.id;
  var inspectorHtml = '<div class="json-inspector" id="' + inspectorId + '"></div>';

  return '<div class="expand-inner">' +
    '<div class="expand-label">Step Timeline</div>' +
    '<div class="step-timeline">' + cards + '</div>' +
    inspectorHtml +
    '</div>';
}

function toggleStep(e, runId, stepName) {
  e.stopPropagation();
  var key = runId + '|' + stepName;
  if (expandedStep === key) {
    expandedStep = null;
    var el = document.getElementById('inspector-' + runId);
    if (el) { el.className = 'json-inspector'; el.innerHTML = ''; }
    // re-render just to update card active states
    loadRuns();
    return;
  }
  expandedStep = key;

  // Find step data without re-fetching
  fetch(BASE + '/api/runs').then(function(r) { return r.json(); }).then(function(runs) {
    var run = runs && runs.find(function(r) { return r.id === runId; });
    if (!run || !run.step_states) return;
    var step = run.step_states.find(function(s) { return s.step_name === stepName; });
    if (!step) return;

    var inspectorEl = document.getElementById('inspector-' + runId);
    if (!inspectorEl) return;

    var inputHtml, outputHtml;

    if (step.error) {
      inputHtml = '<div class="json-col-label">Input</div>' +
        '<div class="json-block">' + (step.input ? prettyJson(step.input) : '<span style="color:var(--muted)">—</span>') + '</div>';
      outputHtml = '<div class="json-col-label">Error</div>' +
        '<div class="json-error-block">' + esc(step.error) + '</div>';
    } else {
      inputHtml = '<div class="json-col-label">Input</div>' +
        '<div class="json-block">' + (step.input ? prettyJson(step.input) : '<span style="color:var(--muted)">—</span>') + '</div>';
      outputHtml = '<div class="json-col-label">Output</div>' +
        '<div class="json-block">' + (step.output ? prettyJson(step.output) : '<span style="color:var(--muted)">—</span>') + '</div>';
    }

    inspectorEl.innerHTML = '<div>' + inputHtml + '</div><div>' + outputHtml + '</div>';
    inspectorEl.className = 'json-inspector visible';
    loadRuns(); // re-render to show active card state
  });
}

function toggleRun(id) {
  if (expandedRun === id) {
    expandedRun = null;
    expandedStep = null;
  } else {
    expandedRun = id;
    expandedStep = null;
  }
  loadRuns();
}

// ── DLQ ──────────────────────────────────────────────────

async function loadDLQ() {
  var container = document.getElementById('tab-dlq-content');
  try {
    var res = await fetch(BASE + '/api/dlq');
    var items = await res.json();

    dlqCount = items ? items.length : 0;
    updateDLQBadge();

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="dlq-empty">' +
        '<div class="dlq-empty-icon">&#10003;</div>' +
        '<div class="dlq-empty-title">All clear — no failed steps</div>' +
        '</div>';
      return;
    }

    var html = '<table><thead><tr>' +
      '<th>ID</th><th>Run ID</th><th>Step</th><th>Attempts</th><th>Error</th><th>Created</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td>' + fmtId(item.id) + '</td>' +
        '<td>' + fmtId(item.run_id) + '</td>' +
        '<td><span class="mono">' + esc(stepLabel(item.step_name || '')) + '</span></td>' +
        '<td><span class="mono">' + (item.attempts || 0) + '</span></td>' +
        '<td><span class="error-cell" title="' + esc(item.error || '') + '">' + esc(item.error || '') + '</span></td>' +
        '<td>' + fmtTime(item.created_at) + '</td>' +
        '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="empty-state" style="color:var(--red)">Error loading DLQ</div>';
  }
}

function updateDLQBadge() {
  var btn = document.getElementById('tab-btn-dlq');
  if (!btn) return;
  var existing = btn.querySelector('.tab-badge');
  if (existing) existing.remove();
  if (dlqCount > 0) {
    var badge = document.createElement('span');
    badge.className = 'tab-badge';
    badge.textContent = dlqCount;
    btn.appendChild(badge);
  }
}

// ── Trigger ───────────────────────────────────────────────

window.triggerSelected = async function() {
  var email = document.getElementById('email-input').value.trim();
  var scenario = document.getElementById('scenario-select').value;
  var box = document.getElementById('trigger-response');

  if (scenario === 'duplicate') {
    await triggerDuplicate(email);
    return;
  }

  box.className = 'trigger-response visible';
  box.textContent = 'Sending...';

  try {
    var res = await fetch(BASE + '/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, scenario: scenario, timestamp: new Date().toISOString() })
    });
    var data = await res.json();
    box.textContent = JSON.stringify(data, null, 2);
    setTimeout(refreshAll, 600);
  } catch (e) {
    box.textContent = 'Error: ' + e.message;
  }
};

async function triggerDuplicate(email) {
  var box = document.getElementById('trigger-response');
  box.className = 'trigger-response visible';
  box.textContent = 'Sending duplicate webhook (same timestamp)...';
  var ts = new Date().toISOString();
  var payload = { email: email, scenario: 'happy', timestamp: ts };
  try {
    var results = await Promise.all([
      fetch(BASE + '/api/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      fetch(BASE + '/api/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    ]);
    var bodies = await Promise.all(results.map(function(r) { return r.json(); }));
    box.textContent = 'Request 1: ' + JSON.stringify(bodies[0]) + '\nRequest 2: ' + JSON.stringify(bodies[1]);
    setTimeout(refreshAll, 600);
  } catch (e) {
    box.textContent = 'Error: ' + e.message;
  }
}

// ── Tabs ──────────────────────────────────────────────────

window.switchTab = function(tab, el) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('tab-runs-content').style.display = tab === 'runs' ? '' : 'none';
  document.getElementById('tab-dlq-content').style.display = tab === 'dlq' ? '' : 'none';
  if (tab === 'runs') loadRuns(); else loadDLQ();
};

// ── Refresh ───────────────────────────────────────────────

async function refreshAll() {
  await Promise.all([
    loadMetrics(),
    loadRuns(),
    loadDLQ()
  ]);
  var el = document.getElementById('last-refreshed');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString();
}

window.refreshAll = refreshAll;

window.toggleAutoRefresh = function() {
  var on = document.getElementById('auto-refresh-chk').checked;
  clearInterval(autoTimer);
  if (on) autoTimer = setInterval(refreshAll, 2000);
};

// ── Helpers ───────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────

refreshAll();
autoTimer = setInterval(refreshAll, 2000);

})();
</script>
</body>
</html>`;
