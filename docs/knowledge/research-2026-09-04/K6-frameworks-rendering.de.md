# K6 - HTML, JavaScript, Frameworks & Rendering

Status: `CONTENT_READY_FOR_PXK-29 IMPLEMENTATION WHEN DEPENDENCY OPENS`

Jira: `PXK-29`  
Confluence authority: `Knowledge Deep Dive - Moderne Web-Technologien, Rendering & Auffindbarkeit - 2026-09-02`  
Planned DE route: `/wissen/wie-websites-ausgeliefert-werden/`  
Planned EN route: `/en/knowledge/how-websites-are-delivered/`  
Architecture: supporting deep dive under `Wie KI Websites liest`, not a sixth equal pillar.

## Editorial title

**Wie moderne Websites gebaut und ausgeliefert werden - und was Maschinen davon sehen**

Optional orientation subtitle:

**HTML, JavaScript, React, Next.js & Co.: Entscheidend ist nicht der Frameworkname, sondern was die URL tatsaechlich ausliefert.**

## Lead

React, Next.js, WordPress, Vue oder Astro sagen zunaechst etwas ueber die technische Umsetzung einer Website aus. Sie sagen noch nicht zuverlaessig, welche Inhalte beim ersten Abruf vorhanden sind, was erst durch JavaScript entsteht oder welche Interaktion ein Browser spaeter aktiviert. Fuer Auffindbarkeit und maschinelle Verarbeitung ist deshalb die konkrete **Auslieferungs- und Renderingarchitektur** wichtiger als ein Frameworketikett.

## 1. Was ist ueberhaupt eine Website? - HTML, CSS, JavaScript und TypeScript

**HTML** beschreibt Inhalt und Struktur: Ueberschriften, Absaetze, Links, Bilder, Formulare und weitere Elemente. Ein Browser verarbeitet dieses Dokument und baut daraus seine Dokumentstruktur.

**CSS** bestimmt Darstellung und Layout. Es beeinflusst, wie Inhalte angeordnet, sichtbar und bedienbar werden, ersetzt aber keine saubere inhaltliche Struktur.

**JavaScript** kann Verhalten hinzufuegen, Daten nachladen und die Dokumentstruktur nach dem ersten Abruf veraendern. Das ist fuer interaktive Websites normal. Problematisch wird eine Abhaengigkeit erst dann, wenn geschaeftlich wichtige Informationen oder notwendige Wege nur nach einem fehleranfaelligen Clientpfad existieren und der relevante Empfaenger diesen Pfad nicht verlaesslich ausfuehrt.

**TypeScript** ist vor allem ein Entwicklungswerkzeug rund um JavaScript. Fuer die Frage, was ein Crawler oder Browser am Ende erhaelt, ist nicht der TypeScript-Quellcode im Entwicklerprojekt entscheidend, sondern das erzeugte Webverhalten und die ausgelieferten Ressourcen. Vor der finalen Veroeffentlichung sollte fuer diesen Satz noch einmal die aktuelle offizielle TypeScript-Dokumentation in den Source Register aufgenommen werden; der aktuelle Research markiert diese Quelle als kleine Restluecke.

## 2. Was sind React, Vue und Svelte - und was sind Next.js, Nuxt, SvelteKit, Angular oder Astro?

Komponentenbibliotheken und Frameworks helfen Entwicklern, Oberflaechen und Anwendungen zu strukturieren. Sie sind aber keine feste Aussage ueber das fertige HTML einer einzelnen URL.

- **React** kann in unterschiedlichen Architekturen eingesetzt werden; React dokumentiert unter anderem servererzeugtes HTML, Hydration und Server Components.
- **Next.js** kombiniert im App Router Server und Client Components und kann Seiten je nach Architektur unterschiedlich vor-rendern, serverseitig erzeugen, streamen oder clientseitig ergaenzen.
- **Vue** und **Nuxt** koennen serverseitige, clientseitige und hybride Modelle abbilden.
- **SvelteKit** erlaubt routebezogene Entscheidungen zu SSR, CSR und Prerendering.
- **Angular** dokumentiert Server-Side Rendering, Hybrid Rendering und Prerendering.
- **Astro** verfolgt standardmaessig einen HTML-first/Islands-Ansatz, bei dem Interaktivitaet gezielt fuer einzelne Komponenten aktiviert werden kann.
- **WordPress** erzeugt in klassischen Setups HTML serverseitig, kann aber durch Themes, Plugins, Headless-Setups und clientseitige Anwendungen sehr unterschiedlich ausfallen.

Die Liste ist keine Rangfolge. Ein gutes oder schlechtes Ergebnis kann mit vielen Stacks gebaut werden.

## 3. Vier Auslieferungsmodelle: Static, Server, Client, Hybrid

