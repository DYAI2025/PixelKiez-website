# Source Register - implementation subset

Status: `IMPLEMENTATION_SOURCE_REGISTER`

This register is a curated subset of the supplied research. URLs and claim boundaries were taken from the research dossiers, then the most time-sensitive core provider claims were independently spot-checked on 2026-09-04. A later publication freeze must refresh all `HIGH` freshness sources.

## Primary / official sources

| ID | Source | URL | Used for | Freshness |
|---|---|---|---|---|
| SRC-GGL-001 | Google Search Central - How Google Search Works | https://developers.google.com/search/docs/fundamentals/how-search-works | crawl/index/serve distinction, no guarantee | MEDIUM |
| SRC-GGL-002 | Google Search Central - AI features and your website | https://developers.google.com/search/docs/appearance/ai-features | AI Overviews/AI Mode eligibility, no special AI markup, query fan-out, SEO fundamentals | HIGH |
| SRC-GGL-004 | Google - SEO Guide for Web Developers | https://developers.google.com/search/docs/fundamentals/get-started-developers | important content in textual/DOM-accessible form | MEDIUM |
| SRC-GGL-005 | Google - Fix Search-related JavaScript problems | https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript | JavaScript rendering and limitations | MEDIUM |
| SRC-GGL-006 | Google - Dynamic rendering as workaround | https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering | SSR/static/hydration alternatives; dynamic rendering not preferred permanent solution | MEDIUM |
| SRC-GGL-007 | Google - Organization structured data | https://developers.google.com/search/docs/appearance/structured-data/organization | organization details and disambiguation | MEDIUM |
| SRC-GGL-008 | Google - Intro to Structured Data | https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data | structured data helps explicit machine-readable description; no general ranking guarantee | MEDIUM |
| SRC-GGL-010 | Google - Control your snippets | https://developers.google.com/search/docs/appearance/snippet | snippets are query-dependent and largely selected from page content | MEDIUM |
| SRC-GGL-012 | Google - Helpful, reliable, people-first content | https://developers.google.com/search/docs/fundamentals/creating-helpful-content | quality/trust framing; no invented single E-E-A-T score | MEDIUM |
| SRC-OAI-001 | OpenAI - Overview of OpenAI Crawlers | https://developers.openai.com/api/docs/bots | OAI-SearchBot, GPTBot, ChatGPT-User are distinct paths; independent controls | HIGH |
| SRC-OAI-002 | OpenAI - Publishers and Developers FAQ | https://help.openai.com/en/articles/12627856-publishers-and-developers-faq | ChatGPT Agent in Atlas uses ARIA labels/roles/states for interaction | HIGH |
| SRC-OAI-003 | OpenAI - Computer-Using Agent | https://openai.com/index/computer-using-agent/ | visual/screenshot computer-use path | HIGH |
| SRC-ANT-001 | Anthropic - Web crawler controls | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler | ClaudeBot / Claude-User / Claude-SearchBot purpose distinctions | HIGH |
| SRC-ANT-002 | Anthropic - Computer Use Tool | https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool | screenshot/mouse/keyboard interaction path | HIGH |
| SRC-PER-001 | Perplexity - Crawlers | https://docs.perplexity.ai/docs/resources/perplexity-crawlers | PerplexityBot vs Perplexity-User; user-triggered fetch behavior | HIGH |
| SRC-WEB-001 | WHATWG - HTML Parsing | https://html.spec.whatwg.org/multipage/parsing.html | HTML parsing into a document tree | LOW |
| SRC-WEB-002 | W3C WAI - Accessible Names and Descriptions | https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/ | accessible name/role semantics | LOW |
| SRC-WEB-003 | W3C - WAI-ARIA 1.2 | https://www.w3.org/TR/wai-aria-1.2/ | roles, states and properties | LOW |
| SRC-PW-001 | Playwright - Locators | https://playwright.dev/docs/locators | automation via role, label and accessible name | MEDIUM |
| SRC-PW-002 | Playwright - Actionability | https://playwright.dev/docs/actionability | visible/stable/enabled/event-receiving checks | MEDIUM |
| SRC-REA-001 | React - hydrateRoot | https://react.dev/reference/react-dom/client/hydrateRoot | hydration of server-generated HTML | MEDIUM |
| SRC-REA-002 | React - Server Components | https://react.dev/reference/rsc/server-components | server component execution model | MEDIUM |
| SRC-NXT-001 | Next.js - Server and Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components | App Router server/client split and initial render model | HIGH |
| SRC-NUX-001 | Nuxt - Rendering Modes | https://nuxt.com/docs/3.x/guide/concepts/rendering | universal, client and hybrid modes | MEDIUM |
| SRC-SVK-001 | SvelteKit - Page options | https://svelte.dev/docs/kit/page-options | SSR/CSR/prerender route options | MEDIUM |
| SRC-ANG-001 | Angular - Server-side and hybrid rendering | https://angular.dev/guide/ssr | SSR, hybrid rendering, prerender | MEDIUM |
| SRC-AST-001 | Astro - Islands Architecture | https://docs.astro.build/en/concepts/islands/ | HTML-first output with selective client islands | MEDIUM |
| SRC-AST-002 | Astro - On-demand rendering | https://docs.astro.build/en/guides/on-demand-rendering/ | static vs request-time rendering | MEDIUM |
| SRC-WP-001 | WordPress - Templates | https://developer.wordpress.org/themes/templates/templates/ | server-side template/output example | LOW |

## Scientific / benchmark sources retained

These are used to explain limits and mechanisms, not to claim a direct Google/OpenAI ranking effect.

| ID | Source | Type | Safe use |
|---|---|---|---|
| LIT-001 | Aggarwal et al., `GEO: Generative Engine Optimization`, KDD 2024 / DOI 10.1145/3637528.3671900, arXiv 2311.09735 | peer-reviewed conference paper with benchmark experiments | Shows that content modifications can change visibility metrics in the tested generative-engine benchmark. Do **not** convert the reported uplift into expected organic traffic/citation uplift for real platforms. |
| LIT-002 | Liu et al., `Lost in the Middle: How Language Models Use Long Contexts`, TACL 2024, DOI 10.1162/tacl_a_00638 | peer-reviewed | Shows position-sensitive long-context use in the tested QA/retrieval settings. Use only as evidence that long-context use can be imperfect; not as a universal web-copy placement rule. |
| LIT-003 | Zhou et al., `WebArena: A Realistic Web Environment for Building Autonomous Agents`, ICLR 2024 | peer-reviewed benchmark | Shows realistic multi-step web tasks were challenging for the evaluated agents. Historical benchmark values must be dated and must not be presented as current universal capability. |
| LIT-005 | Deng et al., `Mind2Web: Towards a Generalist Agent for the Web`, NeurIPS 2023 | peer-reviewed dataset/benchmark | Shows the need to select/reduce relevant web elements for generalist agents; does not prove one universal DOM/AX interface. |

## Source-handling rules

1. Provider behavior, bot names, robots behavior and product-specific features are `HIGH` freshness. Re-open official docs immediately before publication.
2. No search-result snippet is a source. Use the canonical page or paper.
3. A provider's recommendation proves the provider's stated behavior/requirement, not an undisclosed ranking weight.
4. Benchmark results stay benchmark-scoped.
5. The absence of a documented mechanism is not proof that the mechanism is impossible; it means Pixelkiez must not publish it as a hard fact.
