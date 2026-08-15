# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written static HTML portfolio with an Astro-built, mobile-first single-page engineering profile whose content lives in JSON.

**Architecture:** Astro 5 with static output. All copy lives in `content/*.json` and is imported directly in component frontmatter — no content collections, since these are data files rather than markdown. One page (`src/pages/index.astro`) composes nine section components. A single global stylesheet defines design tokens for both themes; components carry their own scoped styles. Netlify builds `dist/` and serves redirects from `public/_redirects`.

**Tech Stack:** Astro 5, plain CSS with custom properties, Node 22, `node:test` for build assertions, Netlify hosting.

**Spec:** `docs/superpowers/specs/2026-08-15-portfolio-redesign-design.md`

## Global Constraints

- **Mobile-first.** Write the base styles for a 360px viewport; add desktop styles inside `@media (min-width: 48rem)` and above. Never the reverse.
- **Tap targets** are at least 44px in any dimension.
- **Spacing scale**, used exclusively — no arbitrary pixel values: `4, 8, 12, 16, 24, 32, 48, 64, 96` px, exposed as `--space-1` … `--space-9`.
- **Type scale**, used exclusively: `12, 13, 15, 17, 21, 28, 44` px as `--text-xs` … `--text-3xl`.
- **One accent color.** Purple, used for at most four elements on the whole page.
- **AA contrast** in both themes for all text.
- **Transitions** are `120ms ease-out`, and every animation is disabled under `prefers-reduced-motion: reduce`.
- **Focus rings** are visible on every interactive element; never `outline: none` without a replacement.
- **No client-side JavaScript at all.** The page ships zero scripts; theming follows `prefers-color-scheme` in CSS, with no toggle.
- **Copy rules:** never write "10x", "rockstar", "ninja", or throughput claims. Never write "4+ years". The AI-first section copy and the hero subline are fixed verbatim in the spec — copy them exactly, do not paraphrase.
- **Never invent facts.** All content comes from `content/*.json`, which is populated from the spec and the resume. If a value is unknown, ask rather than inventing.

---

### Task 1: Astro scaffold, Netlify config, and the build-check harness

Sets up the project so every later task has a build to run and a test to extend. The old HTML files stay in place for now — they are removed in Task 8 once the new page renders everything.

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `netlify.toml`, `.gitignore` (modify), `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run build` emitting `dist/index.html`; `npm test` running `node --test test/build-check.mjs` against the built output. Later tasks add assertions to this same file.

- [ ] **Step 1: Scaffold Astro into the existing directory**

Run from the repo root. The `--template minimal` flag avoids the demo content, and `--no-install --no-git` keeps it from touching the existing repo.

```bash
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict --skip-houston
```

If the CLI refuses because the directory is non-empty, accept the prompt to continue — it does not delete existing files. Verify afterwards that `index.html`, `about.html`, `projects.html`, `css/`, `images/`, and `blogs/` are all still present.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Configure Astro for a static site**

Replace `astro.config.mjs` entirely:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mansoorameen.netlify.app',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
```

`site` is required for the sitemap and for absolute OG image URLs in Task 2.

- [ ] **Step 4: Add the Netlify build config**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 5: Ignore build artifacts**

Append to `.gitignore`:

```
node_modules/
dist/
.astro/
```

- [ ] **Step 6: Write a placeholder page**

Replace `src/pages/index.astro`:

```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Mansoor Ameen</title>
  </head>
  <body>
    <h1>Mansoor Ameen</h1>
  </body>
</html>
```

- [ ] **Step 7: Write the failing build check**

Create `test/build-check.mjs`. This file is the project's only test and grows in later tasks. It asserts against the built HTML, which is what actually ships.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = existsSync('dist/index.html')
  ? readFileSync('dist/index.html', 'utf8')
  : '';

test('the site builds an index page', () => {
  assert.ok(existsSync('dist/index.html'), 'run `npm run build` first');
});

test('the page names Mansoor Ameen', () => {
  assert.match(html, /Mansoor Ameen/);
});
```

- [ ] **Step 8: Wire up the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "node --test test/build-check.mjs"
```

- [ ] **Step 9: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `dist/index.html` does not exist yet, so the first assertion trips with "run `npm run build` first".

- [ ] **Step 10: Build, then run the test to verify it passes**

```bash
npm run build && npm test
```

Expected: both tests PASS.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json netlify.toml .gitignore src/ test/
git commit -m "build: scaffold Astro with a static build and output assertions"
```

---

### Task 2: Design tokens, base layout, and SEO metadata

Everything visual derives from this task. Both themes, the type and spacing scales, and the per-page metadata live here.

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: the build from Task 1.
- Produces: `Base.astro`, accepting props `{ title: string; description: string }` and rendering a `<slot />` inside `<main>`. All later components assume the CSS custom properties defined below exist.

- [ ] **Step 1: Write the design tokens and base styles**

Create `src/styles/global.css`. The dark theme is the default; the light theme is applied when the system prefers light. Both palettes were chosen to pass AA — `--muted` is the lightest text color permitted for body copy, and `--faint` is reserved for non-essential metadata at 12px or larger.

