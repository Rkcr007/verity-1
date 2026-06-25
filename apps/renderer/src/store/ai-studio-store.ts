import { create } from 'zustand';
import { VerityError, type ProposalId, type WorkspaceId } from '@verity/core';
import type {
  ReasoningEntryDto,
  SemanticProposalDto,
  SemanticStepDto,
} from '@verity/core/ipc';
import { invoke, on } from '../ipc/client.js';

export type GenerationPhase = 'idle' | 'thinking' | 'streaming' | 'proposed' | 'applied';

interface AiStudioState {
  phase: GenerationPhase;
  prompt: string;
  sessionId: string | null;
  proposalId: string | null;
  proposal: SemanticProposalDto | null;
  streamingSteps: readonly SemanticStepDto[];
  reasoning: readonly ReasoningEntryDto[];
  showCode: boolean;
  generating: boolean;
  generationError: string | null;
  setPrompt: (prompt: string) => void;
  setShowCode: (show: boolean) => void;
  generate: (projectId: WorkspaceId, prompt: string) => Promise<void>;
  loadProposal: (projectId: WorkspaceId, proposalId: string) => Promise<void>;
  applyProposal: (projectId: WorkspaceId) => Promise<void>;
  discardProposal: (projectId: WorkspaceId) => Promise<void>;
  reset: () => void;
}

export const useAiStudioStore = create<AiStudioState>((set, get) => ({
  phase: 'idle',
  prompt: '',
  sessionId: null,
  proposalId: null,
  proposal: null,
  streamingSteps: [],
  reasoning: [],
  showCode: false,
  generating: false,
  generationError: null,

  setPrompt: (prompt) => set({ prompt }),
  setShowCode: (show) => set({ showCode: show }),

  generate: async (projectId, prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    set({
      phase: 'thinking',
      prompt: trimmed,
      generating: true,
      generationError: null,
      streamingSteps: [],
      reasoning: [],
      proposal: null,
      proposalId: null,
      sessionId: null,
    });

    try {
      const { sessionId, proposalId } = await invoke('ai:generate', { projectId, prompt: trimmed });
      set({ sessionId, proposalId, phase: 'streaming' });
    } catch (error) {
      const message =
        error instanceof VerityError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : 'AI generation failed';
      set({ phase: 'idle', generating: false, generationError: message });
    }
  },

  loadProposal: async (projectId, proposalId) => {
    const proposal = await invoke('semantic:get-proposal', {
      projectId,
      proposalId: proposalId as ProposalId,
    });
    set({ proposal, proposalId, streamingSteps: [...proposal.test.steps], phase: 'proposed' });
  },

  applyProposal: async (projectId) => {
    const { proposalId } = get();
    if (!proposalId) return;
    const proposal = await invoke('semantic:apply-proposal', {
      projectId,
      proposalId: proposalId as ProposalId,
    });
    set({ proposal, phase: 'applied', generating: false });
  },

  discardProposal: async (projectId) => {
    const { proposalId } = get();
    if (!proposalId) return;
    await invoke('semantic:discard-proposal', {
      projectId,
      proposalId: proposalId as ProposalId,
    });
    set({
      phase: 'idle',
      proposal: null,
      proposalId: null,
      streamingSteps: [],
      generating: false,
    });
  },

  reset: () =>
    set({
      phase: 'idle',
      prompt: '',
      sessionId: null,
      proposalId: null,
      proposal: null,
      streamingSteps: [],
      reasoning: [],
      showCode: false,
      generating: false,
      generationError: null,
    }),
}));

export function bindAiStudioEvents(projectId: WorkspaceId): () => void {
  const offReasoning = on('ai.reasoning.entry', (event) => {
    if (event.payload.projectId !== projectId) return;
    const { sessionId } = useAiStudioStore.getState();
    if (sessionId && event.payload.sessionId !== sessionId) return;
    useAiStudioStore.setState((s) => ({
      reasoning: [...s.reasoning, event.payload.entry],
    }));
  });

  const offStep = on('ai.generation.step', (event) => {
    if (event.payload.projectId !== projectId) return;
    const { sessionId } = useAiStudioStore.getState();
    if (sessionId && event.payload.sessionId !== sessionId) return;
    const step = event.payload.step as SemanticStepDto;
    useAiStudioStore.setState((s) => ({
      streamingSteps: [...s.streamingSteps.filter((x) => x.id !== step.id), step].sort(
        (a, b) => a.id - b.id,
      ),
      phase: 'streaming',
    }));
  });

  const offCompleted = on('ai.generation.completed', (event) => {
    if (event.payload.projectId !== projectId) return;
    useAiStudioStore.setState({
      proposal: event.payload.proposal,
      proposalId: event.payload.proposal.id,
      streamingSteps: [...event.payload.proposal.test.steps],
      phase: 'proposed',
      generating: false,
      generationError: null,
    });
  });

  return () => {
    offReasoning();
    offStep();
    offCompleted();
  };
}

export const QUICK_PROMPTS = [
  'Create checkout flow test',
  'Generate negative login tests',
  'Verify cart add/remove flow',
  'Smoke test home page load',
] as const;
