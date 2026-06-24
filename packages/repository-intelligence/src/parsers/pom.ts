/** A single Maven dependency coordinate. */
export interface MavenDependency {
  readonly groupId: string;
  readonly artifactId: string;
  readonly version?: string;
  readonly scope?: string;
}

/** Parsed subset of a Maven POM relevant to framework detection. */
export interface PomManifest {
  readonly packaging?: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly dependencies: readonly MavenDependency[];
  readonly dependencyManagement: readonly MavenDependency[];
}

const TAG = (name: string): RegExp =>
  new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i');

/**
 * Parse Maven POM XML for dependency coordinates (E1-S2 T1).
 * Handles property placeholders and dependencyManagement blocks.
 */
export function parsePom(content: string): PomManifest {
  const properties = parseProperties(content);
  const dependencies = parseDependencyBlocks(content, 'dependencies').map((dep) =>
    resolveDependency(dep, properties),
  );
  const dependencyManagement = parseDependencyBlocks(content, 'dependencyManagement').map((dep) =>
    resolveDependency(dep, properties),
  );

  const packagingMatch = content.match(TAG('packaging'));
  const packaging = packagingMatch?.[1]?.trim();

  return {
    ...(packaging ? { packaging } : {}),
    properties,
    dependencies,
    dependencyManagement,
  };
}

/** Collect effective dependencies (direct + managed, deduped by coordinate). */
export function effectiveDependencies(manifest: PomManifest): readonly MavenDependency[] {
  const map = new Map<string, MavenDependency>();
  for (const dep of [...manifest.dependencyManagement, ...manifest.dependencies]) {
    map.set(`${dep.groupId}:${dep.artifactId}`, dep);
  }
  return [...map.values()];
}

/** Find the first dependency matching groupId and optional artifactId. */
export function findDependency(
  manifest: PomManifest,
  groupId: string,
  artifactId?: string,
): MavenDependency | undefined {
  return effectiveDependencies(manifest).find(
    (dep) =>
      dep.groupId === groupId && (artifactId === undefined || dep.artifactId === artifactId),
  );
}

function parseProperties(content: string): Record<string, string> {
  const block = content.match(TAG('properties'));
  if (!block?.[1]) return {};

  const props: Record<string, string> = {};
  const propTag = /<([\w.-]+)>([^<]*)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = propTag.exec(block[1])) !== null) {
    const key = match[1];
    const value = match[2];
    if (key && value !== undefined) {
      props[key] = value.trim();
    }
  }
  return props;
}

function parseDependencyBlocks(content: string, section: string): MavenDependency[] {
  const sectionMatch = content.match(TAG(section));
  if (!sectionMatch?.[1]) return [];

  const deps: MavenDependency[] = [];
  const depBlocks = sectionMatch[1].matchAll(/<dependency>([\s\S]*?)<\/dependency>/gi);
  for (const block of depBlocks) {
    const inner = block[1];
    if (!inner) continue;
    const groupId = readTag(inner, 'groupId');
    const artifactId = readTag(inner, 'artifactId');
    if (!groupId || !artifactId) continue;
    const version = readTag(inner, 'version');
    const scope = readTag(inner, 'scope');
    deps.push({
      groupId,
      artifactId,
      ...(version ? { version } : {}),
      ...(scope ? { scope } : {}),
    });
  }
  return deps;
}

function readTag(block: string, name: string): string | undefined {
  const match = block.match(TAG(name));
  return match?.[1]?.trim();
}

function resolveDependency(
  dep: MavenDependency,
  properties: Readonly<Record<string, string>>,
): MavenDependency {
  if (!dep.version) return dep;
  const resolved = resolveProperty(dep.version, properties);
  if (resolved === dep.version) return dep;
  return { ...dep, version: resolved };
}

function resolveProperty(value: string, properties: Readonly<Record<string, string>>): string {
  const match = value.match(/^\$\{([^}]+)\}$/);
  if (!match?.[1]) return value;
  return properties[match[1]] ?? value;
}