```css
:root {
  --bg: #0a0a0c;
  --surface: #101015;
  --text: #ededf0;
  --muted: #a0a0ad;
  --faint: #7a7a88;
  --hairline: #1c1c24;
  --accent: #b39dfb;
  --status: #7dd3a8;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
  --space-9: 96px;

  --text-xs: 12px; --text-sm: 13px; --text-base: 15px; --text-md: 17px;
  --text-lg: 21px; --text-xl: 28px; --text-3xl: 44px;

  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, "Cascadia Mono", monospace;

  --measure: 34em;
  --page-max: 62rem;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #fbfbf9;
    --surface: #ffffff;
    --text: #16161a;
    --muted: #55555f;
    --faint: #6e6e78;
    --hairline: #e4e4de;
    --accent: #6d28d9;
    --status: #197a52;
  }
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

main { max-width: var(--page-max); margin: 0 auto; padding: 0 var(--space-5); }

@media (min-width: 48rem) {
  main { padding: 0 var(--space-7); }
}

h1, h2, h3 { line-height: 1.15; letter-spacing: -0.025em; margin: 0; font-weight: 600; }

p { margin: 0; max-width: var(--measure); }

a { color: inherit; }

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}

.label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.mono { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--faint); }

.section { border-top: 1px solid var(--hairline); padding: var(--space-7) 0; }

.section-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.section-num { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--faint); }

.tech {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--accent);
  margin-top: var(--space-3);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Write the base layout**

Create `src/layouts/Base.astro`. `Astro.site` supplies the absolute URL that LinkedIn and Slack require for OG images — relative paths are ignored by those crawlers.

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const ogImage = new URL('/og.png', Astro.site).href;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/images/mainlogo.svg" />
    <meta name="theme-color" content="#0a0a0c" />
    <meta name="google-site-verification" content="O7EjhQgHhRfxUaWkLhkMzkx0YW1UdKvvPmZ9fbsVVAg" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />
  </head>
  <body>
    <main>
      <slot />
    </main>
  </body>
</html>
```

The `google-site-verification` value is copied verbatim from `index.html:7` of the old site and must not be altered.

- [ ] **Step 3: Use the layout on the index page**

Replace `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base
  title="Mansoor Ameen — Frontend Engineer"
  description="Frontend engineer building production web and mobile applications with React, React Native, Next.js and TypeScript."
>
  <h1>Mansoor Ameen</h1>
</Base>
```

- [ ] **Step 4: Add metadata assertions to the test**

Append to `test/build-check.mjs`:

```js
test('the page declares a viewport for mobile', () => {
  assert.match(html, /name="viewport" content="width=device-width/);
});

test('social cards get an absolute image URL', () => {
  assert.match(html, /property="og:image" content="https:\/\//);
});

test('the google site verification token is preserved', () => {
  assert.match(html, /O7EjhQgHhRfxUaWkLhkMzkx0YW1UdKvvPmZ9fbsVVAg/);
});
```

- [ ] **Step 5: Run the test to verify the new assertions fail**

```bash
npm test
```

Expected: FAIL on the viewport and og:image assertions — the previous build in `dist/` predates the layout.

