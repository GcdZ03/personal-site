/**
 * Turns raw evidence — CI logs and source files — into the figures the case
 * studies quote, so a number on the site is read from the thing it describes
 * rather than typed in by hand.
 *
 * Plain JavaScript for the same reason as `github.mjs`: the refresh script runs
 * under bare Node with no TypeScript loader.
 */

/**
 * @typedef {object} SourceFile
 * @property {string} path  Repo-relative, forward slashes.
 * @property {string} text
 */

/**
 * @typedef {object} Match
 * @property {string} path
 * @property {number} line  1-based.
 */

/**
 * @typedef {object} Fact
 * @property {string} id
 * @property {string | number} value
 * @property {string} label       What the value counts, set after it.
 * @property {string} short       The compact form for a project row.
 * @property {string} source      Link text for where the value was read.
 * @property {string} href        That place, as a URL.
 * @property {string} checkedAt   When this value was last read successfully.
 */

/**
 * @typedef {object} ProjectClaims
 * @property {string | null} commit      The commit the source facts were read at.
 * @property {string | null} commitUrl
 * @property {Fact[]} facts
 */

/**
 * @typedef {object} VerifiedClaims
 * @property {string} generatedAt
 * @property {Record<string, ProjectClaims>} projects
 */

/**
 * The number of tests a green CI log reports, from whichever runner wrote it.
 * Swift Testing and node:test print a summary line; XCTest's summary is
 * skipped when it reports zero, because a Swift package prints one for the
 * empty XCTest bundle alongside the Swift Testing total.
 *
 * @param {string} log
 * @returns {number | null}
 */
export function parseTestCount(log) {
  const swift = log.match(/Test run with (\d+) tests? in \d+ suites? passed/);
  if (swift) return Number(swift[1]);

  const node = log.match(/^.*# tests (\d+)\s*$/m);
  if (node) return Number(node[1]);

  for (const xc of log.matchAll(/Executed (\d+) tests?, with 0 failures/g)) {
    if (Number(xc[1]) > 0) return Number(xc[1]);
  }
  return null;
}

/**
 * Every line of code matching `pattern`, ignoring lines that are comments —
 * a doc comment that names a forbidden API is not a use of it.
 *
 * @param {SourceFile[]} files
 * @param {RegExp} pattern
 * @returns {Match[]}
 */
export function findInCode(files, pattern) {
  /** @type {Match[]} */
  const matches = [];
  for (const file of files) {
    file.text.split('\n').forEach((line, index) => {
      if (line.trimStart().startsWith('//')) return;
      if (pattern.test(line)) matches.push({ path: file.path, line: index + 1 });
    });
  }
  return matches;
}

/**
 * Keeps each fact that could not be re-read at its last good value, with its
 * old `checkedAt`, so one failed request never blanks a number or claims a
 * check that did not happen.
 *
 * @param {VerifiedClaims | null} previous
 * @param {Record<string, { commit: string | null, commitUrl: string | null, facts: (Fact | { id: string, failed: true })[] }>} fresh
 * @returns {Record<string, ProjectClaims>}
 */
export function mergeClaims(previous, fresh) {
  /** @type {Record<string, ProjectClaims>} */
  const merged = {};
  for (const [slug, project] of Object.entries(fresh)) {
    const old = previous?.projects?.[slug];
    const facts = [];
    for (const fact of project.facts) {
      if (!('failed' in fact)) {
        facts.push(fact);
        continue;
      }
      const kept = old?.facts.find((candidate) => candidate.id === fact.id);
      if (kept) facts.push(kept);
    }
    merged[slug] = {
      commit: project.commit ?? old?.commit ?? null,
      commitUrl: project.commitUrl ?? old?.commitUrl ?? null,
      facts,
    };
  }
  return merged;
}
