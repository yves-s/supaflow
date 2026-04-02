# Supaflow Dashboard — Design Spec

**Datum:** 2026-04-01  
**Status:** Approved  
**Zielgruppe:** LnB Ops-Team (kein Tech-Background)  
**Primärer Anwendungsfall:** Reaktiv — prüfen was mit einer spezifischen Email passiert ist

---

## 1. Architektur

**Stack:** Next.js (App Router) auf Vercel  
**Datenbank:** Bestehendes Supabase-Projekt `mjqnsblgcrnwxvkcocze` — kein neues Schema, keine Migrationen  
**Auth:** Supabase Auth mit Magic Link — kein Passwort, einfach für Ops-Team  
**Realtime:** Supabase Realtime auf `workflow_runs` — bei neuen/geänderten Rows wird die Runs-Liste neu geladen (full refetch, kein granulares Update). Flow-Graph in View 2 pollt `step_states` alle 2s wenn `status = 'running'`, stoppt sobald `completed` oder `failed`.

Das Dashboard liest ausschliesslich diese drei bestehenden Tabellen:

**`workflow_runs`** — verifiziertes Schema:
| Spalte | Typ |
|--------|-----|
| id | uuid PK |
| workflow_name | text |
| trigger_type | text |
| status | text — `pending/running/completed/failed` |
| started_at | timestamptz |
| completed_at | timestamptz nullable |
| error | text nullable |
| trigger_payload | jsonb — enthält `email` key |
| metadata | jsonb |

**`step_states`** — verifiziertes Schema:
| Spalte | Typ |
|--------|-----|
| id | uuid PK |
| run_id | uuid FK → workflow_runs.id |
| step_name | text |
| status | text — `pending/running/completed/failed/skipped` |
| started_at | timestamptz |
| completed_at | timestamptz nullable |
| input | jsonb |
| output | jsonb |
| error | text nullable |
| attempt | integer |

**`dead_letter_queue`** — verifiziertes Schema:
| Spalte | Typ |
|--------|-----|
| id | uuid PK |
| run_id | uuid FK → workflow_runs.id |
| step_name | text |
| error | text |
| input | jsonb |
| attempts | integer |
| created_at | timestamptz |
| resolved_at | timestamptz nullable |
| resolved_by | text nullable |

---

## 2. Step-Namen

**Neue Workflows (zukünftig):** Step-Namen werden aus der natürlichsprachlichen Workflow-Beschreibung abgeleitet. Der Builder-Skill ist dafür verantwortlich, dass `step_name` in `step_states` human-readable ist.

**Bestehende LnB-Workflows:** Der Step `fetch_subscriptions` hat in `step_states.output` ein Array von Objekten mit den Feldern `id` (List-ID als String) und `name` (Klarname der Liste). Das Dashboard mappt List-IDs auf Klarnamen zur Laufzeit:

```typescript
// output shape von fetch_subscriptions:
// [{ id: "4856489", name: "Newsletter So geht Gesundheit", ... }, ...]

// step_name "unsubscribe:4856489" → "Newsletter: So geht Gesundheit abmelden"
function resolveStepName(stepName: string, listMap: Record<string, string>): string {
  const match = stepName.match(/^unsubscribe:(\d+)$/)
  if (match) return `${listMap[match[1]] ?? match[1]} abmelden`
  if (stepName === 'fetch_subscriptions') return 'Subscriptions abrufen'
  return stepName
}
```

Fallback wenn `fetch_subscriptions` fehlt oder fehlgeschlagen: roher `step_name` wird angezeigt.

---

## 3. Views

### View 1: Runs-Liste (Startseite)

**Stats-Row** (4 Kacheln, aus einem Query):
- Erfolgreich (grün) — COUNT where status = 'completed'
- Fehlgeschlagen (rot) — COUNT where status = 'failed'
- Laufend (gelb) — COUNT where status = 'running'
- DLQ offen (orange) — COUNT where resolved_at IS NULL; klickbar → `/dlq`

**Suchfeld:** Email-Suche filtert die Tabelle live. Bei aktivem Suchfilter kein LIMIT — alle Treffer werden angezeigt. Ohne Suchfilter: LIMIT 50, neueste zuerst.

**Tabelle:** Spalten: Email · Workflow · Status-Badge · Gestartet · Dauer  
- Klick auf Zeile → `/runs/[id]`
- Fehlgeschlagene Rows sind rot hinterlegt
- Laufende Rows: Dauer zeigt `now() - started_at` (live)

---

### View 2: Run-Detail (`/runs/[id]`)

**Layout:** Zwei-spaltig — Flow-Graph links, Step-Detail-Sidebar rechts.

**Flow-Graph (React Flow, read-only):**
- Ein Node pro Step, Reihenfolge nach `step_states.started_at ASC`
- Bei identischem `started_at` (Edge Case): alphabetisch nach `step_name` als Tiebreaker
- Sequenzielle Edges (kein Branching in v1)
- Node-Farbe nach Status: grün (completed), rot (failed), gelb (running), grau (pending/skipped)
- Klick auf Node öffnet Details in der Sidebar

