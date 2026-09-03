# K2 - Wie Maschinen Websites verarbeiten

Status: `HARDENING_SOURCE / CURRENT_ARTICLE_IS_BASE`

Target: `site/wissen/wie-ki-websites-liest.html`  
Role: primary Knowledge cluster for machine readability.  
Jira relation: editorial hardening; do not replace the accepted Scene 1 implementation wholesale.

## Editorial position

The current article already contains substantial approved structure and examples. The research does not justify a rewrite from zero. This file defines the content that should be preserved or used to harden claims that are currently broader than the evidence.

## Canonical lead

Crawler, Suchsysteme und Browser-Agenten koennen dieselbe URL auf unterschiedlichen Wegen verarbeiten. Deshalb gibt es nicht "die eine KI-Sicht" auf eine Website. Entscheidend sind drei Fragen: Welches System greift zu? Zu welchem Zweck? Und welche Repraesentation verarbeitet es tatsaechlich - die HTTP-Antwort, HTML, ein nach JavaScript veraendertes DOM, Accessibility-Semantik oder eine visuelle Browseransicht?

## Canonical section: Ein Dokument, mehrere Verarbeitungsebenen

Beim Abruf einer URL kommt zunaechst eine HTTP-Antwort zurueck. Darin kann bereits ein weitgehend vollstaendiges HTML-Dokument stecken - oder nur ein Geruest, das erst im Browser durch JavaScript ergaenzt wird. Ein Browser parst HTML in eine Dokumentstruktur; Skripte koennen diese Struktur anschliessend veraendern. Zusaetzlich existieren semantische Repraesentationen fuer Assistive Technology, und manche Agenten arbeiten direkt oder teilweise mit visuellen Screenshots.

Diese Ebenen sind nicht austauschbar. Wenn ein Firmenname, eine Leistung oder ein Kontaktweg erst nach einer bestimmten Client-Ausfuehrung entsteht, ist er fuer Systeme abhaengig davon, ob genau dieser Verarbeitungspfad erfolgreich durchlaufen wird. Steht die Information bereits sinnvoll im initialen Dokument, sinkt diese Abhaengigkeit. Das ist eine Robustheits- und Kompatibilitaetsaussage - keine Rankinggarantie.

## Canonical section: Nicht jeder Bot kommt aus demselben Grund

Anbieter dokumentieren unterschiedliche Zugriffspfade. OpenAI trennt beispielsweise den Search-Crawler OAI-SearchBot, GPTBot fuer moegliche Trainingsnutzung und ChatGPT-User fuer bestimmte nutzerinitiierte Abrufe. Anthropic dokumentiert eigene Bots fuer Training, Search und nutzerbezogene Abrufe. Perplexity unterscheidet ebenfalls automatisches Search-Crawling und einen User-Fetcher.

Daraus folgt: "AI-Bot erlauben oder blockieren" ist zu ungenau. Fuer eine belastbare Aussage braucht man den konkreten User Agent, den Produktzweck und die aktuelle Dokumentation. Auch robots.txt wirkt nicht fuer jeden nutzerinitiierten Zugriff identisch. Anbieterregeln koennen sich aendern und muessen vor Veroeffentlichung erneut geprueft werden.

## Canonical section: JavaScript - weder unsichtbar noch automatisch unproblematisch

Die Aussage "Suchmaschinen koennen kein JavaScript" ist falsch. Google dokumentiert JavaScript-Rendering und stellt Werkzeuge und Empfehlungen fuer JavaScript-Websites bereit. Ebenso falsch waere die umgekehrte Vereinfachung: "Wenn Google JavaScript rendert, ist clientseitige Auslieferung immer unproblematisch." Rendering ist ein Verarbeitungsschritt mit technischen Voraussetzungen und Fehlerquellen; andere Crawler oder Fetcher koennen ausserdem andere Faehigkeiten besitzen.

