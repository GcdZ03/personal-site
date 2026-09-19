import { describe, expect, it } from 'vitest';
import {
  sortProjects,
  featuredProjects,
  hasDetailPage,
  shouldShowAllProjectsLink,
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
