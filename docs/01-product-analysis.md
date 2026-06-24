# Verity — Product Analysis Report

> **Product:** Verity — AI-Native Test Engineering Workspace
> **Source:** MVP UI Prototype (`Autonomous_Test_Workspace_MVP.dc.html`)
> **Document 1 of 5** — Product Discovery & Implementation Planning

---

## 1. Product Summary

Verity is a **repository-centric AI Test Engineering Workspace** delivered as a desktop application. It operates as an AI-native engineering layer on top of a customer's existing test repository.

**Core principles:**

- The **repository is the center** of the experience.
- Tests are stored in the **customer's repository** — never a proprietary cloud store.
- Generated framework code is **not** the source of truth.
- The **Semantic Test Model is the source of truth**.
- **Playwright Java** is the MVP adapter only; future framework support is mandatory.
- **Local-first** execution. **Git-native** workflow. **Framework-neutral** architecture.

---

## 2. Screen Inventory

| # | Screen | Route | Entry Points | Primary Purpose |
|---|--------|--------|--------------|-----------------|
| 1 | Welcome | `/welcome` | Cold launch | Product introduction, onboarding gate |
| 2 | Create Project Wizard | `/create` | Welcome CTA, Projects "Connect" | Repository connection & analysis |
| 3 | Workspace | `/workspace` | Welcome demo, Projects card click | Primary working environment |
| 4 | Projects | `/projects` | Activity rail | Repository list & switching |
| 5 | Executions | `/executions` | Activity rail, Workspace toolbar | Run history & failure analysis |
| 6 | AI Memory | `/memory` | Activity rail | Repository intelligence inspection |
| 7 | Settings | `/settings` | Activity rail | Adapter, git, execution configuration |

---

## 3. Feature Inventory

### Onboarding & Project Management
- **F-01** Workspace naming
- **F-02** Repository source selection (GitHub, GitLab, Bitbucket, Local)
- **F-03** OAuth-implied repository connection
- **F-04** Automatic framework detection (build tool, test framework, adapter, pattern)
- **F-05** Repository analysis with progress animation
- **F-06** Understanding score computation
- **F-07** Business flow detection
- **F-08** Multi-project management

### Repository Intelligence
- **F-09** File tree rendering with change annotations (A/M markers)
- **F-10** Page object discovery
- **F-11** Locator inventory with confidence scoring
- **F-12** Business flow mapping
- **F-13** Test asset discovery (pages, tests, utils)
- **F-14** Repository understanding score

### AI Test Studio
- **F-15** Natural language test prompt input
- **F-16** Quick prompt suggestions
- **F-17** Semantic step streaming (step-by-step revelation)
- **F-18** Semantic step display (intent, action, context, expected, confidence)
- **F-19** Code view toggle (semantic ↔ generated code)
- **F-20** Proposed change review (file list with A/M type)
- **F-21** Apply / Discard decision gate
- **F-22** AI reasoning trace (bottom panel)
- **F-23** Repository context annotation ("repo-aware · reviews before applying")

### Interactive Browser
- **F-24** Embedded browser simulation (address bar, nav controls)
- **F-25** AI DOM observation indicator
- **F-26** Element highlight overlay (label + bounding box)
- **F-27** Scan animation during AI observation

### Execution Engine
- **F-28** Local test execution trigger (Run button)
- **F-29** Step-by-step execution timeline
- **F-30** Pass/fail/running/queued step states
- **F-31** Execution duration per step
- **F-32** Screenshot capture (simulated)
- **F-33** Network request summary
- **F-34** Console error summary
- **F-35** AI failure classification (app bug vs test defect)

### Git Integration
- **F-36** Git change tracking (working tree status)
- **F-37** File diff viewer (inline +/- display)
- **F-38** Commit message editing
- **F-39** Commit & push action
- **F-40** Branch display and selector
- **F-41** Git activity log (bottom panel)

### Execution History
- **F-42** Run list with status, duration, branch, timestamp
- **F-43** Run detail view with failure summary
- **F-44** AI-generated failure classification per run
- **F-45** Confidence score per run

### AI Memory
- **F-46** Page inventory with understanding percentage
- **F-47** Business flow inventory
- **F-48** Locator inventory with confidence
- **F-49** Repository intelligence summary
- **F-50** "Coming soon" roadmap signals (self-healing, knowledge graph)

### Settings
- **F-51** Framework adapter management (active + coming soon list)
- **F-52** Repository connection settings
- **F-53** Git integration settings (review enforcement note)
- **F-54** AI model configuration display
- **F-55** Execution configuration (browser, headless, workers, evidence)

---

## 4. Workflow Inventory

