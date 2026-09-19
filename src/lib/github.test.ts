import { describe, expect, it } from 'vitest';
import { summarizeRepo } from '@/lib/github.mjs';
import type { GitHubRepo, GitHubRelease } from '@/lib/github.mjs';

const repo: GitHubRepo = {
  name: 'CreativeNotch',
  html_url: 'https://github.com/GcdZ03/CreativeNotch',
  stargazers_count: 12,
  pushed_at: '2026-09-13T00:00:00Z',
};

describe('summarizeRepo', () => {
  it('maps the API shape to the rendered shape', () => {
    const release: GitHubRelease = { tag_name: 'v0.5.0' };
    expect(summarizeRepo(repo, release)).toEqual({
      name: 'CreativeNotch',
      url: 'https://github.com/GcdZ03/CreativeNotch',
      stars: 12,
      latestRelease: 'v0.5.0',
      lastPushed: '2026-09-13T00:00:00Z',
    });
  });

  it('tolerates a repository with no releases', () => {
    expect(summarizeRepo(repo, null).latestRelease).toBeNull();
  });

  it('treats a missing star count as zero', () => {
    const bare = { ...repo, stargazers_count: undefined } as unknown as GitHubRepo;
    expect(summarizeRepo(bare, null).stars).toBe(0);
  });
});
