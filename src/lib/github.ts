export interface GitHubRepo {
  name: string;
  html_url: string;
  stargazers_count: number;
  pushed_at: string;
}

export interface GitHubRelease {
  tag_name: string;
}

export interface RepoStats {
  name: string;
  url: string;
  stars: number;
  latestRelease: string | null;
  lastPushed: string;
}

export interface GitHubStats {
  generatedAt: string;
  repos: RepoStats[];
}

export function summarizeRepo(
  repo: GitHubRepo,
  release: GitHubRelease | null,
): RepoStats {
  return {
    name: repo.name,
    url: repo.html_url,
    stars: repo.stargazers_count ?? 0,
    latestRelease: release?.tag_name ?? null,
    lastPushed: repo.pushed_at,
  };
}
