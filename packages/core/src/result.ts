import type { SerializedError } from './errors.js';

/**
 * Result<T> — the universal return type for fallible operations (resolution I-03).
 *
 * Services never throw across boundaries; they return a Result. The IPC layer
 * relies on this exact shape as its wire contract (architecture §2.4).
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: SerializedError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (error: SerializedError): Result<never> => ({ ok: false, error });

export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok;
}

export function isErr<T>(result: Result<T>): result is { ok: false; error: SerializedError } {
  return !result.ok;
}

/** Unwrap a Result, throwing the reconstructed error if it failed. Use only on trusted boundaries. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw new Error(`[${result.error.code}] ${result.error.userMessage}`);
}
