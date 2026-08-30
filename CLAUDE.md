# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pixelkiez website — a static site with a build step, no framework. Source lives in `site/`, the deliverable is generated into `dist/` (not committed). A separate contact-form service lives in `api/`. Internally still named "BDS" (Berlin Digital Systems): `bds.css`, `bds.js`, package `bds-website` — the public brand and domain are Pixelkiez / `pixelkiez.de`.

**Everything in this repo is German**: code identifiers (`WURZEL`, `QUELLE`, `uebersetze`), comments, commit messages, README, and the site content itself. Keep it that way.

## Commands

```bash
npm run deps        # install deps — ALWAYS use this, never npm install/ci directly (see below)
npm run build       # site/ → dist/ (fails hard on any embedding or i18n error)
npm run verify      # acceptance gate over dist/, exit 1 on problems
npm run serve       # preview dist/ on http://localhost:8080 with production-like headers
npm run i18n        # after changing German text: extract new strings to site/i18n/en.json
npm run clean       # delete dist/
```

Before any deploy: `npm run build && npm run verify`. There are no tests or linters — build self-checks plus `verify.mjs` are the quality gates.

Contact-form service: `cd api && npm run mailtest` (SMTP credential check, `node mailtest.mjs --senden` sends a real test mail), `node server.mjs` to run it (config via env vars only, documented in `api/server.mjs` header and README).

### Why `npm run deps`

The project syncs via iCloud. Plain `npm install`/`npm ci` writes `node_modules` while iCloud uploads it, producing corrupt " 2"-suffixed duplicates (has happened). `scripts/deps.sh` installs normally, then moves the result to `node_modules.nosync` (iCloud skips `.nosync`) and symlinks it — for both the root and `api/`. If a build hangs silently, rerun `npm run deps`.

## Architecture

### Build pipeline (`scripts/build.mjs`)

Three German pages (`index.html`, `impressum.html`, `datenschutz.html`) plus a generated English page. Per page the build:

1. Content-hashes fonts and images into their filenames (enables 1-year immutable caching).
2. Merges, minifies, and **inlines all CSS and JS into the HTML** — the delivered pages load no external CSS/JS at all; one response per page.
3. Minifies HTML with two non-negotiable settings: `caseSensitive` (otherwise `viewBox`/`preserveAspectRatio` are lowercased and the SVG sprite breaks) and `conservativeCollapse` (preserves word spacing between inline elements).
4. Pre-compresses everything as `.br` and `.gz` next to the originals (Caddy serves them via `precompressed`).

The build **aborts** on any leftover `<link>`/`<script src>`, unresolved font/image reference, invalid embedded JS, broken JSON-LD, or missing translation. Never weaken these checks — they are the reason mistakes surface at build time instead of in production.

`scripts/verify.mjs` then checks what only shows on the whole `dist/` tree: orphaned files, dangling references, leftover source structure.

### i18n — German is the single source

There is deliberately no second English HTML file. `dist/en/index.html` is generated at build time by string replacement from `site/index.html` using `site/i18n/en.json` (HTML text/attributes/JSON-LD) and `site/i18n/en.js.json` (strings inside `bds.js`). The build fails if a German sentence lacks a translation **or** a translation points at text that no longer exists. Workflow after touching German text: `npm run i18n` → fill in the empty values in `en.json` → `npm run build`. Impressum/Datenschutz stay German-only on purpose (legal risk).

### Frontend

`site/assets/js/bds.js` is a dependency-free IIFE; `site/assets/css/bds.css` holds the whole design system. No libraries — keep it that way. Design tokens: primary `#B6C7C4`, black `#0E1413`, accent `#EC5D43` (as text: `#8F2410` for 4.5:1 contrast). All text contrast must hold WCAG AA — recheck when changing colors.

### Deployment — two services (Railway)

1. **Website**: root `Dockerfile`, two-stage — builds `dist/`, final image is Caddy + `dist/` only (no Node). `Caddyfile` serves the site, redirects www→apex, sets cache/security headers, and reverse-proxies `/api/*` to the form service via `API_UPSTREAM` (e.g. `bds-api.railway.internal:3000`) — same origin for the browser, no CORS.
2. **Form service**: `api/Dockerfile`, deliberately separate so a mail outage can't take down the site. Framework-free Node + nodemailer. Stores nothing; forwards form JSON as mail with visitor's address as `Reply-To`. Refuses with 503 while `SMTP_HOST`/`MAIL_TO` are unset — there is intentionally no success response without actual delivery. Includes honeypot, rate limiting, size/length limits, header-injection stripping, forced TLS, and forced IPv4 (the container has no IPv6 route; without the three IPv4 locks in `server.mjs`, SMTP failures masquerade as wrong-password errors).

`scripts/serve.mjs` mirrors the Caddy behavior locally (same headers, same `/api/*` proxy), so the full form→mail path can be tested before deploying.

### Repo root documents

`2026-07-28-BDS-Website-Bauplan.md`, `BDS-Website-Vision.md`, `BDS-Leistungen-Website-Content-v1.1.md` are internal working documents (vision, build plan, approved copy) — they inform content decisions but must never end up in the web root.

## Known open items before go-live

See "Offene Punkte" in README.md: legal texts carry `[FREIGABE AUSSTEHEND]`, domain is still the `pixelkiez.de` placeholder in canonical/OG/JSON-LD, SMTP env vars unset (form runs in dry-run), and the "ab 995,–" hero price is unconfirmed.
