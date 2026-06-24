# Verity — Technical Mapping

> **Document 3 of 5** — Screen → Features → Services → APIs → Domain Models → Events
> Maps every screen in the prototype to its backing system components.

---

## Welcome Screen

```
Features:    F-01 (name prompt implicit), intro content
Services:    None (static)
APIs:        None
Domain:      None
Events:      user.onboarding.started
```

---

## Create Project Wizard

### Step 0 — Name
```
Features:  F-01
Services:  ProjectService
APIs:      CreateProject(name)
Domain:    Project { id, name, createdAt }
Events:    project.created
```

### Step 1 — Repository Source
```
Features:  F-02, F-03
Services:  RepositoryConnectorService, OAuthService
APIs:      ConnectRepository(source, repoPath, credentials)
           OAuthAuthorize(provider)
Domain:    Repository { id, source, path, branch, remoteUrl }
Events:    repository.connected, auth.completed
```

### Step 2 — Framework Detection
```
Features:  F-04
Services:  RepositoryIntelligenceService
APIs:      DetectFramework(repositoryId)
Domain:    Framework { buildTool, testFramework, adapter, adapterVersion, pattern }
Events:    framework.detected, framework.detection.failed
```

### Step 3 — Repository Analysis
```
Features:  F-05, F-06, F-07, F-09, F-10, F-11, F-12, F-13, F-14
Services:  RepositoryIntelligenceService
APIs:      AnalyzeRepository(repositoryId)
           GetAnalysisProgress(jobId)
Domain:    RepositoryIndex { pages[], pageObjects[], tests[], utils[],
                             flows[], locators[], understandingScore }
Events:    repository.analysis.started
           repository.analysis.progress { pages, tests, po, utils }
           repository.analysis.completed { score }
```

### Step 4 — Ready
```
Features:  None (confirmation)
Services:  ProjectService
APIs:      FinalizeProject(projectId)
Domain:    Project (fully hydrated)
Events:    project.ready
```

---

## Workspace Screen

### Toolbar
```
Features:  F-36 (git changes count), F-28 (Run), branch display
Services:  GitService, ExecutionService
APIs:      GetWorkingTreeStatus(repositoryId)
           RunTest(projectId, testId)
Domain:    WorkingTreeStatus, ExecutionJob
Events:    git.status.changed, execution.started
```

### Left Panel — Repository Section
```
Features:  F-09
Services:  RepositoryIntelligenceService, FileSystemService
APIs:      GetFileTree(repositoryId)
Domain:    FileNode { name, path, type, status: clean|added|modified }
Events:    repository.file.changed (fs watcher)
```

### Left Panel — Framework Section
```
Features:  F-04 (display)
Services:  RepositoryIntelligenceService
APIs:      GetFrameworkInfo(projectId)
Domain:    Framework
Events:    None (static after analysis)
```

### Left Panel — Semantic Tests Section
```
Features:  F-15..F-22 (display)
Services:  SemanticModelService
APIs:      ListSemanticTests(projectId)
Domain:    SemanticTest { id, name, steps[], status: pass|fail|draft }
Events:    semantic.test.created, semantic.test.updated
```

### Left Panel — Git Changes Section
```
Features:  F-36, F-37, F-38, F-39
Services:  GitService
APIs:      GetWorkingTreeStatus(repositoryId)
           GetFileDiff(repositoryId, filePath)
           CommitAndPush(repositoryId, message, files[])
Domain:    GitChange { file, path, type: A|M|D }, GitCommit
Events:    git.committed, git.pushed, git.push.failed
```

### Center Panel — Interactive Browser
```
Features:  F-24, F-25, F-26, F-27
Services:  BrowserControlService (Playwright CDP)
APIs:      LaunchBrowser(url)
           HighlightElement(selector)
           GetDOMSnapshot()
Domain:    BrowserSession, DOMElement { selector, role, label, confidence }
Events:    browser.element.highlighted, dom.snapshot.captured
```

