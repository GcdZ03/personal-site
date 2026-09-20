import { writeFile } from 'node:fs/promises';
import { summarizeRepo } from '../src/lib/github.mjs';

const REPOS = ['GcdZ03/CreativeNotch', 'GcdZ03/personal-site'];
const OUTPUT = new URL('../src/data/github-stats.json', import.meta.url);

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'personal-site-build',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

try {
  const repos = [];
  for (const slug of REPOS) {
    const repo = await getJson(`https://api.github.com/repos/${slug}`);
    if (!repo) continue;
    const release = await getJson(`https://api.github.com/repos/${slug}/releases/latest`);
    repos.push(summarizeRepo(repo, release));
  }
  if (repos.length === 0) throw new Error('no repositories resolved');
  await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), repos }, null, 2)}\n`);
  console.log(`Wrote stats for ${repos.length} repo(s).`);
} catch (error) {
  console.warn(`Stats refresh failed, keeping committed data: ${error.message}`);
  process.exit(0);
}