Fuer oeffentliche Unternehmensseiten ist deshalb eine robuste Regel sinnvoll: Geschaeftlich tragende Informationen - Name, Leistung, Standort, zentrale Erklaerungen und erreichbare Navigationswege - sollten nicht unnoetig davon abhaengen, dass ein bestimmter Clientpfad erfolgreich laeuft. Interaktive Funktionen duerfen selbstverstaendlich JavaScript verwenden.

## Canonical section: Was "maschinenlesbar" nicht bedeutet

Maschinenlesbar bedeutet nicht automatisch:

- indexiert;
- gut gerankt;
- fuer eine konkrete Anfrage retrieved;
- in einen Modellkontext aufgenommen;
- als Quelle zitiert;
- fuer einen Browser-Agenten bedienbar.

Eine Seite kann technisch hervorragend lesbar sein und trotzdem eine Kundenfrage nicht explizit beantworten. Sie kann eine klare Antwort enthalten, aber fuer eine bestimmte Suche nicht ausgewaehlt werden. Und ein Agent kann den Inhalt verstehen, aber an einem schlecht beschrifteten Formular oder einem uneindeutigen Erfolgszustand scheitern. Diese Trennungen verbinden K2 mit Answerability, Entity Clarity und Agent Readiness.

## Canonical section: Was Pixelkiez praktisch prueft

Fuer eine Website-Diagnose ist nicht der Frameworkname die erste Frage, sondern die beobachtbare Auslieferung:

1. Was liefert die URL im ersten Dokument?
2. Welche Kerninformationen sind dort bereits vorhanden?
3. Was entsteht erst nach JavaScript-Ausfuehrung?
4. Bleiben interne Links und Navigation fuer relevante Crawler erreichbar?
5. Sind Name, Leistungen, Standort und Kontaktweg als normaler Text und semantische Elemente vorhanden?
6. Gibt es strukturierte Daten, und stimmen sie mit dem sichtbaren Inhalt ueberein?
7. Welche Crawler/Fetcher sind laut aktueller robots- und WAF-Konfiguration zugelassen?
8. Fuer interaktive Pfade: Kann ein Browser beziehungsweise Agent das Bedienelement erkennen und einen eindeutigen Ergebniszustand lesen?

Das Ergebnis ist kein pauschales "AI-friendly"-Siegel. Es ist eine Beschreibung der nachgewiesenen Repraesentationen, Abhaengigkeiten und Risiken.

## Required hardening of current article

When implementing/reviewing the current page:

- Preserve the core statement `Es gibt nicht die eine maschinelle Sicht`.
- Preserve provider-purpose differentiation, but refresh provider claims immediately before publication.
- Do not state or imply that all non-Google AI crawlers are raw-HTML-only unless the specific provider has current evidence.
- Do not call Google's process a universally fixed `two-wave indexing` law. Describe crawl/render/index as processing stages and note that rendering may be a separate/queued step where supported by current Google documentation.
- Keep `robots.txt ist eine Steuerung, kein Schloss`, but keep product-specific exceptions scoped to the documented fetcher.
- Avoid `initial HTML is the only insurance`. Prefer `initial meaningful HTML reduces dependence on client execution and broadens compatibility`.

## Scene-1 caption - keep with minor qualification

**Szene 1 - Ein Dokument, mehrere Lesarten.** Dieselbe URL kann je nach System und Abrufweg als initiales HTML, als nach JavaScript veraenderte Dokumentstruktur, als semantische Interaktionsstruktur oder als visuelle Browseroberflaeche verarbeitet werden. Aus einer einzelnen Darstellung laesst sich nicht ableiten, welchen Weg jedes konkrete System bei jedem Abruf verwendet.

## Public source note

Recommended visible sources:

1. WHATWG HTML parsing (`SRC-WEB-001`)
2. Google JavaScript/Search documentation (`SRC-GGL-004/005/006`)
3. OpenAI crawler documentation (`SRC-OAI-001`)
4. Anthropic crawler controls (`SRC-ANT-001`)
5. Perplexity crawler documentation (`SRC-PER-001`)

Provider sources are `HIGH` freshness where bot behavior is discussed.