**Step-Detail-Sidebar:**
- Step-Name (human-readable via Mapping), Status, Dauer, Anzahl Versuche
- Fehlermeldung (bei failed) — nur `error` Feld, kein Stack-Trace für Ops-User
- Bei DLQ-Steps: Button "In DLQ ansehen" → `/dlq?entry=[dlq_id]`

---

### View 3: Dead Letter Queue (`/dlq`)

**URL-Parameter:** `?entry=[dlq_id]` scrollt und highlightet den spezifischen Eintrag (Deep-Link aus View 2). Falls der Eintrag bereits resolved ist (und damit im Standard-Filter ausgeblendet), wird automatisch auf "Alle anzeigen" umgeschaltet. Falls der Eintrag nicht existiert, wird eine Meldung "Eintrag nicht gefunden" angezeigt.

**Layout:** Liste aller ungelösten DLQ-Einträge, neueste zuerst.

**Pro Eintrag:**
- Email (aus `workflow_runs.trigger_payload->>'email'`), Workflow-Name, Step-Name (human-readable), Fehlermeldung, Timestamp, Anzahl Versuche
- **"Erledigt"-Button** → POST `/api/dlq/[id]/resolve`

**Filter:** Nur ungelöste Einträge (`resolved_at IS NULL`) standardmässig. Toggle für "Alle anzeigen" zeigt auch resolved Einträge (grau, durchgestrichen).

---

## 4. Datenbank-Queries

Alle Queries laufen server-side (Next.js Route Handlers) mit dem Supabase Service Role Key.

**Stats-Row:**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed')    as failed,
  COUNT(*) FILTER (WHERE status = 'running')   as running
FROM workflow_runs;
-- DLQ offen: separater Query
SELECT COUNT(*) FROM dead_letter_queue WHERE resolved_at IS NULL;
```

**Runs-Liste (ohne Filter, max 50):**
```sql
SELECT id, trigger_payload->>'email' as email, workflow_name, status,
       started_at,
       COALESCE(
         EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000,
         EXTRACT(EPOCH FROM (now() - started_at)) * 1000
       )::integer as duration_ms
FROM workflow_runs
ORDER BY started_at DESC
LIMIT 50;
```

**Runs-Liste (mit Email-Filter, kein LIMIT):**
```sql
SELECT id, trigger_payload->>'email' as email, workflow_name, status,
       started_at,
       COALESCE(
         EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000,
         EXTRACT(EPOCH FROM (now() - started_at)) * 1000
       )::integer as duration_ms
FROM workflow_runs
WHERE trigger_payload->>'email' ILIKE '%' || $1 || '%'
ORDER BY started_at DESC;
```

**Run-Detail (Steps):**
```sql
SELECT id, step_name, status, started_at, completed_at, input, output, error, attempt
FROM step_states
WHERE run_id = $1
ORDER BY started_at ASC, step_name ASC;
```

**DLQ:**
```sql
SELECT d.id, d.step_name, d.error, d.input, d.attempts, d.created_at,
       d.resolved_at, d.resolved_by,
       w.trigger_payload->>'email' as email,
       w.workflow_name
FROM dead_letter_queue d
JOIN workflow_runs w ON w.id = d.run_id
WHERE d.resolved_at IS NULL  -- toggle entfernt diese Bedingung
ORDER BY d.created_at DESC;
```

**DLQ resolve (Route Handler POST `/api/dlq/[id]/resolve`):**
```typescript
// Auth user ID kommt aus Supabase session (server-side via cookies)
const { data: { user } } = await supabase.auth.getUser()
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
await supabaseAdmin.from('dead_letter_queue')
  .update({ resolved_at: new Date().toISOString(), resolved_by: user.email })
  .eq('id', params.id)
```
`resolved_by` speichert die Email-Adresse des Auth-Users (lesbarer als UUID für das Ops-Team).

---

## 5. Auth & Deployment

- Supabase Auth: Magic Link (kein Passwort) — User gibt Email ein, klickt Link
- Middleware schützt alle Routes ausser `/auth` — nicht eingeloggte User werden redirected
- Vercel-Deployment via GitHub-Integration (auto-deploy on main)
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- RLS: bestehende Policies bleiben unverändert; Service Role Key nur in Route Handlers (server-side)

---

## 6. Was bewusst nicht in v1

- Retry-Trigger aus dem Dashboard (gehört in die Edge Function)
- Alerting / Notifications
- Zeitraum-Filter (reaktiver Use-Case braucht nur Email-Suche)
- Mobile-Optimierung
- Pagination (LIMIT 50 ohne Filter reicht für Ops-Team)

---

## 7. Offene Entscheidungen (nicht Dashboard-blockierend)

- Vercel-Projekt: neues Projekt oder unter bestehender LnB-Organisation?
- Custom Domain (z.B. `flow.liebscherbracht.de`) — optional, später
