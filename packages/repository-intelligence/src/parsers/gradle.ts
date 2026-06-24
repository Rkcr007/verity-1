/** Parsed Gradle build signals (stub — full parser ships with Gradle adapter). */
export interface GradleManifest {
  readonly hasPlaywright: boolean;
  readonly hasJUnit5: boolean;
  readonly playwrightVersion?: string;
}

/**
 * Lightweight Gradle build.gradle / build.gradle.kts probe (E1-S2 T3 stub).
 */
export function parseGradleBuild(content: string): GradleManifest {
  const lower = content.toLowerCase();
  const hasPlaywright =
    lower.includes('com.microsoft.playwright') || lower.includes('playwright');
  const hasJUnit5 =
    lower.includes('org.junit.jupiter') || lower.includes('junit-jupiter');

  const versionMatch = content.match(
    /com\.microsoft\.playwright['":\s]+playwright['":\s]+['"]?([^'"\s]+)/i,
  );

  return {
    hasPlaywright,
    hasJUnit5,
    ...(versionMatch?.[1] ? { playwrightVersion: versionMatch[1] } : {}),
  };
}
