# Personal Developer Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static personal developer site that introduces Gerald Chang, features CreativeNotch as a case study, and makes adding future side projects a one-file change.

**Architecture:** Astro compiles Markdown content collections and `.astro` pages to static HTML at build time. There is no server code in the request path — no functions, no database, no runtime secrets. GitHub statistics are fetched during the build by a Node script and committed as JSON, so the site renders identically with or without network access. Cloudflare Pages builds on push to `main`.

**Tech Stack:** Astro 7.3.3, TypeScript (strict), Tailwind CSS 4.3.3 via `@tailwindcss/vite`, Vitest 5.0.1, `@astrojs/check` 0.9.10, GitHub Actions, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-19-personal-site-design.md`

## Global Constraints

- Node `>=22.12.0` and npm `>=9.6.5` are required by Astro 7. The dev machine has Node v26.3.1 and npm 11.16.0.
- `output` stays static. Never add an SSR adapter, an API route, or a `.server.ts` file — the spec's core constraint is that nothing executes per request.
- No runtime secrets. The only credential in the system is a GitHub token used inside CI and never emitted into build output.
- No new third-party accounts. GitHub and Cloudflare are the only two permitted.
- Tailwind 4 is configured through the Vite plugin and a CSS `@import "tailwindcss"` directive. There is no `tailwind.config.js` and the legacy `@astrojs/tailwind` integration must not be installed.
- Content collections are declared in `src/content.config.ts` (singular, at `src/` root — not `src/content/config.ts`).
- Tier vocabulary is exactly `flagship` | `standard` | `archive`. Never introduce a fourth tier or rename these.
- Every commit message uses Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

---

## File Structure

| Path | Responsibility |
|---|---|
| `astro.config.mjs` | Astro + Tailwind Vite plugin wiring. Static output. |
| `src/content.config.ts` | Collection definitions and Zod schemas for `projects` and `posts`. |
| `src/lib/projects.ts` | Pure tier/sort/feature-selection logic. No Astro imports, so it is unit-testable. |
| `src/lib/projects.test.ts` | Tests for the above. |
| `src/lib/github.ts` | Pure transform from GitHub API shapes to the stats the site renders. No network. |
| `src/lib/github.test.ts` | Tests for the above. |
| `scripts/fetch-github-stats.mjs` | Performs the network call in CI, writes `src/data/github-stats.json`. Fails soft. |
| `src/data/github-stats.json` | Committed build input. Guarantees the site builds offline. |
| `src/data/experience.ts` | Career timeline and skill groups, structured. |
| `src/layouts/BaseLayout.astro` | HTML shell: head, meta, nav, footer, theme. |
| `src/components/ProjectRow.astro` | One project as a row. The arity-independent layout primitive. |
| `src/pages/index.astro` | Homepage. |
| `src/pages/projects/index.astro` | Project index. |
| `src/pages/projects/[...slug].astro` | Case study. Generated for `flagship` only. |
| `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro` | Blog. |
| `src/pages/about.astro` | Bio, experience timeline, skills. |
| `src/styles/global.css` | Tailwind import plus design tokens. |
| `src/content/projects/*.md` | Project entries. |
| `.github/workflows/ci.yml` | `astro check`, Vitest, build, link check. |

Splitting `src/lib/*` away from `.astro` files is deliberate: pure functions can be tested by Vitest without an Astro runtime, which is what makes the "site shape follows content" rules verifiable rather than eyeballed.

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/styles/global.css`, `src/pages/index.astro`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run build`, `npm run dev`, `npm run check`, `npm test`. Later tasks assume Tailwind classes work in any `.astro` file and that `@/` resolves to `src/`.

- [ ] **Step 1: Initialise the package**

Run from the repo root (`~/Documents/Github/personal-site`). The repo already contains `docs/`, so scaffold in place rather than creating a subdirectory.

```bash
npm init -y
npm install astro@7.3.3
npm install -D typescript @astrojs/check@0.9.10 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest@5.0.1
```

- [ ] **Step 2: Write `package.json` scripts**

Replace the `scripts` block in `package.json` with exactly:

```json
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "stats": "node scripts/fetch-github-stats.mjs"
  },
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://personal-site.pages.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

The `site` value is corrected in Task 10 once the real Cloudflare subdomain is known.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Write `src/styles/global.css`**

```css
@import "tailwindcss";
```

Design tokens are added to this file in Task 9. Keep it minimal until then.

- [ ] **Step 7: Write a placeholder `src/pages/index.astro`**

```astro
---
import '@/styles/global.css';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gerald Chang</title>
  </head>
  <body class="bg-white text-neutral-900">
    <main class="mx-auto max-w-2xl p-8">
      <h1 class="text-2xl font-semibold">Gerald Chang</h1>
    </main>
  </body>
</html>
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.DS_Store
*.tgz
```

- [ ] **Step 9: Verify the build works**

Run: `npm run build`
Expected: exits 0 and writes `dist/index.html`. Confirm the Tailwind classes are present by running `grep -c "bg-white" dist/index.html`, which should print a non-zero count. If it prints 0, the Vite plugin is not wired up — recheck Step 3.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro 7 project with Tailwind 4"
```

---

### Task 2: Project tier and ordering logic

This task exists before any page, because it encodes the spec's two growth rules — tier ordering and the conditional "All projects" link — as pure functions that can be tested directly.

**Files:**
- Create: `src/lib/projects.ts`
- Test: `src/lib/projects.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Tier = 'flagship' | 'standard' | 'archive'`
  - `interface ProjectSummary { id: string; title: string; tier: Tier; order: number }`
  - `sortProjects<T extends ProjectSummary>(projects: T[]): T[]`
  - `featuredProjects<T extends ProjectSummary>(projects: T[], limit?: number): T[]`
  - `hasDetailPage(tier: Tier): boolean`
  - `shouldShowAllProjectsLink(total: number, shown: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/projects.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/projects`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/projects.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects.ts src/lib/projects.test.ts
git commit -m "feat: add project tier ordering and feature-selection logic"
```

---

### Task 3: Content collections

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/projects/creative-notch.md`
- Create: `src/content/posts/.gitkeep`

**Interfaces:**
- Consumes: `Tier` from `src/lib/projects.ts`.
- Produces: collections `projects` and `posts`, importable via `getCollection('projects')` and `getCollection('posts')` from `astro:content`. Project entry `data` matches the schema below; `entry.id` is the slug derived from the filename.

- [ ] **Step 1: Write `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    tier: z.enum(['flagship', 'standard', 'archive']),
    stack: z.array(z.string()).min(1),
    role: z.string(),
    period: z.string(),
    links: z
      .object({
        repo: z.string().url().optional(),
        download: z.string().url().optional(),
        demo: z.string().url().optional(),
      })
      .default({}),
    order: z.number().int(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts };
```

- [ ] **Step 2: Create the empty posts directory**

```bash
mkdir -p src/content/posts && touch src/content/posts/.gitkeep
```

The `glob` loader tolerates an empty directory but not a missing one.

- [ ] **Step 3: Write the CreativeNotch entry**

Create `src/content/projects/creative-notch.md`. The body is the case study and is expanded in Task 11 — for now it needs enough to render.

```markdown
---
title: CreativeNotch
tagline: Turns the MacBook notch into something useful, without the battery drain.
tier: flagship
stack: ["Swift", "SwiftUI", "macOS 26+"]
role: Sole developer
period: 2026 — present
links:
  repo: https://github.com/GcdZ03/CreativeNotch
order: 1
---

The notch is the only part of a MacBook screen that no application can use.
CreativeNotch makes it a surface — without the constant polling that makes most
menu-bar utilities a measurable battery cost.
```

- [ ] **Step 4: Verify the schema validates**

Run: `npm run build`
Expected: exits 0. Then deliberately break it to confirm validation is active — change `tier: flagship` to `tier: featured`, run `npm run build` again, and expect a failure naming the invalid enum value. Restore `flagship` afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "feat: add project and post content collections"
```

---

### Task 4: Base layout and project row component

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/ProjectRow.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `src/styles/global.css`.
- Produces:
  - `BaseLayout` accepting props `{ title: string; description: string }` and a default slot.
  - `ProjectRow` accepting props `{ href?: string; title: string; tagline: string; stack: string[]; period: string }`.

- [ ] **Step 1: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '@/styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const nav = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Writing' },
  { href: '/about', label: 'About' },
];
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />
  </head>
  <body class="bg-white text-neutral-900 antialiased">
    <div class="mx-auto flex min-h-screen max-w-2xl flex-col px-6">
      <header class="flex gap-6 py-8 text-sm">
        {nav.map((item) => <a class="hover:underline" href={item.href}>{item.label}</a>)}
      </header>
      <main class="flex-1"><slot /></main>
      <footer class="py-12 text-sm text-neutral-500">
        <a class="hover:underline" href="https://github.com/GcdZ03">GitHub</a>
      </footer>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Write `src/components/ProjectRow.astro`**

This is the arity-independent primitive from the spec. It is a row, never a card in a fixed-column grid, so it composes correctly at any project count.

```astro
---
interface Props {
  href?: string;
  title: string;
  tagline: string;
  stack: string[];
  period: string;
}

const { href, title, tagline, stack, period } = Astro.props;
---
<article class="border-t border-neutral-200 py-6">
  <div class="flex items-baseline justify-between gap-4">
    <h3 class="font-medium">
      {href ? <a class="hover:underline" href={href}>{title}</a> : title}
    </h3>
    <span class="shrink-0 text-sm text-neutral-500">{period}</span>
  </div>
  <p class="mt-1 text-neutral-600">{tagline}</p>
  <ul class="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
    {stack.map((item) => <li class="rounded bg-neutral-100 px-2 py-1">{item}</li>)}
  </ul>
</article>
```

- [ ] **Step 3: Use the layout from the homepage**

Replace `src/pages/index.astro` with:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Gerald Chang" description="Developer. Builds macOS tools.">
  <h1 class="text-2xl font-semibold">Gerald Chang</h1>
</BaseLayout>
```

- [ ] **Step 4: Verify**

Run: `npm run build && npm run check`
Expected: both exit 0. `dist/index.html` contains the nav links.

- [ ] **Step 5: Commit**

```bash
git add src/layouts src/components src/pages/index.astro
git commit -m "feat: add base layout and project row component"
```

---

### Task 5: Project index page

**Files:**
- Create: `src/pages/projects/index.astro`

**Interfaces:**
- Consumes: `sortProjects`, `hasDetailPage` from `@/lib/projects`; `ProjectRow`; `BaseLayout`; the `projects` collection.
- Produces: the route `/projects`.

- [ ] **Step 1: Write the page**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import ProjectRow from '@/components/ProjectRow.astro';
import { sortProjects, hasDetailPage } from '@/lib/projects';

const entries = await getCollection('projects');
const projects = sortProjects(
  entries.map((entry) => ({
    id: entry.id,
    title: entry.data.title,
    tier: entry.data.tier,
    order: entry.data.order,
    data: entry.data,
  })),
);

const listed = projects.filter((project) => project.tier !== 'archive');
const archived = projects.filter((project) => project.tier === 'archive');
---
<BaseLayout title="Projects — Gerald Chang" description="Side projects and things built.">
  <h1 class="text-2xl font-semibold">Projects</h1>

  <div class="mt-8">
    {listed.map((project) => (
      <ProjectRow
        href={hasDetailPage(project.tier) ? `/projects/${project.id}` : project.data.links.repo}
        title={project.data.title}
        tagline={project.data.tagline}
        stack={project.data.stack}
        period={project.data.period}
      />
    ))}
  </div>

  {archived.length > 0 && (
    <section class="mt-12">
      <h2 class="text-sm font-medium text-neutral-500">Also built</h2>
      <ul class="mt-3 space-y-1 text-sm text-neutral-600">
        {archived.map((project) => (
          <li>
            {project.data.links.repo
              ? <a class="hover:underline" href={project.data.links.repo}>{project.data.title}</a>
              : project.data.title}
            <span class="text-neutral-400"> — {project.data.tagline}</span>
          </li>
        ))}
      </ul>
    </section>
  )}
</BaseLayout>
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run check`
Expected: exit 0, and `dist/projects/index.html` exists and contains "CreativeNotch".

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects/index.astro
git commit -m "feat: add project index page"
```

---

### Task 6: Case study pages

**Files:**
- Create: `src/pages/projects/[...slug].astro`

**Interfaces:**
- Consumes: `hasDetailPage`; the `projects` collection; `render` from `astro:content`.
- Produces: routes `/projects/<slug>` for `flagship` projects only. A `standard` or `archive` project must not produce a page — the index links those straight to their repository.

- [ ] **Step 1: Write the page**

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { hasDetailPage } from '@/lib/projects';

export const getStaticPaths = (async () => {
  const entries = await getCollection('projects');
  return entries
    .filter((entry) => hasDetailPage(entry.data.tier))
    .map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

const { entry } = Astro.props;
const { Content } = await render(entry);
const links = Object.entries(entry.data.links) as Array<[string, string]>;
---
<BaseLayout title={`${entry.data.title} — Gerald Chang`} description={entry.data.tagline}>
  <article>
    <h1 class="text-2xl font-semibold">{entry.data.title}</h1>
    <p class="mt-2 text-neutral-600">{entry.data.tagline}</p>

    <dl class="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt class="text-neutral-500">Role</dt><dd>{entry.data.role}</dd>
      <dt class="text-neutral-500">Period</dt><dd>{entry.data.period}</dd>
      <dt class="text-neutral-500">Stack</dt><dd>{entry.data.stack.join(', ')}</dd>
    </dl>

    {links.length > 0 && (
      <p class="mt-6 flex gap-4 text-sm">
        {links.map(([label, href]) => (
          <a class="underline" href={href}>{label}</a>
        ))}
      </p>
    )}

    <div class="prose mt-10 max-w-none"><Content /></div>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify only flagship pages are generated**

Run: `npm run build && ls dist/projects/`
Expected: a `creative-notch/` directory exists. Then temporarily change CreativeNotch's `tier` to `standard`, rebuild, and confirm `dist/projects/creative-notch/` is **absent**. Restore `flagship` and rebuild.

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects/\[...slug\].astro
git commit -m "feat: add flagship case study pages"
```

---

### Task 7: Homepage

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `featuredProjects`, `shouldShowAllProjectsLink`, `hasDetailPage`; the `projects` collection.
- Produces: the route `/`.

- [ ] **Step 1: Write the page**

The "All projects" link is conditional, so the homepage presents as a focused single-project site now and as an index later with no code change.

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import ProjectRow from '@/components/ProjectRow.astro';
import { featuredProjects, shouldShowAllProjectsLink, hasDetailPage } from '@/lib/projects';

const entries = await getCollection('projects');
const all = entries.map((entry) => ({
  id: entry.id,
  title: entry.data.title,
  tier: entry.data.tier,
  order: entry.data.order,
  data: entry.data,
}));

const featured = featuredProjects(all);
const showAllLink = shouldShowAllProjectsLink(all.length, featured.length);

// TASK BLOCKER: ask the author for their LinkedIn URL before this page ships.
// The spec names email, GitHub and LinkedIn as the full contact surface. Do not
// guess the handle — a wrong profile link is worse than no link. If the author
// does not want a LinkedIn presence, delete the anchor below instead.
const LINKEDIN_URL = 'https://www.linkedin.com/in/REPLACE-ME';
---
<BaseLayout title="Gerald Chang" description="Developer. Builds macOS tools.">
  <section class="py-8">
    <h1 class="text-2xl font-semibold">Gerald Chang</h1>
    <p class="mt-3 max-w-prose text-neutral-600">
      Developer. I build macOS tools that respect the machine they run on.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-sm font-medium text-neutral-500">Selected work</h2>
    <div class="mt-3">
      {featured.map((project) => (
        <ProjectRow
          href={hasDetailPage(project.tier) ? `/projects/${project.id}` : project.data.links.repo}
          title={project.data.title}
          tagline={project.data.tagline}
          stack={project.data.stack}
          period={project.data.period}
        />
      ))}
    </div>
    {showAllLink && <p class="mt-6 text-sm"><a class="underline" href="/projects">All projects →</a></p>}
  </section>

  <section class="mt-12">
    <h2 class="text-sm font-medium text-neutral-500">Elsewhere</h2>
    <p class="mt-3 flex gap-4 text-sm">
      <a class="underline" href="https://github.com/GcdZ03">GitHub</a>
      <a class="underline" href={LINKEDIN_URL}>LinkedIn</a>
      <a class="underline" href="mailto:dezhengchang@gmail.com">Email</a>
    </p>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify the conditional link**

Run: `npm run build && grep -c "All projects" dist/index.html`
Expected: `0`, because only one project exists. Then add a throwaway `src/content/projects/tmp-a.md`, `tmp-b.md`, `tmp-c.md` (tier `standard`, orders 10/11/12, any title and tagline, `stack: ["TypeScript"]`, `role: Sole developer`, `period: 2026`), rebuild, and expect the count to become `1`. Delete the three temporary files and rebuild.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add homepage with content-driven project selection"
```

---

### Task 8: Blog and about page

**Files:**
- Create: `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`
- Create: `src/data/experience.ts`, `src/pages/about.astro`
- Create: `src/content/posts/hello.md`

**Interfaces:**
- Consumes: the `posts` collection; `BaseLayout`.
- Produces: routes `/blog`, `/blog/<slug>`, `/about`; `experience: Role[]` and `skills: SkillGroup[]` from `@/data/experience`.

**Note on scope:** the site deliberately hosts no resume document. The author
tailors a PDF per application, so a generic copy here would be a weaker version
than the one an employer receives. This page is a profile, not a resume, and must
not link to or generate a downloadable CV.

- [ ] **Step 1: Write a first post so the index has content**

Create `src/content/posts/hello.md`:

```markdown
---
title: Why CreativeNotch does not poll
description: A note on choosing an event-driven design over a timer, and what it cost.
date: 2026-09-19
---

Most menu-bar utilities poll. Polling is simple, and on a laptop it is a
measurable battery cost. This is what choosing the harder path bought.
```

- [ ] **Step 2: Write `src/pages/blog/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';

const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime(),
);
const formatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
---
<BaseLayout title="Writing — Gerald Chang" description="Notes on building things.">
  <h1 class="text-2xl font-semibold">Writing</h1>
  {posts.length === 0 && <p class="mt-6 text-neutral-600">Nothing published yet.</p>}
  <div class="mt-8">
    {posts.map((post) => (
      <article class="border-t border-neutral-200 py-6">
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="font-medium">
            <a class="hover:underline" href={`/blog/${post.id}`}>{post.data.title}</a>
          </h2>
          <time class="shrink-0 text-sm text-neutral-500" datetime={post.data.date.toISOString()}>
            {formatter.format(post.data.date)}
          </time>
        </div>
        <p class="mt-1 text-neutral-600">{post.data.description}</p>
      </article>
    ))}
  </div>
</BaseLayout>
```

- [ ] **Step 3: Write `src/pages/blog/[...slug].astro`**

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';

export const getStaticPaths = (async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

const { post } = Astro.props;
const { Content } = await render(post);
const formatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
---
<BaseLayout title={`${post.data.title} — Gerald Chang`} description={post.data.description}>
  <article>
    <h1 class="text-2xl font-semibold">{post.data.title}</h1>
    <time class="mt-2 block text-sm text-neutral-500" datetime={post.data.date.toISOString()}>
      {formatter.format(post.data.date)}
    </time>
    <div class="prose mt-10 max-w-none"><Content /></div>
  </article>
</BaseLayout>
```

- [ ] **Step 4: Write `src/data/experience.ts`**

**TASK BLOCKER:** the placeholder below must be replaced with the author's real
history and real skills before Task 10 deploys publicly. Ask the author for both.
Do not invent roles, dates, or proficiencies — a fabricated CV is worse than an
empty page.

Skills are grouped lists with no proficiency levels. The spec excludes percentage
bars and star ratings deliberately: they quantify something unmeasurable and read
as inexperienced to the engineers reviewing them.

```ts
export interface Role {
  organisation: string;
  title: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export const experience: Role[] = [
  {
    organisation: 'Independent',
    title: 'Developer',
    period: '2026 — present',
    summary: 'Building macOS developer tools, most recently CreativeNotch.',
    highlights: [
      'Shipped CreativeNotch v0.5.0, an event-driven macOS notch utility.',
    ],
  },
];

export const skills: SkillGroup[] = [
  { label: 'Languages', items: ['Swift', 'TypeScript'] },
  { label: 'Platforms', items: ['macOS', 'Web'] },
  { label: 'Tools', items: ['Git', 'Xcode'] },
];
```

- [ ] **Step 5: Write `src/pages/about.astro`**

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import { experience, skills } from '@/data/experience';
---
<BaseLayout title="About — Gerald Chang" description="Experience, skills and background.">
  <h1 class="text-2xl font-semibold">About</h1>
  <p class="mt-3 max-w-prose text-neutral-600">
    Developer. I build macOS tools that respect the machine they run on.
  </p>

  <section class="mt-12">
    <h2 class="text-sm font-medium text-neutral-500">Experience</h2>
    {experience.map((role) => (
      <article class="border-t border-neutral-200 py-6">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-medium">{role.title}, {role.organisation}</h3>
          <span class="shrink-0 text-sm text-neutral-500">{role.period}</span>
        </div>
        <p class="mt-1 text-neutral-600">{role.summary}</p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {role.highlights.map((item) => <li>{item}</li>)}
        </ul>
      </article>
    ))}
  </section>

  <section class="mt-12">
    <h2 class="text-sm font-medium text-neutral-500">Skills</h2>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {skills.map((group) => (
        <>
          <dt class="text-neutral-500">{group.label}</dt>
          <dd>{group.items.join(', ')}</dd>
        </>
      ))}
    </dl>
  </section>
</BaseLayout>
```

- [ ] **Step 6: Verify**

Run: `npm run build && npm run check`
Expected: exit 0; `dist/blog/index.html`, `dist/blog/hello/index.html`, and `dist/about/index.html` all exist. Confirm `grep -ril "resume\|\.pdf" dist/` returns nothing — the site must not advertise a CV.

- [ ] **Step 7: Commit**

```bash
git add src/pages/blog src/pages/about.astro src/data/experience.ts src/content/posts/hello.md
git commit -m "feat: add blog and about pages"
```

---

### Task 9: GitHub statistics

The transform is pure and tested; the network call lives in a script that fails soft, so a GitHub outage degrades the numbers rather than breaking the build.

**Files:**
- Create: `src/lib/github.ts`
- Test: `src/lib/github.test.ts`
- Create: `scripts/fetch-github-stats.mjs`
- Create: `src/data/github-stats.json`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface RepoStats { name: string; url: string; stars: number; latestRelease: string | null; lastPushed: string }`
  - `summarizeRepo(repo: GitHubRepo, release: GitHubRelease | null): RepoStats`
  - `src/data/github-stats.json` conforming to `{ generatedAt: string; repos: RepoStats[] }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/github.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { summarizeRepo, type GitHubRepo, type GitHubRelease } from '@/lib/github';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/github`.

- [ ] **Step 3: Write `src/lib/github.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 14 tests total across both files.

- [ ] **Step 5: Write the committed fallback data**

Create `src/data/github-stats.json`:

```json
{
  "generatedAt": "2026-09-19T00:00:00.000Z",
  "repos": [
    {
      "name": "CreativeNotch",
      "url": "https://github.com/GcdZ03/CreativeNotch",
      "stars": 0,
      "latestRelease": "v0.5.0",
      "lastPushed": "2026-09-13T00:00:00Z"
    }
  ]
}
```

- [ ] **Step 6: Write `scripts/fetch-github-stats.mjs`**

```js
import { writeFile } from 'node:fs/promises';

const REPOS = ['GcdZ03/CreativeNotch'];
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
    repos.push({
      name: repo.name,
      url: repo.html_url,
      stars: repo.stargazers_count ?? 0,
      latestRelease: release?.tag_name ?? null,
      lastPushed: repo.pushed_at,
    });
  }
  if (repos.length === 0) throw new Error('no repositories resolved');
  await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), repos }, null, 2)}\n`);
  console.log(`Wrote stats for ${repos.length} repo(s).`);
} catch (error) {
  console.warn(`Stats refresh failed, keeping committed data: ${error.message}`);
  process.exit(0);
}
```

The `process.exit(0)` in the failure path is deliberate: a stats outage must never fail a deploy.

- [ ] **Step 7: Render the stats on the homepage**

In `src/pages/index.astro`, add to the frontmatter:

```ts
import stats from '@/data/github-stats.json';
```

and insert this section immediately before the closing `</BaseLayout>`:

```astro
  <section class="mt-12">
    <h2 class="text-sm font-medium text-neutral-500">On GitHub</h2>
    <ul class="mt-3 space-y-1 text-sm text-neutral-600">
      {stats.repos.map((repo) => (
        <li>
          <a class="hover:underline" href={repo.url}>{repo.name}</a>
          {repo.latestRelease && <span class="text-neutral-400"> — {repo.latestRelease}</span>}
          {repo.stars > 0 && <span class="text-neutral-400"> · {repo.stars} stars</span>}
        </li>
      ))}
    </ul>
  </section>
```

- [ ] **Step 8: Verify both paths**

Run: `npm run stats && npm run build`
Expected: the script reports success and `src/data/github-stats.json` updates. Then run `GITHUB_TOKEN=invalid npm run stats` and expect the warning plus exit code 0 with the JSON left intact.

- [ ] **Step 9: Commit**

```bash
git add src/lib/github.ts src/lib/github.test.ts scripts/ src/data/github-stats.json src/pages/index.astro
git commit -m "feat: add build-time GitHub statistics"
```

**Deferred by design:** the spec describes a Cloudflare Worker cron that calls a
deploy hook daily to refresh these numbers, and explicitly makes it optional for
the first release. It is not a task in this plan. While the site is under active
development, every push already refreshes the statistics. Add the cron only once
deploy frequency drops below the desired refresh rate; GitHub Actions' `schedule`
trigger is not an acceptable substitute, because GitHub disables it silently
after 60 days without repository activity.

---

### Task 10: CI and Cloudflare deployment

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `astro.config.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: the `check`, `test`, and `build` scripts from Task 1.
- Produces: a live site and a green CI check on every push.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.12'
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run build
      - run: npx --yes linkinator@6 ./dist --recurse --silent --skip "^https?://"
```

External links are skipped in the link check because third-party sites rate-limit CI runners and would make the build flaky. Internal links are fully verified.

- [ ] **Step 2: Push the repository to GitHub**

```bash
gh repo create personal-site --public --source=. --remote=origin --push
```

- [ ] **Step 3: Connect Cloudflare Pages**

This step requires a browser and cannot be automated. In the Cloudflare dashboard:

1. Sign up or sign in at `dash.cloudflare.com`. No payment method is required.
2. Go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorise GitHub and select the `personal-site` repository.
4. Set the build command to `npm run build` and the build output directory to `dist`.
5. Add an environment variable `NODE_VERSION` with the value `22.12.0`.
6. Deploy, then note the assigned `*.pages.dev` URL.

- [ ] **Step 4: Correct the site URL**

Set `site` in `astro.config.mjs` to the actual `*.pages.dev` URL from Step 3. This makes canonical URLs correct.

- [ ] **Step 5: Write `README.md`**

```markdown
# personal-site

Static personal site built with Astro 7 and Tailwind 4. No backend.

- `npm run dev` — local development
- `npm run check` — types and content schema
- `npm test` — unit tests
- `npm run build` — static build into `dist/`
- `npm run stats` — refresh committed GitHub statistics

Deploys automatically to Cloudflare Pages on push to `main`.

Design: `docs/superpowers/specs/2026-09-19-personal-site-design.md`
```

- [ ] **Step 6: Verify the deployment**

Confirm the `*.pages.dev` URL serves the homepage, that `/projects`, `/projects/creative-notch`, `/blog`, and `/about` all load, and that the GitHub Actions run is green.

- [ ] **Step 7: Commit**

```bash
git add .github README.md astro.config.mjs
git commit -m "chore: add CI and deploy to Cloudflare Pages"
git push
```

---

### Task 11: CreativeNotch case study content

The spec identifies this as the highest-leverage page on the site: the only one that demonstrates judgement rather than output. It is a writing task, not a coding task.

**Files:**
- Modify: `src/content/projects/creative-notch.md`

**Interfaces:**
- Consumes: the schema from Task 3 and the page from Task 6.
- Produces: no new interfaces.

- [ ] **Step 1: Gather the facts**

Read `~/Documents/Github/CreativeNotch` — its README, its release notes, and enough source to describe the event-driven design accurately. Do not invent technical claims; if the no-polling mechanism is not clear from the code, ask the author.

- [ ] **Step 2: Write the case study body**

Keep the frontmatter unchanged and replace the body. Structure it as: the problem, the constraint chosen, what that constraint forced architecturally, what it cost, and the result. Target 400–700 words. Show the decision and its trade-off — a feature list fails the purpose of the page.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: exit 0; `dist/projects/creative-notch/index.html` contains the new prose.

- [ ] **Step 4: Commit**

```bash
git add src/content/projects/creative-notch.md
git commit -m "docs: write CreativeNotch case study"
```

---

### Task 12: Design pass

**Files:**
- Modify: `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/ProjectRow.astro`, and page files as needed.

**Interfaces:**
- Consumes: every page built so far.
- Produces: no new interfaces. Structure and routes must not change.

- [ ] **Step 1: Invoke the design skill**

REQUIRED SUB-SKILL: use the `frontend-design` skill. Everything built so far uses deliberately plain Tailwind defaults; this task replaces them with a considered visual identity.

- [ ] **Step 2: Define tokens in `src/styles/global.css`**

Use Tailwind 4's CSS-first configuration — an `@theme` block, not a `tailwind.config.js`. Define a typographic scale, one accent colour, spacing rhythm, and both light and dark palettes.

Anchor the direction on CreativeNotch's own visual language rather than the default dark-mode portfolio look. The spec names this explicitly: the site should not read as templated.

- [ ] **Step 3: Apply the tokens across layout, components, and pages**

Preserve the row-based project layout. Do not convert it to a card grid — the spec rejects grids because they break at project counts that are not multiples of the column count.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run check && npm test`
Expected: all exit 0. Check the rendered pages at several viewport widths and in both colour schemes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: apply custom visual design"
```

---

## Verification Checklist

Run before declaring the project complete:

- [ ] `npm run check` exits 0.
- [ ] `npm test` passes, 14 tests.
- [ ] `npm run build` exits 0 from a clean `node_modules`.
- [ ] `dist/` contains no serverless function output and the repo contains no adapter dependency.
- [ ] `grep -ri "api_key\|secret\|token" dist/` returns nothing.
- [ ] Adding a `standard` project is one new Markdown file and requires no other change.
- [ ] The site is live on `*.pages.dev` and CI is green.
- [ ] Lighthouse performance and accessibility both score 95 or above on the
      deployed homepage, with no remediation work. The static architecture should
      make this automatic; a lower score means something regressed in Task 12.
- [ ] The site links to no resume or CV document anywhere.
- [ ] `src/data/experience.ts` contains the author's real history and skills, not
      the placeholder.
- [ ] The LinkedIn placeholder in `src/pages/index.astro` has been replaced with a
      real URL or the anchor has been deleted.
