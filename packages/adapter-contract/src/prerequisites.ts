/**
 * One prerequisite check (JDK, Maven, browser binaries, etc.).
 */
export interface PrerequisiteCheck {
  readonly name: string;
  readonly satisfied: boolean;
  readonly message: string;
  readonly guidance?: string;
}

/**
 * Aggregate prerequisite report before a test run (architecture §9.1, §11.2).
 */
export interface PrerequisiteReport {
  readonly ready: boolean;
  readonly checks: readonly PrerequisiteCheck[];
}

export function prerequisiteReport(checks: readonly PrerequisiteCheck[]): PrerequisiteReport {
  return {
    ready: checks.every((c) => c.satisfied),
    checks,
  };
}

export function satisfiedCheck(name: string, message: string): PrerequisiteCheck {
  return { name, satisfied: true, message };
}

export function failedCheck(name: string, message: string, guidance: string): PrerequisiteCheck {
  return { name, satisfied: false, message, guidance };
}
