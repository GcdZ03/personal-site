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

Astro 7 with TypeScript and Tailwind 4, compiled to static HTML and deployed to
Cloudflare Pages. Astro 7 requires Node 22.12 or later.

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
- GitHub statistics are fetched by a script that is run by hand, and its output
  is committed, so no token is needed at build or request time. Day-old figures
  are indistinguishable from live ones.
- Contact is by link, so nothing is written.

The consequence is that the site has no component that can fail independently of
Cloudflare, no secret to rotate, and no quota to exceed.

### Why Astro over Next.js

Next.js is an application framework. This is a document site. Astro ships zero
JavaScript by default, supports React components where interactivity is genuinely
wanted, and treats Markdown content collections as a first-class, type-checked
primitive — which is precisely the shape of this content.

## Content model

Projects and posts live in Astro content collections, declared in
`src/content.config.ts` using the Content Layer API with Zod-validated
frontmatter, so a malformed entry fails the build rather than rendering an empty
section.

    src/content/projects/*.md
    src/content/posts/*.md
    src/data/experience.ts   # roles and skills

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

- `flagship` — gets a full case-study page and is first in line for the
  homepage.
- `standard` — a row in the project index, linking out to its repository,
  download, or demo. No detail page.
- `archive` — a single line under "Also built". No page, and never on the
  homepage.

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

The homepage shows up to three projects: flagship first, then standard to fill
whatever slots remain; archive projects never appear. Reserving the homepage for
flagships alone would leave it showing a single item beside empty space until a
second case study exists. Its "All projects" link renders only when more than
three projects exist. The site's shape is derived from the content collection
rather than hardcoded, so it presents as a focused single-project site today and
as an index later, with no code change.

### Layout primitive

The project index is a vertical list of rich rows — title, tagline, stack chips,
period, and an optional link to the case study — not a card grid.

A multi-column card grid has arity constraints: it composes at 3, 6, and 9 items
and looks broken at 1, 2, 4, 5, and 7. Since the project count will cross those
numbers repeatedly, a grid would require redesign each time. A row list is
correct at every count and scans faster.

## GitHub statistics

A script, `npm run stats`, fetches public repository data from the GitHub API
and writes it to `src/data/github-stats.json`, which is committed and read at
build time. The GitHub token is optional and only raises the rate limit, so the
script runs locally as well as anywhere a secret is available. Scope is
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
figures refresh only when someone runs `npm run stats` and commits the result:
`npm run build` — the command Cloudflare runs — reads the committed JSON and
never calls the API, and CI does not run the script either, since it holds no
token and could not commit the output back. Automating the refresh is exactly
what the cron above would buy. Until then, refreshing by hand before a release
is enough at this update rate.

## Resume

The site does not host, link, or generate a resume document. The author tailors a
PDF for each application, so any generic copy published here would be a weaker
version of what an employer actually receives, and keeping it in the repository
would mean versioning a file that changes per application.

Experience and skills still appear on the site, on `/about`, because a recruiter
reading the site should not have to ask for them. That page is a profile, not a
resume, and is named accordingly.

Skills are presented as grouped lists. Proficiency bars and percentages are
excluded deliberately: they quantify something unmeasurable and read as
inexperienced.

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

## Accounts and cost

The host decision is settled: Cloudflare Pages, chosen over Vercel primarily
because Vercel's free Hobby tier prohibits commercial use, which would become a
problem if CreativeNotch is ever monetised and this site becomes its landing
page. Cloudflare's free analytics, which require no cookie consent banner, were
a secondary factor.

The project requires two accounts in total:

- GitHub (`GcdZ03`) — already held.
- Cloudflare — free, no payment method required.

No other account exists anywhere in the system. The absence of a backend
eliminates the email provider, spam-prevention service, form service, CMS, and
database that a conventional build of this site would accumulate.

Neither account holds a payment method, so no usage spike can produce a bill.
Cloudflare's static asset serving has no bandwidth limit to exceed, so a traffic
spike degrades nothing.

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
