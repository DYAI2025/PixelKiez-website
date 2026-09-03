# K5 - Agent Readiness

Status: `CONTENT_READY_FOR_IMPLEMENTATION`

Target: `site/wissen/agent-readiness.html`  
Jira: `PXK-58`  
Scene: existing Scene 5 remains as a Pixelkiez explanatory workflow.

## Editorial title

**Agent Readiness: Kann eine KI Ihre Website benutzen?**

## Lead

Eine Website lesen zu koennen ist nicht dasselbe wie auf ihr eine Aufgabe zu erledigen. Ein Agent muss relevante Bedienelemente erkennen, Eingaben korrekt setzen, mit Zustandsaenderungen umgehen und am Ende verstehen, ob die Handlung erfolgreich war oder fehlgeschlagen ist. Pixelkiez verwendet **Agent Readiness** als Arbeitsmodell fuer diese praktische Bedienbarkeit. Es gibt keinen universellen Branchenstandard und keine Markup-Regel, die Kompatibilitaet mit allen Agenten garantiert.

## Abschnitt: Lesen oder handeln.

Fuer eine reine Informationsfrage kann es genuegen, Text zu finden und zu verstehen. Fuer eine Handlung kommen weitere Schritte hinzu. Ein Agent, der eine Kontaktanfrage absenden soll, muss zum Beispiel:

1. den richtigen Kontaktpfad finden;
2. Formularfelder und ihre Bedeutung erkennen;
3. die vorgesehenen Werte eintragen;
4. den Absendevorgang ausloesen;
5. Validierungsfehler oder Rueckfragen verarbeiten;
6. nach dem Absenden einen eindeutigen Erfolgs- oder Fehlerzustand lesen.

Ein Klick allein beweist keinen erfolgreichen Prozess. Fuer Pixelkiez ist deshalb der **Readback** zentral: Das System muss nach einer Handlung feststellen koennen, was tatsaechlich passiert ist.

Dieses Stufenmodell ist eine eigene Erklaerhilfe. Es ist kein allgemeiner Reifegradstandard der Webbranche.

## Abschnitt: Navigation und semantische Struktur.

Saubere Websemantik hat zunaechst einen menschlichen Zweck: Sie macht Oberflaechen fuer Assistive Technology verstaendlicher und bedienbarer. Native Links, Buttons, Formular-Labels, Rollen, zugaengliche Namen und Zustandsinformationen liefern strukturierte Hinweise darauf, was ein Element ist und was es tut.

Diese Semantik kann auch Automation helfen. Playwright unterstuetzt beispielsweise gezielte Locators ueber Rollen, Labels und Accessible Names. OpenAI dokumentiert aktuell fuer ChatGPT Agent in Atlas, dass ARIA-Labels, Rollen und States zur Interpretation von Seitenstruktur und interaktiven Elementen genutzt werden.

Daraus folgt trotzdem keine Gleichung `barrierefrei = agent-ready`. Andere Agenten koennen Screenshots und visuelle Informationen nutzen, verschiedene Signale kombinieren oder Oberflaechen ganz ueber APIs umgehen. Gute Semantik erweitert die Robustheit fuer bestimmte Interaktionspfade; sie ist kein universelles Agentenprotokoll.

## Abschnitt: Formulare und bedienbare Elemente.

Formulare machen die Unterschiede besonders sichtbar. Robust sind vor allem Interfaces, deren Zweck nicht erraten werden muss:

- Felder besitzen sichtbare und programmatisch verknuepfte Beschriftungen;
- Buttons verwenden eindeutige Aktionsnamen statt nur Icons ohne Namen;
- Pflichtfelder und erlaubte Formate werden klar kommuniziert;
- Fehler werden am betroffenen Feld beziehungsweise im relevanten Kontext erklaert;
- Fokus und Tastaturbedienung bleiben nachvollziehbar;
- nach einer Aktion existiert ein eindeutiger Zustand wie "Anfrage wurde gesendet" oder eine konkrete Fehlermeldung;
- dynamische Inhalte veraendern die Seite nicht so unvorhersehbar, dass das Ziel oder der Zustand verloren geht.

Auch fuer klassische Testautomation sind Eigenschaften wie Sichtbarkeit, Stabilitaet und Aktivierbarkeit relevant. Das ist ein guter Hinweis darauf, wie deterministisch ein Interface ist - aber erneut kein Beweis, dass jeder AI-Agent dasselbe Pruefmodell verwendet.

