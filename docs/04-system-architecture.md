# Verity — System Architecture Document

> **Document 4 of 5** — Version 1.0 · Founding Architecture · Electron MVP
> Produced to be validated before implementation. No implementation code.

---

## Locked Architectural Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| AD-001 | Semantic Test Model is the platform source of truth. Generated framework code is a deterministic **projection**. | Decouples the platform from all test frameworks permanently |
| AD-002 | The core platform has **zero** direct dependencies on any test framework. All framework interaction is behind an adapter interface. | Framework neutrality is a structural constraint, not a convention |
| AD-003 | Desktop shell is **Electron** for MVP. | Development velocity, ecosystem depth, hiring, Cursor/VS Code precedent. Revisit Tauri post-MVP. |

These decisions are load-bearing. No future PR may violate them.

**Future adapters that must be supported with zero core changes:** Selenium Java, Playwright TypeScript, Selenium Python, Cypress.

---

## Table of Contents

1. High-Level Design (HLD)
2. Low-Level Design (LLD)
3. Domain-Driven Design (DDD)
4. Bounded Contexts
5. Monorepo Structure
6. Event Architecture
7. Repository Intelligence Design
8. Semantic Model Design
9. Adapter Architecture
10. Desktop Architecture
11. Execution Engine Architecture
12. Git Engine Architecture
13. AI Orchestration Architecture

---

# SECTION 1 — High-Level Design

## 1.1 System Overview

Verity is a desktop application that operates as an AI-native engineering layer on top of a customer's existing test repository. It does not host tests. It does not own execution infrastructure. It understands the customer's repository deeply and uses that understanding to author, run, and evolve test suites — producing real files that commit to the customer's own version control.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERITY DESKTOP APPLICATION (Electron)                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      RENDERER PROCESS                                │    │
│  │                   React · TypeScript · Vite                          │    │
│  │   Welcome  Workspace  Projects  Executions  Memory  Settings        │    │
│  │   AI Test Studio · Browser View · Execution Timeline · Git Panel    │    │
│  └───────────────────────────┬───────────────────────────────────────────┘    │
│                               │  contextBridge (IPC, contextIsolation on)     │
│  ┌───────────────────────────┴───────────────────────────────────────────┐    │
│  │                        MAIN PROCESS  (Node.js · TypeScript)            │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ IPC Command  │  │ Domain Event │  │   Service Container       │   │    │
│  │  │ Router       │  │ Bus          │  │   (manual DI wiring)      │   │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘   │    │
│  │  ┌──────┴──────────────────┴──────────────────────────────────────┐  │    │
│  │  │                    DOMAIN SERVICES                               │  │    │
│  │  │  Project · Repository Intelligence · Semantic Model              │  │    │
│  │  │  Adapter Registry (→ Playwright Java Adapter)                    │  │    │
│  │  │  AI Orchestration · Execution Engine · Git Engine · FileSystem   │  │    │
│  │  └──────────────────────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │    │
│  │  │       LOCAL PERSISTENCE (SQLite via Drizzle)                      │  │    │
│  │  │  projects · runs · run_steps · index_cache · evidence_refs       │  │    │
│  │  └──────────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                          │                         │
         ▼                          ▼                         ▼
┌─────────────────┐    ┌───────────────────────┐    ┌──────────────────┐
│  CUSTOMER REPO  │    │  AI MODEL API          │    │  OAUTH PROVIDER  │
│  (local clone)  │    │  (Anthropic Claude)    │    │  GitHub / GitLab │
│  .verity/tests/ │    │  claude-sonnet-4-6     │    └──────────────────┘
│  src/test/java/ │    └───────────────────────┘
└─────────────────┘
```

## 1.2 Principal Data Flows

**Flow A — Repository Onboarding**
```
User → Select repo → RepositoryConnector → Clone/Open → FileSystemService
  → RepositoryIntelligenceService.detectFramework()
  → RepositoryIntelligenceService.analyzeRepository() [streaming]
    → AST Scanner → StructuralIndex
    → AI Enricher → EnrichedIndex
    → LocalPersistence.saveIndex()
  → ProjectService.finalizeProject()
  → IPC event: project.ready → Renderer
