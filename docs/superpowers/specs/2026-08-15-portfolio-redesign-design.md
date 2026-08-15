# Portfolio Redesign — Design Spec

Date: 2026-08-15
Status: Approved for planning

## Problem

The site and the resume became two sources of truth, and the site stopped
being updated. It presents a 2022–2023 profile — "4+ years experience",
React/Next.js/React Native only — while the resume presents six years
across React, React Native, Next.js, TypeScript, Flutter, NestJS, OTA
updates, and mobile deep linking.

Secondary problems:

- Projects lead with a 2020 Chrome extension rather than production work.
- No work history on the site at all. The strongest evidence (Expo 2020
  Dubai, the React Native rebuild, splitting one product into two apps)
  exists only in the resume.
- Plain HTML with no includes has already caused drift: `index.html` still
  carries a `mailto:your-email@gmail.com` placeholder fixed elsewhere.
- Blog posts are duplicated between `blogs/*.html` and Hashnode.

## Audience and Purpose

Primary audience: recruiters and hiring managers screening the candidate.

The site is not the resume. The resume is optimized for ATS and complete
history; the site is optimized for a hiring manager forming an impression
in under a minute. The site is a deliberate subset whose job is to make a
reader think "this person has actually built things," then hand them the
resume link and a way to make contact.

## Technical Decisions

**Framework: Astro, static output, deployed to Netlify.**

Plain HTML was considered and rejected for two reasons: the CMS in phase 2
writes JSON, which needs a build step to render into HTML (client-side
`fetch` would hide content from search engines and link previews), and HTML
has no includes, so nav, footer, and meta tags would be copy-pasted across
pages — the drift problem the redesign exists to solve. Next.js and a Vite
SPA were rejected as heavier than a five-section static site needs. Astro
outputs static HTML, ships no JavaScript unless asked, and can host React
components if interactivity is ever needed.

**Content: JSON files under `content/`.**

```
content/
  profile.json      name, title, tagline, location, links, lastUpdated
  work.json         selected work entries
  experience.json   role entries
  stack.json        grouped technologies
  writing.json      posts with links to Hashnode
```

A `profile.ts` layer was considered and rejected: the CMS is the source of
truth for site content, and a form can write JSON safely but cannot write
TypeScript. One layer, not two.

**Resume: stays in Google Docs.** The site links to it via the
`/export?format=pdf` URL so the link downloads a current PDF without
requiring the viewer to have a Google account or hit a "Request access"
wall. This leaves site and resume as two sources, which is accepted: the
site is a deliberate subset, so they only re-sync when a role changes. A
`lastUpdated` field rendered in the footer makes staleness publicly
visible as a forcing function.

**Phase 2: Sveltia CMS at `/admin`.** Git-based — the admin form commits
JSON changes to GitHub, Netlify rebuilds, the site updates in one to two
minutes. No server and no database. Deferred so the redesign can ship
without waiting on the GitHub OAuth setup, which is the only fiddly part.

## Visual Direction

Dark base (near-black) with a light theme, monospace labels and metadata,
one purple accent used sparingly, sections presented as an indexed list
with hairline rules. A stat strip sits directly below the hero.

Craft requirements, which are part of the deliverable and not polish to be
added later:

- A single spacing scale; no eyeballed gaps.
- A defined type scale with optical letter-spacing on large headings.
- AA contrast in both themes, verified rather than assumed.
- Visible focus rings on every interactive element.
- Transitions at roughly 120ms ease-out, and `prefers-reduced-motion`
  respected.
- The design must work with no project screenshots. Client work cannot be
  shown, so the page carries itself typographically.

## Mobile

Mobile is the primary view, not a fallback — most recruiters open a
portfolio link from LinkedIn on a phone.

- Build mobile-first; the 360px-wide layout is designed before the desktop
  one.
- The proof strip reflows from four columns to two on narrow screens.
- Hero type scales down so the headline never exceeds three lines on a
  phone.
- Tap targets are at least 44px.
- Verified on a real device before ship, not only in a resized browser.

## Page Structure

One long home page, in this order:

1. **Hero** — name, one-sentence positioning, stack line, availability,
   buttons for Resume, GitHub, LinkedIn.
2. **Proof strip** — 6+ years shipping / 4 platforms shipped to (web, iOS,
   Android, desktop) / Expo 2020 Dubai, onsite / 1.9K reads on one post.
   Chosen over an app count: "10+ apps" invites the question "which ten?"
   and quantity is not what impresses. Shipping to four platforms is
   uncommon among frontend engineers and is provable further down the page.
3. **Selected Work** — three entries: the React Native rebuild and
   client/staff split, Shownex, and Expo 2020 Dubai. Each has a title, a
   two-sentence outcome-focused description, and a technology line.
4. **About** — short. Absorbs the AI-assisted-workflow point in one clause
   rather than getting its own section.
5. **Experience** — Shownex (3 bullets), BuildNext (3), Viga (2), followed
   by a link to the full resume.
6. **Technical Stack** — grouped as Frontend / Mobile / Backend / Tools.
7. **Writing** — links out to Hashnode, leading with the 1.9K-view post and
   its daily.dev feature.
8. **Experiments** — the auth-flow project only.
9. **Contact** — email, LinkedIn, GitHub, and the footer `lastUpdated`
   stamp.

## Excluded

- A "How I Build / AI-first" section. Folded into About as one clause;
  as a standalone section it reads as filler in 2026.
- Freelance, TheTravelights (WordPress), and Diya Systems (technical
  support) from Experience. The resume keeps them for continuous history;
  on the site they dilute a senior engineering frame.
- The coronavirus Chrome extension.
- Self-hosted blog pages, which split search ranking against the Hashnode
  originals.
- PDF generation from site data. The Google Doc remains the resume source.

## Migration

Redirects from the old URLs so no existing link 404s:

- `/about.html` → `/#about`
- `/projects.html` → `/#work`
- `/blogs/howjsworks.html`, `/blogs/android.html`, `/blogs/morning.html` →
  their Hashnode equivalents

Preserved as-is: `.well-known/brave-rewards-verification.txt`, the
`google-site-verification` meta tag, the favicon, and `images/me.jpeg`.

Fixed during the rebuild:

- `index.html:230` — the dead `mailto:your-email@gmail.com` placeholder.
- `index.html:64` — an `<h5>` closed with `</h3>`.
- `index.html:7` — `name="theme>-color"` typo.

## Quality Bar

- Per-page OG and Twitter meta tags, plus an OG image, so shared links
  render properly on LinkedIn and Slack.
- `sitemap.xml` and `robots.txt`.
- Lighthouse: 95+ on performance, accessibility, and SEO.
- Keyboard navigable end to end.
- No content in the page that is only reachable via client-side JavaScript.

## Phasing

**Phase 1** — Astro rebuild, all sections, both themes, mobile, redirects,
meta, deploy. Content edited by hand in `content/*.json`.

**Phase 2** — Sveltia CMS at `/admin`: GitHub OAuth, a collection schema
matching the JSON files, and browser-based editing from any device.
