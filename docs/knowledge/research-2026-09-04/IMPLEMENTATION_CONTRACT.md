# Knowledge Content Implementation Contract

Status: `BINDING_FOR_NEXT_CONTENT_IMPLEMENTATION`

Purpose: move the approved research synthesis into the existing Pixelkiez Knowledge pages without re-researching or inventing new factual claims inside the coding session.

## 1. Source of content truth

For K1-K6, the files in this directory are the editorial implementation input. The existing `site/wissen/*.html` files remain the UI/scene/layout implementation truth. Jira and Confluence remain product/architecture authority.

When content and current HTML differ:

- preserve the accepted scene grammar and page architecture;
- replace draft/placeholder prose with the approved content;
- do not preserve an old sentence if it conflicts with the claim ledger;
- do not silently change route architecture, publication state or CTA behavior.

## 2. No autonomous factual expansion

Claude/Codex MAY:

- adapt paragraph length to the existing design;
- improve grammar and transitions without changing meaning;
- split approved copy into paragraphs, lists or callouts;
- produce a semantically equivalent English translation;
- add internal links already authorized by Knowledge architecture;
- add source notes that point to sources in `SOURCE_REGISTER.md`.

Claude/Codex MUST NOT:

- add a new provider behavior, ranking factor, GEO tactic or benchmark result from memory;
- turn `can`, `may`, `helps`, `is associated with` or `in the tested setting` into a stronger causal statement;
- invent percentages or expected customer uplift;
- claim a platform uses a specific rendering/agent representation unless the source is provider-scoped;
- create a public `Answerability Score`, `Entity Trust Score`, `Agent Readiness Score` or `AI Visibility Score` without a separately approved measurement contract;
- change noindex/sitemap/llms publication state as a side effect;
- imply automated instant analysis in the CTA.

If a new material factual sentence is needed, STOP that sentence and mark `SOURCE_NEEDED` rather than filling the gap.

## 3. Page-by-page mapping

### K1 -> PXK-58

Target: `site/wissen/seo-geo-ai-visibility.html`

Use the existing headings where possible:

1. Drei Begriffe, drei Fragen.
2. Wo sie sich ueberschneiden.
3. AI Visibility: Messung, nicht Optimierung.
4. Warum klassische Suche weiter zaehlt.
5. Was sich beobachten laesst - und was nicht.

The existing Scene 2 idea is retained: no guaranteed funnel. Update its caption only if needed to ensure GEO is described as an emerging optimization field, not as a proven universal layer.

### K2 -> editorial hardening, not a replacement slice

Target: `site/wissen/wie-ki-websites-liest.html`

Keep the substantial current article and Scene 1. Apply the hardening notes in `K2-machine-readability.de.md`, especially around provider-specific bot behavior and unsupported universal JavaScript-rendering assumptions.

### K3 -> PXK-58

Target: `site/wissen/answerability.html`

Keep Scene 3. The article must explicitly label Answerability as a Pixelkiez working model and must not imply an external AI/search score.

### K4 -> PXK-58

Current target route: `site/wissen/entity-trust.html`

Research verdict: the term `Entity Trust` is misleading if presented as a technical mechanism. Preferred public title/content term is `Entity Clarity` or German `eindeutige Entity-Zuordnung / Identitaetsklarheit`. Do not change the route automatically; route migration needs an explicit product decision because it affects internal links, canonical/hreflang and release history.

Keep Scene 4 after wording review. It should show clarity/ambiguity, not a trust score.

### K5 -> PXK-58

Target: `site/wissen/agent-readiness.html`

Keep Scene 5. Treat its stages as a Pixelkiez explanatory workflow, not a universal industry maturity standard.

### K6 -> PXK-29

New DE route planned by Jira/Confluence: `/wissen/wie-websites-ausgeliefert-werden/`

New EN route: `/en/knowledge/how-websites-are-delivered/`

Implement only after the active release-track dependency allows PXK-29 to start. K6 is a supporting deep dive under Machine Readability, not a sixth equal Knowledge pillar.

## 4. Source notes in public pages

The article should not become an academic paper. Use a compact `Quellen und Einordnung` section or equivalent with the 3-6 sources most material to that page.

Dynamic provider documentation must be re-opened immediately before publication. If behavior has changed, update the copy and claim ledger rather than publishing stale product behavior.

Scientific papers should be used for limits/mechanisms, not to manufacture platform-specific ranking claims.

## 5. DE -> EN rule

DE is the canonical editorial source for the implementation slice. EN must be semantically equivalent:

- no new claims;
- no omitted qualification;
- preserve `can/may`, scope and non-guarantee wording;
- preserve `Pixelkiez working model` labels;
- use the same material source set;
- do not translate emerging terms into stronger industry standards.

## 6. Required implementation checks

For PXK-58/PXK-29 implementation, in addition to existing Jira AC:

- `wissen-platzhalter` must disappear only after real content replaces it;
- visible draft/status copy must be removed only when the article content is complete;
- scene caption and article prose must not contradict each other;
- source links/notes must be valid;
- no accidental indexing/sitemap/llms release;
- canonical/hreflang/internal links preserved;
- DE/EN semantic equivalence reviewed;
- responsive, keyboard, no-JS/reduced-motion and accessibility gates run as required by the ticket;
- exact-head CI evidence required before merge.

## 7. Publication stop conditions

STOP publication when:

- a high-freshness provider claim was not revalidated;
- `Entity Trust` is still presented as an external technical trust mechanism;
- a benchmark effect is sold as expected organic/customer uplift;
- any copy promises ranking, citation, traffic or conversion;
- the CTA implies a live automated analysis not backed by the accepted manual-intake runtime;
- the content implementation silently changes indexability.
