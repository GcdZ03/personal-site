import { describe, expect, it } from 'vitest';
import {
  sortProjects,
  featuredProjects,
  hasDetailPage,
  shouldShowAllProjectsLink,
  toProjectListings,
  projectHref,
  type ProjectLinks,
  type ProjectListing,
  type ProjectSummary,
} from '@/lib/projects';

const p = (
  id: string,
  tier: ProjectSummary['tier'],
  order: number,
  title = id,
): ProjectSummary => ({ id, title, tier, order });

describe('sortProjects', () => {
  it('orders flagship before standard before archive', () => {
    const input = [p('c', 'archive', 1), p('a', 'flagship', 1), p('b', 'standard', 1)];
    expect(sortProjects(input).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('orders by the order field within a tier', () => {
    const input = [p('b', 'standard', 2), p('a', 'standard', 1)];
    expect(sortProjects(input).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('falls back to title when tier and order tie', () => {
    const input = [p('z', 'standard', 1, 'Zebra'), p('a', 'standard', 1, 'Apple')];
    expect(sortProjects(input).map((x) => x.id)).toEqual(['a', 'z']);
  });

  it('does not mutate its input', () => {
    const input = [p('b', 'standard', 2), p('a', 'flagship', 1)];
    sortProjects(input);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('featuredProjects', () => {
  it('returns at most three by default', () => {
    const input = [
      p('a', 'flagship', 1), p('b', 'standard', 1),
      p('c', 'standard', 2), p('d', 'standard', 3),
    ];
    expect(featuredProjects(input).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes archive projects', () => {
    const input = [p('a', 'flagship', 1), p('z', 'archive', 1)];
    expect(featuredProjects(input).map((x) => x.id)).toEqual(['a']);
  });

  it('returns the single project when only one exists', () => {
    expect(featuredProjects([p('a', 'flagship', 1)]).map((x) => x.id)).toEqual(['a']);
  });

  it('returns an empty array for no projects', () => {
    expect(featuredProjects([])).toEqual([]);
  });
});

describe('hasDetailPage', () => {
  it('is true only for flagship', () => {
    expect(hasDetailPage('flagship')).toBe(true);
    expect(hasDetailPage('standard')).toBe(false);
    expect(hasDetailPage('archive')).toBe(false);
  });
});

describe('shouldShowAllProjectsLink', () => {
  it('is hidden when everything is already shown', () => {
    expect(shouldShowAllProjectsLink(3, 3)).toBe(false);
    expect(shouldShowAllProjectsLink(1, 1)).toBe(false);
  });

  it('is shown when projects exist beyond those displayed', () => {
    expect(shouldShowAllProjectsLink(4, 3)).toBe(true);
  });
});

const listing = (
  id: string,
  tier: ProjectSummary['tier'],
  links: ProjectLinks,
): ProjectListing => ({
  id,
  title: id,
  tier,
  order: 1,
  data: { title: id, tier, order: 1, links },
});

const REPO = 'https://github.com/GcdZ03/Thing';
const DOWNLOAD = 'https://example.com/Thing.dmg';
const DEMO = 'https://thing.example.com';

describe('toProjectListings', () => {
  it('hoists the sortable fields and keeps the frontmatter', () => {
    const entry = {
      id: 'thing',
      data: { title: 'Thing', tier: 'standard' as const, order: 2, links: { repo: REPO } },
    };
    expect(toProjectListings([entry])).toEqual([
      { id: 'thing', title: 'Thing', tier: 'standard', order: 2, data: entry.data },
    ]);
  });
});

describe('projectHref', () => {
  it('sends a flagship to its case study', () => {
    expect(projectHref(listing('creative-notch', 'flagship', {}))).toBe(
      '/projects/creative-notch',
    );
  });

  it('prefers the case study over the outbound links a flagship also carries', () => {
    expect(projectHref(listing('creative-notch', 'flagship', { repo: REPO }))).toBe(
      '/projects/creative-notch',
    );
  });

  it('links a standard project to its repo', () => {
    expect(projectHref(listing('thing', 'standard', { repo: REPO }))).toBe(REPO);
  });

  it('links a standard project with only a download to that download', () => {
    expect(projectHref(listing('thing', 'standard', { download: DOWNLOAD }))).toBe(
      DOWNLOAD,
    );
  });

  it('links a standard project with only a demo to that demo', () => {
    expect(projectHref(listing('thing', 'standard', { demo: DEMO }))).toBe(DEMO);
  });

  it('prefers repo over download when a standard project has both', () => {
    expect(
      projectHref(listing('thing', 'standard', { repo: REPO, download: DOWNLOAD })),
    ).toBe(REPO);
  });

  it('prefers download over demo when there is no repo', () => {
    expect(
      projectHref(listing('thing', 'standard', { download: DOWNLOAD, demo: DEMO })),
    ).toBe(DOWNLOAD);
  });

  it('has nowhere to send a linkless archive project', () => {
    expect(projectHref(listing('old', 'archive', {}))).toBeUndefined();
  });
});
