# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Changed
- Restructured from standalone project to Claude Code Plugin
- Runtime, schema, and dashboard moved to `assets/` (copied to projects on init)

### Added
- Plugin manifest (`.claude-plugin/plugin.json`)
- Supaflow Skill (`skills/supaflow/SKILL.md`) — teaches Claude to instrument workflows
- `/supaflow:init` command — project setup + full scan
- `/supaflow:scan` command — on-demand re-scan
- Continuous hook — auto-instruments on file edits
- GitHub marketplace config (`marketplace.json`)

### Removed
- Example workflow (replaced by init scan of real code)
- Project-level deno.json, project.json, supaflow.json (now created per-project by init)
