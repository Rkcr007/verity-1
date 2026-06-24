import { useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import type { EntryRecommendationDto } from '@verity/core/ipc';
import { IC, Icon } from '../../components/Icon.js';
import { WelcomeEntryCard } from '../../components/WelcomeEntryCard.js';
import { invoke } from '../../ipc/client.js';
import { useProjects } from '../../store/project-store.js';
import { useRouter } from '../../store/router-store.js';
import { useToast } from '../../store/toast-store.js';

const VALUE_PROPS = [
  {
    ic: IC.branch,
    t: 'Repository-first',
    d: 'Tests live as real files in your repo — committed through Git, never a proprietary cloud store.',
  },
  {
    ic: IC.spark,
    t: 'AI as a collaborator',
    d: 'A senior automation engineer that reads your page objects and proposes changes you review first.',
  },
  {
    ic: IC.layers,
    t: 'Framework-neutral',
    d: 'Playwright Java today; Selenium, Cypress, and more as adapters. Your framework is the engine.',
  },
] as const;

/**
 * Welcome — onboarding router (M1.5). Four entry paths + resume last workspace.
 */
export function WelcomeScreen(): React.ReactElement {
  const startCreate = useRouter((s) => s.startCreate);
  const go = useRouter((s) => s.go);
  const openProject = useProjects((s) => s.openProject);
  const toast = useToast((s) => s.show);

  const [recent, setRecent] = useState<Project | null>(null);
  const [recommendation, setRecommendation] = useState<EntryRecommendationDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [{ project }, rec] = await Promise.all([
          invoke('project:get-recent', undefined),
          invoke('intelligence:recommend-entry', {}),
        ]);
        setRecent(project);
        setRecommendation(rec);
      } catch {
        // Non-blocking — Welcome still renders all paths.
      }
    })();
  }, []);

  const openDemo = async (): Promise<void> => {
    setBusy(true);
    try {
      const project = await invoke('project:open-demo', undefined);
      await openProject(project.id);
      toast('Demo workspace ready — explore without your company repo');
      go('workspace');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not open demo workspace', 'err');
    } finally {
      setBusy(false);
    }
  };

  const resumeRecent = async (): Promise<void> => {
    if (!recent) return;
    setBusy(true);
    try {
      await openProject(recent.id);
      go('workspace');
      toast(`Resumed ${recent.name}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resume workspace', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        background: 'radial-gradient(110% 90% at 75% 0%,#101725 0%,#0A0C10 58%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--b0) 1px,transparent 1px),linear-gradient(90deg,var(--b0) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.35,
          maskImage: 'radial-gradient(circle at 70% 25%,black,transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 70% 25%,black,transparent 70%)',
        }}
      />
      <div
        style={{
          flex: 1,
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 60px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: 'linear-gradient(135deg,var(--acc),var(--ai))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 22px rgba(91,140,239,0.35)',
            }}
          >
            <Icon d={IC.shield} size={22} stroke="white" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Verity</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>AI-Native Test Engineering Workspace</div>
          </div>
        </div>

        <div style={{ fontSize: 34, lineHeight: '40px', fontWeight: 700, letterSpacing: -1, maxWidth: 620 }}>
          Work alongside a senior automation engineer that{' '}
          <span
            style={{
              background: 'linear-gradient(120deg,var(--acc),var(--ai))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            knows your repository.
          </span>
        </div>
        <p style={{ fontSize: 15, lineHeight: '23px', color: 'var(--t1)', maxWidth: 560, marginTop: 18 }}>
          Start fresh, connect an existing repo, migrate from Selenium, or explore the demo — Verity adapts to
          where you are in your test engineering journey.
        </p>

        {recommendation ? (
          <div
            style={{
              marginTop: 22,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--ai-dim)',
              border: '1px solid rgba(167,139,250,0.25)',
              fontSize: 12.5,
              color: 'var(--t1)',
              maxWidth: 620,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--ai)' }}>Suggested: </span>
            {recommendation.headline}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 28,
            maxWidth: 860,
          }}
        >
          {recent ? (
            <WelcomeEntryCard
              icon={IC.arrow}
              title="Resume where you left off"
              description={`Continue ${recent.name} — pick up indexing, tests, and AI Studio.`}
              journey={[
                'Open your last workspace',
                'Repository index is preserved',
                'Continue authoring in AI Studio',
              ]}
              badge="Recent"
              accent
              onClick={() => void resumeRecent()}
            />
          ) : null}
          <WelcomeEntryCard
            icon={IC.plus}
            title="Start fresh"
            description="Enterprise framework picker with intelligence — Verity handles JDK, Maven, browsers, and repo layout."
            journey={[
              'Choose language & framework stack',
              'Scaffold repo in an empty folder',
              'Auto-install dependencies & browsers',
              'Start with semantic tests + page objects',
            ]}
            badge="Recommended"
            accent={!recent}
            onClick={() => startCreate('greenfield')}
          />
          <WelcomeEntryCard
            icon={IC.folder}
            title="Connect a repository"
            description="Point Verity at an existing automation repo. We detect the stack and index pages, flows, and locators."
            journey={[
              'Pick local folder (GitHub OAuth soon)',
              'Framework detection from build files',
              'Full repository intelligence scan',
              'Workspace ready for AI collaboration',
            ]}
            onClick={() => startCreate('existing')}
          />
          <WelcomeEntryCard
            icon={IC.layers}
            title="Migrate from Selenium"
            description="Connect a Selenium Java estate and get an incremental Playwright Java migration plan."
            journey={[
              'Index existing Selenium tests',
              'AI migration plan (flow-by-flow)',
              'Semantic tests alongside legacy suite',
              'Transpile to Playwright when ready',
            ]}
            onClick={() => startCreate('migrate')}
          />
          <WelcomeEntryCard
            icon={IC.spark}
            title="Try the demo workspace"
            description="Explore AI Studio and repository intelligence without connecting your company repo."
            journey={[
              'Pre-built e-commerce test project',
              'Sample page objects & semantic tests',
              'Full workspace UI — zero setup',
            ]}
            onClick={() => void openDemo()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 28, maxWidth: 720 }}>
          {VALUE_PROPS.map((p) => (
            <div
              key={p.t}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--b1)',
                borderRadius: 13,
                padding: '17px 16px',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--bg3)',
                  border: '1px solid var(--b1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 11,
                }}
              >
                <Icon d={p.ic} size={17} stroke="var(--acc)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: '17px' }}>{p.d}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 26, display: 'flex', gap: 16, fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon d={IC.check} size={13} stroke="var(--ok)" /> Local execution
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon d={IC.check} size={13} stroke="var(--ok)" /> Git-native
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon d={IC.check} size={13} stroke="var(--ok)" /> Your framework, your repo
          </span>
          {busy ? <span>Opening…</span> : null}
          <button
            type="button"
            onClick={() => go('projects')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--acc)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All projects →
          </button>
        </div>
      </div>
    </div>
  );
}