### Static / Prerendering

Die Seite wird vorab erzeugt. Beim Abruf liegen die zentralen Inhalte bereits als HTML vor. JavaScript kann danach Interaktion ergaenzen, muss aber nicht den Kerninhalt erst erzeugen.

### Server-Side Rendering

Die Seite wird beim Request auf dem Server erzeugt. Auch hier kann der Empfaenger bereits ein inhaltlich sinnvolles HTML-Dokument erhalten. `dynamisch` bedeutet also nicht automatisch `clientseitig`.

### Client-Side Rendering

Der Server kann zunaechst eine schlanke App-Shell ausliefern. Relevante Inhalte werden danach durch JavaScript im Browser erzeugt oder nachgeladen. Das kann fuer Anwendungen sinnvoll sein, erzeugt fuer genau diese Inhalte aber eine zusaetzliche Abhaengigkeit vom Clientpfad.

### Hybrid Rendering

Viele moderne Websites kombinieren die Modelle. Eine Leistungsseite kann ihren Inhalt statisch oder serverseitig liefern, waehrend ein Terminplaner, Filter oder Konfigurator clientseitig interaktiv wird. Das ist oft die realistischste Betrachtung: nicht `welche eine Renderingart hat die Website?`, sondern `welcher Teil wird auf welchem Weg ausgeliefert?`.

## 4. Hydration ohne Fachjargon

Hydration beschreibt bei React und aehnlichen Architekturen den Schritt, in dem clientseitige Logik an bereits servererzeugtes HTML angehaengt wird. Das Dokument kann also schon sichtbar und lesbar sein; danach macht JavaScript Menues, Filter, Formulare oder andere Komponenten interaktiv.

Das ist weder automatisch gut noch schlecht fuer SEO oder AI-Systeme. Entscheidend ist, welche Information vor und nach diesem Schritt vorhanden ist und welche Systeme welchen Zustand verarbeiten koennen.

Ein einfaches Beispiel:

**Vor Hydration bereits vorhanden:** Firmenname, Leistung, Standort, Beschreibung, Kontaktlink.  
**Nach Hydration zusaetzlich aktiv:** Terminpicker, Filter, dynamische Validierung, persoenliche UI-Zustaende.

## 5. Was bedeutet das fuer klassische Suchmaschinen?

Google dokumentiert, dass Google Search JavaScript verarbeiten und rendern kann. Gleichzeitig empfiehlt Google robuste JavaScript-SEO-Praktiken und weist auf Grenzen und unterschiedliche Verarbeitungsschritte hin. Fuer zentrale Unternehmensinhalte ist es deshalb sinnvoll, nicht unnoetig auf eine leere App-Shell plus spaetere Client-Ausfuehrung angewiesen zu sein.

Diese Empfehlung ist **keine** Aussage, dass servergerenderte Websites automatisch besser ranken. Ranking haengt von wesentlich mehr Faktoren ab, und der Research liefert keine kausale Framework- oder SSR-Rangliste. Die belastbare Aussage ist kleiner: Wenn Kerninformationen bereits im sinnvollen initialen Dokument vorhanden sind, koennen sie auch von Empfaengern genutzt werden, die den spaeteren Clientpfad nicht oder nicht vollstaendig ausfuehren.

## 6. Was bedeutet das fuer KI-Crawler und andere Abrufpfade?

Hier ist Vorsicht besonders wichtig. Die Anbieter dokumentieren unterschiedliche Bots und Zwecke, aber nicht fuer jeden Crawler eine vollstaendige Rendering-Spezifikation. Pixelkiez sollte deshalb **nicht** pauschal schreiben: "AI-Crawler fuehren kein JavaScript aus."

Stattdessen gilt:

1. konkreten Anbieter und User Agent identifizieren;
2. aktuelle offizielle Dokumentation und robots-/WAF-Regeln pruefen;
3. wenn moeglich den tatsaechlichen Abruf im Serverlog oder mit einem reproduzierbaren Test beobachten;
4. wichtige oeffentliche Inhalte so ausliefern, dass sie nicht unnoetig von einer unbekannten Clientfaehigkeit abhaengen.

OpenAI, Anthropic und Perplexity dokumentieren bereits unterschiedliche Search-, Training- und nutzerinitiierte Pfade. Das allein reicht, um die Vorstellung einer einzigen universellen `KI-Sicht` zu widerlegen. Es reicht nicht, um fuer jeden dieser Pfade dieselbe JavaScript-Faehigkeit zu behaupten.

## 7. Was bedeutet das fuer Browser-Agenten?

Browser-Agenten fuegen eine weitere Ebene hinzu: Sie muessen nicht nur Inhalt erfassen, sondern mit einer Oberflaeche handeln.

