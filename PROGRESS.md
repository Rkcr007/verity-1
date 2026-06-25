# Verity — Build Progress

> Living tracker for MVP delivery. Update this file as milestones land.
> Roadmap source: `docs/05-development-roadmap.md` · Architecture: `docs/04-system-architecture.md`

**Product:** AI-Native Test Engineering Workspace (Electron desktop)  
**MVP target:** End-to-end authoring → run → commit on Playwright Java (~18 weeks)  
**Last updated:** 2026-06-26

---

## Milestone overview

| Milestone | Name | Status | Target outcome |
|-----------|------|--------|----------------|
| **M0** | Foundation | ✅ Complete | Monorepo, Electron shell, IPC, SQLite, design system, CI |
| M1 | Repository Intelligence | 🔄 In progress | GitHub OAuth + tree-sitter optional |
| **M1.5** | Workspace entry paths | ✅ Complete | Welcome router, scaffold, demo, migrate, resume |
| **M1.6** | Framework intelligence | ✅ Complete | Enterprise catalog, recommendations, auto-setup |
| **M1.7** | Multi-adapter + toolchain | ✅ Complete | Playwright TS scaffold, one-click toolchain, LLM rec, repo signals |
| M2 | Semantic Model | ✅ Complete | Left panel wired; run status in M5 |
| M3 | Playwright Java Adapter | ✅ Complete | Transpile, prerequisites, Maven `run()` |
| M4 | AI Test Studio | ✅ Complete | Prompt → stream → proposal → apply |
| M5 | Execution Engine | ✅ Complete | Run tests, timeline, Executions screen |
| M6 | Git Integration | ✅ Complete | Status, diff, commit modal, push, branch selector |
| M7 | Polish & Error States | ✅ Complete | All S-01..S-12, auto-update, virtual tree, a11y |
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
- [x] Create Project Wizard — 5 steps with **existing / greenfield / migrate** modes (M1.5)
- [x] **Welcome entry router** — resume, start fresh, connect, migrate, demo sandbox (M1.5)
- [x] **Journey previews** — each Welcome card shows step-by-step path (M1.6)
- [x] **Enterprise framework catalog** — Playwright Java/TS, Selenium, Cypress, Python (M1.6)
- [x] **Framework intelligence** — rule-based recommend from app description + mode (M1.6)
- [x] **Greenfield framework picker** — wizard Step 1 stack selection (M1.6)
- [x] **Auto environment setup** — Maven resolve, compile, Playwright browser install (M1.6)
- [x] **Playwright TypeScript adapter** — scaffold, npm install, transpile, prerequisites (M1.7)
- [x] **One-click toolchain** — JDK/Maven (brew/winget) and Node via `toolchain:install-for-adapter` (M7)
- [x] **LLM framework recommendation** — Claude when `ANTHROPIC_API_KEY` set, rules fallback (M4)
- [x] **Repo signal intelligence** — connect/migrate recommendations from detected stack (M1.7)
- [x] **Greenfield scaffold** — Playwright Java Maven + page objects + `.verity/tests/` (M1.5)
- [x] **Folder inspection** — empty / Selenium / Playwright routing + AI suggestion banner (M1.5)
- [x] **Demo workspace** — bundled `demo-shop-e2e` fixture, no company repo required (M1.5)
- [x] **Selenium migration plan** — rule-based incremental path UI (M1.5)
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
- [x] Left panel — Semantic Tests section (status dots, click → read-only AI Studio)

---

## M3 — Playwright Java Adapter (EPIC 3)

- [x] `packages/adapter-playwright-java` — TestAdapter, prerequisites, transpiler
- [x] `AdapterRegistryService` + IPC (`adapter:list`, `adapter:check-prerequisites`)
- [x] Semantic preview/apply wired to real transpiler
- [x] Prerequisite report UI — wizard Step 2 + Settings screen
- [ ] Execution `run()` — stub until M5

---

## M4 — AI Test Studio (EPIC 4)

- [x] Prompt console + quick chips (`AiStudioPanel`)
- [x] Step generation — Claude API + rules fallback (`packages/ai-orchestration`)
- [x] Streaming steps + reasoning trace (IPC events → bottom panel)
- [x] `SemanticStepCard`, code preview toggle
- [x] Proposal review — apply / discard (`semantic:apply-proposal`)
- [x] `semantic:get-proposal` IPC

---

## M5 — Execution Engine (EPIC 5)

- [x] `packages/execution-engine` — Maven subprocess runner
- [x] Playwright Java adapter `run()` via `mvn -Dtest=ClassName test`
- [x] `ExecutionService` + `RunRepository` (SQLite persistence)
- [x] IPC: `execution:run`, `execution:cancel`, `execution:get`, `execution:list`
- [x] Step timeline UI + Execution Logs bottom tab
- [x] Executions screen (list + step detail)
- [x] Failure classification (rule-based post-run)
- [x] Semantic test status from last run (pass/fail/draft)

---

## M6 — Git Integration (EPIC 6)

### Phase 1–2 — Engine + IPC ✅

