# Canonical Claim Ledger

Status: `CONTENT_GUARDRAIL`

This ledger is the semantic boundary for the implementation copy. Claude/Codex may improve grammar and layout, but may not strengthen a claim beyond the `Allowed wording` column without new evidence and review.

## K1 - SEO, GEO and AI Visibility

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K1-C01 | VERIFIED | For Google AI Overviews/AI Mode, normal SEO fundamentals remain relevant; Google states there are no additional technical requirements or special AI markup. Supporting links must be indexed and eligible for a Search snippet. | SRC-GGL-002 | `Google has a separate GEO ranking checklist.` |
| K1-C02 | VERIFIED / DERIVED MODEL | Crawling, rendering, indexing, retrieval, grounding/citation and visible presence should be analyzed separately. Meeting prerequisites does not guarantee later stages. | SRC-GGL-001, SRC-GGL-002 | `Indexing leads to AI citation.` |
| K1-C03 | QUALIFIED | GEO is an emerging research/industry term for optimization in generative-engine contexts. Controlled research shows effects in tested setups, but this does not establish a stable cross-platform organic-growth law. | LIT-001 + red-team review | `GEO reliably raises organic AI visibility by X%.` |
| K1-C04 | PIXELKIEZ DEFINITION | AI Visibility is the observed presence of a company/source in a defined answer system, query set, language/location and time window. It can be measured as mention/link/citation presence, but is not one hidden platform score. | research synthesis | `AI Visibility is a provider metric with one score.` |
| K1-C05 | VERIFIED | OpenAI documents separate OAI-SearchBot, GPTBot and user-triggered ChatGPT-User paths; search and training controls are not the same. | SRC-OAI-001 | `One AI bot controls all OpenAI use.` |
| K1-C06 | VERIFIED | Structured data can support explicit interpretation/search features where a platform supports it; it is not a general ranking or AI-citation guarantee. | SRC-GGL-007/008 | `Schema boosts AI visibility.` |

## K2 - Machine Readability

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K2-C01 | VERIFIED | HTML and the browser DOM are different processing stages; JavaScript can modify the DOM after parsing. | SRC-WEB-001 | `Machines only read raw HTML.` |
| K2-C02 | VERIFIED | Google can render JavaScript and documents limitations/operational differences; important content should remain robustly accessible. | SRC-GGL-004/005/006 | `Google cannot read JavaScript` or `Google executes every page exactly like a human browser.` |
| K2-C03 | CONVERGENT | There is no single universal machine representation of a website. Different crawlers, fetchers, browser agents and automation systems can use different paths and representations. | SRC-OAI-001, SRC-ANT-001, SRC-PER-001, SRC-OAI-002/003 | `Every AI uses the accessibility tree` or `every AI fetches only raw HTML.` |
| K2-C04 | VERIFIED, PROVIDER-SCOPED | User-triggered fetchers can have different robots behavior from automatic crawlers; this must be stated per provider. | SRC-OAI-001, SRC-PER-001 | `robots.txt controls every AI request.` |
| K2-C05 | RECOMMENDATION | Critical public information in meaningful initial HTML improves compatibility with clients that do not or cannot execute the required client JavaScript. | derived from K2-C02/C03; red-team survives as conditional | `SSR ranks better` or `all AI crawlers require server HTML.` |

## K3 - Answerability

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K3-C01 | PIXELKIEZ WORKING MODEL | Pixelkiez uses Answerability to describe how directly, explicitly, contextually and supportably a page answers a concrete question. It is not an official Google/OpenAI score. | research corpus + red-team terminology audit | `Answerability is an industry/platform metric.` |
| K3-C02 | VERIFIED, GOOGLE-SCOPED | Google can generate query-specific snippets primarily from page content. | SRC-GGL-010 | `A short answer block receives more AI citations.` |
| K3-C03 | QUALIFIED | Clear local structure and self-contained passages can make information easier to identify and use in some retrieval/QA systems. Effects depend on retriever, chunking, model and query. | LIT-002 and research synthesis | `Headings/lists/tables increase AI citation rate.` |
| K3-C04 | QUALIFIED | Long-context research shows that model use of relevant information can depend on position in tested settings. | LIT-002 | `Always put every answer first because LLMs ignore the middle.` |
| K3-C05 | METHOD | Pixelkiez may assess answerability by question match, explicitness, local context completeness, evidence/provenance and machine availability. No public numeric score is justified until the method is calibrated. | research synthesis | `A high answerability score predicts rankings/citations.` |

