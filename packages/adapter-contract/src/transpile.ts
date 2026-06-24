/**
 * A single file emitted by transpilation — projection of the semantic model.
 */
export type TranspileFileType = 'create' | 'modify';

export interface TranspileFile {
  readonly path: string;
  readonly content: string;
  readonly type: TranspileFileType;
}

/**
 * Result of transpiling a semantic test to framework code (architecture §9.1).
 */
export interface TranspileResult {
  readonly files: readonly TranspileFile[];
  readonly warnings: readonly string[];
}

export function transpileResult(
  files: readonly TranspileFile[],
  warnings: readonly string[] = [],
): TranspileResult {
  return { files, warnings };
}
