import claims from '@/data/verified-claims.json';
import type { Fact, ProjectClaims } from '@/lib/claims.mjs';

const byProject = claims.projects as Record<string, ProjectClaims>;

/** The checked facts for a project, or null when none have been read. */
export function claimsFor(slug: string): ProjectClaims | null {
  const project = byProject[slug];
  return project && project.facts.length > 0 ? project : null;
}

/**
 * The few facts a project row has room for. The release tag is left out: it
 * already appears in the homepage's GitHub list.
 */
export function rowProof(slug: string, limit = 3): string[] {
  return (claimsFor(slug)?.facts ?? [])
    .filter((fact) => fact.id !== 'release')
    .slice(0, limit)
    .map((fact) => fact.short);
}

/**
 * The date a block of facts can honestly claim: the oldest check among them,
 * since a fact that failed to refresh keeps its earlier date.
 */
export function checkedOn(facts: Pick<Fact, 'checkedAt'>[]): Date | null {
  const times = facts.map((fact) => Date.parse(fact.checkedAt)).filter(Number.isFinite);
  return times.length > 0 ? new Date(Math.min(...times)) : null;
}
