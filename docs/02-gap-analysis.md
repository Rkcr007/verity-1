# Verity — Gap Analysis Report

> **Document 2 of 5** — Comparison of MVP UI Prototype against Product Vision
> Identifies what the prototype implies but does not yet specify, and the risks that follow.

---

## 1. Missing Workflows

| # | Missing Workflow | Risk Level | Notes |
|---|-----------------|------------|-------|
| G-01 | **Semantic model persistence** — no indication of how semantic tests are stored (YAML in repo? local DB?) | Critical | The prototype treats semantic tests as ephemeral UI state |
| G-02 | **Semantic test editing** — no manual edit of a step once generated | High | Only AI can author; users must re-prompt to modify |
| G-03 | **OAuth authentication** — "GitHub OAuth connected" shown but no auth flow | High | Required before any repo connection |
| G-04 | **Repo conflict / staleness handling** — what happens when the repo changes while workspace is open | High | No sync/conflict UX exists |
| G-05 | **Test selection before run** — no ability to run a single test or a subset | High | Only "Run [test name]" hardcoded |
| G-06 | **Adapter-level configuration** — browser choice, viewport, environment variables | Medium | Settings shows execution config but no depth |
| G-07 | **Test parametrization / data tables** — data-driven test support entirely absent | Medium | |
| G-08 | **CI/CD pipeline integration** — no trigger, webhook, or badge | Medium | Desktop-first, but teams need CI evidence |
| G-09 | **Team / multi-user awareness** — no shared state, no "authored by" attribution | Medium | |
| G-10 | **Application error vs test defect drill-down** — failure classification shown but not interactive | Medium | Only Executions view shows classification |
| G-11 | **Semantic test versioning** — test history / rollback | Low | Git handles file history but semantic model has no version UI |

---

## 2. Missing States

| # | Missing State | Where |
|---|--------------|-------|
| S-01 | Auth error / disconnected repo | Create Wizard Step 1 |
| S-02 | Framework not detected / ambiguous | Wizard Step 2 |
| S-03 | Low understanding score (< 60%) | Wizard Step 3, Memory |
| S-04 | AI generation error / timeout | AI Studio |
| S-05 | No tests found in repository | Workspace left panel |
| S-06 | Merge conflict in working tree | Git Changes panel |
| S-07 | Push rejected (remote ahead) | Commit Modal |
| S-08 | Test runner not installed (Maven/JDK missing) | Run button |
| S-09 | Empty executions history | Executions screen |
| S-10 | Repository re-indexing in progress | Memory, Workspace |
| S-11 | AI service unavailable (offline) | AI Studio |
| S-12 | Semantic step with zero-confidence locator | Semantic Step Card |

---

## 3. Missing Components

| # | Missing Component | Impact |
|---|------------------|--------|
| C-01 | **Semantic Test Editor** — inline step editing without re-prompting | High |
| C-02 | **Evidence Viewer** — screenshot, HAR, console replay per step | High |
| C-03 | **Locator Inspector** — click element in browser → resolve locator → insert into step | High |
| C-04 | **Branch Selector / Creator** — UI to create a Verity branch per test | Medium |
| C-05 | **Update Banner** — desktop app update notification | Medium |
| C-06 | **Notification Center** — background run completions, index events | Medium |
| C-07 | **Run Configuration Panel** — test filter, browser, env var overrides before Run | Medium |
| C-08 | **Diff Expansion** — click file in diff to see full file, not just changed lines | Medium |
| C-09 | **AI Prompt History** — recall prior prompts per project | Low |
| C-10 | **Coverage Heatmap** — which pages/flows have tests, which don't | Low |

---

## 4. Missing Architecture Requirements

| # | Requirement | Notes |
|---|------------|-------|
| A-01 | **Semantic Model file format** — must be defined before code gen. Proposal: `.verity/tests/*.yaml` committed in repo | Critical |
| A-02 | **Adapter contract** — formal interface all adapters must implement (translate semantic model → code) | Critical |
| A-03 | **IPC protocol** — renderer ↔ main process communication for file I/O, git, execution | Critical |
| A-04 | **Repository watcher** — file system events to detect external repo changes | High |
| A-05 | **Local persistence layer** — project registry, run history, index cache (SQLite or similar) | High |
| A-06 | **AI service boundary** — local model vs cloud API, auth, rate limiting, offline fallback | High |
| A-07 | **Execution process isolation** — Maven/Playwright runs in subprocess with stdout/stderr streaming | High |
| A-08 | **Evidence storage** — screenshots, HAR files per run, local only, retention policy | Medium |
| A-09 | **Auto-update mechanism** — Electron updater with staged rollout | Medium |
| A-10 | **Multi-window support** — one workspace per open project, or single window with project switching | Medium |

---

## 5. MVP Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R-01 | **Semantic Model format lock-in** — wrong format choice will make migration painful | Critical | Define format before sprint 1; design for extensibility (versioned schema) |
| R-02 | **AI generation quality** — low-confidence steps or wrong page object usage breaks trust | Critical | Require 85%+ confidence threshold; human review is mandatory |
| R-03 | **Playwright Java execution environment** — JDK, Maven, browser binary not on user machine | High | Prerequisite checker in wizard; bundled browser via Playwright |
| R-04 | **Repository intelligence accuracy** — poor page object parsing produces wrong locators | High | Start with structural AST analysis, not LLM guessing |
| R-05 | **Git integration safety** — accidental force push or data loss | High | Read-only until explicit user commit action; no destructive ops |
| R-06 | **Electron security surface** — broad Node access in renderer is a risk | Medium | contextIsolation on, nodeIntegration off, strict preload bridge |

---

## 6. Gap Closure Priorities

The following must be resolved **before sprint 1**:

1. **A-01 Semantic Model format** — everything derives from it.
2. **A-02 Adapter contract** — enforces framework neutrality structurally.
3. **A-03 IPC protocol** — the spine of the desktop app.
4. **R-01 / R-02** — trust-critical risks tied to the above.

The following are **MVP-blocking but can be designed in parallel**:

- G-01 persistence, G-03 OAuth, A-04 watcher, A-05 SQLite, A-07 subprocess isolation.

The following are explicitly **deferred post-MVP**:

- G-07 data-driven tests, G-08 CI/CD, G-09 teams, C-10 coverage heatmap, F-50 self-healing locators.
