# Personal Developer Site — Design

Date: 2026-09-19
Status: Approved, ready for implementation planning

## Purpose

A personal site that introduces Gerald Chang as a developer: who he is, what he
has built, and how to reach him. The primary audience is people evaluating him —
recruiters, hiring managers, collaborators — and the secondary audience is other
developers who arrive from a project link.

The site must argue for its author, not merely list him. A visitor who reads one
page should come away understanding how he makes engineering decisions.

## Constraints

- Ongoing cost must be $0, with no free-tier limit the site can realistically hit.
- The author writes new side projects continuously. Adding one must be cheap.
- The design is custom. The site must not read as a template.
- No custom domain initially; a free subdomain is acceptable.

## Architecture

Astro 5 with TypeScript and Tailwind, compiled to static HTML and deployed to
Cloudflare Pages.

There is no backend. The deployed artifact is HTML, CSS, images, and a small
amount of client JavaScript. Nothing executes on a server in response to a
visitor's request: no serverless functions in the request path, no database, no
runtime secrets, no third-party request-time dependencies.

The one piece of scheduled infrastructure — the rebuild cron described under
GitHub Statistics — sits entirely outside the request path. It handles no visitor
traffic, holds no user data, and its failure would leave the site serving
slightly stale numbers rather than erroring.

### Why no backend

A backend is required only when one of three conditions holds: data must be
fresher than the rebuild cadence, reading it requires a secret at request time,
or something must be written. This site meets none of them.

- Content is authored by hand in the repository and is static by nature.
- GitHub statistics are fetched during CI, where the token is a build secret that
  never reaches the browser. Day-old figures are indistinguishable from live ones.
- Contact is by link, so nothing is written.

The consequence is that the site has no component that can fail independently of
Cloudflare, no secret to rotate, and no quota to exceed.

### Why Astro over Next.js

Next.js is an application framework. This is a document site. Astro ships zero
JavaScript by default, supports React components where interactivity is genuinely
wanted, and treats Markdown content collections as a first-class, type-checked
primitive — which is precisely the shape of this content.

## Content model

Projects and posts live in Astro content collections with Zod-validated
frontmatter, so a malformed entry fails the build rather than rendering an empty
section.

    src/content/projects/*.md
    src/content/posts/*.md
    src/data/experience.ts

### Project frontmatter

    title: string
    tagline: string          # one line, shown in the index row
    tier: 'flagship' | 'standard' | 'archive'
    stack: string[]
    role: string
    period: string           # e.g. "2026 — present"
    links:
      repo?: string
      download?: string
      demo?: string
    order: number

### Tiers

Tier controls how much of the site a project occupies, and therefore how much
work adding one costs.

- `flagship` — gets a full case-study page and appears on the homepage.
- `standard` — a row in the project index, linking out to its repository. No
  detail page.
- `archive` — a single line under "Also built". No page.

`standard` is the expected default. Adding a project at that tier means writing
six lines of frontmatter and pushing; it requires no layout or design decisions.
This is the property that keeps the site maintainable as the project count grows.

`CreativeNotch` is the only `flagship` project at launch.

## Site structure

    /              homepage: intro, up to 3 featured projects, links
    /projects      all projects, ordered by tier then order
    /projects/[slug]  case study; generated only for tier: flagship
    /blog          post index
    /blog/[slug]   post
    /resume        experience timeline, print-friendly

The homepage's "All projects" link renders only when more than three projects
exist. The site's shape is derived from the content collection rather than
hardcoded, so it presents as a focused single-project site today and as an index
later, with no code change.

### Layout primitive

The project index is a vertical list of rich rows — title, tagline, stack chips,
period, and an optional link to the case study — not a card grid.

A multi-column card grid has arity constraints: it composes at 3, 6, and 9 items
and looks broken at 1, 2, 4, 5, and 7. Since the project count will cross those
numbers repeatedly, a grid would require redesign each time. A row list is
correct at every count and scans faster.

## GitHub statistics

A build step fetches public repository data from the GitHub API using a token
held in CI secrets, and writes the results into the generated HTML. Scope is
deliberately narrow: recent commit activity and CreativeNotch's stars and latest
release. A full contribution graph is excluded — a sparse one reads as a
liability and a dense one is a signal readers discount.

Freshness comes from a scheduled rebuild: a Cloudflare Worker cron trigger calls
a Cloudflare Pages deploy hook daily. GitHub Actions' scheduled workflows are
deliberately not used for this, because GitHub disables them silently after 60
days without repository activity — a failure mode that would go unnoticed.

The cron Worker is the only scheduled component in the system. It serves no
visitor requests; it exists solely to trigger a build.

Both this step and the cron are optional for the first release. Without them the
statistics simply refresh whenever the site is deployed, which during active
development is often enough. They should be added only once deploy frequency
drops below the desired refresh rate.

## Contact

Email address, GitHub, and LinkedIn, presented as links. No form.

A form would add spam surface, a third-party or self-hosted endpoint, and a
component that can fail silently. Anyone motivated to make contact will use a
link, and the site has no other reason to accept input.

## Design direction

Custom. The visual identity draws on CreativeNotch's own language — it is a notch
utility, which supplies a specific and non-generic motif — rather than the
default dark-mode portfolio look.

The design pass covers a typographic scale, a single accent color, spacing
rhythm, and light and dark themes. It is a dedicated effort undertaken once the
structure is standing, not decided upfront.

## Deployment

Commits to `main` on GitHub trigger a Cloudflare Pages build. Pull requests get
preview deployments. The site is served from a `*.pages.dev` subdomain.

Cloudflare Pages is chosen over Vercel for its unlimited free bandwidth; Vercel's
hobby tier caps bandwidth and restricts commercial use. Attaching a custom domain
later is a DNS change and requires no rebuild or migration.

## Testing

- `astro check` in CI — catches type errors and content schema violations.
- A link checker in CI — catches broken internal and external links.

No component test suite. For a site with no runtime logic, it would be ceremony
without corresponding risk.

## Cost

Zero, ongoing. Cloudflare Pages' free tier provides unlimited bandwidth and 500
builds per month; the site will use roughly 30 to 60 once the daily rebuild is
enabled. There is no request cap,
submission quota, or expiring trial anywhere in the stack. A custom domain, if
later desired, costs approximately $10 per year and is the only possible expense.

## Deliberately not built

These are excluded until the site's scale justifies them:

- Tag filtering, search, and pagination on the project index — revisit past ~15 projects.
- View counters and reaction buttons — these require persistent state, which would
  introduce the site's only stateful component in exchange for a vanity metric.
- A hosted CMS — Markdown in the repository is version-controlled and has no
  external account to maintain.
- Runtime data such as now-playing widgets — these would force a serverless
  function and an OAuth refresh token, making the site non-static.

## Success criteria

1. A visitor understands what the author builds within ten seconds of landing.
2. The CreativeNotch case study communicates a real engineering decision and its
   consequences, not just a feature list.
3. Adding a `standard` project takes under five minutes and touches one file.
4. The site scores well on Lighthouse performance and accessibility without
   remediation work, which the static architecture should make automatic.
5. Total recurring cost remains $0.
