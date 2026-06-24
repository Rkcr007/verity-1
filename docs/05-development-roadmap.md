# Verity — Development Roadmap & Implementation Plan

> **Document 5 of 5** — Epics, Stories, Tasks, Milestones
> Build priority: Desktop Shell → Repository Intelligence → Semantic Model → Framework Adapter → AI Test Studio → Execution Engine → Git Integration

---

## 1. Milestones

| Milestone | Name | Duration | Outcome |
|-----------|------|----------|---------|
| M0 | Foundation | 2 weeks | Monorepo scaffold, Electron shell, IPC bridge, SQLite, CI |
| M1 | Repository Intelligence | 3 weeks | Connect repo, detect framework, analyze, file tree, AI memory |
| M2 | Semantic Model | 2 weeks | YAML format, read/write, validation, left panel tests section |
| M3 | Playwright Java Adapter | 2 weeks | Transpile semantic → Java, prerequisite checker |
| M4 | AI Test Studio | 3 weeks | Prompt → stream → steps → proposal → apply |
| M5 | Execution Engine | 2 weeks | Run test, stream events, step timeline, evidence capture |
| M6 | Git Integration | 2 weeks | Status, diff, commit modal, push |
| M7 | Polish & Error States | 2 weeks | All missing states, offline, update mechanism |
| **MVP** | **Ship (closed beta)** | — | **End-to-end authoring → run → commit on Playwright Java** |

**Total: ~18 weeks to closed beta.**

---

## 2. Milestone Dependencies

```
M0 Foundation ─────────────────────────────────────┐
                                                    ▼
M1 Repository Intelligence ────────────────────────┐
                                                    ▼
M2 Semantic Model ◄──── M1 ───────────────────────┐
                                                    ▼
M3 Playwright Java Adapter ◄──── M2 ──────────────┐
                                                    ▼
M4 AI Test Studio ◄──── M1 + M2 + M3 ─────────────┐
                                                    ▼
M5 Execution Engine ◄──── M3 + M4 ────────────────┐
                                                    ▼
M6 Git Integration ◄──── M4 + M5 ─────────────────┐
                                                    ▼
M7 Polish ◄──── ALL ──────────────────────────────┘
                                                    ▼
                                                [ MVP ]
```

---

## 3. Epics, Stories, Tasks

### EPIC 0 — Foundation (M0)

```
E0-S1: Monorepo scaffold
  T1 Init pnpm workspace + turbo.json
  T2 Create apps/desktop (Electron), apps/renderer (Vite+React+TS)
  T3 Create packages/core with base domain models
  T4 Shared tsconfig base
  T5 ESLint + Prettier + import-boundary rules (enforce AD-002)
  T6 GitHub Actions CI (typecheck, lint, build, framework-import guard)

E0-S2: Electron shell + IPC bridge
  T1 Main process bootstrap + window creation
  T2 Preload contextBridge (typed, minimal surface)
  T3 IPC command router pattern + Result discriminated union
  T4 Domain event bus + IPC forwarder
  T5 Security hardening (contextIsolation, sandbox, CSP)

E0-S3: Local persistence
  T1 SQLite via Drizzle + migration system
  T2 Schema: projects, runs, run_steps, index_cache, evidence_refs, api_usage
  T3 ProjectRepository CRUD

E0-S4: Design system
  T1 Port CSS custom properties / tokens from prototype
  T2 Primitive components (Pill, AdapterBadge, Icon, Section)
  T3 Layout shell (AppShell, ActivityRail)
  T4 Routing + toast manager
```

### EPIC 1 — Repository Intelligence (M1)

