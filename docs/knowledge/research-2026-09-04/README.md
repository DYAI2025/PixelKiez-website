# Pixelkiez Knowledge Research Synthesis - 2026-09-04

Status: `RESEARCH_SYNTHESIS / IMPLEMENTATION_INPUT / NOT_PUBLISHED`

This directory is the editorial source package for the next Knowledge implementation slices. It is deliberately outside `site/`; the current Docker build copies only `site/` and `scripts/`, so these files do not change the runtime website by themselves.

## Repository snapshot

- Development repository: `DYAI2025/PixelKiez-website`
- Base ref used for this synthesis: `main`
- Base commit: `71328920f1a548d1faf58f66c6fc07d4903ba935`
- Base tree: `a872df16367026199d777521ad185c38ba11b4b8`
- Upstream comparison point observed during reconcile: `PixelKiez/PixelKiez-website` `main` at `efb7d69ebca7e49c6cd65cb84bca33eb32d02e02`

This package is not proof that the Knowledge pages are publication-ready. It is a source-controlled content input for later implementation and review.

## Jira mapping

- `PXK-58` consumes K1, K3, K4 and K5 for the four existing content shells:
  - `/wissen/seo-geo-ai-visibility/`
  - `/wissen/answerability/`
  - `/wissen/entity-trust/` (route kept for now; public terminology needs correction, see below)
  - `/wissen/agent-readiness/`
- K2 hardens the already substantial `/wissen/wie-ki-websites-liest/` article. It is not a request to replace the current scene/content work wholesale.
- `PXK-29` consumes K6 for the separate deep dive `/wissen/wie-websites-ausgeliefert-werden/` and the corresponding English route.
- No PXAPI, automation, indexing, sitemap or production release is part of this package.

## Research inputs reviewed

### Primary-source research - used

1. `research_2/deep-research-report (1).md` - strongest structured primary-source dossier; source registry, claim matrix, prohibited claims and article material.
2. `research_1/1_executive_findings_pipeline_getrenntheit_in_suc.md` - independent primary-source style run used for convergence checks.
3. `research_1/grok_report.pdf` - visually inspected as a corroborating primary-style dossier. It substantially overlaps the Markdown dossiers. It is not used as unique claim authority because its text layer is not reliably extractable and the Markdown research carries stronger traceability.
4. `research_1/Primaerquellen-Dossier ... 2026.md` - supplemental architecture synthesis. Only statements that survived the stronger primary/scientific/red-team comparison were retained.

### Scientific research - used

1. `research_2/executive_scientific_findings_keine_universellen_.md` - main scientific evidence review.
2. `research_1/evidence_review_web_search_information_retrieval.md` - supplemental scientific review used for comparison.

### Adversarial research - used

1. `research_3/executive_red_team_verdict_surviving_core_ideas_w.md` - main falsification / counter-evidence report.

### Excluded from subject-matter evidence

- `research_1/deep-research-report (2).md` - a generic deep-research workflow/legal-method report, not the requested K1-K6 subject-matter dossier.
- `research_3/deep-research-report (3).md` - a research-project planning report, not the executed adversarial K1-K6 evidence review.
- `.DS_Store` and the NotebookLM mind map are not factual authorities.

## Synthesis rule

A claim is implementation-ready only when at least one of these conditions is met:

1. a current primary/official source directly supports the scoped statement; or
2. the claim survives convergence across the primary-source dossier and the scientific/adversarial reviews.

Claims are weakened or removed when the red-team report identifies a causal leap, platform overgeneralization, benchmark overgeneralization or terminology problem.

`SOURCE_NEEDED` and low-confidence effects are not converted into customer-facing facts.

## Canonical terminology decisions