- [x] `packages/git-engine` — status (porcelain), diff, commit, push, list branches
- [x] Git engine unit tests (temp repo fixture)
- [x] IPC DTOs — `GitChangeDto`, `GitStatusDto`, `DiffLineDto`, commit/push requests
- [x] IPC commands — `git:get-status`, `git:get-diff`, `git:commit`, `git:push`, `git:list-branches`
- [x] `GitService` + handlers wired in desktop container
- [x] `semantic.proposal.applied` → refresh git status + `git.status.changed` event
- [x] `GitOperationError` in `@verity/core`

### Phase 3 — Status UI ✅

- [x] Renderer `git-store` + event bindings
- [x] Left panel Git Changes section
- [x] Toolbar change counter chip + branch pill
- [x] Git Activity bottom tab

### Phase 4 — Commit flow ✅

- [x] `CommitModal` — file list, inline diff, message input, file selection
- [x] Commit & Push wired to IPC (`git:commit` → `git:push`)
- [x] Branch pill in toolbar (read-only)
- [x] Post-apply toast: "Applied — review in Git Changes"

### Phase 5 — Polish ✅

- [x] Branch selector dropdown (E6-S4) + `git:checkout-branch`
- [x] Error state S-06 merge conflict banner (Git Changes + CommitModal)
- [x] Error state S-07 push rejected inline (CommitModal, commit-succeeded-locally path)
- [x] Settings → Git Integration section (author, branch prefix, save)
- [x] Backend E2E: apply → git status → commit → branch create

### Original checklist

- [x] Working tree status + left panel Git Changes
- [x] Diff viewer + CommitModal
- [x] Commit & push (never `--force`)
- [x] `packages/git-engine`

---

## M7 — Polish (EPIC 7)

- [x] Error states S-01, S-02, S-03, S-05, S-10, S-12
- [x] S-04 AI generation error banner in AI Studio
- [x] S-06 merge conflict banner (Git Changes + CommitModal)
- [x] S-07 push rejected inline (CommitModal)
- [x] S-08 Run prerequisite gate — banner + modal + ⌘R/Ctrl+R shortcut
- [x] S-09 empty executions history state
- [x] S-11 AI offline / no API key banner (`OfflineBanner` + `ai:get-capabilities`)
- [x] `electron-updater` — `UpdateService`, IPC `app:*-update`, `UpdateBanner`
- [x] Virtualized file tree (`flattenVisibleFileTree` + windowed render >60 rows)
- [x] A11y — ActivityRail `aria-label`, modals `role="dialog"`, file tree `role="tree"`

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
│   ├── adapter-playwright-java/ # M3 transpiler      ✅
│   ├── git-engine/              # M6 git CLI wrapper   ✅
│   └── repository-intelligence/ # detectors, parsers ✅
├── apps/desktop/src/main/services/
│   ├── repository-connector-service.ts  ✅
│   ├── repository-scanner.ts            ✅ (basic)
│   └── intelligence-service.ts          ✅
├── docs/                 # Architecture docs        ✅
├── design/               # MVP prototype HTML       ✅
└── PROGRESS.md           # This file                ✅
```

**Planned packages (not yet created):** _(none — git-engine added)_
**Added:** `adapter-playwright-typescript`, `toolchain`, `ai-orchestration`, `execution-engine`, `git-engine`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-26 | **M7 complete** — S-01..S-12, electron-updater, virtual file tree, a11y pass |
| 2026-06-26 | **M7 partial** — S-04/08/09 error states, Run prerequisite gate, ⌘R shortcut |
| 2026-06-26 | **M6 complete** — Phase 5 polish, branch selector, S-06/S-07, Settings Git, E2E git flow |
| 2026-06-26 | **M7 partial** — S-11 offline banner, `ai:get-capabilities` IPC |
| 2026-06-26 | **M6 Phase 1–2** — `git-engine` package, IPC `git:*` commands, `GitService`, proposal→status hook |
| 2026-06-24 | **M5** — Execution engine, Maven run, timeline, Executions screen, run persistence |
| 2026-06-24 | **M4** — AI Test Studio: prompt, streaming steps, apply/discard, reasoning panel |
| 2026-06-24 | **M2 E2-S4** — Workspace Repository file tree (IDE explorer), read-only Editor tab, live tree fallback + auto-index |
| 2026-06-24 | **M1.7** — Playwright TS adapter, toolchain install, LLM framework rec, repo-signal intelligence |
| 2026-06-24 | **M1.6** — Enterprise framework catalog, intelligence recommendations, greenfield picker, auto-setup |
| 2026-06-24 | **M1.5** — Welcome entry router, greenfield scaffold, demo sandbox, Selenium migration plan, resume |
| 2026-06-24 | **M2 E2-S3** — Workspace left panel Semantic Tests list, read-only AI Studio |
| 2026-06-24 | **M1 E1-S5** — File watcher + incremental indexer |
| 2026-06-24 | **M1 E1-S2** — `repository-intelligence` package, POM parser, PlaywrightJavaDetector, wizard detection failure UI |
| 2026-06-24 | **M1 started** — RepositoryConnector, intelligence services, Create Project Wizard (local folder path) |
| 2026-06-24 | **IPC catalog complete** — 28 commands, 28 events, stub handlers for unimplemented channels |
| 2026-06-24 | **Lock-ins complete** — `semantic-model` + `adapter-contract` |
| 2026-06-24 | **M0 complete** — primitives, toast, Projects screen, CI, PROGRESS tracker |