```

**Flow B — Test Authoring**
```
User → Prompt → AIOrchestrationService.generateSteps()
  → ContextBuilder.assemble(projectId) → RepositoryIndex → context package
  → Claude API [streaming]
    → each step → parsed → SemanticStep
    → AdapterRegistry.transpileStep(step) → code preview
    → IPC event: ai.generation.step → Renderer
  → SemanticProposal assembled
  → User: Apply →
    → SemanticModelService.write(test) → .verity/tests/*.yaml
    → AdapterRegistry.transpile(test) → .java files written
    → GitEngine.refreshStatus()
    → IPC event: semantic.proposal.applied → Renderer
```

**Flow C — Test Execution**
```
User → Run →
  → AdapterRegistry.getActive().prerequisiteCheck()
  → ExecutionEngine.run(testId)
    → SubprocessManager.spawn("mvn -Dtest=X test")
    → stdout parser → ExecutionEvents
    → each event → EvidenceCapture → screenshot/HAR stored
    → IPC event: execution.step.event → Renderer
  → Run completed → RunStore.persist()
  → AIOrchestrationService.classifyFailure() [if failed]
  → IPC event: execution.completed → Renderer
```

**Flow D — Commit & Push**
```
User → CommitModal → GitEngine.getDiff()
  → User reviews → confirms commit message
  → GitEngine.commit(message, files[]) → GitEngine.push()
  → IPC events: git.committed, git.pushed → Renderer
```

## 1.3 External System Dependencies

| System | Purpose | Protocol | Auth |
|--------|---------|----------|------|
| Anthropic Claude API | Step generation, enrichment, failure classification | HTTPS / SSE | API key (user-supplied) |
| GitHub | Repository connection, OAuth | HTTPS | OAuth 2.0 PKCE |
| GitLab | Repository connection, OAuth | HTTPS | OAuth 2.0 PKCE |
| Local Git CLI | All git operations | subprocess | SSH / HTTPS (OS credential store) |
| Local JDK + Maven | Playwright Java execution | subprocess | N/A |
| Playwright Browser | Browser automation | process | N/A |

---

# SECTION 2 — Low-Level Design

## 2.1 Main Process Architecture

The Electron main process is the system's kernel. It owns all I/O, all subprocess management, all file system access, and all domain state. The renderer is a pure presentation layer with zero business logic.

```
main.ts
  ├── bootstrap()
  │     ├── initDatabase()
  │     ├── initServiceContainer()
  │     ├── initIPCRouter()
  │     ├── initEventBus()
  │     └── createWindow()
  ├── ServiceContainer  (singletons)
  │     LocalPersistence · FileSystemService · ProjectService
  │     RepositoryIntelligenceService · SemanticModelService
  │     AdapterRegistry · AIOrchestrationService · ExecutionEngine · GitEngine
  └── IPCRouter
        ├── Receives invoke() calls from renderer
        ├── Routes to correct service method
        ├── Returns serialized response
        └── Pushes domain events via webContents.send()
```

## 2.2 Renderer Process Architecture

```
renderer/
  ├── AppShell.tsx               # Root layout, routing, toast manager
  ├── ipc/
  │     ├── client.ts            # Typed wrappers around window.verity
  │     ├── commands.ts          # invoke() calls, typed request/response
  │     └── events.ts            # pushed event subscriptions, typed
  ├── store/
  │     ├── projectStore.ts      # Active project, project list (Zustand)
  │     ├── workspaceStore.ts    # AI Studio state, proposal, phase
  │     ├── executionStore.ts    # Current run, step timeline
  │     └── gitStore.ts          # Working tree status, changes
  ├── screens/                   # One dir per screen
  ├── components/                # Shared, no domain knowledge
  └── theme/                     # CSS custom properties, tokens
```

## 2.3 Threading & Concurrency Model

| Concern | Where it runs | Isolation |
|---------|--------------|-----------|
| UI rendering | Renderer process | Sandboxed, no Node |
| Domain services | Main process | Single Node event loop |
| AST parsing (heavy) | Worker thread pool | Off main loop |
| Embedding computation | Worker thread | Off main loop |
| Test execution | Child process (spawn) | Fully isolated subprocess |
| Git operations | Child process (git CLI) | Fully isolated subprocess |
| AI API calls | Main process (async I/O) | Non-blocking |

## 2.4 Error Handling Strategy

- **Domain errors** are typed (`VerityError` hierarchy) with a `code`, `userMessage`, and `recoverable` flag.
- IPC responses are a discriminated union: `{ ok: true, data }` or `{ ok: false, error }`.
- The renderer never sees raw stack traces; only sanitized `userMessage`.
- Subprocess failures (Maven, git) capture stderr and map to domain errors.
- All errors are written to a local rotating log (`~/.verity/logs/`) for diagnostics.

---

# SECTION 3 — Domain-Driven Design

## 3.1 Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Workspace** | Root container for one connected repository and all its intelligence, tests, and runs |
| **Repository** | A customer-owned git repository containing a test suite |
| **Repository Index** | Verity's computed understanding: pages, page objects, locators, flows, conventions |
| **Framework** | A test automation framework (Playwright Java, Selenium Java, …) |
| **Adapter** | Component that translates between Semantic Tests and a specific Framework |
| **Semantic Test** | Framework-neutral description of intent, steps, expected outcomes. **THE SOURCE OF TRUTH** |
| **Semantic Step** | One atomic unit: intent, action, context page, expected outcome, confidence |
| **Proposal** | AI-generated set of changes (YAML + transpiled code) awaiting user review |
| **Transpilation** | Converting a Semantic Test into framework code. Deterministic and reversible |
| **Projection** | The framework-specific code files — projections of the Semantic Test, not independent artifacts |
| **Page Object** | A class in the customer repo encapsulating interactions with one application page |
| **Locator** | A strategy + selector pair identifying a DOM element |
| **Business Flow** | A named multi-page user sequence achieving a business goal |
| **Understanding Score** | Computed 0–100% confidence of Verity's knowledge of the repository |
| **Execution Run** | One invocation of a test producing a timeline, evidence, and a result |
| **Evidence** | Artifacts captured during a run: screenshots, HAR files, console logs |
| **Failure Classification** | AI determination of why a run failed: app bug, test defect, locator drift, environment |
| **Working Tree** | Local filesystem state of the repo; changes exist here before commit |

## 3.2 Aggregates

### Aggregate: Workspace
```
Root: Workspace { id, name, repository, framework, understandingScore, status }
Status: CREATED → INDEXING → READY → STALE → INDEXING
Invariants:
  - Exactly one active Adapter
  - understandingScore recomputed after every index update
  - Does NOT own SemanticTests or ExecutionRuns (separate aggregates by WorkspaceId)
```

### Aggregate: SemanticTest
```
Root: SemanticTest { id, workspaceId, name, steps[], status, adapterId, promptVersion, ts }
Status: DRAFT | READY | FAILING | PASSING
Invariants:
  - steps never empty once out of DRAFT
  - step ids monotonically increasing
  - adapterId immutable after first transpilation
  - References Locators by id; does NOT own them
```

### Aggregate: ExecutionRun
```
Root: ExecutionRun { id, workspaceId, semanticTestId, branch, status, steps[],
                     failureClassification?, startedAt, completedAt? }
Status: QUEUED | RUNNING | PASSED | FAILED | CANCELLED
Invariants:
  - Terminal status set once
  - RunSteps append-only
  - failureClassification only after FAILED
  - Stores evidence references, not evidence blobs
```

### Aggregate: RepositoryIndex
```
Root: RepositoryIndex { id, workspaceId, pages[], pageObjects[], locators[],
                        flows[], conventions, understandingScore, indexedAt, version }
Invariants:
  - Always internally consistent (no orphaned locators)
  - Locators owned by Pages
  - understandingScore + version recomputed on every write
```

## 3.3 Entities

| Entity | Identity | Notes |
|--------|----------|-------|
| Workspace | WorkspaceId (ULID) | Root aggregate |
| Repository | RepositoryId (ULID) | 1:1 with Workspace |
| SemanticTest | SemanticTestId (ULID) | Stored as YAML in repo |
| ExecutionRun | RunId (ULID) | Stored in SQLite |
| RunStep | RunStepId (ULID) | Child of ExecutionRun |
| Page | PageId (ULID) | Child of RepositoryIndex |
| PageObject | PageObjectId (ULID) | Child of RepositoryIndex |
| Locator | LocatorId (ULID) | Child of Page |
| BusinessFlow | FlowId (ULID) | Child of RepositoryIndex |

## 3.4 Value Objects

| Value Object | Fields |
|-------------|--------|
| SemanticStep | id (positional), intent, action, context, expected, confidence, locatorRefs[] |
| Framework | adapterId, version, buildTool, testFramework, pattern |
| Score | value (0–100), computedAt, breakdown{} |
| LocatorRef | locatorId, strategy, value, confidence, isInvented |
| DiffHunk | filePath, lineNumber, type, content |
| FailureClassification | type, confidence, summary, evidence[], recommendation |
| ConventionModel | baseTestClass, pageObjectSuffix, testMethodPattern, annotationStyle |

## 3.5 Domain Services

| Service | Responsibility | Why a service |
|---------|---------------|---------------|
| UnderstandingScoreCalculator | Computes score from coverage + confidence | Uses multiple aggregates |
| TranspilationCoordinator | Orchestrates semantic → code via active adapter | Crosses Semantic Model + Adapter |
| ProposalApplier | Atomically writes YAML + code to working tree | Coordinates SemanticModel + FS + Git |
| ContextAssembler | Selects/packages context for AI | Reads Index + SemanticTests together |
| IncrementalIndexer | Applies file-change deltas to the Index | Merges partial re-scan |

---

# SECTION 4 — Bounded Contexts

## 4.1 Context Map

```
┌──────────────────────┐   shared kernel   ┌──────────────────────────┐
│ WORKSPACE MANAGEMENT  │◄─────────────────►│ REPOSITORY INTELLIGENCE   │
│ Workspace, Project    │   (core types)    │ RepositoryIndex, Page     │
└──────────┬───────────┘                   └────────────┬─────────────┘
           │ customer/supplier                          │ upstream
           ▼                                            ▼
┌──────────────────────┐   conformist      ┌──────────────────────────┐
│ SEMANTIC MODEL        │◄─────────────────►│ ADAPTER                   │
│ SemanticTest, Step    │   (adapter reads  │ TestAdapter, Transpiler   │
│ (SOURCE OF TRUTH)     │    semantic model)│ Playwright Java Adapter   │
└──────────┬───────────┘                   └────────────┬─────────────┘
           │                                            │
           ▼                                            ▼
┌──────────────────────┐                   ┌──────────────────────────┐
│ AI ORCHESTRATION      │                   │ EXECUTION                 │
│ Session, Proposal     │                   │ ExecutionRun, Evidence    │
└──────────────────────┘                   └────────────┬─────────────┘
                                                         │
┌──────────────────────┐                   ┌────────────▼─────────────┐
│ GIT INTEGRATION       │                   │ (Execution emits runs     │
│ WorkingTree, Commit   │                   │  classified by AI)        │
└──────────────────────┘                   └──────────────────────────┘
```

## 4.2 Context Definitions

| Bounded Context | Core Responsibility | Owns | Depends On |
|-----------------|--------------------|------|-----------|
| **Workspace Management** | Project lifecycle, registry, active workspace | Workspace, Project, Settings | Shared kernel |
| **Repository Intelligence** | Scan, parse, index, score the repo | RepositoryIndex, Page, PageObject, Locator, Flow | FileSystem, AI (enrichment) |
| **Semantic Model** | Authoritative test definitions | SemanticTest, SemanticStep | Shared kernel |
| **Adapter** | Translate semantic ↔ framework | TestAdapter, Transpiler, Detector, Runner spec | Semantic Model (read), Repository Index (read) |
| **AI Orchestration** | Prompt, generate, classify | AISession, SemanticProposal, ReasoningTrace | Repository Intelligence, Semantic Model, Adapter |
| **Execution** | Run tests, capture evidence | ExecutionRun, RunStep, Evidence | Adapter (runner), AI (classify) |
| **Git Integration** | Working tree, diff, commit, push | WorkingTreeStatus, GitChange, Commit | FileSystem, Git CLI |

## 4.3 Context Relationships

- **Shared Kernel:** `packages/core` — domain primitives (IDs, Score, Result type, event base). Shared by all contexts.
- **Customer/Supplier:** Repository Intelligence supplies the Index that Semantic Model and AI consume.
- **Conformist:** Adapters conform to the Semantic Model schema; the Semantic Model never bends to a framework.
- **Anti-Corruption Layer:** The Adapter contract is the ACL that prevents framework concepts from leaking into the core.

---

# SECTION 5 — Monorepo Structure

```
verity/
├── apps/
│   ├── desktop/                    # Electron main + preload
│   │   ├── src/
│   │   │   ├── main/               # main process entry, IPC router, container
│   │   │   ├── preload/            # contextBridge exposure (typed, minimal)
│   │   │   └── ipc/                # command + event channel definitions
│   │   ├── electron-builder.yml
│   │   └── package.json
│   └── renderer/                   # React UI (Vite + TypeScript)
│       ├── src/{screens,components,store,ipc,theme}/
│       └── package.json
│
├── packages/
│   ├── core/                       # Shared kernel — domain types, no deps
│   ├── repository-intelligence/    # scanner, detector, enricher
│   ├── semantic-model/             # YAML schema, reader, writer, validator
│   ├── adapter-contract/           # TestAdapter interface (TypeScript types)
│   ├── adapter-playwright-java/    # MVP adapter (detector, transpiler, runner)
│   ├── execution-engine/           # process manager, evidence capture, run store
│   ├── git-engine/                 # status, diff, commit, push (git CLI wrapper)
│   ├── ai-orchestration/           # client, context-builder, step-generator, classifier
│   └── local-persistence/          # SQLite via Drizzle, repositories, migrations
│
├── tools/
│   ├── build/                      # shared tsconfig base, vite/electron config
│   └── eslint/                     # shared lint config
│
├── pnpm-workspace.yaml
├── turbo.json                      # Turborepo pipeline
└── package.json
```

## 5.1 Module Boundary Rules

```
renderer            → core, ipc (typed wrappers only)
desktop/main        → all packages/* (composition root)
adapter-*           → adapter-contract, core
ai-orchestration    → core, semantic-model, repository-intelligence, adapter-contract
execution-engine    → adapter-contract, core, local-persistence
git-engine          → core
repository-intelligence → core
semantic-model      → core
local-persistence   → core

FORBIDDEN:
  renderer → packages/* directly (must go through IPC)
  adapter-* → ai-orchestration (adapters are pure transpilers/runners)
  core → anything (shared kernel has zero internal deps)
  ANY core package → playwright / selenium / cypress (AD-002)
```

The last rule is enforced by an ESLint `no-restricted-imports` boundary + a CI check that greps for framework imports outside `adapter-*`.

---

# SECTION 6 — Event Architecture

## 6.1 Event Bus Model

A single in-process `DomainEventBus` in the main process. Events are typed, immutable, and carry a `workspaceId` for routing. The bus has two consumer classes:

1. **Internal subscribers** — services reacting to domain events (e.g., index update → score recompute).
2. **IPC forwarder** — forwards whitelisted events to the renderer via `webContents.send()`.

```
Service A ──emit──► DomainEventBus ──► Internal Subscribers (services)
                          │
                          └──► IPCForwarder ──► Renderer (webContents.send)
```

## 6.2 Event Catalog

| Event | Emitted By | Internal Consumers | Forwarded to UI |
|-------|-----------|-------------------|:---:|
| `project.created` | ProjectService | LocalPersistence | ● |
| `repository.connected` | RepositoryConnector | RepositoryIntelligence | ● |
| `framework.detected` | RepositoryIntelligence | AdapterRegistry | ● |
| `repository.analysis.progress` | RepositoryIntelligence | — | ● |
| `repository.analysis.completed` | RepositoryIntelligence | ScoreCalculator, Persistence | ● |
| `repository.file.changed` | FileSystemService (watcher) | IncrementalIndexer | ● |
| `repository.index.updated` | IncrementalIndexer | AISession (invalidate) | ● |
| `ai.generation.started` | AIOrchestration | — | ● |
| `ai.generation.step` | AIOrchestration | — | ● |
| `ai.reasoning.entry` | AIOrchestration | — | ● |
| `ai.generation.completed` | AIOrchestration | — | ● |
| `semantic.proposal.applied` | ProposalApplier | GitEngine, SemanticModel | ● |
| `semantic.proposal.discarded` | AIOrchestration | — | ● |
| `execution.started` | ExecutionEngine | — | ● |
| `execution.step.event` | ExecutionEngine | EvidenceCapture | ● |
| `execution.completed` | ExecutionEngine | RunStore, AIClassifier | ● |
| `execution.classified` | AIClassifier | RunStore | ● |
| `git.status.changed` | GitEngine | — | ● |
| `git.committed` | GitEngine | — | ● |
| `git.pushed` | GitEngine | — | ● |
| `git.push.failed` | GitEngine | — | ● |

## 6.3 Event Delivery Guarantees

- **In-process, synchronous dispatch** for internal subscribers (no message broker in MVP).
- **At-most-once** to the renderer; UI state is reconcilable via explicit `get*` queries on reconnect.
- Streaming events (`ai.generation.step`, `execution.step.event`) carry a monotonic `seq` so the UI can detect gaps and request a resync.
- No event sourcing in MVP — events are notifications, not the persistence mechanism. SQLite holds state of record.

---

# SECTION 7 — Repository Intelligence Design

## 7.1 Three-Phase Pipeline

```
Phase 1 — Structural Scan (deterministic, no AI, fast)
  1. Walk directory tree (.gitignore-aware) → file list
  2. Parse build manifest (pom.xml / package.json / build.gradle)
     → buildTool, dependencies, testFramework, adapterVersion
  3. AST-parse source (tree-sitter) → Page Object classes,
     locator calls (getByRole, getByPlaceholder, @FindBy, locator())
     → Locator { name, selector, strategy, filePath, line }
  4. Scan test files → test method names, page object references
  5. Group locators by page → Page { name, url?, elements[] }
  Output: StructuralIndex (deterministic)

Phase 2 — Semantic Enrichment (AI-assisted)
  1. Generate semantic descriptions per page object
  2. Identify cross-page navigation → BusinessFlow candidates
  3. Compute understandingScore = coverage × accuracy × depth
  Output: EnrichedIndex (with confidence scores)

Phase 3 — Incremental Update (fs watcher)
  Trigger: file change event
  1. Re-parse changed file only
  2. Merge delta into cached Index
  3. Emit repository.index.updated
```

## 7.2 Understanding Score Formula

```
UnderstandingScore =
    0.40 × LocatorCoverage      (% of interactive elements with resolved locators)
  + 0.30 × FlowAccuracy         (% of detected flows that map to real page sequences)
  + 0.20 × PageObjectDepth      (avg methods+locators per page object, normalized)
  + 0.10 × ConventionClarity    (confidence in detected naming/inheritance patterns)
```

## 7.3 Parser Strategy

| Language | Parser | Extracts |
|----------|--------|----------|
| Java | tree-sitter-java | classes, methods, `@FindBy`, Playwright `getBy*`, `locator()` |
| TypeScript | tree-sitter-typescript | classes, `page.getBy*`, `locator()`, fixtures |
| Python | tree-sitter-python | classes, `find_element`, `page.get_by_*` |

**Principle:** structural truth comes from AST (deterministic). AI only *describes and connects* what the AST found — it never invents structure.

## 7.4 Index Storage

- Cached in SQLite (`index_cache` table) keyed by workspaceId + version.
- Source of truth for the index is the repository itself; the cache is rebuildable.
- Stale detection: a content hash of relevant files; mismatch → re-index.

---

# SECTION 8 — Semantic Model Design

## 8.1 The Source-of-Truth Principle (AD-001)

> The Semantic Test (YAML) **is** the test. The framework code (`.java`) is a build artifact — a projection. If the projection is deleted, it regenerates from the YAML. The reverse is **not** true.

## 8.2 File Format

Location in customer repo: `.verity/tests/{slug}.yaml`

```yaml
version: "1"
id: checkout-flow-001
name: User completes checkout
adapter: playwright-java          # locked at authoring; re-transpile on change
promptVersion: step-generation@1.1.0
created: 2026-06-24T00:00:00Z
modified: 2026-06-24T00:00:00Z

steps:
  - id: 1
    intent: "Authenticate user"
    action: "Enter email & password, submit"
    context: "Login Page"
    expected: "Redirected to Home, session active"
    confidence: 0.98
    locators:
      - ref: email-input
        strategy: role
        value: 'textbox[name="Email address"]'
        invented: false
      - ref: submit-button
        strategy: role
        value: 'button[name="Sign in"]'
        invented: false
```

## 8.3 Schema Governance

- Schema is versioned (`version: "1"`). A `SchemaMigrator` upgrades older files on read.
- Validation via Zod in `packages/semantic-model`. Invalid YAML never reaches an adapter.
- Writer is **deterministic** (stable key ordering, preserved comments) so git diffs stay clean.

## 8.4 Projection Lifecycle

```
SemanticTest (YAML)  ──transpile──►  Projection (.java)
        ▲                                   │
        │                                   │ (never read back as truth)
        └────── edit always here ───────────┘

Re-transpilation triggers:
  - Adapter change (explicit user action)
  - Semantic step edit
  - Adapter version upgrade
  - Manual "regenerate projection" command
```

## 8.5 Why Not Store Code as Truth

| If code were truth | Consequence |
|--------------------|-------------|
| Framework switch = full rewrite | Violates framework neutrality (AD-002) |
| AI must parse generated code to edit | Lossy, error-prone round-trips |
| Intent is implicit | No reliable confidence scoring or classification |

The semantic model keeps **intent explicit and framework absent**, which is what makes neutrality, confidence, and classification possible.

---

# SECTION 9 — Adapter Architecture

## 9.1 The Adapter Contract (ACL)

Every adapter implements one interface. It is the **only** component allowed to import a test framework (AD-002).

```
interface TestAdapter {
  id: string                      // "playwright-java"
  name: string                    // "Playwright Java"
  version: string                 // "1.48"

  detect(repoRoot: Path): DetectionResult
  transpile(test: SemanticTest, index: RepositoryIndex): TranspileResult
  run(test: SemanticTest, config: ExecutionConfig): AsyncIterable<ExecutionEvent>
  checkPrerequisites(repoRoot: Path): PrerequisiteReport
}

TranspileResult {
  files: { path, content, type: "create" | "modify" }[]
  warnings: string[]
}

ExecutionEvent {
  type: "step.started" | "step.passed" | "step.failed" | "run.completed"
  stepId: number
  timestamp: number
  duration?: number
  evidence?: { screenshot?: Buffer, networkLog?: HAREntry[] }
  error?: { message, stack? }
}
```

## 9.2 Adapter Capabilities Matrix

| Capability | Playwright Java (MVP) | Selenium Java | Playwright TS | Selenium Python | Cypress |
|-----------|:---:|:---:|:---:|:---:|:---:|
| detect() | ● | planned | planned | planned | planned |
| transpile() | ● | planned | planned | planned | planned |
| run() | ● | planned | planned | planned | planned |
| prerequisites() | ● | planned | planned | planned | planned |
| Locator strategies | role, text, placeholder, css, xpath | css, xpath, id, name | role, text, css | css, xpath, id | css, text |

## 9.3 Adapter Registry

```
AdapterRegistry
  ├── register(adapter: TestAdapter)
  ├── list(): TestAdapter[]
  ├── get(id): TestAdapter
  ├── active(projectId): TestAdapter        // resolved from project settings
  └── detectBest(repoRoot): TestAdapter      // runs all detect(), picks highest score
```

## 9.4 Adding a New Adapter (zero core change)

```
1. Create packages/adapter-<framework>/
2. Implement TestAdapter
3. Register in the composition root (desktop/main)
4. Add transpiler snapshot tests
→ No change to core, semantic-model, ai-orchestration, or renderer.
```

This is the structural proof of AD-002.

---

# SECTION 10 — Desktop Architecture (Electron)

## 10.1 Process Model

```
┌─────────────────────────────────────────────┐
│ MAIN PROCESS (Node)                          │
│  - Service container, IPC router, event bus  │
│  - All file system, git, subprocess, AI I/O  │
│  - SQLite                                     │
└───────────────┬─────────────────────────────┘
                │ contextBridge (preload)
┌───────────────▼─────────────────────────────┐
│ RENDERER PROCESS (Chromium)                  │
│  - React UI only                             │
│  - contextIsolation: true                    │
│  - nodeIntegration: false                    │
│  - sandbox: true                             │
└─────────────────────────────────────────────┘
       + Worker threads (AST, embeddings)
       + Child processes (Maven, git, Playwright)
```

## 10.2 Security Posture

| Control | Setting | Reason |
|---------|---------|--------|
| `contextIsolation` | `true` | Isolate preload from page context |
| `nodeIntegration` | `false` | No Node in renderer |
| `sandbox` | `true` | Renderer cannot touch OS directly |
| Preload surface | Minimal, typed | Only whitelisted IPC channels exposed |
| CSP | strict, no remote scripts | Prevent injection |
| API key | OS keychain (keytar) | Never in SQLite/logs/crash reports |
| External nav | blocked / shell.openExternal | No arbitrary navigation |

## 10.3 Preload Bridge

```
window.verity = {
  invoke<C extends Command>(channel: C, payload): Promise<Response<C>>
  on<E extends Event>(channel: E, handler): Unsubscribe
}
```

Only these two methods are exposed. Channels are a closed enum — the renderer cannot invoke arbitrary IPC.

## 10.4 Auto-Update

- `electron-updater` with a signed release feed.
- Staged rollout (percentage gates) post-MVP.
- Update-available surfaced as a non-blocking banner; user controls restart.

## 10.5 Packaging

- `electron-builder` → signed `.dmg` (macOS, notarized), `.exe` (Windows, NSIS), `.AppImage` (Linux).
- Playwright browser binaries fetched on first run, not bundled, to keep installer small.

---

# SECTION 11 — Execution Engine Architecture

## 11.1 Responsibilities

Owns the lifecycle of an `ExecutionRun`: spawn the adapter's runner, parse events, capture evidence, persist results, trigger classification.

```
ExecutionEngine
  ├── SubprocessManager     # spawn/kill/stream child processes
  ├── EventParser           # adapter stdout/JUnit XML → ExecutionEvent[]
  ├── EvidenceCapture       # screenshots, HAR, console → local store
  ├── RunStore              # persist ExecutionRun + RunStep to SQLite
  └── RunCoordinator        # orchestrates the above, emits events
```

## 11.2 Execution Sequence

```
run(testId):
  1. adapter.checkPrerequisites()  → block with guidance if failing
  2. RunCoordinator creates ExecutionRun (status QUEUED → RUNNING)
  3. adapter.run(test, config) yields ExecutionEvent stream
  4. For each event:
       - map stepId → semantic step
       - EvidenceCapture stores artifacts, keeps only refs in DB
       - emit execution.step.event (with seq) → UI
  5. On run.completed:
       - RunStore.persist()
       - if FAILED → AIClassifier.classify() (background)
       - emit execution.completed
```

## 11.3 Evidence Storage

```
~/.verity/evidence/{workspaceId}/{runId}/
  ├── step-1.png
  ├── step-6.png
  ├── network.har
  └── console.log
```

- DB stores **references** (paths + metadata), never blobs.
- Retention policy: keep last N runs per test (configurable), prune older evidence.
- Evidence never leaves the machine (see AI data boundary, §13.9).

## 11.4 Process Isolation & Cancellation

- Each run is a dedicated child process; killing it cannot affect the app.
- Cancellation sends SIGTERM → SIGKILL escalation; partial results persisted.
- stdout/stderr streamed line-by-line; backpressure handled by bounded buffer.

---

# SECTION 12 — Git Engine Architecture

## 12.1 Principle: Read-Only Until Explicit Commit

Verity never mutates git history without an explicit, reviewed user action. No auto-commit, no force-push, no rebase. The working tree is the only thing the AI writes to (via ProposalApplier), and even that is reviewed before commit.

## 12.2 Operations

```
GitEngine (git CLI wrapper, child process)
  ├── getStatus(repoRoot): GitChange[]            # porcelain v2 parse
  ├── getDiff(repoRoot, filePath): DiffHunk[]
  ├── commit(repoRoot, message, files[]): void    # stages only listed files
  ├── push(repoRoot): PushResult                  # tracks current upstream
  ├── currentBranch(repoRoot): string
  ├── listBranches(repoRoot): Branch[]
  └── createBranch(repoRoot, name): void          # verity/ prefix by default
```

## 12.3 Safety Rails

| Risk | Rail |
|------|------|
| Accidental force push | `push` never uses `--force`; rejected pushes surface to user |
| Committing unrelated files | Only explicitly selected files are staged |
| Destructive history ops | Not exposed in MVP (no reset --hard, rebase, etc.) |
| Credential leakage | Uses OS credential helper; Verity never stores git creds |
| Dirty-tree surprises | Status is re-read before every commit; conflicts surfaced |

## 12.4 Commit Flow (from prototype CommitModal)

```
User opens Review & Commit
  → GitEngine.getStatus() + getDiff() per file
  → AI change summary attached per file (from proposal metadata)
  → User edits message, selects files
  → GitEngine.commit(message, files)
  → GitEngine.push()
  → emit git.committed, git.pushed
  → on rejection: emit git.push.failed with reason (remote ahead, auth)
```

## 12.5 Branch Strategy

- Default: author on the current branch; user may opt into a `verity/<test-slug>` branch per the Settings → Git Integration config.
- Post-MVP: optional automatic PR creation (`Open pull requests: Enabled` in settings).

---

# SECTION 13 — AI Orchestration Architecture

## 13.1 Responsibilities

The AI Orchestration context turns natural-language intent into reviewed `SemanticProposal`s, streams reasoning, and classifies failures — always behind the data boundary in §13.9.

```
AIOrchestrationService
  ├── ContextAssembler        # selects + packs repo context
  ├── IntentClassifier        # lightweight pre-pass
  ├── StepGenerator           # streaming step generation
  ├── LocatorResolver         # validates locators against the Index
  ├── ConfidenceScorer        # per-step + proposal confidence
  ├── FailureClassifier       # post-run classification
  ├── ReasoningTracer         # streams reasoning entries to UI
  └── SessionManager          # per-workspace AI session state
```

## 13.2 Context Assembly & RAG

```
Context budget per request: ~40,000 tokens
  System prompt              ~1,200
  Repository summary         ~1,500
  Relevant page objects (8)  ~8,000
  Existing test patterns (4) ~6,000
  Business flows (3)         ~3,000
  High-confidence locators   ~4,000
  User prompt                ~500
  Output reservation         ~8,000
  Safety headroom            ~7,800

RelevanceScore(unit, prompt) =
    0.40 × SemanticSimilarity(embeddings)   # local embedding model
  + 0.30 × FlowCoverage(detected flows)
  + 0.20 × LocatorConfidence
  + 0.10 × RecencyBoost

Embeddings computed locally (all-MiniLM-L6-v2). No source code leaves the machine for embedding.
```

## 13.3 Step Generation Pipeline

```
Phase 1 Intent Classification   → IntentClassification {primaryFlow, testType, pages, locators, conf}
Phase 2 Context Assembly        → ContextPackage
Phase 3 Step Generation (stream)→ SemanticStep objects via delimiter protocol
Phase 4 Locator Resolution      → exact → fuzzy(Levenshtein≤2) → flag INVENTED
Phase 5 Confidence Computation  → step + proposal confidence
Phase 6 Code Preview            → adapter.transpile() (preview only, not written)

Streaming chunk types:
  { type: "step",      payload: PartialSemanticStep }
  { type: "reasoning", payload: ReasoningEntry }
  { type: "done",      payload: SemanticProposal }
```

**System-prompt invariants:** use only locators in context; flag invented locators (conf < 0.75); one step = one observable action; steps describe WHAT, never HOW (no framework knowledge in steps).

## 13.4 Confidence Model

```
StepConfidence =
    0.50 × LocatorResolutionScore   # 1.0 all resolved … 0.0 all invented
  + 0.30 × FlowCoverageScore
  + 0.20 × PageObjectMatchScore

ProposalConfidence = mean(step.confidence)

ProposalConfidence < 0.70 → warning in AI Studio
ProposalConfidence < 0.50 → block Apply, require explicit acknowledgment
```

## 13.5 Prompt Engineering & Versioning

```
System prompt layers (composable, versioned files):
  L1 Role Definition
  L2 Repository Context (structured, injected)
  L3 Behavioral Invariants
  L4 Output Format Contract (embedded JSON schema)
  L5 Few-shot Examples (canonical, not from customer repo)

prompts/
  step-generation/v1.1.0.txt      (current)
  failure-classification/v1.0.0.txt
  intent-classification/v1.0.0.txt
  enrichment/v1.0.0.txt
```

Each SemanticTest records its `promptVersion`. Re-generation is explicit; existing tests retain their original context.

## 13.6 Failure Classification

```
Input: failed step + expected outcome + error message + network log + console + locator used
Model: lightweight Claude call (~3,000-token context)
Output: FailureClassification {
  type: application-bug | test-defect | locator-drift | environment | unknown
  confidence, summary, evidence[], recommendation
}
Post: persist to run; if locator-drift → flag locator in Index (self-healing foundation)
```

## 13.7 Session Management

```
AISession { id, projectId, contextSnapshot, conversationHistory(last 4 turns),
            proposals[], tokensUsed }

- repository.index.updated → invalidate contextSnapshot (refresh on next prompt)
- Follow-up prompts include prior proposal → enables "make step 3 role-based",
  "add a negative assertion", "split into two tests"
```

## 13.8 Rate Limiting, Cost, Offline

```
Concurrency: 1 generation per project (queued); 3 classifications; 1 enrichment
Caps: generation ≤10k out tokens; context ≤40k; classification ≤1k; enrichment ≤4k
Usage persisted: api_usage(date, op, in_tokens, out_tokens, model)

Offline / no API key:
  Workspace, file tree, semantic tests, git, EXECUTION → fully functional
  AI Studio prompt → blocked with banner; classification queued for reconnect
```

## 13.9 Security & Data Boundary (non-negotiable)

```
NEVER leaves the machine:
  source code, page object implementations, test data/fixtures,
  screenshots, HAR files (may carry auth tokens)

Reaches the Claude API:
  semantic descriptions (not raw source), locator names/strategies,
  user prompt, step intents/expected outcomes, sanitized error messages

DataSanitizer (pre-flight on every API call):
  strips Authorization/Cookie/Bearer, passwords, card numbers (regex)
  logs what was sent locally → inspectable in Settings → AI Model → Request Log

API key: OS keychain only; never SQLite, never logs, never crash reports.
```

---

## Architecture Validation Checklist

- [x] Semantic Model is the single source of truth (AD-001) — §8
- [x] Core has zero framework dependencies (AD-002) — §5.1, §9
- [x] New adapters require no core changes — §9.4
- [x] Electron security posture defined (AD-003) — §10.2
- [x] Customer data never leaves machine except via explicit action — §13.9
- [x] Git operations are review-gated and non-destructive — §12
- [x] Execution is fully process-isolated — §11.4
- [x] Bounded contexts and their relationships defined — §4
- [x] Event catalog with delivery guarantees — §6
