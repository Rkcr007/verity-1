/**
 * VerityError hierarchy (resolution I-03, architecture §2.4).
 *
 * Domain errors are typed, carry a stable `code`, a `userMessage` safe to show
 * in the UI, and a `recoverable` flag. Raw stack traces never cross IPC; they
 * are serialized to `SerializedError` first.
 */

export type VerityErrorCode =
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PERSISTENCE'
  | 'IPC_CHANNEL_UNKNOWN'
  | 'IPC_HANDLER_FAILED'
  | 'PREREQUISITE_FAILED'
  | 'GIT_OPERATION_FAILED'
  | 'AI_UNAVAILABLE';

export interface SerializedError {
  readonly code: VerityErrorCode;
  readonly userMessage: string;
  readonly recoverable: boolean;
  /** Developer-facing detail; never rendered in the UI. */
  readonly detail?: string;
}

export class VerityError extends Error {
  readonly code: VerityErrorCode;
  readonly userMessage: string;
  readonly recoverable: boolean;
  readonly detail?: string;

  constructor(params: {
    code: VerityErrorCode;
    userMessage: string;
    recoverable?: boolean;
    detail?: string;
    cause?: unknown;
  }) {
    super(params.userMessage, params.cause !== undefined ? { cause: params.cause } : undefined);
    this.name = 'VerityError';
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.recoverable = params.recoverable ?? true;
    if (params.detail !== undefined) this.detail = params.detail;
  }

  serialize(): SerializedError {
    return {
      code: this.code,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      ...(this.detail !== undefined ? { detail: this.detail } : {}),
    };
  }

  /** Normalize any thrown value into a SerializedError for transport over IPC. */
  static from(error: unknown): SerializedError {
    if (error instanceof VerityError) return error.serialize();
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN',
        userMessage: 'An unexpected error occurred.',
        recoverable: true,
        detail: error.message,
      };
    }
    return {
      code: 'UNKNOWN',
      userMessage: 'An unexpected error occurred.',
      recoverable: true,
      detail: String(error),
    };
  }
}

export class ValidationError extends VerityError {
  constructor(userMessage: string, detail?: string) {
    super({ code: 'VALIDATION', userMessage, recoverable: true, ...(detail ? { detail } : {}) });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends VerityError {
  constructor(userMessage: string, detail?: string) {
    super({ code: 'NOT_FOUND', userMessage, recoverable: true, ...(detail ? { detail } : {}) });
    this.name = 'NotFoundError';
  }
}

export class PersistenceError extends VerityError {
  constructor(userMessage: string, detail?: string) {
    super({
      code: 'PERSISTENCE',
      userMessage,
      recoverable: false,
      ...(detail ? { detail } : {}),
    });
    this.name = 'PersistenceError';
  }
}

/** Thrown when an IPC channel is catalogued but not yet implemented for the current milestone. */
export class NotImplementedError extends VerityError {
  constructor(feature: string) {
    super({
      code: 'IPC_HANDLER_FAILED',
      userMessage: `${feature} is not available yet.`,
      recoverable: true,
      detail: 'Handler ships in a later milestone.',
    });
    this.name = 'NotImplementedError';
  }
}

/** Thrown when a git CLI operation fails or is rejected. */
export class GitOperationError extends VerityError {
  constructor(userMessage: string, detail?: string) {
    super({
      code: 'GIT_OPERATION_FAILED',
      userMessage,
      recoverable: true,
      ...(detail ? { detail } : {}),
    });
    this.name = 'GitOperationError';
  }
}
