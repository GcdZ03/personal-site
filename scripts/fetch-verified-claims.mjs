import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { findInCode, mergeClaims, parseTestCount } from '../src/lib/claims.mjs';

const OUTPUT = new URL('../src/data/verified-claims.json', import.meta.url);

// Reading a job's log needs a token even on a public repository. The GitHub
// CLI's is the usual source on a laptop; without either, the test counts keep
// their committed values and everything else still refreshes.
function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

const auth = token();
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'personal-site-build',
  ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
};

async function get(url, as = 'json') {
  // npm's registry refuses GitHub's media type with a 406.
  const response = await fetch(url, {
    headers: url.startsWith('https://registry.npmjs.org/') ? { 'User-Agent': headers['User-Agent'] } : headers,
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  if (as === 'json') return response.json();
  if (as === 'text') return response.text();
  return Buffer.from(await response.arrayBuffer());
}

const now = new Date().toISOString();
const failed = (id, error) => {
  console.warn(`  ${id}: kept previous value (${error.message})`);
  return { id, failed: true };
};

/**
 * The newest green push to main of the repo's CI workflow. The repo-wide runs
 * listing is filtered here rather than asking the per-workflow endpoint,
 * whose `status=success` listing returned runs a month stale.
 */
async function latestGreenRun(slug) {
  const url = `https://api.github.com/repos/${slug}/actions/runs?branch=main&event=push&status=success&per_page=50`;
  const { workflow_runs: runs = [] } = await get(url);
  const [run] = runs
    .filter((candidate) => candidate.path === '.github/workflows/ci.yml')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!run) throw new Error(`no green CI run on main for ${slug}`);
  return run;
}

/** The largest test count any job of the run reports; matrix jobs repeat it. */
async function testsInRun(slug, run) {
  if (!auth) throw new Error('no GitHub token, so no job logs');
  const { jobs } = await get(`${run.jobs_url}?per_page=100`);
  let count = null;
  for (const job of jobs) {
    const log = await get(`https://api.github.com/repos/${slug}/actions/jobs/${job.id}/logs`, 'text');
    const found = parseTestCount(log);
    if (found !== null) count = Math.max(count ?? 0, found);
  }
  if (count === null) throw new Error(`no test summary in run ${run.id}`);
  return count;
}

async function testsFact(slug, run, label) {
  try {
    const count = await testsInRun(slug, run);
    return {
      id: 'tests',
      value: count,
      label,
      short: `${count} tests passing`,
      source: `CI run ${run.id}`,
      href: run.html_url,
      checkedAt: now,
    };
  } catch (error) {
    return failed('tests', error);
  }
}

/** The repository's files at `sha`, read from GitHub's tarball. */
async function sourceAt(slug, sha, underDir) {
  const dir = await mkdtemp(join(tmpdir(), 'claims-'));
  try {
    const archive = join(dir, 'src.tar.gz');
    await writeFile(archive, await get(`https://codeload.github.com/${slug}/tar.gz/${sha}`, 'buffer'));
    execFileSync('tar', ['-xzf', archive, '-C', dir]);
    const [top] = (await readdir(dir)).filter((name) => name !== 'src.tar.gz');
    const root = join(dir, top);
    const files = [];
    for (const entry of await readdir(join(root, underDir), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.swift')) continue;
      const full = join(entry.parentPath, entry.name);
      files.push({ path: relative(root, full).split(sep).join('/'), text: await readFile(full, 'utf8') });
    }
    return files;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A count of code lines matching `pattern`, linked to the first one. */
function countFact(slug, sha, files, { id, pattern, search, label, short }) {
  const matches = findInCode(files, pattern);
  const [first] = matches;
  return {
    id,
    value: matches.length,
    label,
    short: short(matches.length),
    source: first ? `${first.path.split('/').pop()}:${first.line}` : 'code search',
    href: first
      ? `https://github.com/${slug}/blob/${sha}/${first.path}#L${first.line}`
      : `https://github.com/search?q=${encodeURIComponent(`repo:${slug} ${search}`)}&type=code`,
    checkedAt: now,
  };
}

async function creativeNotch() {
  const slug = 'GcdZ03/CreativeNotch';
  const run = await latestGreenRun(slug);
  const sha = run.head_sha;
  const facts = [await testsFact(slug, run, 'tests passing in CI')];

  try {
    const files = await sourceAt(slug, sha, 'Sources');
    facts.push(
      countFact(slug, sha, files, {
        id: 'repeating-timers',
        pattern: /repeats:\s*true/,
        search: 'repeats: true',
        label: 'repeating Timer in the app source',
        short: (n) => `${n} repeating timer${n === 1 ? '' : 's'}`,
      }),
      countFact(slug, sha, files, {
        id: 'global-monitors',
        pattern: /addGlobalMonitorForEvents\(/,
        search: 'addGlobalMonitorForEvents',
        label: 'global event monitor, installed only while the panel is open',
        short: (n) => `${n} global monitor${n === 1 ? '' : 's'}`,
      }),
      countFact(slug, sha, files, {
        id: 'event-taps',
        pattern: /CGEvent\.tapCreate|CGEventTapCreate/,
        search: 'tapCreate',
        label: 'event taps, so nothing asks for Accessibility',
        short: (n) => `${n} event tap${n === 1 ? '' : 's'}`,
      }),
    );
  } catch (error) {
    for (const id of ['repeating-timers', 'global-monitors', 'event-taps']) facts.push(failed(id, error));
  }

  try {
    const release = await get(`https://api.github.com/repos/${slug}/releases/latest`);
    facts.push({
      id: 'release',
      value: release.tag_name,
      label: 'latest release',
      short: release.tag_name,
      source: 'GitHub releases',
      href: release.html_url,
      checkedAt: now,
    });
  } catch (error) {
    facts.push(failed('release', error));
  }

  return { commit: sha.slice(0, 7), commitUrl: `https://github.com/${slug}/tree/${sha}`, facts };
}

async function prDecisionLog() {
  const slug = 'GcdZ03/pr-decision-log';
  const run = await latestGreenRun(slug);
  const facts = [await testsFact(slug, run, 'tests passing in CI, on Node 22 and 24')];

  try {
    const { version } = await get('https://registry.npmjs.org/pr-decision-log/latest');
    facts.push({
      id: 'npm',
      value: version,
      label: 'published on npm',
      short: `v${version} on npm`,
      source: 'npm registry',
      href: `https://www.npmjs.com/package/pr-decision-log/v/${version}`,
      checkedAt: now,
    });
  } catch (error) {
    facts.push(failed('npm', error));
  }

  return {
    commit: run.head_sha.slice(0, 7),
    commitUrl: `https://github.com/${slug}/tree/${run.head_sha}`,
    facts,
  };
}

async function attempt(name, read, ids) {
  try {
    return await read();
  } catch (error) {
    console.warn(`${name}: ${error.message}`);
    return { commit: null, commitUrl: null, facts: ids.map((id) => ({ id, failed: true })) };
  }
}

const previous = await readFile(OUTPUT, 'utf8').then(JSON.parse, () => null);
const projects = mergeClaims(previous, {
  'creative-notch': await attempt('CreativeNotch', creativeNotch, [
    'tests', 'repeating-timers', 'global-monitors', 'event-taps', 'release',
  ]),
  'pr-decision-log': await attempt('pr-decision-log', prDecisionLog, ['tests', 'npm']),
});
await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: now, projects }, null, 2)}\n`);
for (const [slug, project] of Object.entries(projects)) {
  console.log(`${slug}: ${project.facts.map((fact) => `${fact.id}=${fact.value}`).join(', ')}`);
}
