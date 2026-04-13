# CLAUDE.md – edge-flow Project Instructions

> Dieses Dokument wird von Claude Code automatisch gelesen.
> Projektspezifische Konfiguration (Stack, Build-Commands, Pfade, Pipeline-Verbindung) liegt in `project.json`.

---

## Projekt

**Supaflow** – TypeScript workflow runtime with retries, idempotency, DLQ, and React Flow observability dashboard. Built on Supabase Edge Functions.

---

## Konventionen

### Git
- **Branches:** `feature/{ticket-id}-{kurzbeschreibung}`, `fix/...`, `chore/...`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Sprache:** Commit Messages auf Englisch

### Code
- **Runtime:** Deno + TypeScript (supabase/functions/)
- **Dashboard:** React 18 + Vite + @xyflow/react + dagre (dashboard/)
- **Database:** Supabase Postgres with RLS
- **Config:** supaflow.json (project root)

### Dateien
- Keine Dateien löschen ohne explizite Anweisung

---

## Autonomer Modus

Dieses Repo nutzt ein Multi-Agent-System. Ob lokal oder auf dem Server:

1. **Arbeite autonom** — keine interaktiven Fragen, keine manuellen Bestätigungen
2. **Plane selbst** — kein Planner-Agent, keine Spec-Datei. Lies betroffene Dateien direkt und gib Agents konkrete Instruktionen
3. **Wenn unklar:** Konservative Lösung wählen, nicht raten
4. **Commit + PR** am Ende des Workflows → Board-Status "in_review"
5. **Merge erst nach Freigabe** — User sagt "passt"/"ship it" oder `/ship`

## Ticket-Workflow (Just Ship Board)

> Nur aktiv wenn `pipeline.api_url` und `pipeline.api_key` in `project.json` gesetzt sind. Ohne Pipeline-Config werden diese Schritte übersprungen.

Falls Pipeline konfiguriert ist, sind Status-Updates **PFLICHT**:

| Workflow-Schritt | Board-Status | Wann |
|---|---|---|
| `/ticket` — Ticket schreiben | — | Erstellt ein neues Ticket im Board |
| `/develop` — Ticket implementieren | **`in_progress`** | Sofort nach Ticket-Auswahl, VOR dem Coding |
| `/ship` — PR mergen & abschließen | **`done`** | Nach erfolgreichem Merge |

Status-Updates via Board API (curl):
```bash
curl -s -X PATCH -H "X-Pipeline-Key: {pipeline.api_key}" \
  -H "Content-Type: application/json" \
  -d '{"status": "{status}"}' \
  "{pipeline.api_url}/api/tickets/{N}"
```

**Backward Compatibility:** Falls nur `pipeline.project_id` gesetzt ist (ohne `api_url`/`api_key`), wird `mcp__claude_ai_Supabase__execute_sql` als Fallback verwendet. Fuehre `/setup-pipeline` aus um auf Board API zu upgraden.

**Überspringe KEINEN dieser Schritte.** Falls ein Update fehlschlägt, versuche es erneut oder informiere den User.

---

## Architektur

```
supabase/functions/_shared/supaflow.ts  — Runtime (serve, step, idempotency, retries, DLQ)
supabase/functions/example-workflow/    — Example workflow using the API
supabase/functions/tests/               — Deno tests
supabase/migrations/                    — Postgres schema (4 tables)
dashboard/                              — React Flow observability UI (Vite)
supaflow.json                           — Config (Supabase URL, anon key, port)
```

**Commands:** `deno task example` (run workflow), `deno task test` (tests), `cd dashboard && npm run dev` (dashboard)

---

## Sicherheit

- Keine API Keys, Tokens oder Secrets im Code
- Input Validation auf allen Endpoints

---

## Konversationelle Trigger

**"passt"**, **"done"**, **"fertig"**, **"klappt"**, **"sieht gut aus"** → automatisch `/ship` ausführen

**Wichtig:** `/ship` läuft **vollständig autonom** — keine Rückfragen bei Commit, Push, PR oder Merge. Der User hat seine Freigabe bereits gegeben.
