# Verity — Build Progress

> Living tracker for MVP delivery. Update this file as milestones land.
> Roadmap source: `docs/05-development-roadmap.md` · Architecture: `docs/04-system-architecture.md`

**Product:** AI-Native Test Engineering Workspace (Electron desktop)  
**MVP target:** End-to-end authoring → run → commit on Playwright Java (~18 weeks)  
**Last updated:** 2026-06-24

---

## Milestone overview

| Milestone | Name | Status | Target outcome |
|-----------|------|--------|----------------|
| **M0** | Foundation | ✅ Complete | Monorepo, Electron shell, IPC, SQLite, design system, CI |
| M1 | Repository Intelligence | 🔄 In progress | GitHub OAuth + tree-sitter optional |
| M2 | Semantic Model | ⏳ Pending | `.verity/tests/*.yaml`, left-panel tests |
| M3 | Playwright Java Adapter | ⏳ Pending | Transpile, prerequisites, adapter registry |
| M4 | AI Test Studio | ⏳ Pending | Prompt → stream → apply |
| M5 | Execution Engine | ⏳ Pending | Run tests, timeline, Executions screen |
| M6 | Git Integration | ⏳ Pending | Status, diff, commit modal, push |
| M7 | Polish & Error States | ⏳ Pending | Offline, prerequisites, auto-update |
| **MVP** | Closed beta | ⏳ Pending | Full happy path shipped |

---

## M0 — Foundation (EPIC 0)

### Done

- [x] pnpm workspace + Turborepo (`pnpm-workspace.yaml`, `turbo.json`)
- [x] `apps/desktop` — Electron main, preload, IPC router, event bus, security posture
- [x] `apps/renderer` — Vite + React + TypeScript shell
- [x] `packages/core` — domain models, IDs, Result, VerityError, IPC CommandMap (seed)
- [x] `packages/local-persistence` — SQLite schema (projects, runs, index_cache, …)
- [x] `ProjectService` — create, list, get, open, settings
- [x] IPC handlers: `app:ping`, `project:*`, `settings:*`
- [x] Design tokens (`apps/renderer/src/theme/tokens.css`)
- [x] `AppShell`, `ActivityRail`, `WelcomeScreen`, `WorkspaceScreen` (skeleton)
- [x] `project-store`, `router-store`, typed IPC client
- [x] AD-002 ESLint rule — no framework SDKs outside `packages/adapter-*`
- [x] UI primitives — `Pill`, `Section`, `AdapterBadge`, `GitMark`
- [x] Toast manager — `toast-store` + `ToastHost`
- [x] **Projects screen** — list/open projects from SQLite via IPC
- [x] GitHub Actions CI — typecheck, lint, build, framework-import guard
- [x] `project-store.createProject` for wizard handoff (M1)
- [x] Service container `exactOptionalPropertyTypes` fix

### Remaining (optional M0 polish — defer to M7 if not needed)

- [ ] Search filter on Projects screen (M1)
- [ ] Empty-state illustration when zero projects

---

## Sprint-1 lock-ins (before M2/M3)

| Artifact | Status | Location |
|----------|--------|----------|
| Semantic YAML schema v1 | ✅ Done | `packages/semantic-model` |
| `TestAdapter` contract | ✅ Done | `packages/adapter-contract` |
| IPC catalog (repository, intelligence, semantic) | ✅ Done | `packages/core/src/ipc` |

---

## M1 — Repository Intelligence (EPIC 1)

- [x] `RepositoryConnectorService` — local folder picker, connect/open, persist repo on project
- [ ] GitHub OAuth (PKCE) — stub only (`repository:oauth-start` returns not-implemented)
- [x] Create Project Wizard — 5 steps (Name → Source → Framework → Analysis → Ready)
- [x] Framework detection — `pom.xml` parser, `PlaywrightJavaDetector` (`packages/repository-intelligence`)
- [x] Structural scan — file tree, Java locator extraction, index cache in SQLite
- [x] AI enrichment + understanding score — rule-based enricher + score calculator
- [x] File watcher + incremental indexer — `RepositoryWatcherService`, `applyIncrementalChanges`, `repository.file.changed` / `repository.index.updated` events
- [x] AI Memory screen (pages, flows, locators tabs)
- [ ] `packages/repository-intelligence` — tree-sitter upgrade (regex scan done)

