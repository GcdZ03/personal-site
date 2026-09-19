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

/** The outbound URLs a project may carry, mirroring the content schema. */
export interface ProjectLinks {
  repo?: string;
  download?: string;
  demo?: string;
}

/** The subset of a project's frontmatter this module reasons about. */
export interface ProjectData {
  title: string;
  tier: Tier;
  order: number;
  links: ProjectLinks;
}

/** A content-collection entry, typed structurally so this file stays testable. */
export interface ProjectEntry<D extends ProjectData = ProjectData> {
  id: string;
  data: D;
}

/** What the pages iterate over: sortable fields hoisted, frontmatter kept. */
export interface ProjectListing<D extends ProjectData = ProjectData>
  extends ProjectSummary {
  data: D;
}

/**
 * Hoists the fields sortProjects and featuredProjects need out of frontmatter.
 * Both listing pages need the identical shape, so they share one mapping.
 */
export function toProjectListings<D extends ProjectData>(
  entries: ProjectEntry<D>[],
): ProjectListing<D>[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.data.title,
    tier: entry.data.tier,
    order: entry.data.order,
    data: entry.data,
  }));
}

/**
 * Where a project row points, decided in one place so every page agrees.
 *
 * A flagship goes to its own case study. Everything else links out, preferring
 * the source, then a download, then a hosted demo — the schema guarantees a
 * standard-tier project has at least one of the three, so only an archive
 * project can land on undefined and render as plain text.
 */
export function projectHref(project: ProjectListing): string | undefined {
  if (hasDetailPage(project.tier)) return `/projects/${project.id}`;
  const { repo, download, demo } = project.data.links;
  return repo ?? download ?? demo;
}