## K4 - Entity Clarity

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K4-C01 | VERIFIED, GOOGLE-SCOPED | Organization structured data can help Google understand administrative details and disambiguate an organization. | SRC-GGL-007 | `Organization schema builds entity trust/ranking.` |
| K4-C02 | VERIFIED | Explicit identifiers, names, URLs, addresses and truthful links to other representations can reduce ambiguity when supported by the relevant structured-data model. | SRC-GGL-007/008 | `sameAs verifies identity automatically.` |
| K4-C03 | RESEARCH SYNTHESIS | Consistent identity information is a hygiene/clarity factor; contradictory information can make resolution harder. | primary + entity-resolution research + red-team | `NAP consistency directly boosts AI citations.` |
| K4-C04 | REJECTED TERMINOLOGY | There is no supported universal `Entity Trust Score` in the reviewed evidence. `Entity Trust` should not be presented as a technical mechanism. | red-team terminology audit | any external score/trust claim |
| K4-C05 | SEPARATION RULE | Entity clarity, trustworthiness, ranking and generative citation are separate questions. | red-team + provider docs | any direct entity -> ranking/citation causal chain |

## K5 - Agent Readiness

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K5-C01 | VERIFIED | Accessible names, roles and states provide defined semantics for assistive technology. | SRC-WEB-002/003 | `ARIA exists for AI agents.` |
| K5-C02 | VERIFIED, TOOL-SCOPED | Playwright can locate and operate elements via roles, labels and accessible names. | SRC-PW-001/002 | `All browser agents use ARIA.` |
| K5-C03 | VERIFIED, PRODUCT-SCOPED / HIGH FRESHNESS | OpenAI currently states that ChatGPT Agent in Atlas uses ARIA labels, roles and states to interpret page structure and interactive elements. | SRC-OAI-002 | `All ChatGPT/OpenAI agents use the accessibility tree.` |
| K5-C04 | VERIFIED, PRODUCT-SCOPED | Screenshot/pixel-based computer-use paths also exist, including OpenAI CUA and Anthropic Computer Use. | SRC-OAI-003, SRC-ANT-002 | `Semantic HTML is required for every AI agent.` |
| K5-C05 | PIXELKIEZ WORKING MODEL | Agent Readiness can be assessed as a bounded workflow: interpret controls -> perform action -> read an unambiguous success/error result, while recording barriers such as auth, consent, CAPTCHA, payment or permissions. | research synthesis | `WCAG compliance equals agent readiness.` |
| K5-C06 | QUALIFIED | Realistic web-agent benchmarks show complex multi-step web tasks can be difficult, but benchmark numbers are historical snapshots rather than present-day universal capability. | LIT-003, LIT-005 | undated current capability percentages |

## K6 - Frameworks and Rendering

| ID | Status | Allowed wording | Evidence | Do not strengthen to |
|---|---|---|---|---|
| K6-C01 | VERIFIED / CONVERGENT | Framework name does not uniquely determine the delivered representation. Modern frameworks support multiple static/server/client/hybrid patterns. | SRC-REA/NXT/NUX/SVK/ANG/AST | `React pages are CSR` or `Next.js pages are SSR.` |
| K6-C02 | VERIFIED | Hydration attaches client logic/interactivity to server-generated HTML in React's documented model; similar concepts exist in other frameworks. | SRC-REA-001 | `Hydration means client-only rendering.` |
| K6-C03 | VERIFIED, NEXT-SCOPED | Next.js App Router supports Server and Client Components; the concrete boundary and rendering choices determine what is delivered and what becomes interactive on the client. | SRC-NXT-001 | `use client means no initial HTML.` |
| K6-C04 | VERIFIED / CONVERGENT | Nuxt, SvelteKit, Angular and Astro document multiple rendering modes; Astro uses an HTML-first/islands model by default. | SRC-NUX-001, SRC-SVK-001, SRC-ANG-001, SRC-AST-001/002 | framework SEO ranking tables |
| K6-C05 | REJECTED CAUSAL CLAIM | The evidence does not justify `framework X ranks better`, `SSR ranks better`, or `framework X creates AI visibility`. | red-team | any framework-level ranking/citation guarantee |
| K6-C06 | RECOMMENDATION | For public business content, evaluate the actual delivery: initial HTTP response, client-only dependencies, rendered result, semantic structure and critical action/readback. | Confluence product model + research synthesis | `Detect technology -> assign SEO/AI score.` |

## Global prohibited strengthening

No article may turn a technical prerequisite, interpretability aid, accessibility practice, framework default, benchmark effect or provider-specific behavior into a guaranteed ranking, citation, traffic, conversion or revenue outcome.