### Center Panel — Execution Tab
```
Features:  F-28..F-35
Services:  ExecutionService
APIs:      GetExecutionResult(jobId)
           StreamExecutionSteps(jobId)
Domain:    ExecutionRun { id, testId, steps[], status, duration }
           ExecutionStep { id, label, status, duration, screenshot?, networkRequests? }
Events:    execution.step.started, execution.step.completed, execution.step.failed
           execution.completed, execution.failed
```

### Center Panel — Code/Diff Tab
```
Features:  F-09 (display), F-17, F-18
Services:  AdapterService, SemanticModelService
APIs:      GetGeneratedCode(semanticTestId, adapterId)
           GetFileDiff(repositoryId, filePath)
Domain:    CodeFile { path, lines[], adapter }
Events:    semantic.test.applied (triggers refresh)
```

### Right Panel — AI Test Studio
```
Features:  F-15..F-23
Services:  AIService, RepositoryIntelligenceService, SemanticModelService, AdapterService
APIs:      GenerateSemanticSteps(projectId, prompt) → stream
           ApplySemanticTest(projectId, semanticTest)
           DiscardProposal(proposalId)
Domain:    SemanticProposal { id, steps[], proposedFiles[], status: draft|applied|discarded }
           SemanticStep { id, intent, action, context, expected, confidence, generatedCode[] }
Events:    ai.generation.started, ai.generation.step.streamed, ai.generation.completed
           semantic.proposal.applied, semantic.proposal.discarded
```

### Bottom Panel — AI Reasoning
```
Features:  F-22
Services:  AIService
APIs:      StreamReasoningTrace(sessionId)
Domain:    ReasoningEntry { type: ai|step|ok|err, message, timestamp }
Events:    ai.reasoning.entry
```

### Bottom Panel — Git Activity
```
Features:  F-40, F-41
Services:  GitService
APIs:      GetGitLog(repositoryId, limit)
Domain:    GitLogEntry
Events:    git.committed
```

---

## Projects Screen

```
Features:  F-08, F-02 (entry)
Services:  ProjectService
APIs:      ListProjects()
           DeleteProject(projectId)  [implied]
Domain:    Project { id, name, repo, source, framework, branch,
                     tests, pages, score, lastActiveAt }
Events:    project.opened, project.created
```

---

## Executions Screen

```
Features:  F-42, F-43, F-44, F-45
Services:  ExecutionService, AIService
APIs:      ListRuns(projectId, limit, offset)
           GetRunDetail(runId)
           GetFailureClassification(runId)
Domain:    ExecutionRun
           FailureClassification { type: app-bug|test-defect|infra, summary, confidence }
Events:    execution.run.selected
```

---

## AI Memory Screen

```
Features:  F-46, F-47, F-48, F-49, F-50
Services:  RepositoryIntelligenceService
APIs:      GetRepositoryIndex(projectId)
           GetPages(projectId)
           GetFlows(projectId)
           GetLocators(projectId)
           GetIntelligenceSummary(projectId)
Domain:    RepositoryIndex, Page, BusinessFlow, Locator
Events:    repository.index.updated (triggers refresh)
```

---

## Settings Screen

```
Features:  F-51..F-55
Services:  ProjectService, AdapterRegistry, GitService, ExecutionService
APIs:      GetProjectSettings(projectId)
           UpdateProjectSettings(projectId, settings)
           ListAdapters()
Domain:    ProjectSettings { adapter, git, execution, ai }
           Adapter { id, name, version, status: active|available|coming-soon }
Events:    settings.updated
```

---

## Service-to-Screen Matrix

| Service | Welcome | Create | Workspace | Projects | Executions | Memory | Settings |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ProjectService | | ● | ● | ● | | | ● |
| RepositoryConnectorService | | ● | | | | | |
| OAuthService | | ● | | | | | |
| RepositoryIntelligenceService | | ● | ● | | | ● | |
| SemanticModelService | | | ● | | | | |
| AdapterRegistry | | ● | ● | | | | ● |
| AIOrchestrationService | | ● | ● | | ● | | |
| ExecutionEngine | | | ● | | ● | | ● |
| GitEngine | | | ● | | | | ● |
| FileSystemService | | ● | ● | | | | |
| LocalPersistence | | ● | ● | ● | ● | ● | ● |
