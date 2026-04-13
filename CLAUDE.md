# CLAUDE.md – edge-flow Project Instructions

> Dieses Dokument wird von Claude Code automatisch gelesen.
> Projektspezifische Konfiguration (Stack, Build-Commands, Pfade, Pipeline-Verbindung) liegt in `project.json`.

---

## Projekt

**Supaflow** – Claude Code Plugin for automatic workflow instrumentation on Supabase Edge Functions.

---

## Konventionen

### Git
- **Branches:** `feature/{ticket-id}-{kurzbeschreibung}`, `fix/...`, `chore/...`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Sprache:** Commit Messages auf Englisch

### Code
- **Plugin:** Claude Code Plugin (skills, commands, hooks)
- **Runtime:** Deno + TypeScript (assets/supaflow.ts)
- **Dashboard:** React 18 + Vite + @xyflow/react + dagre (assets/dashboard/)
- **Database:** Supabase Postgres with RLS

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
.claude-plugin/plugin.json         — Plugin manifest
skills/supaflow/SKILL.md           — Instrumentation skill (principles, API, decisions)
commands/supaflow-init.md          — /supaflow:init command
commands/supaflow-scan.md          — /supaflow:scan command
hooks/hooks.json                   — Continuous PostToolUse hook
assets/supaflow.ts                 — Runtime (copied to projects on init)
assets/supaflow_schema.sql         — Schema (copied to projects on init)
assets/dashboard/                  — Dashboard app (copied to projects on init)
assets/tests/                      — Runtime tests
marketplace.json                   — GitHub marketplace config
```

**Commands:** `claude --plugin-dir .` (development), `/plugin validate` (check manifest)

---

## Sicherheit

- Keine API Keys, Tokens oder Secrets im Code
- Input Validation auf allen Endpoints

---

## Konversationelle Trigger

**"passt"**, **"done"**, **"fertig"**, **"klappt"**, **"sieht gut aus"** → automatisch `/ship` ausführen

**Wichtig:** `/ship` läuft **vollständig autonom** — keine Rückfragen bei Commit, Push, PR oder Merge. Der User hat seine Freigabe bereits gegeben.
