import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  commitChanges,
  checkoutBranch,
  createBranch,
  getDiff,
  getStatus,
  parsePorcelainStatus,
  parseUnifiedDiff,
} from './index.js';

const tempDirs: string[] = [];

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'verity-git-'));
  tempDirs.push(dir);
  execSync('git init -b main', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@verity.local"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Verity Test"', { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, 'README.md'), 'hello\n');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('parsePorcelainStatus', () => {
  it('maps untracked and modified lines', () => {
    const changes = parsePorcelainStatus('?? new.txt\n M README.md\n');
    assert.equal(changes.length, 2);
    assert.equal(changes[0]?.type, 'A');
    assert.equal(changes[0]?.path, 'new.txt');
    assert.equal(changes[1]?.type, 'M');
    assert.equal(changes[1]?.path, 'README.md');
  });

  it('maps merge conflict lines to U', () => {
    const changes = parsePorcelainStatus('UU conflict.txt\n');
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.type, 'U');
    assert.equal(changes[0]?.path, 'conflict.txt');
  });
});

describe('parseUnifiedDiff', () => {
  it('extracts added and removed lines', () => {
    const lines = parseUnifiedDiff(`diff --git a/a.txt b/a.txt
--- a/a.txt
+++ b/a.txt
@@ -1 +1 @@
-old
+new
 context`);
    assert.deepEqual(
      lines.map((line) => line.kind + line.content),
      ['-old', '+new', ' context'],
    );
  });
});

describe('getStatus', () => {
  it('reports branch and working tree changes', async () => {
    const repo = initRepo();
    writeFileSync(join(repo, 'feature.txt'), 'draft\n');
    writeFileSync(join(repo, 'README.md'), 'hello world\n');

    const status = await getStatus(repo);

    assert.equal(status.branch, 'main');
    assert.equal(status.changes.length, 2);
    assert.ok(status.changes.some((change) => change.path === 'feature.txt' && change.type === 'A'));
    assert.ok(status.changes.some((change) => change.path === 'README.md' && change.type === 'M'));
  });
});

describe('getDiff', () => {
  it('returns diff lines for a modified file', async () => {
    const repo = initRepo();
    writeFileSync(join(repo, 'README.md'), 'hello world\n');

    const lines = await getDiff(repo, 'README.md');
    assert.ok(lines.some((line) => line.kind === '+' && line.content.includes('world')));
  });
});

describe('commitChanges', () => {
  it('commits only selected files', async () => {
    const repo = initRepo();
    writeFileSync(join(repo, 'a.txt'), 'a\n');
    writeFileSync(join(repo, 'b.txt'), 'b\n');

    const result = await commitChanges({
      repoRoot: repo,
      message: 'test: add selected files',
      files: ['a.txt'],
    });

    assert.equal(result.fileCount, 1);
    const status = await getStatus(repo);
    assert.equal(status.changes.length, 1);
    assert.equal(status.changes[0]?.path, 'b.txt');
  });
});

describe('checkoutBranch', () => {
  it('creates and switches branches', async () => {
    const repo = initRepo();
    await createBranch(repo, 'verity/feature');
    const status = await getStatus(repo);
    assert.equal(status.branch, 'verity/feature');
    await checkoutBranch(repo, 'main');
    const back = await getStatus(repo);
    assert.equal(back.branch, 'main');
  });
});
