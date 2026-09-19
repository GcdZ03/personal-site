/**
 * The one mapping from GitHub's API shape to the shape the site renders.
 *
 * Plain JavaScript on purpose: `scripts/fetch-github-stats.mjs` is run by Node
 * directly, with no build step and no TypeScript loader, so a `.ts` module
 * could not be the implementation the script actually executes. Types live in
 * JSDoc, which the TypeScript compiler reads for `.mjs` consumers just as it
 * would a `.ts` file, so `src/lib/github.test.ts` still type-checks.
 */

/**
 * @typedef {object} GitHubRepo
 * @property {string} name
 * @property {string} html_url
 * @property {number} stargazers_count
 * @property {string} pushed_at
 */

/**
 * @typedef {object} GitHubRelease
 * @property {string} tag_name
 */

/**
 * @typedef {object} RepoStats
 * @property {string} name
 * @property {string} url
 * @property {number} stars
 * @property {string | null} latestRelease
 * @property {string} lastPushed
 */

/**
 * @typedef {object} GitHubStats
 * @property {string} generatedAt
 * @property {RepoStats[]} repos
 */

/**
 * @param {GitHubRepo} repo
 * @param {GitHubRelease | null} release
 * @returns {RepoStats}
 */
export function summarizeRepo(repo, release) {
  return {
    name: repo.name,
    url: repo.html_url,
    stars: repo.stargazers_count ?? 0,
    latestRelease: release?.tag_name ?? null,
    lastPushed: repo.pushed_at,
  };
}