```
E1-S1: Repository source connection
  T1 Local folder picker (Electron dialog)
  T2 GitHub OAuth (PKCE) flow
  T3 GitLab OAuth flow
  T4 Open/read existing local clone
  T5 Persist Repository to SQLite

E1-S2: Framework detection
  T1 pom.xml parser → Maven, JUnit, adapter version
  T2 package.json parser (future TS adapters)
  T3 build.gradle parser stub
  T4 AdapterDetector interface + PlaywrightJavaDetector
  T5 Wizard Step 2 — detection UI with animation + states

E1-S3: Repository structural scan
  T1 File tree walker (.gitignore aware)
  T2 tree-sitter Java parser (page objects, locators)
  T3 Locator extractor (getByRole/getByPlaceholder/@FindBy/locator())
  T4 Page object → Page mapping
  T5 Test method discovery
  T6 Run AST in worker thread pool

E1-S4: AI-assisted enrichment
  T1 Context assembly from structural index
  T2 AI: semantic page descriptions
  T3 AI: business flow detection
  T4 UnderstandingScoreCalculator
  T5 Wizard Step 3 — analysis UI (counting, flows, score ring)

E1-S5: File watcher + incremental index
  T1 fs watcher integration
  T2 IncrementalIndexer (re-parse changed file, merge delta)
  T3 Emit repository.index.updated

E1-S6: AI Memory screen
  T1 Stats grid (pages, components, flows, locators)
  T2 Pages tab (understanding % per page)
  T3 Flows tab
  T4 Locators tab (confidence)
  T5 Repository Intelligence tab
```

### EPIC 2 — Semantic Model (M2)

```
E2-S1: YAML format
  T1 Zod schema v1
  T2 Reader with validation + SchemaMigrator
  T3 Deterministic writer (stable ordering, comment-preserving)
  T4 Path convention: .verity/tests/{slug}.yaml

E2-S2: Semantic model service
  T1 List tests (scan .verity/tests/)
  T2 Get test by id
  T3 Write test (create/update)
  T4 Delete test (confirmation)
  T5 Validate (required fields, locator refs)

E2-S3: Left panel — Semantic Tests section
  T1 List with status dots
  T2 Status derivation from last run
  T3 Click → open in AI Studio (read-only MVP)
```

### EPIC 3 — Playwright Java Adapter (M3)

```
E3-S1: Adapter contract impl
  T1 Implement TestAdapter for playwright-java
  T2 Prerequisite checker (JDK 17+, Maven 3.8+, Playwright browsers)
  T3 Prerequisite report UI in wizard

E3-S2: Transpiler
  T1 SemanticStep → Playwright Java method body
  T2 Full test class generation (package, imports, @Test)
  T3 Page object modification (append missing locators only)
  T4 Write to working tree at correct package path
  T5 Transpiler snapshot tests per step type

E3-S3: Adapter registry
  T1 Registry singleton + active resolution
  T2 detectBest() across adapters
  T3 Settings → Framework Adapter screen
```

### EPIC 4 — AI Test Studio (M4)

```
E4-S1: Prompt console
  T1 Textarea (Enter submit, Shift+Enter newline)
  T2 Quick prompt chips
  T3 Busy/idle styling
  T4 Session-scoped prompt history

E4-S2: Step generation (streaming)
  T1 ContextAssembler + local embeddings
  T2 IntentClassifier pre-pass
  T3 StepGenerator stream parsing (delimiter protocol)
  T4 SemanticStep reveal animation
  T5 LocatorResolver (exact → fuzzy → invented flag)
  T6 ConfidenceScorer (step + proposal)

E4-S3: Step display
  T1 SemanticStepCard (intent/action/context/expected/confidence)
  T2 Code view toggle (live transpile preview)
  T3 Confidence threshold warnings

E4-S4: Proposal review + apply
  T1 ProposedChangesPanel (file list + apply/discard)
  T2 ProposalApplier: atomic write YAML + code
  T3 Discard clears state
  T4 Apply → git status refresh + left panel update

E4-S5: AI Reasoning trace
  T1 ReasoningTracer stream
  T2 Bottom panel Reasoning tab
  T3 Clear on new prompt
```

### EPIC 5 — Execution Engine (M5)