## M2 — Semantic Model (EPIC 2)

- [x] Zod schema v1, reader, writer, migrator (`packages/semantic-model`)
- [x] Path: `.verity/tests/{slug}.yaml`
- [x] `SemanticModelService` + IPC (`semantic:*` wired)
- [ ] Left panel — Semantic Tests section

---

## M3 — Playwright Java Adapter (EPIC 3)

- [ ] `packages/adapter-playwright-java`
- [ ] Prerequisites checker (JDK, Maven, browsers)
- [ ] Transpiler — semantic step → Java
- [ ] `AdapterRegistry` + Settings framework UI

---

## M4 — AI Test Studio (EPIC 4)

- [ ] Prompt console + quick chips
- [ ] Streaming step generation (Claude API)
- [ ] `SemanticStepCard`, code preview toggle
- [ ] Proposal review — apply / discard
- [ ] AI reasoning trace (bottom panel)
- [ ] `packages/ai-orchestration`

---

## M5 — Execution Engine (EPIC 5)

- [ ] Maven subprocess manager
- [ ] Step timeline UI + evidence capture
- [ ] Executions screen (list + detail)
- [ ] Failure classification
- [ ] `packages/execution-engine`

---

## M6 — Git Integration (EPIC 6)

- [ ] Working tree status + left panel Git Changes
- [ ] Diff viewer + CommitModal
- [ ] Commit & push (never `--force`)
- [ ] `packages/git-engine`

---

## M7 — Polish (EPIC 7)

- [ ] Error states S-01 … S-12
- [ ] Offline / no API key banner
- [ ] Full prerequisite checker
- [ ] `electron-updater`
- [ ] Perf (virtualized file tree) + a11y pass

---

## MVP scope gate

### Ships in MVP

- Single-user, single active workspace
- Playwright Java adapter only
- GitHub + local folder sources
- AI-generated semantic tests (review-gated)
- Local execution + git commit/push
- Repository intelligence (pages, flows, locators)

### Explicitly deferred

- GitLab / Bitbucket OAuth
- Additional adapters
- Manual semantic step editing
- CI/CD integration
- Self-healing locators, knowledge graph
- Team / multi-user features

---

## Repo map (current)

```
verity/
├── apps/
│   ├── desktop/          # Electron main + preload  ✅
│   └── renderer/         # React UI                 ✅ (Create wizard)
├── packages/
│   ├── core/             # Shared kernel            ✅
│   ├── local-persistence/# SQLite                   ✅
│   ├── semantic-model/   # YAML v1 schema R/W       ✅
│   ├── adapter-contract/ # TestAdapter ACL          ✅
│   └── repository-intelligence/ # detectors, parsers ✅
├── apps/desktop/src/main/services/
│   ├── repository-connector-service.ts  ✅
│   ├── repository-scanner.ts            ✅ (basic)
│   └── intelligence-service.ts          ✅
├── docs/                 # Architecture docs        ✅
├── design/               # MVP prototype HTML       ✅
└── PROGRESS.md           # This file                ✅
```

**Planned packages (not yet created):** `adapter-playwright-java`, `execution-engine`, `git-engine`, `ai-orchestration`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-24 | **M1 E1-S4 + E1-S6** — index enrichment, wizard flows from scan, AI Memory screen |
| 2026-06-24 | **M1 E1-S2** — `repository-intelligence` package, POM parser, PlaywrightJavaDetector, wizard detection failure UI |
| 2026-06-24 | **M1 started** — RepositoryConnector, intelligence services, Create Project Wizard (local folder path) |
| 2026-06-24 | **IPC catalog complete** — 28 commands, 28 events, stub handlers for unimplemented channels |
| 2026-06-24 | **Lock-ins complete** — `semantic-model` + `adapter-contract` |
| 2026-06-24 | **M0 complete** — primitives, toast, Projects screen, CI, PROGRESS tracker |