- [ ] **Step 6: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/layouts/Base.astro src/pages/index.astro test/build-check.mjs
git commit -m "feat: add design tokens, base layout, and social metadata"
```

---

### Task 3: Content JSON files

All copy for the site, in one place, in the shape the phase-2 CMS will write. Every later task reads from these files and adds no hardcoded copy.

**Files:**
- Create: `content/profile.json`, `content/work.json`, `content/experience.json`, `content/stack.json`, `content/writing.json`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: five JSON files imported directly by components, e.g. `import profile from '../../content/profile.json'`. Field names below are the contract — later tasks reference them exactly.

- [ ] **Step 1: Write the profile content**

Create `content/profile.json`. The `subline` and `howIBuild` strings are the spec's approved copy — reproduce them exactly.

```json
{
  "name": "Mansoor Ameen",
  "role": "Frontend Engineer",
  "headline": "Frontend engineer building production web and mobile applications.",
  "subline": "Six years shipping React, React Native and Next.js. I work AI-first — spec, build, test, review — and it's how I picked up Flutter and NestJS and shipped in my first week.",
  "status": "Open to opportunities",
  "tag": "AI-first engineer",
  "location": "Kasaragod, Kerala",
  "experienceYears": "6+ years",
  "about": "I build production web and mobile applications, mostly with React, React Native, Next.js and TypeScript. I've rebuilt legacy mobile systems from the ground up, split a single product into separate client and staff apps, and shipped to the web, both app stores, and the desktop. Lately that has extended into Flutter on mobile and NestJS on the backend.",
  "howIBuild": {
    "lead": "I work AI-first, with a real process behind it: brainstorm, then a written spec, then implementation, testing, and review. Claude Code does most of the typing. I own the architecture, the review, and what ships.",
    "body": "The practical effect is range. I picked up Flutter and NestJS and shipped features in my first week on each — not by skipping the fundamentals, but by compressing the loop between reading, building, and validating."
  },
  "stats": [
    { "value": "6+", "label": "Years shipping" },
    { "value": "4", "label": "Platforms shipped to" },
    { "value": "Expo 2020", "label": "Dubai, onsite" },
    { "value": "1.9K", "label": "Reads on one post" }
  ],
  "links": {
    "email": "manzooravail@gmail.com",
    "github": "https://github.com/mansoorameen",
    "linkedin": "https://linkedin.com/in/mansoorameenkm",
    "hashnode": "https://mansoorameen.hashnode.dev/",
    "resume": "https://docs.google.com/document/d/1ZGxBr2mUVSRxOU6l7IFxTEEZ0vYpU--6Dh2ZV_8lDk4/export?format=pdf"
  },
  "lastUpdated": "August 2026"
}
```

The `resume` URL is the old site's document ID with `/edit?usp=sharing` replaced by `/export?format=pdf`, so the link downloads a current PDF without requiring a Google account.

- [ ] **Step 2: Write the selected work content**

Create `content/work.json`:

```json
[
  {
    "title": "React Native Application Rebuild",
    "meta": "BuildNext · 2022–25",
    "description": "Rebuilt a bug-prone class-component mobile app into a modern functional architecture, then split it into two production apps — one for clients, one for internal staff — so each could evolve and ship independently. Later extended the same product into a rebranded B2B app for a business client.",
    "tech": ["react-native", "redux", "rest", "ota-updates"]
  },
  {
    "title": "Shownex",
    "meta": "Shownex · 2025–present",
    "description": "A movie discovery product spanning web and mobile. Built features across a Next.js and TypeScript web app and a Flutter mobile app, implemented deep linking so shared links open the installed app or fall through to the right store, and shipped OTA updates that reach users without an app-store release.",
    "tech": ["next.js", "typescript", "flutter", "nestjs", "deep-linking"]
  },
  {
    "title": "Expo 2020 Dubai — AR Live Ops",
    "meta": "Onsite, Dubai · 2021",
    "description": "Worked onsite on one of the largest augmented reality deployments at Expo 2020. Built a React and Mapbox application to track and visualise AR anchors across the Expo site, and supported testing and live operations for the Expo Xplorer app.",
    "tech": ["react", "mapbox", "ar", "live-ops"]
  }
]
```

- [ ] **Step 3: Write the experience content**

Create `content/experience.json`. Freelance, TheTravelights, and Diya Systems are deliberately absent — see the spec's Excluded section.

```json
[
  {
    "company": "Shownex",
    "role": "Frontend Engineer",
    "period": "Nov 2025 – Present",
    "bullets": [
      "Build web and mobile features for a movie discovery product using Next.js, TypeScript, Zustand and Tailwind CSS.",
      "Implemented mobile deep linking and over-the-air updates, and contributed to the Flutter app and the NestJS backend.",
      "Optimise data fetching and rendering, and work across product, backend and mobile to resolve cross-platform issues."
    ]
  },
  {
    "company": "BuildNext Constructions",
    "role": "Frontend Developer",
    "period": "Dec 2022 – Oct 2025",
    "bullets": [
      "Rebuilt the company's legacy React Native app from the ground up, replacing a bug-prone class-component architecture.",
      "Split the product into separate client and staff apps, then extended it into a rebranded B2B app for a business client.",
      "Built web features in React and Next.js, including a dashboard rendering coordinate data with HTML Canvas."
    ]
  },
  {
    "company": "Viga Entertainment Technologies",
    "role": "Frontend Developer",
    "period": "Aug 2021 – Nov 2022",
    "bullets": [
      "Built React web applications and contributed to a Windows desktop app in Electron, TypeScript and React.",
      "Designed and implemented a single sign-on web application, and was selected for the onsite Expo 2020 Dubai project."
    ]
  }
]
```

- [ ] **Step 4: Write the stack content**

Create `content/stack.json`:

```json
[
  { "group": "Frontend", "items": ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "Material UI", "Shadcn UI"] },
  { "group": "Mobile", "items": ["React Native", "Flutter", "Dart", "Deep Linking", "OTA Updates", "iOS", "Android"] },
  { "group": "Backend", "items": ["Node.js", "NestJS", "REST APIs", "Firebase", "Elasticsearch"] },
  { "group": "Tools", "items": ["Redux", "Zustand", "Electron", "Jest", "Git", "Chart.js", "D3.js", "Mapbox"] }
]
```

- [ ] **Step 5: Write the writing content**

Create `content/writing.json`. The first entry leads because of its third-party validation.

```json
[
  {
    "title": "How JavaScript Works",
    "note": "1.9K+ reads · featured on daily.dev",
    "url": "https://mansoorameen.hashnode.dev/how-javascript-works"
  },
  {
    "title": "Understanding Closures and the Lexical Environment",
    "note": "",
    "url": "https://mansoorameen.hashnode.dev/understanding-closures-and-lexical-environment"
  },
  {
    "title": "5 React hooks that you should know",
    "note": "",
    "url": "https://mansoorameen.hashnode.dev/5-react-hooks-that-you-should-know"
  }
]
```

- [ ] **Step 6: Write assertions that guard the content rules**

Append to `test/build-check.mjs`. These catch the two failure modes that matter: banned copy sneaking in, and the stale profile returning.

```js
import profile from '../content/profile.json' with { type: 'json' };

test('the resume link downloads a PDF rather than opening a Doc', () => {
  assert.match(profile.links.resume, /export\?format=pdf$/);
});

test('no contact placeholder survives from the old site', () => {
  assert.doesNotMatch(html, /your-email@gmail\.com/);
});