```
E5-S1: Process manager
  T1 Spawn Maven subprocess
  T2 stdout/stderr streaming via IPC
  T3 Kill/cancel (SIGTERM→SIGKILL)

E5-S2: Event parsing
  T1 Parse Playwright/JUnit output → ExecutionEvents
  T2 Map test steps → semantic step ids
  T3 Per-step duration

E5-S3: Evidence capture
  T1 Screenshot on pass/fail (Playwright tracing)
  T2 HAR capture
  T3 Console log capture
  T4 Store files locally, refs in DB

E5-S4: Execution UI
  T1 Step timeline (icons, duration, spinner)
  T2 Screenshot display
  T3 Network summary
  T4 Execution Logs bottom tab

E5-S5: Run persistence + classification
  T1 Persist ExecutionRun + steps
  T2 Executions screen list from DB
  T3 Run detail view
  T4 FailureClassifier call post-run

E5-S6: Debug mode (stub)
  T1 Debug tab placeholder
  T2 Architecture stub for step-through debugger
```

### EPIC 6 — Git Integration (M6)

```
E6-S1: Git status
  T1 git status porcelain parsing
  T2 Left panel Git Changes (A/M markers)
  T3 Toolbar change counter
  T4 Git Activity bottom tab

E6-S2: Diff viewer
  T1 git diff → DiffHunk[]
  T2 CommitModal file list
  T3 Inline diff renderer (+/-)
  T4 AI change summary per file

E6-S3: Commit & push
  T1 Commit message input
  T2 Stage selected files only
  T3 git commit
  T4 git push (current upstream, never --force)
  T5 Push failure states (remote ahead, auth)
  T6 Committed state in left panel

E6-S4: Branch management
  T1 Branch display in toolbar
  T2 Branch selector dropdown
  T3 Sync/fetch indicator
```

### EPIC 7 — Polish & Error States (M7)

```
E7-S1: Missing error states (S-01..S-12)
  T1 Auth error in wizard
  T2 Framework not detected
  T3 Low understanding score warning
  T4 AI offline banner
  T5 Test runner missing (prerequisite failure)
  T6 Merge conflict in git changes
  T7 Push rejected state

E7-S2: Prerequisite checker (full)
  T1 Pre-run environment check
  T2 One-step guidance per missing requirement

E7-S3: Auto-update
  T1 electron-updater integration
  T2 Update-available banner
  T3 Download + restart flow

E7-S4: Performance
  T1 Index load < 3s for 500-file repos
  T2 Time-to-first-step < 2s
  T3 File tree virtualization

E7-S5: Accessibility
  T1 Run keyboard shortcut (Cmd/Ctrl+R)
  T2 Modal focus management
  T3 ARIA labels on icon buttons
```

---

## 4. MVP Scope Gate

### Ships in MVP
- Single-user, single active workspace
- Playwright Java adapter only
- GitHub + local folder sources
- AI-generated semantic tests (review-gated)
- Local test execution
- Git commit & push
- AI failure classification
- Repository intelligence (pages, flows, locators)

### Deferred (post-MVP)
- GitLab / Bitbucket OAuth
- Additional adapters (Selenium Java, Playwright TS, Selenium Python, Cypress)
- Semantic step manual editing
- CI/CD integration (webhook trigger, pipeline badge)
- Self-healing locators
- Coverage heatmap
- Knowledge graph visualization
- Team / multi-user features
- Evidence viewer (step-level replay)
- Debug step-through mode

---

## 5. Critical Path & First-Sprint Lock-ins

Before sprint 1, three artifacts must be finalized (they gate everything downstream):

1. **Semantic Model YAML schema v1** (Doc 4 §8) — everything derives from it.
2. **Adapter contract interface** (Doc 4 §9) — enforces neutrality structurally.
3. **IPC channel catalog** (Doc 4 §6, §10.3) — the spine of the desktop app.

**Recommended team shape for MVP:** 1 architect/lead, 2 full-stack (desktop+services), 1 frontend (renderer/UX), 1 AI/ML engineer (orchestration), part-time DevOps (CI, packaging, signing).

---

## 6. Risk-Burndown Sequencing

| Sprint window | De-risks |
|---------------|----------|
| M0–M1 | R-04 (intelligence accuracy via AST-first), R-06 (Electron security) |
| M2–M3 | R-01 (semantic format lock-in), AD-002 proof (adapter isolation) |
| M4 | R-02 (AI quality via confidence gating + mandatory review) |
| M5 | R-03 (execution environment via prerequisite checker) |
| M6 | R-05 (git safety via read-only-until-commit) |
| M7 | Remaining states, offline, update, perf |
