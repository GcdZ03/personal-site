export type Tier = 'flagship' | 'standard' | 'archive';

export interface ProjectSummary {
  id: string;
  title: string;
  tier: Tier;
  order: number;
}

const TIER_RANK: Record<Tier, number> = {
  flagship: 0,
  standard: 1,
  archive: 2,
};

/** Tier first, then the explicit order field, then title as a stable tiebreak. */
export function sortProjects<T extends ProjectSummary>(projects: T[]): T[] {
  return [...projects].sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  );
}

/**
 * The homepage selection. Archive projects never surface here; because
 * sortProjects ranks flagship first, this naturally prefers case studies and
 * fills the remaining slots with standard projects.
 */
export function featuredProjects<T extends ProjectSummary>(
  projects: T[],
  limit = 3,
): T[] {
  return sortProjects(projects.filter((project) => project.tier !== 'archive')).slice(
    0,
    limit,
  );
}

/** Only flagship projects get their own case-study page. */
export function hasDetailPage(tier: Tier): boolean {
  return tier === 'flagship';
}

/** Keeps the homepage honest: no "All projects" link when there is no more to see. */
export function shouldShowAllProjectsLink(total: number, shown: number): boolean {
  return total > shown;
}