test('banned copy stays out of the page', () => {
  for (const banned of [/10x/i, /rockstar/i, /\bninja\b/i, /4\+ years/]) {
    assert.doesNotMatch(html, banned);
  }
});
```

- [ ] **Step 7: Run the test to verify it fails**

```bash
npm run build && npm test
```

Expected: FAIL — `content/profile.json` is not yet imported anywhere, but the import itself resolves, so the failure is on whichever assertion the current build cannot satisfy. If all three pass at this point that is acceptable: they are regression guards, and Task 4 is what puts the content on the page.

- [ ] **Step 8: Commit**

```bash
git add content/ test/build-check.mjs
git commit -m "feat: add site content as JSON"
```

---

### Task 4: Hero and proof strip

The first screen. Carries the AI-first signal twice, per the spec.

**Files:**
- Create: `src/components/Hero.astro`, `src/components/ProofStrip.astro`
- Modify: `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: `content/profile.json` fields `name`, `headline`, `subline`, `status`, `tag`, `location`, `experienceYears`, `stats`, `links`.
- Produces: `<Hero />` and `<ProofStrip />`, both taking no props.

- [ ] **Step 1: Write the hero component**

Create `src/components/Hero.astro`. The status dot is decorative, so it is hidden from assistive technology; the status text carries the meaning.

```astro
---
import profile from '../../content/profile.json';
const { name, headline, subline, status, tag, location, experienceYears, links } = profile;
---
<header class="hero">
  <p class="status">
    <span class="dot" aria-hidden="true"></span>{status}
    <span class="sep" aria-hidden="true">·</span>
    <span class="tag">{tag}</span>
  </p>

  <h1>{headline}</h1>
  <p class="subline">{subline}</p>
  <p class="mono meta">{location} &nbsp;·&nbsp; {experienceYears}</p>

  <p class="actions">
    <a class="primary" href={links.resume}>Resume</a>
    <a class="secondary" href={links.github} rel="noopener">GitHub</a>
    <a class="secondary" href={links.linkedin} rel="noopener">LinkedIn</a>
  </p>
  <p class="visually-hidden">{name}</p>
</header>

<style>
  .hero { padding: var(--space-8) 0 var(--space-7); }

  .status {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--status);
    letter-spacing: 0.04em;
    margin-bottom: var(--space-5);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status);
    display: inline-block;
  }

  .sep, .tag { color: var(--faint); }

  h1 {
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: -0.035em;
    max-width: 13em;
  }

  .subline {
    font-size: var(--text-base);
    color: var(--muted);
    margin-top: var(--space-5);
  }

  .meta { margin-top: var(--space-4); }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-6);
  }

  .actions a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: 5px;
    font-size: var(--text-sm);
    text-decoration: none;
    transition: background 120ms ease-out, border-color 120ms ease-out;
  }

  .primary { background: var(--text); color: var(--bg); font-weight: 600; }
  .primary:hover { background: var(--accent); }

  .secondary { border: 1px solid var(--hairline); color: var(--muted); }
  .secondary:hover { border-color: var(--faint); color: var(--text); }

  .visually-hidden {
    position: absolute;
    width: 1px; height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (min-width: 48rem) {
    .hero { padding: var(--space-9) 0 var(--space-8); }
    h1 { font-size: var(--text-3xl); }
    .subline { font-size: var(--text-md); }
  }
</style>
```

The headline at `--text-xl` (28px) on a 360px viewport wraps to three lines at most, which is the spec's mobile requirement. Verify this in Task 9.

- [ ] **Step 2: Write the proof strip**

Create `src/components/ProofStrip.astro`. Two columns on mobile, four from the tablet breakpoint up.

```astro
---
import profile from '../../content/profile.json';
const { stats } = profile;
---
<ul class="strip">
  {stats.map((s) => (
    <li>
      <span class="value">{s.value}</span>
      <span class="label">{s.label}</span>
    </li>
  ))}
</ul>

<style>
  .strip {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border-top: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
  }

  li {
    padding: var(--space-5) var(--space-4);
    border-right: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
  }

  li:nth-child(2n) { border-right: 0; }
  li:nth-last-child(-n + 2) { border-bottom: 0; }

  .value {
    display: block;
    font-size: var(--text-xl);
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .label {
    display: block;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: var(--space-2);
  }

  @media (min-width: 48rem) {
    .strip { grid-template-columns: repeat(4, 1fr); }
    li:nth-child(2n) { border-right: 1px solid var(--hairline); }
    li:last-child { border-right: 0; }
    li { border-bottom: 0; }
  }
</style>
```

- [ ] **Step 3: Compose them on the page**

Replace the body of `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import ProofStrip from '../components/ProofStrip.astro';
---
<Base
  title="Mansoor Ameen — Frontend Engineer"
  description="Frontend engineer building production web and mobile applications with React, React Native, Next.js and TypeScript."
>
  <Hero />
  <ProofStrip />
</Base>
```

- [ ] **Step 4: Write the failing assertions**

Append to `test/build-check.mjs`:

```js
test('the hero carries the AI-first signal', () => {
  assert.match(html, /AI-first engineer/);
  assert.match(html, /I work AI-first/);
});

test('the proof strip renders all four stats', () => {
  for (const stat of profile.stats) {
    assert.ok(html.includes(stat.label), `missing stat: ${stat.label}`);
  }
});
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — the built page predates the components.

- [ ] **Step 6: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS.

- [ ] **Step 7: Look at it**

```bash
npm run dev
```

Open the printed URL, and narrow the window to 360px. Confirm the headline wraps to no more than three lines, the stats sit two-per-row, and the buttons are comfortably tappable.

- [ ] **Step 8: Commit**

```bash
git add src/components/Hero.astro src/components/ProofStrip.astro src/pages/index.astro test/build-check.mjs
git commit -m "feat: add hero and proof strip"
```

---

### Task 5: Section shell, Selected Work, and How I Build

Introduces the numbered-section pattern every remaining section reuses, then the two sections that carry the most weight.

**Files:**
- Create: `src/components/Section.astro`, `src/components/Work.astro`, `src/components/HowIBuild.astro`
- Modify: `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: `content/work.json`; `content/profile.json` field `howIBuild`.
- Produces: `<Section num="01" title="Selected work" id="work">…</Section>` — props are `num: string`, `title: string`, `id: string`, plus a default slot. Every later section uses it.

- [ ] **Step 1: Write the section shell**

Create `src/components/Section.astro`:

```astro
---
interface Props {
  num: string;
  title: string;
  id: string;
}
const { num, title, id } = Astro.props;
---
<section class="section" id={id}>
  <div class="section-head">
    <span class="section-num">{num}</span>
    <h2 class="label">{title}</h2>
  </div>
  <slot />
</section>

<style>
  h2 { font-size: var(--text-xs); font-weight: 500; }
</style>
```

`.section`, `.section-head`, `.section-num`, and `.label` all come from `global.css` — do not redefine them here.

- [ ] **Step 2: Write the selected work component**

Create `src/components/Work.astro`:

```astro
---
import work from '../../content/work.json';
---
<ol class="entries">
  {work.map((item) => (
    <li>
      <div class="row">
        <h3>{item.title}</h3>
        <span class="mono">{item.meta}</span>
      </div>
      <p>{item.description}</p>
      <p class="tech">{item.tech.join('  ·  ')}</p>
    </li>
  ))}
</ol>

<style>
  .entries { list-style: none; margin: 0; padding: 0; }

  li {
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--hairline);
  }

  li:last-child { border-bottom: 0; padding-bottom: 0; }
  li:first-child { padding-top: 0; }

  .row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  h3 { font-size: var(--text-lg); }

  p { color: var(--muted); margin-top: var(--space-2); max-width: 38em; }

  @media (min-width: 48rem) {
    .row {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-5);
    }
    .row .mono { white-space: nowrap; }
  }
</style>
```

- [ ] **Step 3: Write the How I Build component**

Create `src/components/HowIBuild.astro`. This section is emphasised typographically — a larger lead paragraph and an accent rule — rather than with a box or a badge.

```astro
---
import profile from '../../content/profile.json';
const { lead, body } = profile.howIBuild;
---
<div class="build">
  <p class="lead">{lead}</p>
  <p class="body">{body}</p>
</div>

<style>
  .build { border-left: 2px solid var(--accent); padding-left: var(--space-5); }

  .lead {
    font-size: var(--text-md);
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .body { color: var(--muted); margin-top: var(--space-4); }

  @media (min-width: 48rem) {
    .lead { font-size: var(--text-lg); line-height: 1.5; }
  }
</style>
```

That accent border is one of the four permitted uses of the accent color. The others are the tech lines, the primary button hover, and the focus ring.

- [ ] **Step 4: Add both sections to the page**

In `src/pages/index.astro`, add the imports and place the sections after `<ProofStrip />`:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import ProofStrip from '../components/ProofStrip.astro';
import Section from '../components/Section.astro';
import Work from '../components/Work.astro';
import HowIBuild from '../components/HowIBuild.astro';
---
<Base
  title="Mansoor Ameen — Frontend Engineer"
  description="Frontend engineer building production web and mobile applications with React, React Native, Next.js and TypeScript."
>
  <Hero />
  <ProofStrip />
  <Section num="01" title="Selected work" id="work"><Work /></Section>
  <Section num="02" title="How I build" id="how-i-build"><HowIBuild /></Section>
</Base>
```

- [ ] **Step 5: Write the failing assertions**

Append to `test/build-check.mjs`:

```js
import work from '../content/work.json' with { type: 'json' };

test('every selected work entry renders', () => {
  for (const item of work) {
    assert.ok(html.includes(item.title), `missing work entry: ${item.title}`);
  }
});

