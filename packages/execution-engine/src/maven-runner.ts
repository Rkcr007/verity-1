import { spawn } from 'node:child_process';

export interface MavenRunResult {
  readonly success: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export interface MavenRunOptions {
  readonly cwd: string;
  /** Simple class name, e.g. CheckoutFlow001 */
  readonly testClass: string;
  readonly signal?: AbortSignal;
  readonly onOutput?: (line: string) => void;
}

/**
 * Run a single JUnit test class via Maven surefire.
 */
export async function runMavenTest(options: MavenRunOptions): Promise<MavenRunResult> {
  const start = Date.now();
  const args = ['-Dtest=' + options.testClass, 'test', '-q'];

  return new Promise((resolve) => {
    const child = spawn('mvn', args, {
      cwd: options.cwd,
      env: process.env,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    const append = (chunk: Buffer, target: 'stdout' | 'stderr'): void => {
      const text = chunk.toString('utf8');
      if (target === 'stdout') stdout += text;
      else stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().length > 0) options.onOutput?.(line);
      }
    };

    child.stdout.on('data', (chunk: Buffer) => append(chunk, 'stdout'));
    child.stderr.on('data', (chunk: Buffer) => append(chunk, 'stderr'));

    const onAbort = (): void => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000);
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', onAbort);
      const exitCode = code ?? 1;
      const combined = stdout + stderr;
      const buildSuccess = /BUILD SUCCESS/i.test(combined);
      resolve({
        success: exitCode === 0 && buildSuccess,
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - start,
      });
    });

    child.on('error', (error) => {
      options.signal?.removeEventListener('abort', onAbort);
      resolve({
        success: false,
        exitCode: 1,
        stdout,
        stderr: stderr + (error instanceof Error ? error.message : String(error)),
        durationMs: Date.now() - start,
      });
    });
  });
}
