# personal-site

Static personal site built with Astro 7 and Tailwind 4. No backend.

- `npm run dev` — local development
- `npm run check` — types and content schema
- `npm test` — unit tests
- `npm run build` — static build into `dist/`
- `npm run stats` — refresh committed GitHub statistics

Not deployed yet. The intended setup is Cloudflare Workers (static assets) building from
`main`; nothing is connected until that project exists.

Design: `docs/superpowers/specs/2026-09-19-personal-site-design.md`

## Adding a project

Create one Markdown file in `src/content/projects/`. Frontmatter fields are
defined by the schema in `src/content.config.ts`:

- `title`, `tagline`, `role` — plain strings.
- `stack` — array of at least one string.
- `period` — a string, e.g. `"2024 — 2025"` or `"2026 — present"`.
- `tier` — one of `flagship`, `standard`, or `archive`:
  - `flagship` gets its own case-study page (`/projects/<slug>`) and appears
    on the homepage.
  - `standard` is a row in the `/projects` index that links out to its repo,
    download, or demo.
  - `archive` is a single line under "Also built" — no dedicated page or
    outbound link required.
- `links` — an object with optional `repo`, `download`, and `demo` URLs. A
  **`standard`-tier project must set at least one of these** — the schema
  enforces it, and a project with nothing to link to belongs in `archive`
  instead.
- `order` — an integer controlling display order.

### Frontmatter gotcha: quote values that look like numbers

YAML parses a bare `period: 2026` as a number, which fails the `period`
string schema. Quote it:

```yaml
period: "2026"
# or
period: 2026 — present
```

The second form works unquoted because the em dash and space keep YAML from
reading it as a number — but when in doubt, quote it.