test('the how-i-build section names the process and the outcome', () => {
  assert.match(html, /Claude Code/);
  assert.match(html, /first week/);
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — the built page has neither section yet.

- [ ] **Step 7: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/Section.astro src/components/Work.astro src/components/HowIBuild.astro src/pages/index.astro test/build-check.mjs
git commit -m "feat: add selected work and how-i-build sections"
```

---

### Task 6: About, Experience, and Technical Stack

**Files:**
- Create: `src/components/About.astro`, `src/components/Experience.astro`, `src/components/Stack.astro`
- Modify: `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: `content/profile.json` fields `about` and `links.resume`; `content/experience.json`; `content/stack.json`; the `<Section />` component from Task 5.
- Produces: three prop-less components.

- [ ] **Step 1: Write the about component**

Create `src/components/About.astro`:

```astro
---
import profile from '../../content/profile.json';
---
<p class="about">{profile.about}</p>

<style>
  .about { font-size: var(--text-md); color: var(--muted); max-width: 36em; }
</style>
```

- [ ] **Step 2: Write the experience component**

Create `src/components/Experience.astro`:

```astro
---
import experience from '../../content/experience.json';
import profile from '../../content/profile.json';
---
<ol class="roles">
  {experience.map((role) => (
    <li>
      <div class="row">
        <h3>{role.company}</h3>
        <span class="mono">{role.period}</span>
      </div>
      <p class="role">{role.role}</p>
      <ul class="bullets">
        {role.bullets.map((b) => <li>{b}</li>)}
      </ul>
    </li>
  ))}
</ol>

<p class="more">
  <a href={profile.links.resume}>Full resume (PDF)</a>
</p>

<style>
  .roles { list-style: none; margin: 0; padding: 0; }

  .roles > li {
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--hairline);
  }

  .roles > li:first-child { padding-top: 0; }

  .row { display: flex; flex-direction: column; gap: var(--space-1); }

  h3 { font-size: var(--text-md); }

  .role { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent); margin-top: var(--space-1); }

  .bullets { margin: var(--space-3) 0 0; padding-left: var(--space-4); color: var(--muted); }
  .bullets li { margin-bottom: var(--space-2); max-width: 38em; }

  .more { margin-top: var(--space-5); }

  .more a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: var(--text-sm);
    color: var(--text);
    text-decoration: none;
    border-bottom: 1px solid var(--hairline);
    transition: border-color 120ms ease-out;
  }

  .more a:hover { border-color: var(--text); }

  @media (min-width: 48rem) {
    .row {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-5);
    }
    .row .mono { white-space: nowrap; }
  }
</style>
```

The role line is the fourth and final permitted accent use. If a later task needs the accent, remove it from somewhere first.

- [ ] **Step 3: Write the stack component**

Create `src/components/Stack.astro`. Grouped, as plain text lists rather than pills — pills are what the old site did and they read as noise at this density.

```astro
---
import stack from '../../content/stack.json';
---
<dl class="stack">
  {stack.map((group) => (
    <div class="group">
      <dt class="mono">{group.group}</dt>
      <dd>{group.items.join('  ·  ')}</dd>
    </div>
  ))}
</dl>

<style>
  .stack { margin: 0; }

  .group {
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--hairline);
  }

  .group:last-child { border-bottom: 0; }

  dt { margin-bottom: var(--space-2); }

  dd { margin: 0; color: var(--muted); max-width: 38em; }

  @media (min-width: 48rem) {
    .group { display: grid; grid-template-columns: 8rem 1fr; gap: var(--space-5); align-items: baseline; }
    dt { margin-bottom: 0; }
  }
</style>
```

- [ ] **Step 4: Add the sections to the page**

In `src/pages/index.astro`, import the three components and append after the How I build section:

```astro
  <Section num="03" title="About" id="about"><About /></Section>
  <Section num="04" title="Experience" id="experience"><Experience /></Section>
  <Section num="05" title="Technical stack" id="stack"><Stack /></Section>
```

- [ ] **Step 5: Write the failing assertions**

Append to `test/build-check.mjs`:

```js
import experience from '../content/experience.json' with { type: 'json' };

test('every current role renders', () => {
  for (const role of experience) {
    assert.ok(html.includes(role.company), `missing role: ${role.company}`);
  }
});

test('roles excluded from the site stay off the page', () => {
  for (const excluded of [/TheTravelights/i, /Diya Systems/i, /WordPress/i, /Freelance/i]) {
    assert.doesNotMatch(html, excluded);
  }
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL on the missing roles.

- [ ] **Step 7: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/About.astro src/components/Experience.astro src/components/Stack.astro src/pages/index.astro test/build-check.mjs
git commit -m "feat: add about, experience, and stack sections"
```

---

### Task 7: Writing, Experiments, Contact, and the footer

Completes the page.

**Files:**
- Create: `src/components/Writing.astro`, `src/components/Experiments.astro`, `src/components/Contact.astro`
- Modify: `src/pages/index.astro`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: `content/writing.json`; `content/profile.json` fields `links` and `lastUpdated`.
- Produces: three prop-less components. `<Contact />` renders the page footer, so no separate footer component exists.

- [ ] **Step 1: Write the writing component**

Create `src/components/Writing.astro`:

```astro
---
import writing from '../../content/writing.json';
import profile from '../../content/profile.json';
---
<ul class="posts">
  {writing.map((post) => (
    <li>
      <a href={post.url} rel="noopener">
        <span class="title">{post.title}</span>
        {post.note && <span class="mono note">{post.note}</span>}
      </a>
    </li>
  ))}
</ul>

<p class="more">
  <a href={profile.links.hashnode} rel="noopener">All posts on Hashnode</a>
</p>

<style>
  .posts { list-style: none; margin: 0; padding: 0; }

  .posts li { border-bottom: 1px solid var(--hairline); }

  .posts a {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-height: 44px;
    padding: var(--space-4) 0;
    text-decoration: none;
    transition: color 120ms ease-out;
  }

  .title { font-size: var(--text-md); }

  .posts a:hover .title { color: var(--accent); }

  .more { margin-top: var(--space-5); }

  .more a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: var(--text-sm);
    text-decoration: none;
    border-bottom: 1px solid var(--hairline);
  }

  @media (min-width: 48rem) {
    .posts a {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-5);
    }
    .note { white-space: nowrap; }
  }
</style>
```

- [ ] **Step 2: Write the experiments component**

Create `src/components/Experiments.astro`. One entry only — the Chrome extension is excluded per the spec.

```astro
---
---
<div class="entry">
  <div class="row">
    <h3>Authentication Flow</h3>
    <span class="mono">
      <a href="https://auth-flow-three.vercel.app/" rel="noopener">Demo</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/mansoorameen/auth-flow" rel="noopener">Source</a>
    </span>
  </div>
  <p>A side project exploring TypeScript, progressive web app features, and unit testing outside of day-to-day product work.</p>
  <p class="tech">next.js  ·  typescript  ·  jest  ·  pwa</p>
</div>

<style>
  h3 { font-size: var(--text-md); }

  .row { display: flex; flex-direction: column; gap: var(--space-2); }

  .row a { text-decoration: none; border-bottom: 1px solid var(--hairline); padding-bottom: 1px; }
  .row a:hover { border-color: var(--faint); }

  p { color: var(--muted); margin-top: var(--space-2); }

  @media (min-width: 48rem) {
    .row { flex-direction: row; justify-content: space-between; align-items: baseline; gap: var(--space-5); }
  }
</style>
```

- [ ] **Step 3: Write the contact component**

Create `src/components/Contact.astro`. The email is written literally so the test in Task 3 can prove the old placeholder is gone.

```astro
---
import profile from '../../content/profile.json';
const { email, github, linkedin } = profile.links;
---
<div class="contact">
  <p class="line">
    <a href={`mailto:${email}`}>{email}</a>
  </p>
  <p class="line">
    <a href={github} rel="noopener">GitHub</a>
    <a href={linkedin} rel="noopener">LinkedIn</a>
  </p>
</div>

<footer class="foot">
  <p class="mono">Last updated {profile.lastUpdated}</p>
</footer>

<style>
  .line { display: flex; flex-wrap: wrap; gap: var(--space-5); }

  .line + .line { margin-top: var(--space-3); }

  .line a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: var(--text-md);
    text-decoration: none;
    border-bottom: 1px solid var(--hairline);
    transition: border-color 120ms ease-out;
  }

  .line a:hover { border-color: var(--text); }

  .foot {
    border-top: 1px solid var(--hairline);
    padding: var(--space-5) 0 var(--space-7);
    margin-top: var(--space-7);
  }
</style>
```

- [ ] **Step 4: Add the final sections to the page**

Append to `src/pages/index.astro`, after the stack section:

```astro
  <Section num="06" title="Writing" id="writing"><Writing /></Section>
  <Section num="07" title="Experiments" id="experiments"><Experiments /></Section>
  <Section num="08" title="Contact" id="contact"><Contact /></Section>
```

- [ ] **Step 5: Write the failing assertions**

Append to `test/build-check.mjs`:

```js
test('the real email address is on the page', () => {
  assert.ok(html.includes(`mailto:${profile.links.email}`));
});

test('the footer stamps when the site was last updated', () => {
  assert.ok(html.includes(profile.lastUpdated));
});

test('the excluded side project stays off the page', () => {
  assert.doesNotMatch(html, /coronavirus/i);
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL on the email and last-updated assertions.

- [ ] **Step 7: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS, including the placeholder-email assertion from Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/components/Writing.astro src/components/Experiments.astro src/components/Contact.astro src/pages/index.astro test/build-check.mjs
git commit -m "feat: add writing, experiments, and contact sections"
```

---

### Task 8: Migration — remove the old site, add redirects, sitemap, and OG image

The new page now renders everything the old one did. This task retires the old files without breaking any existing link.

**Files:**
- Delete: `index.html`, `about.html`, `projects.html`, `script.js`, `css/main.css`, `blogs/`
- Move: `images/` → `public/images/`, `.well-known/` → `public/.well-known/`, `downloads/` → deleted
- Create: `public/_redirects`, `public/robots.txt`, `public/og.png`
- Modify: `astro.config.mjs`, `package.json`
- Test: `test/build-check.mjs`

**Interfaces:**
- Consumes: the complete page from Task 7.
- Produces: a `dist/` directory that is the entire deployable site.

- [ ] **Step 1: Move the static assets Astro should serve**

Astro serves anything under `public/` at the site root, unchanged.

```bash
mkdir -p public
git mv images public/images
git mv .well-known public/.well-known
```

The favicon reference in `Base.astro` is already `/images/mainlogo.svg`, which resolves correctly after this move.

- [ ] **Step 2: Delete the old site**

`downloads/` holds the zipped Chrome extension, which the spec excludes.

```bash
git rm -r index.html about.html projects.html script.js css blogs downloads
```

- [ ] **Step 3: Add redirects so no existing link 404s**

Create `public/_redirects`. Netlify reads this file from the publish directory. The `301!` forces the redirect even though a file of that name no longer exists.

```
/about.html                /#about                                                                    301!
/projects.html             /#work                                                                     301!
/blogs/howjsworks.html     https://mansoorameen.hashnode.dev/how-javascript-works                     301!
/blogs/android.html        https://mansoorameen.hashnode.dev/                                         301!
/blogs/morning.html        https://mansoorameen.hashnode.dev/                                         301!
```

The android and morning posts redirect to the Hashnode index because their individual slugs are not recorded in the old HTML. Before shipping, check `https://mansoorameen.hashnode.dev/` for their real URLs and use those instead if they exist.

- [ ] **Step 4: Add robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://mansoorameen.netlify.app/sitemap-index.xml
```

- [ ] **Step 5: Add the sitemap integration**

```bash
npx astro add sitemap --yes
```

Confirm `astro.config.mjs` now imports `@astrojs/sitemap` and lists it in `integrations`. The `site` value set in Task 1 is what makes it work.

- [ ] **Step 6: Create the OG image**

The social card is a 1200×630 PNG. Generate it from the site itself so it matches the design rather than being drawn separately:

```bash
npm run dev
```

In another terminal, screenshot the hero at card dimensions and save it to `public/og.png`:

```bash
npx playwright screenshot --viewport-size=1200,630 --wait-for-timeout=1500 http://localhost:4321/ public/og.png
```

Open `public/og.png` and confirm the name and headline are both legible and nothing is cut mid-word. If the crop is poor, adjust the viewport height or scroll offset rather than accepting it — this image is what appears on LinkedIn.

- [ ] **Step 7: Write assertions for the migration**

Append to `test/build-check.mjs`:

```js
test('redirects ship with the build', () => {
  const redirects = readFileSync('dist/_redirects', 'utf8');
  for (const path of ['/about.html', '/projects.html', '/blogs/howjsworks.html']) {
    assert.ok(redirects.includes(path), `missing redirect for ${path}`);
  }
});

test('the brave rewards verification file survives the migration', () => {
  assert.ok(existsSync('dist/.well-known/brave-rewards-verification.txt'));
});

test('the social card image is deployed', () => {
  assert.ok(existsSync('dist/og.png'));
});

test('a sitemap is generated', () => {
  assert.ok(existsSync('dist/sitemap-index.xml'));
});
```

- [ ] **Step 8: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — the previous build predates the redirects, sitemap, and moved assets.

- [ ] **Step 9: Rebuild and verify the tests pass**

```bash
npm run build && npm test
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: retire the static HTML site and add redirects, sitemap, and social card"
```

---

### Task 9: Verification and deploy

Nothing here is optional — the spec's quality bar is a requirement, not an aspiration.

**Files:**
- Modify: whatever the checks turn up.

**Interfaces:**
- Consumes: the complete site from Task 8.

- [ ] **Step 1: Check both themes**

```bash
npm run build && npx astro preview
```

Open the preview URL. Switch the operating system between light and dark appearance and reload. Confirm in both: text is legible, hairlines are visible but not harsh, and the accent reads as an accent rather than as decoration.

- [ ] **Step 2: Verify contrast**

In Chrome DevTools, open the Elements panel, select each text element, and read the contrast ratio in the Styles pane's color picker. Required: at least 4.5:1 for body text and 3:1 for text at 21px or larger, in **both** themes. The `--muted` and `--faint` tokens are the ones at risk. If any fails, adjust the token in `global.css` rather than patching individual components.

- [ ] **Step 3: Check the keyboard path**

Load the page and press Tab repeatedly from the top. Every link must receive a visible focus ring, in a sensible order, and nothing may be reachable but invisible. Confirm the ring is visible in both themes.

- [ ] **Step 4: Run Lighthouse**

In Chrome DevTools, open the Lighthouse panel, select Mobile, and run it against the preview URL. Required: 95+ for Performance, Accessibility, and SEO. Fix anything below that before continuing; do not proceed on a "close enough".

- [ ] **Step 5: Check it on a real phone**

Get the site onto an actual device — the simplest route is `npx astro preview --host` and opening the printed network URL on a phone on the same Wi-Fi.

Confirm: the headline is at most three lines, the proof strip is two-by-two, no horizontal scrolling exists anywhere, the buttons are easy to hit with a thumb, and text is comfortably readable without zooming. A resized desktop browser is not a substitute for this step.

- [ ] **Step 6: Verify the resume link**

Open the resume URL in a private browsing window with no Google account signed in. It must download a PDF. If it prompts for access instead, fix the sharing setting on the Google Doc to "Anyone with the link can view" before shipping.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address contrast, accessibility, and mobile issues found in verification"
```

- [ ] **Step 8: Deploy**

Push to `master`. Netlify picks up `netlify.toml`, runs `npm run build`, and publishes `dist/`.

```bash
git push origin master
```

- [ ] **Step 9: Verify the live site**

Once the deploy finishes, check on the real domain:

- The page loads and looks right.
- `https://mansoorameen.netlify.app/about.html` redirects to the about section.
- `https://mansoorameen.netlify.app/blogs/howjsworks.html` redirects to Hashnode.
- Paste the site URL into LinkedIn's post composer and confirm the card renders with the OG image and description. If it shows stale data, run the URL through LinkedIn's Post Inspector to refresh the cache.

---

## Phase 2 (not in this plan)

Sveltia CMS at `/admin`, writing to `content/*.json` via GitHub OAuth. Deferred deliberately — see the spec. Plan it separately once phase 1 is live.
