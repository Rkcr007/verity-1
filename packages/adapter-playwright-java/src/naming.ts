/**
 * Map semantic test slug to Playwright Java class name.
 */
export function semanticSlugToClassName(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