Manche Automationspfade arbeiten mit DOM- und Accessibility-Semantik. Playwright kann zum Beispiel Elemente ueber Rollen und Accessible Names adressieren; OpenAI dokumentiert fuer ChatGPT Agent in Atlas aktuell die Nutzung von ARIA-Informationen. Andere Computer-Use-Systeme koennen Screenshots, Pixel, Maus und Tastatur verwenden.

Fuer die Websitearchitektur bedeutet das: Semantische Links, Buttons und Formularfelder, klare Labels, stabile Interaktion und eindeutige Ergebniszustaende sind robuste Grundlagen. Sie garantieren aber keine Kompatibilitaet mit jedem Agenten.

## 8. Next.js als Beispiel: derselbe Stack, unterschiedliche Ergebnisse

Next.js eignet sich gut als Lehrbeispiel, weil der Frameworkname allein wenig ueber eine konkrete Seite aussagt.

### Variante A - content-first

Eine Unternehmensseite liefert im initialen Dokument bereits:

- H1 und Leistungsbeschreibung;
- Standort;
- zentrale Unternehmensinformationen;
- interne Links;
- Kontaktweg.

Client Components machen danach zum Beispiel das Menue, einen Filter oder die Terminwahl interaktiv.

### Variante B - stark clientabhaengig

Der erste Abruf liefert fuer den relevanten Bereich nur eine App-/Loading-Shell. Firmen-, Leistungs- oder Kontaktinformationen entstehen erst nach Client-JavaScript und weiteren Datenabrufen.

Beide Seiten koennen "mit Next.js gebaut" sein. Das Etikett ist deshalb kein Qualitaetsnachweis. Geprueft werden muss die konkrete Route und ihr Verhalten.

Auch `use client` ist kein Synonym fuer `es gibt kein initiales HTML`. Die aktuelle Next.js-Architektur kann Client Components in einen serverseitig vorbereiteten Initialzustand einbetten; die genaue Grenze muss am realen Output geprueft werden.

## 9. Unternehmerregel: robuste Information zuerst, Interaktion dort, wo sie Nutzen bringt

Die praktische Entscheidung ist nicht `modernes Framework oder altes CMS?`. Sie lautet:

- Sind Name, Leistung, Standort und zentrale Aussagen im relevanten Abrufpfad vorhanden?
- Sind interne Links und Kontaktwege echte, verstaendliche Navigation?
- Ist klar, welche Inhalte erst durch JavaScript entstehen?
- Bleibt die Seite auch bei Teilfehlern nachvollziehbar?
- Werden interaktive Funktionen semantisch und zugaenglich umgesetzt?
- Kann nach einer wichtigen Handlung ein eindeutiger Erfolg oder Fehler gelesen werden?
- Ist die konkrete Auslieferung getestet statt aus dem Frameworklogo abgeleitet?

Ein moderner Stack kann diese Anforderungen sehr gut erfuellen. Ein klassischer Stack ebenfalls. Schlechte Architektur kann mit beiden gebaut werden.

## Suggested visual scene

**Vom Quellcode zur ausgelieferten Website**

Three zones, using existing Scene Grammar:

1. Bausteine - HTML / CSS / JavaScript as neutral layers, no vendor logos.
2. Rendering paths - Static / Server / Client / Hybrid as alternatives, not a maturity ladder.
3. Result - meaningful initial document, browser-enhanced interface, semantic interaction layer.

Caption proposal:

**Vom Stack zur tatsaechlichen Auslieferung.** Frameworks geben Moeglichkeiten und Defaults vor; die konkrete Route entscheidet, welche Inhalte direkt im Dokument stehen, was serverseitig erzeugt wird und welche Funktion erst im Client entsteht. Fuer Search, Crawler und Agenten wird deshalb die reale Auslieferung geprueft - nicht der Frameworkname bewertet.

## Public source note

Recommended visible sources:

1. Google JavaScript/Search docs (`SRC-GGL-004/005/006`)
2. React `hydrateRoot` (`SRC-REA-001`)
3. Next.js Server and Client Components (`SRC-NXT-001`)
4. Nuxt / SvelteKit / Angular / Astro docs as framework examples (`SRC-NUX-001`, `SRC-SVK-001`, `SRC-ANG-001`, `SRC-AST-001`)
5. OpenAI crawler docs (`SRC-OAI-001`) only for path/purpose differentiation, not undocumented JS behavior.

## Implementation guardrails

- Resolve the TypeScript official-source gap before publication or keep the TypeScript explanation minimal.
- No framework ranking table.
- No `RSC is the gold standard` language.
- No `SSR guarantees indexing/AI visibility` language.
- No blanket claim that AI-native crawlers cannot render JavaScript.
- Keep K6 as supporting deep dive, not a sixth equal hub pillar.