## Abschnitt: Anmeldung und Transaktionen als spaetere Reifestufe.

Anmeldung, Bezahlung, persoenliche Daten, Einwilligungen oder andere sensible Handlungen sind eine andere Risikoklasse als das Oeffnen einer Informationsseite. Hier ist nicht das Ziel, jede Schranke fuer Automatisierung abzubauen.

Ein gutes agentenfaehiges System muss auch Grenzen respektieren koennen. Dazu gehoeren:

- klare Authentifizierungszustaende;
- nachvollziehbare Berechtigungen;
- ausdrueckliche Bestaetigung vor folgenreichen Aktionen;
- verstaendliche Consent- und Datenschutzschritte;
- eindeutige Fehler- und Abbruchwege;
- keine Umgehung von CAPTCHAs, Anti-Bot-Massnahmen oder Sicherheitskontrollen;
- bei hohen Risiken gegebenenfalls menschliche Freigabe.

Agent Readiness bedeutet deshalb nicht "moeglichst alles automatisch klickbar". Sie bedeutet, dass ein erlaubter Workflow nachvollziehbar, kontrollierbar und verifizierbar ausgefuehrt werden kann.

## Abschnitt: Was heute praktikabel ist - und was Experiment bleibt.

Es existieren unterschiedliche Agentenarchitekturen. Manche arbeiten stark mit DOM- oder Accessibility-Semantik. Andere interagieren ueber Screenshots, Pixel, Maus und Tastatur. Hybride Systeme kombinieren mehrere Darstellungen. Deshalb ist jede pauschale Aussage wie "Agenten sehen nur den Accessibility Tree" oder "Agenten funktionieren wie Menschen" zu grob.

Forschungsbenchmarks wie WebArena zeigen, dass realistischere mehrstufige Webaufgaben fuer die jeweils getesteten Agenten deutlich schwieriger waren als einfache Demonstrationen. Solche Werte altern jedoch schnell. Pixelkiez sollte deshalb keine historische Benchmarkquote als aktuelle universelle Leistungszahl verwenden.

Praktisch pruefbar ist stattdessen ein konkreter Workflow auf einer konkreten Website:

1. Ziel definieren, zum Beispiel "Kontaktformular korrekt absenden";
2. Ausgangszustand dokumentieren;
3. Navigation und Controls identifizieren;
4. Handlung mit einem definierten Agent-/Automationstyp ausfuehren;
5. Erfolg oder Fehler aus der Seite zuruecklesen;
6. Barrieren und Abhaengigkeiten dokumentieren;
7. denselben Test nach Aenderungen reproduzieren.

Das erzeugt belastbare Agent-Readiness-Evidenz fuer den geprueften Pfad - keine universelle Kompatibilitaetsbehauptung.

## Scene-5 caption - approved revision

**Szene 5 - Vom Lesen zum Handeln.** Im Pixelkiez-Arbeitsmodell umfasst ein belastbarer Agentenpfad mehr als das Verstehen von Inhalt: Navigation und Bedienelemente muessen fuer den verwendeten Agenten erkennbar sein, die erlaubte Handlung muss korrekt ausgefuehrt werden koennen und am Ende braucht es einen eindeutigen Erfolg- oder Fehler-Readback. Anmeldung, Zahlung und sensible Transaktionen sind gesonderte, risikoreichere Pfade.

## Public source note

Recommended visible sources:

1. W3C WAI - Accessible Names and Descriptions (`SRC-WEB-002`)
2. Playwright - Locators / Actionability (`SRC-PW-001/002`)
3. OpenAI - Publishers and Developers FAQ (`SRC-OAI-002`) - high freshness
4. OpenAI CUA and/or Anthropic Computer Use (`SRC-OAI-003`, `SRC-ANT-002`) to show visual agent paths
5. WebArena (`LIT-003`) only as dated research context, not as current capability score.

## Implementation guardrails

- Keep accessibility's primary human purpose explicit.
- Do not claim every agent uses ARIA/accessibility trees.
- Do not present the Scene 5 stages as an industry standard.
- Do not frame bypassing auth/CAPTCHA/security as readiness work.
- No current capability percentages unless separately refreshed and clearly benchmark-scoped.
