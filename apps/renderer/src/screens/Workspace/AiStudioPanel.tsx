import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import type { SemanticStepDto, SemanticTestDto } from '@verity/core/ipc';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { invoke } from '../../ipc/client.js';
import { useSemanticStore } from '../../store/semantic-store.js';
import {
  QUICK_PROMPTS,
  bindAiStudioEvents,
  useAiStudioStore,
} from '../../store/ai-studio-store.js';

interface AiStudioPanelProps {
  project: Project;
  selectedTest: SemanticTestDto | null;
  loadingDetail: boolean;
}

/**
 * Interactive AI Test Studio (M4) — prompt, streaming steps, proposal review.
 */
export function AiStudioPanel({
  project,
  selectedTest,
  loadingDetail,
}: AiStudioPanelProps): React.ReactElement {
  const phase = useAiStudioStore((s) => s.phase);
  const prompt = useAiStudioStore((s) => s.prompt);
  const streamingSteps = useAiStudioStore((s) => s.streamingSteps);
  const proposal = useAiStudioStore((s) => s.proposal);
  const generating = useAiStudioStore((s) => s.generating);
  const showCode = useAiStudioStore((s) => s.showCode);
  const setPrompt = useAiStudioStore((s) => s.setPrompt);
  const setShowCode = useAiStudioStore((s) => s.setShowCode);
  const generate = useAiStudioStore((s) => s.generate);
  const applyProposal = useAiStudioStore((s) => s.applyProposal);
  const discardProposal = useAiStudioStore((s) => s.discardProposal);
  const loadTests = useSemanticStore((s) => s.loadTests);

  useEffect(() => {
    return bindAiStudioEvents(project.id);
  }, [project.id]);

  const handleGenerate = useCallback((): void => {
    void generate(project.id, prompt);
  }, [generate, project.id, prompt]);

  const handleApply = useCallback((): void => {
    void applyProposal(project.id).then(() => loadTests(project.id));
  }, [applyProposal, loadTests, project.id]);

  const handleDiscard = useCallback((): void => {
    void discardProposal(project.id);
  }, [discardProposal, project.id]);

  const displaySteps =
    phase === 'proposed' || phase === 'applied'
      ? (proposal?.test.steps ?? streamingSteps)
      : selectedTest && phase === 'idle'
        ? selectedTest.steps
        : streamingSteps;

  return (
    <div
      style={{
        width: 330,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg1)',
        borderLeft: '1px solid var(--b0)',
      }}
    >
      <div
        style={{
          height: 34,
          borderBottom: '1px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          background: 'var(--ai-bg)',
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <Icon d={IC.spark} size={14} stroke="var(--ai)" />
        AI Test Studio
        {generating ? (
          <Pill color="var(--ai)" background="var(--ai-dim)" border="rgba(139,92,246,0.25)">
            generating
          </Pill>
        ) : null}
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--b0)' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe a test in plain language…"
          disabled={generating}
          rows={3}
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: 64,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--b1)',
            background: 'var(--bg2)',
            color: 'var(--t0)',
            fontSize: 12.5,
            lineHeight: '18px',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={generating}
              onClick={() => {
                setPrompt(chip);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--b1)',
                background: 'var(--bg3)',
                color: 'var(--t1)',
                fontSize: 10.5,
                cursor: 'pointer',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || prompt.trim().length === 0}
          style={{
            marginTop: 10,
            width: '100%',
            height: 32,
            border: 'none',
            borderRadius: 8,
            background: generating ? 'var(--bg3)' : 'linear-gradient(135deg,var(--acc),var(--ai))',
            color: 'white',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: generating ? 'default' : 'pointer',
          }}
        >
          {generating ? 'Generating…' : 'Generate test'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {loadingDetail && phase === 'idle' ? (
          <Placeholder message="Loading test…" />
        ) : displaySteps.length === 0 && phase === 'idle' && !selectedTest ? (
          <Placeholder message="Enter a prompt above or select an existing semantic test." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {proposal ? (
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                Proposal · {Math.round(proposal.proposalConfidence * 100)}% confidence ·{' '}
                {proposal.proposedFiles.length} file(s)
              </div>
            ) : null}
            {displaySteps.map((step) => (
              <SemanticStepCard key={step.id} step={step} />
            ))}
            {showCode && proposal ? <CodePreview projectId={project.id} test={proposal.test} /> : null}
          </div>
        )}
      </div>

      {(phase === 'proposed' || proposal) && phase !== 'applied' ? (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--b0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            style={{
              height: 28,
              border: '1px solid var(--b1)',
              borderRadius: 6,
              background: 'var(--bg2)',
              color: 'var(--t1)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {showCode ? 'Hide code preview' : 'Show code preview'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleApply}
              style={{
                flex: 1,
                height: 32,
                border: 'none',
                borderRadius: 8,
                background: 'var(--ok)',
                color: 'white',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Apply to repo
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              style={{
                flex: 1,
                height: 32,
                border: '1px solid var(--b1)',
                borderRadius: 8,
                background: 'var(--bg2)',
                color: 'var(--t0)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'applied' ? (
        <div style={{ padding: 12, borderTop: '1px solid var(--b0)', fontSize: 12, color: 'var(--ok)' }}>
          Applied to repository. Run the test from the workspace toolbar.
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({ message }: { message: string }): React.ReactElement {
  return (
    <div style={{ color: 'var(--t2)', fontSize: 12.5, lineHeight: '18px', opacity: 0.85 }}>
      {message}
    </div>
  );
}

function SemanticStepCard({ step }: { step: SemanticStepDto }): React.ReactElement {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--bg2)',
        border: '1px solid var(--b1)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: 'var(--acc-dim)',
            color: 'var(--acc)',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--mono)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step.id}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{step.intent}</span>
        <span style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
          {Math.round(step.confidence * 100)}%
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--t1)', lineHeight: '16px' }}>
        <div>
          <span style={{ color: 'var(--t2)' }}>Action: </span>
          {step.action}
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--t2)' }}>Expected: </span>
          {step.expected}
        </div>
      </div>
    </div>
  );
}

function CodePreview({
  projectId,
  test,
}: {
  projectId: Project['id'];
  test: SemanticTestDto;
}): React.ReactElement | null {
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    void (async () => {
      const preview = await invoke('semantic:preview-code', { projectId, test });
      setFiles(preview.files.map((f) => ({ path: f.path, content: f.content })));
    })();
  }, [projectId, test]);

  if (files.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {files.map((f) => (
        <div key={f.path} style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 10.5,
              fontFamily: 'var(--mono)',
              color: 'var(--t2)',
              marginBottom: 4,
            }}
          >
            {f.path}
          </div>
          <pre
            style={{
              margin: 0,
              padding: 10,
              background: 'var(--bg0)',
              borderRadius: 6,
              fontSize: 10.5,
              lineHeight: '15px',
              overflow: 'auto',
              maxHeight: 160,
              fontFamily: 'var(--mono)',
            }}
          >
            {f.content.slice(0, 2000)}
          </pre>
        </div>
      ))}
    </div>
  );
}
