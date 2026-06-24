/** Parsed npm manifest fields used for adapter detection. */
export interface PackageJsonManifest {
  readonly name?: string;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
}

/**
 * Parse package.json for dependency signals (E1-S2 T2).
 */
export function parsePackageJson(content: string): PackageJsonManifest | null {
  try {
    const raw = JSON.parse(content) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
      dependencies: raw.dependencies ?? {},
      devDependencies: raw.devDependencies ?? {},
    };
  } catch {
    return null;
  }
}

/** Merged dependency map (dev wins on collision). */
export function allDependencies(manifest: PackageJsonManifest): Readonly<Record<string, string>> {
  return { ...manifest.dependencies, ...manifest.devDependencies };
}