| Term | Decision | Public-use rule |
|---|---|---|
| SEO | established | Use normally, but never imply guaranteed ranking. |
| GEO | `EMERGING_TERM` | Explain as an emerging research/industry term. Do not present it as a Google/OpenAI standard or a guaranteed method. |
| AI Visibility | useful but ambiguous | Treat as an observation/measurement layer: presence, mention, link or citation in a defined system/query/time window. Do not treat it as one hidden score. |
| Answerability | `PIXELKIEZ_WORKING_MODEL` | Explicitly define it as Pixelkiez's working model for how directly, contextually and supportably a page answers a concrete question. It is not a platform metric. |
| Entity Trust | `MISLEADING` | Do not present as a technical mechanism or score. Preferred editorial term: `Entity Clarity` / `Entity-Zuordnung und Konsistenz`. The existing route can remain until a routing decision is made. |
| Agent Readiness | `EMERGING_TERM / PIXELKIEZ_WORKING_MODEL` | Define as testable ability of an agent to interpret controls, execute a bounded task and read back a result. Accessibility helps some agent paths but is not equivalent to agent readiness. |
| Machine Readability | established but broad | Always qualify by system, purpose and representation (HTTP/HTML, DOM, accessibility semantics, visual/browser path, etc.). |

## Core surviving model

1. **Pipeline states must stay separate.** Reachable, crawled, rendered, indexed, retrieved, grounded, cited/linked, visible, clicked and converted are not synonyms and do not form a guaranteed funnel.
2. **There is no single machine view of a website.** Providers expose different crawlers/fetchers and agents; different systems may use different representations and execution paths.
3. **Important public information should be robustly available.** Text, links, identity data and core actions should not depend unnecessarily on one fragile client-only path. This is a compatibility/resilience recommendation, not a ranking guarantee.
4. **Clarity is not causality.** Explicit answers, structured data, semantic markup and entity consistency can improve interpretation or reduce ambiguity in scoped systems, but do not by themselves prove ranking, citation, traffic or conversion impact.
5. **Framework name is not delivery architecture.** The relevant questions are what the URL initially returns, what requires JavaScript, what is rendered or hydrated, and whether the critical content/action remains understandable.
6. **Agent interfaces are heterogeneous.** Some automation uses roles/accessible names, some agents use screenshots/pixels, and some are hybrid. No single markup checklist guarantees compatibility.
7. **Measure observed outcomes separately.** AI citation/presence, referrals and business outcomes require their own evidence; single prompt observations are not durable causal proof.

## Claims intentionally rejected or softened

Do not publish any of the following as fact:

- `GEO is the new SEO.`
- `GEO guarantees AI visibility, citations or traffic.`
- `A fixed-context GEO benchmark uplift predicts real organic uplift.`
- `llms.txt improves rankings or AI citations.`
- `Structured data/schema.org boosts rankings or guarantees AI citations.`
- `FAQ pages are preferred by ChatGPT.`
- `React is bad for SEO` / `Next.js is good for SEO` / `Astro ranks better`.
- `Server rendering ranks better.`
- `All AI crawlers do not execute JavaScript.`
- `If content is in a post-JavaScript DOM, every AI can use it.`
- `Accessibility compliance equals agent readiness.`
- `A clear entity creates trust, ranking or citations.`
- `Entity Trust Score` or `Answerability Score` as an external platform metric.

## Files in this package

- `SOURCE_REGISTER.md` - sources actually needed by the implementation copy, with freshness rules.
- `CLAIM_LEDGER.md` - canonical allowed claims and forbidden strengthening.
- `IMPLEMENTATION_CONTRACT.md` - rules for Claude/Codex when moving copy into HTML and EN routes.
- `K1-seo-geo-ai-visibility.de.md`
- `K2-machine-readability.de.md`
- `K3-answerability.de.md`
- `K4-entity-clarity.de.md`
- `K5-agent-readiness.de.md`
- `K6-frameworks-rendering.de.md`

## Publication boundary

Before public release, high-freshness provider claims must be refreshed against current official documentation. The source package is a strong implementation input; it is not a substitute for the Knowledge publication gate, exact-head CI, browser/accessibility QA, DE/EN equivalence, manual-analysis CTA gate or explicit indexing decision.