| # | Workflow | Screens Involved | Trigger |
|---|----------|-----------------|---------|
| W-01 | First-time onboarding | Welcome → Create → Workspace | Cold launch |
| W-02 | Repository connection | Create Wizard (5 steps) | "Connect repo" CTA |
| W-03 | Test authoring (happy path) | Workspace AI Studio → Apply → Git Changes | Prompt submit |
| W-04 | Test execution | Workspace → Execution tab → Results | Run button |
| W-05 | Commit & push | Git Changes panel → Commit Modal | "Review & commit" |
| W-06 | Failure analysis | Executions → Run detail | Run list click |
| W-07 | Project switching | Projects → card click → Workspace | Rail nav |
| W-08 | Repository intelligence review | AI Memory → tabs | Rail nav |
| W-09 | Adapter inspection | Settings → Framework | Rail nav |
| W-10 | Panel layout control | Workspace toolbar toggles | Toggle buttons |

---

## 5. User Journey Inventory

### Journey 1 — New User, First Test
Welcome → Connect repo (GitHub) → Framework detection → Repository analysis → Workspace → Prompt "Create checkout flow test" → Review 6 semantic steps → Apply → Review Git diff → Commit → Run → See failure → Navigate to Executions → Read AI failure classification

### Journey 2 — Returning User, Iterate on Failing Test
Projects → Select project → Workspace → Executions tab → See last failure → Open Workspace → Re-prompt with context → Apply → Run again

### Journey 3 — Technical Lead, Review What AI Knows
AI Memory → Pages tab → Flows tab → Locators tab → Repository Intelligence → Validate understanding score

### Journey 4 — New Repository Onboarding
Projects → "Connect repo" → Wizard → Workspace (different project)

---

## 6. Component Inventory

### Layout
- `AppShell` — root layout, route controller, toast manager
- `ActivityRail` — left 52px navigation
- `Workspace` — three-panel layout (left/center/right + bottom)
- `Section` — collapsible sidebar section with header

### Navigation
- `NavItem` — rail button with active indicator
- `Tab` — horizontal tab strip (center panel, bottom panel)

### Shared / Primitive
- `AdapterBadge` — framework + version pill
- `Pill` — generic colored tag
- `GitMark` — GitHub/GitLab logo switcher
- `V` (SVG Icon) — icon renderer from path data

### Workspace — Left Panel
- `FileTreeRow` — file/folder with depth, add/mod markers
- `SemanticTestRow` — test name, step count, status dot
- `GitChangeRow` — file type, name, A/M marker

### Workspace — Center Panel
- `BrowserView` — simulated browser with AI overlay
- `ElementHighlight` — bounding box + label overlay
- `ExecutionView` — step timeline + screenshot area
- `DebugView` — placeholder with action pills
- `CodeDiffView` — line-numbered code with add highlighting

### Workspace — Right Panel (AI Studio)
- `PromptConsole` — textarea + send button + quick prompts
- `SemanticStepCard` — step number, intent, action/context/expected, confidence
- `CodePreview` — generated code with syntax tokens
- `ProposedChangesPanel` — file list + apply/discard actions

### Workspace — Bottom Panel
- `LogLine` — colored log entry with type prefix

### Modals
- `CommitModal` — file list, diff viewer, message input, commit/push button

### Wizard
- `WizardProgress` — step indicator bar
- `SourceSelector` — 2x2 grid of source options
- `FrameworkDetectionView` — animated detection + result rows
- `AnalysisView` — counting animation, flow detection, score ring

### Screens
- `Welcome` — hero + three pillars + CTAs
- `Projects` — grid of project cards + empty slot
- `Executions` — run list + run detail
- `Memory` — stats grid + tabbed content
- `Settings` — group nav + content area

---

## 7. State Inventory (observed in prototype)

| State Domain | States |
|--------------|--------|
| AI Studio phase | `idle` → `thinking` → `streaming` → `proposed` → `applied` |
| Execution phase | `idle` → `running` → `done` (pass/fail) |
| Semantic test status | `draft`, `pass`, `fail` |
| Git change type | `A` (added), `M` (modified) |
| Commit state | uncommitted → committed & pushed |
| Panel visibility | left / right / bottom toggles |
| Wizard step | `Project` → `Repository` → `Framework` → `Analysis` → `Ready` |
| Run status | `pass`, `fail`, `running` |

---

## 8. Key Observations

1. The prototype consistently expresses the **review-before-apply** gate — AI never silently touches files.
2. The **Semantic Test Model** is implied throughout but not yet persisted anywhere in the prototype (ephemeral UI state).
3. **Framework neutrality** is messaged but not architecturally enforced in the prototype.
4. The **three-panel workspace** (repository / center work surface / AI studio) is the core UX metaphor and is sound.
