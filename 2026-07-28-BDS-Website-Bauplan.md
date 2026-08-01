# BDS Website v1 — Implementierungsplan

Plan path: `docs/plans/2026-07-28-bds-website-v1.md`
Status: ready-for-execution (2 BLOCKER vor Livegang, nicht vor Baubeginn)
Executor: Claude Code · Review: Vincent (Rolle B)

<!-- GOAL_START -->
Goal: BDS-Website v1 — Angebot ohne Ads, 5 Branchen, Lead-Formular

Ziel. Die bestehende statische Agentur-Website (BDS-Agentur-Website.html) wird zur launchfähigen v1 umgebaut: Angebot ohne Marketing/Ads-Leistungen, Branchenset Arztpraxen, Psychotherapiepraxen, Hotellerie, Handwerk, Baubetriebe, Gastronomie, plus echtes Schnellkontakt-Formular mit Webhook-Anbindung. Die Seite repräsentiert die Agentur professionell und erzeugt qualifizierte Anfragen mit unter 60 Sekunden Kontakthürde.

Scope. Ausgangsartefakt: vorhandene Einzeldatei BDS-Agentur-Website.html (946+ Zeilen, validiert). Zielstruktur: `site/index.html`, `site/impressum.html`, `site/datenschutz.html`, optional `site/assets/` bei Bedarf. Formular-Backend: n8n-Webhook auf eigener Instanz (interne Nutzung, lizenzkonform); Fallback mailto. Deploy-Ziel OPEN QUESTION (VPS vs. Vercel/Netlify).

Bedingungen (hart).
- Keine Erwähnung von SEA/Google Ads/Instagram Ads/Performance-Paketen in Navigation, Leistungen, Preisen, USPs oder Footer.
- Kein Automation-Angebot; Nicht-Angebote-Sektion nennt Werbeanzeigen-Management und Automatisierung explizit.
- Psychotherapie-Profil in seriöser, sensibler Tonalität; Versprechen ist Entlastung/Passung, nicht "mehr Leads".
- Formular: max. 5 Felder, Honeypot statt Captcha, DSGVO-Checkbox mit Link auf Datenschutzseite, keine Drittanbieter-Übertragung außer eigener Webhook-Infrastruktur.
- prefers-reduced-motion deaktiviert alle Animationen vollständig; bestehende Zusage bleibt.
- Alle Preise als "ab"-Werte aus BDS-Leistungen-Website-Content.md; keine neuen Preise erfinden.

Akzeptanzkriterien.
- Volltextsuche der index.html nach "Ads", "Performance Dual", "Kampagne", "Automation" liefert nur Treffer in Nicht-Angeboten/Kommentaren.
- 6 Branchenkarten + 6 Accordion-Panels vorhanden: Praxis, Psychotherapie, Hotel, Handwerk, Bau, Gastro.
- Testsubmission des Formulars erreicht den Webhook und löst Benachrichtigung aus (Evidence: real-boundary-smoke, Screenshot/Log).
- HTML-Parser-Check ohne offene Tags; JS-Syntaxcheck aller Script-Blöcke OK.
- Lighthouse lokal: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95 (ASSUMPTION: statische Seite erreichbar).
- Impressum- und Datenschutzseite existieren und sind aus dem Footer verlinkt (Inhalte: BLOCKER bis Freigabe).

Explizit out-of-scope.
- Kein CMS, kein Framework-Umbau (Next.js/Framer-Entscheidung bleibt separater Spike).
- Kein Blog, kein Chatbot, keine Mehrsprachigkeit, kein Kundenportal.
- Keine Ads-Landingpages, keine Preisrechner, keine neuen Leistungsfelder.
- Keine Änderung der Preisbänder oder des Leistungsplans v1.

Done-Definition. index.html + impressum.html + datenschutz.html im Zielordner, alle Akzeptanzkriterien erfüllt, Formular-Smoke-Test dokumentiert, Übergabeprotokoll mit offenen BLOCKERn (Rechtstexte, Deploy-Freigabe) an Vincent.

Reference-Doc: BDS-Website-Vision.md, BDS-Leistungen-Website-Content.md
<!-- GOAL_END -->

## Evidence and source boundary

## Assumptions, missing information, open questions, blockers

**Facts (vorliegend):**
- BDS-Agentur-Website.html existiert, HTML-/JS-validiert, mit Designsystem, Lead-Filter-Canvas, Accordion (5 Panels inkl. Bau), Projekt-Check (mailto-basiert), Beispielszenarien, 4 Zusagen.
- BDS-Leistungen-Website-Content.md (Fokus-Portfolio, Preise) und BDS-Leistungsplan-v1-Fokus.md liegen vor.
- Auftrag (Transkript): Angebot ohne Marketing, ohne Instagram-Ads; Branchen Gastronomie, Arztpraxen, Psychotherapiepraxen ("alle Praxen"), Hotels, Handwerker; professionell, Lead-Generierung, schnelles Kontaktformular; Deliverables Vision + Plan.

**ASSUMPTION:**
- n8n-Instanz n8n.dyai.cloud steht für einen internen Webhook zur Verfügung (Agentur-Eigennutzung, lizenzkonform gemäß früherer Prüfung).
- Baubetriebe sind volles Profil (Nutzerentscheid 28.07., ersetzt frühere Annahme).
- "alle Praxen" = Segment Praxen mit zwei Website-Profilen (Arztpraxen, Psychotherapie); weitere Heilberufe werden textlich unter Arztpraxen mitgemeint.
- Deutsch als einzige Sprache; Zielgruppe DACH/Deutschland.

**MISSING:**
- Finale Domain, Hosting-Ziel, E-Mail-Postfach für Benachrichtigungen.
- Freigegebene Rechtstexte (Impressum, Datenschutzerklärung inkl. Formular-Passus).
- Finale "ab"-Preise (zu zweit zu fixieren; Plan verwendet Stand v1).

**OPEN QUESTION:**
- Deploy: VPS (vorhanden) vs. Vercel/Netlify. Empfehlung im Plan: VPS + Caddy/nginx, da Webhook-Infrastruktur ohnehin eigen; Entscheidung bei TASK-011.

**BLOCKER (für Livegang, nicht für Bau):**
- B-01 Rechtstexte nicht freigegeben.
- B-02 Domain/Hosting nicht entschieden.

## Requirements

| ID | Anforderung | Quelle | Verifikation | Risiko bei Fehler |
|---|---|---|---|---|
| REQ-F-001 | Leistungssektion zeigt genau 4 Felder + Betreuung; keine Ads-/Performance-Inhalte | user-provided | Volltextsuche + Sichtprüfung | Falsches Angebot am Markt |
| REQ-F-002 | 6 Branchenprofile (Praxis, Psychotherapie, Hotel, Handwerk, Bau, Gastro) als Karten + Accordion | user-provided | DOM-Zählung, Sichtprüfung | Zielgruppen verfehlt |
| REQ-F-003 | Schnellkontakt-Formular: ≤5 Felder, DSGVO-Checkbox, Honeypot, POST an Webhook, Erfolgs-/Fehlerzustand im UI | user-provided | real-boundary-smoke: Testsubmission → Benachrichtigung | Leads gehen verloren |
| REQ-F-004 | Sticky-Schnellkontakt-Button öffnet Formular-Overlay von jeder Scrollposition | user-provided (Vision 5.3) | Sichtprüfung Desktop+Mobil | Kontakthürde zu hoch |
| REQ-F-005 | Projekt-Check übergibt Auswahl vorausgefüllt ans Formular (ersetzt mailto) | evidence (bestehender Check) | Funktionstest | Medienbruch im Funnel |
| REQ-F-006 | Impressum-/Datenschutzseiten als eigene HTML-Seiten, Footer-Links funktionieren | user-provided (Pflicht) | Klicktest | Abmahnrisiko |
| REQ-NF-001 | Core Web Vitals "gut"; Lighthouse P≥90/A≥95/SEO≥95 | Vision 7 | Lighthouse-Lauf | Beweisstück-Funktion verfehlt |
| REQ-NF-002 | Vollständige reduced-motion-Abschaltung bleibt erhalten | evidence | DevTools-Emulation | Barriere/Anspruch verletzt |
| REQ-D-001 | Formulardaten: name, kontakt (email|tel), branche, anliegen?, consent, honeypot, ts; JSON an Webhook | ASSUMPTION | Payload-Inspektion im Webhook-Log | Datenmüll/Spam |
| REQ-A-001 | Eine Quelle der Wahrheit für Inhalte: Texte aus BDS-Leistungen-Website-Content.md; keine erfundenen Zahlen/Preise | evidence | Diff Text ↔ Quelle | Ehrlichkeitsprinzip verletzt |
| REQ-A-002 | Statische Einzeldateien ohne Build-Step; JS/CSS inline wie bisher | evidence | Dateistruktur | Komplexität ohne Nutzen |
| REQ-S-001 | Keine Formulardaten an Drittanbieter; Übertragung nur an eigene Webhook-Domain via HTTPS | user-provided | Netzwerk-Tab bei Testsubmission | DSGVO-Verstoß |
| REQ-S-002 | Eigene strukturierte Daten (Organization/ProfessionalService, FAQ) eingebaut — Dogfooding GEO | Vision 2.2 | Rich-Results-Test / Schema-Validator | Glaubwürdigkeitslücke |
| REQ-O-001 | Jede Submission erzeugt sofortige Benachrichtigung (Mail und/oder Telegram) mit Zeitstempel für SLA-Messung | Vision 5 | Smoke-Test | SLA nicht messbar |

## Architecture and file boundaries

- `site/index.html` — Umbau der bestehenden Datei (Kopie, Original bleibt unangetastet als Referenz).
- `site/impressum.html`, `site/datenschutz.html` — schlanke Seiten im selben Designsystem (Header/Footer wiederverwendet, Platzhalter klar als `[FREIGABE AUSSTEHEND]` markiert).
- Formular-Backend: `POST https://n8n.dyai.cloud/webhook/bds-kontakt` (ASSUMPTION; Pfad bei TASK-008 final) — n8n-Flow: Webhook → Validierung → E-Mail + Telegram → optional Sheet/JSON-Ablage. Kein LangChain, keine weiteren Dienste.
- Kein Build-Tooling, keine externen JS-Libraries; Google Fonts bleibt einzige externe Ressource (OPEN QUESTION Datenschutz: Self-Hosting der Fonts in TASK-010 prüfen — DSGVO-sauberer).
- Verboten: Framework-Einführung, Form-SaaS, Tracking-Skripte Dritter vor Consent-Konzept.

## Implementation phases

- **P0 Inhalt & Struktur fixieren** (TASK-001–TASK-002): Content-Mapping, Branchen-Redaktion Psychotherapie.
- **P1 Angebots-Umbau** (TASK-003–TASK-005): Ads raus, Ebenen-Stack umbauen, Branchen tauschen.
- **P2 Lead-Funnel** (TASK-006–TASK-009): Formular, Sticky-Kontakt, Projekt-Check-Umbau, n8n-Flow + Smoke-Test.
- **P3 Recht & GEO-Dogfooding** (TASK-010): Rechtsseiten-Gerüste, strukturierte Daten, Fonts-Entscheidung.
- **P4 QA & Übergabe** (TASK-011–TASK-012): Lighthouse, Checkliste, Deploy-Empfehlung, Übergabeprotokoll.

Gate je Phase: alle Task-Akzeptanzkriterien erfüllt, sonst kein Phasenwechsel.

## Tasks

### TASK-001: Content-Mapping erstellen
Objective: Jede Sektion der bestehenden HTML dem Zielinhalt zuordnen (behalten/ändern/entfernen).
Requirement links: REQ-A-001, REQ-F-001, REQ-F-002
Files/modules: Read: `BDS-Agentur-Website.html`, `BDS-Leistungen-Website-Content.md` · Create: `docs/content-map.md`
Steps: Sektionen inventarisieren → je Sektion Zielzustand notieren (Quelle: Content-Datei) → Lücken als MISSING markieren.
Acceptance: Content-Map deckt 100 % der Sektionen ab; keine unzugeordnete Sektion.
Evidence: unit-only. Rollback: n/a (nur Doku).

### TASK-002: Psychotherapie-Profil redaktionell ausarbeiten
Objective: Karten- und Accordion-Text für Psychotherapiepraxen in sensibler Tonalität.
Requirement links: REQ-F-002
Files: Modify: `docs/content-map.md`
Steps: Problem (Anfrageflut/Passung), Systemlösung (strukturierte Erstanfrage: Kasse/Privat, Verfahren, Kapazitätsstatus; Wartelisten-Kommunikation), Messgrößen (Anteil passender Anfragen, Bearbeitungszeit/Anfrage) formulieren; Marketing-Vokabular streichen ("Leads", "Wachstum" verboten in diesem Profil).
Acceptance: Text von Vincent freigegeben ODER als ASSUMPTION markiert übernommen; Verbotswörter-Check bestanden.
Evidence: unit-only.

### TASK-003: index.html aufsetzen und Ads/Automation entfernen
Objective: Arbeitskopie erstellen; alle SEA-/Meta-/Performance-/Automation-Inhalte entfernen.
Requirement links: REQ-F-001
Files: Create: `site/index.html` (Kopie) · Modify: ebd.
Steps: Kopie anlegen → Ebene-4-Layer (Performance) aus Stack entfernen → USP "Keine Werbung ohne Fundament" ersetzen durch GEO-USP ("Sichtbar, wo KI antwortet") → Footer-Leistungslinks anpassen → Automation-Tag aus Ebene 2 entfernen → Nicht-Angebote um "Werbeanzeigen-Management (Google/Meta)" und "individuelle Automatisierung" ergänzen.
Acceptance: Volltextsuche "Ads|Kampagne|Performance Dual|Automation" nur in Nicht-Angeboten/HTML-Kommentaren; HTML-Parser ohne Fehler.
Validation: Python-Parser-Check (vorhandenes Skript-Muster).
Evidence: unit-only. Rollback: Original bleibt unverändert.

### TASK-004: Leistungs-Stack auf 4 Felder + Betreuung umbauen
Objective: Stack zeigt Webdesign & Redesign, Recruiting, SEO, GEO & Agent-Readiness, Betrieb & Betreuung.
Requirement links: REQ-F-001, REQ-A-001
Files: Modify: `site/index.html`
Steps: GEO von Ebene-3-Unterpunkt zu eigenem Layer mit Icon (Radar/Funk) aufwerten → Texte/Preise 1:1 aus Content-Datei → Nummerierung 01–05 korrigieren → One-Page-Karte prüfen (bleibt).
Acceptance: 5 Layer sichtbar, Reihenfolge korrekt, Preise identisch mit Content-Datei (Diff-Check).
Evidence: unit-only.

### TASK-005: Psychotherapie-Profil ergänzen (6 Branchen) in Karten, Accordion, Marquee, Hero
Objective: Branchenset vollständig auf die 6 Zielprofile bringen (Bau bleibt, Psychotherapie kommt hinzu).
Requirement links: REQ-F-002
Files: Modify: `site/index.html`
Steps: Psychotherapie-Karte (Text aus TASK-002) als sechste Karte einfügen → sechstes Accordion-Panel ergänzen (Bildmotiv: ruhiger Praxisraum; Unsplash-ID mit onerror-Fallback; Panel-Flexbreiten für 6 Elemente prüfen, mobil 6er-Stapel) → Marquee-Begriffe ergänzen ("Psychotherapiepraxen", "Passende Anfragen") → Hero-Subline-Branchenliste auf 6 anpassen → Projekt-Check-Chips (Branche) auf 6 erweitern → data-target-IDs konsistent.
Acceptance: DOM enthält exakt 6 Branchenkarten + 6 Panels mit korrekten Labels (inkl. Bau und Psychotherapie).
Evidence: unit-only.

### TASK-006: Schnellkontakt-Formular als Overlay bauen
Objective: Formular mit ≤5 Feldern, Honeypot, Consent, Zuständen (idle/sending/ok/error), erreichbar via Sticky-Button und Sektion.
Requirement links: REQ-F-003, REQ-F-004, REQ-D-001, REQ-S-001
Files: Modify: `site/index.html`
Steps: Markup (dialog/Overlay, aria-modal, Fokus-Falle, ESC schließt) → Felder: Name, E-Mail oder Telefon (ein Feld "Wie erreichen wir Sie?"), Branche (Select, vorbelegbar), Anliegen (Textarea optional), Consent-Checkbox mit Link → verstecktes Honeypot-Feld + Zeitstempel → fetch POST JSON an Webhook-URL-Konstante → UI-Zustände inkl. Fehlerfall mit mailto-Fallback-Hinweis.
Acceptance: Ohne Consent kein Absenden; Honeypot-Füllung wird klientseitig verworfen; Fehlerpfad zeigt Fallback; Tastaturbedienung vollständig.
Validation: manueller Funktionstest + JS-Syntaxcheck.
Evidence: unit-only (Boundary folgt TASK-009).

### TASK-007: Sticky-Schnellkontakt + Projekt-Check-Integration
Objective: Permanent sichtbarer Kontakt-Button; Projekt-Check sendet in das Formular statt mailto.
Requirement links: REQ-F-004, REQ-F-005
Files: Modify: `site/index.html`
Steps: Floating-Button (rechts unten, reduziert, reduced-motion-konform) → öffnet Overlay → Projekt-Check-Submit befüllt Branche/Anliegen aus Chips und öffnet Formular → mailto-Logik entfernen.
Acceptance: Von 3 Scrollpositionen (Hero/Mitte/Footer) in ≤2 Interaktionen zum ausfüllbaren Formular; Chips-Auswahl erscheint vorbelegt.
Evidence: unit-only.

### TASK-008: n8n-Webhook-Flow definieren
Objective: Webhook-Endpunkt + Benachrichtigungs-Flow spezifizieren und anlegen.
Requirement links: REQ-O-001, REQ-D-001, REQ-S-001
Files: Create: `docs/n8n-flow-bds-kontakt.md` (Spezifikation; Flow-Anlage in n8n-UI durch Vincent oder via bestehender Instanz)
Steps: Endpunkt-Pfad festlegen → Payload-Schema validieren (Pflichtfelder, Honeypot-Reject serverseitig, Ratenbegrenzung ASSUMPTION via n8n) → Aktionen: E-Mail an Agentur-Postfach (MISSING: Adresse) + Telegram-Nachricht (vorhandener Bot ASSUMPTION) → Antwort 200/JSON.
Acceptance: Flow-Spezifikation vollständig; Flow in n8n angelegt und aktiv ODER als BLOCKER-Notiz an Vincent übergeben.
Evidence: integration (Flow-Testlauf in n8n).

### TASK-009: Real-Boundary-Smoke-Test des Formulars
Objective: Nachweis, dass eine echte Testsubmission die Benachrichtigung auslöst.
Requirement links: REQ-F-003, REQ-O-001
Files: Create: `docs/evidence/formular-smoke.md`
Steps: Seite lokal serven → Testsubmission mit markierten Testdaten → Webhook-Log + Mail/Telegram-Eingang dokumentieren (Screenshot/Zeitstempel) → Negativtest: Honeypot gefüllt → keine Benachrichtigung.
Acceptance: Positiv- und Negativfall dokumentiert.
Evidence: **real-boundary-smoke** (Pflicht für Done von P2). Rollback: Webhook deaktivierbar, Formular zeigt Fallback.

### TASK-010: Rechtsseiten-Gerüste, strukturierte Daten, Fonts-Entscheidung
Objective: impressum.html/datenschutz.html im Designsystem mit markierten Platzhaltern; Schema.org-Daten; DSGVO-saubere Fonts.
Requirement links: REQ-F-006, REQ-S-002, REQ-S-001
Files: Create: `site/impressum.html`, `site/datenschutz.html` · Modify: `site/index.html`
Steps: Seitengerüste mit `[FREIGABE AUSSTEHEND]`-Blöcken (Sizhu-Muster als Strukturreferenz, Inhalte nicht kopieren — anderes Geschäftsmodell) → JSON-LD: Organization/ProfessionalService + FAQPage (aus echten Sektionen) → Google Fonts lokal einbinden (woff2 herunterladen, @font-face) ODER dokumentierte Entscheidung dagegen.
Acceptance: Footer-Links funktionieren; Schema-Validator ohne Fehler; keine Drittanbieter-Fontanfrage im Netzwerk-Tab (bei Self-Hosting-Entscheidung).
Evidence: unit-only.

### TASK-011: QA-Lauf und Deploy-Empfehlung
Objective: Qualität nachweisen, Deploy-Entscheidung vorbereiten.
Requirement links: REQ-NF-001, REQ-NF-002
Files: Create: `docs/qa-report.md`
Steps: HTML/JS-Checks → Lighthouse (lokal geserved) → reduced-motion-Emulation → Mobil-Viewport-Prüfung (375px) → Deploy-Optionen VPS vs. Vercel mit Empfehlung (Kriterien: Webhook-Nähe, TLS, Aufwand) → Checkliste gegen alle Akzeptanzkriterien des Goals.
Acceptance: Alle Goal-Kriterien grün oder als BLOCKER gelistet; Lighthouse-Werte erreicht (sonst Maßnahmenliste).
Evidence: unit-only bis Deploy; production-verified erst nach Livegang.

### TASK-012: Übergabeprotokoll
Objective: Saubere Übergabe an Vincent mit offenen Punkten.
Files: Create: `docs/handover.md`
Steps: Erledigt/Offen/BLOCKER (B-01 Rechtstexte, B-02 Domain/Hosting, Preise-Fixierung) → Bedienhinweise (Webhook-URL ändern, Inhalte pflegen) → nächste Schritte nach Livegang (Search Console, Bing, KI-Testabfragen-Baseline).
Acceptance: Protokoll vollständig; keine stillen Annahmen.
Evidence: user-confirmed nach Review.

## Validation strategy

Je Task benannte Checks; zusätzlich vor Übergabe: Parser-Check, JS-Syntax aller Blöcke, Volltext-Verbotsliste (Ads/Kampagne/Automation außerhalb Nicht-Angebote), Link-Check intern, Lighthouse, Schema-Validator, Formular-Smoke (TASK-009) als hartes Gate. Done-Aussagen nur mit Evidence-Klasse; `unverified` wird nicht als erledigt berichtet.

## Rollback and safety

Original-HTML bleibt unverändert als Referenz; alle Arbeit in `site/`-Kopie. Webhook jederzeit deaktivierbar → Formular-Fehlerpfad zeigt E-Mail-Fallback. Keine Secrets im Repo/HTML (Webhook-URL ist kein Secret, aber Ratenbegrenzung/Honeypot serverseitig). Kein Livegang vor B-01/B-02-Auflösung.

## Execution handoff

Claude Code kann TASK-001–TASK-007 und TASK-010–TASK-012 autonom ausführen; TASK-008/TASK-009 benötigen Zugriff auf die n8n-Instanz (Vincent) — alternativ liefert TASK-008 die vollständige Flow-Spezifikation zur manuellen Anlage in 10 Minuten. Reihenfolge strikt nach Phasen; Verbotsliste aus Goal-Bedingungen gilt als harte Regel.

## Plausibility and truth self-check

- Alle Inhalts- und Preisquellen benannt; keine neuen Zahlen erfunden (REQ-A-001 sichert das im Bau).
- n8n-Verfügbarkeit, Telegram-Bot, Unsplash-Bildwahl, KPI-Zielwerte: als ASSUMPTION markiert.
- Akzeptanzkriterien binär formuliert (Suchtreffer, DOM-Zählung, Smoke-Dokumentation, Lighthouse-Schwellen).
- Kein Framework-Umbau empfohlen, obwohl verlockend — kleinste robuste Lösung auf vorhandener Basis; Next.js-Spike bleibt bewusst getrennt.
- Adversarial-Kritik: Größtes Risiko ist nicht Technik, sondern (1) Rechtstexte verzögern den Launch (B-01 früh an Vincent eskaliert), (2) Formular-Spam ohne Captcha — mitigiert durch Honeypot + Zeitstempel + serverseitige Prüfung, Restrisiko akzeptiert und beobachtbar (REQ-O-001), (3) Psychotherapie-Tonalität falsch getroffen — deshalb Freigabe-Schleife in TASK-002.
- Failure-Mode-Kette: Webhook down → fetch-Fehler → UI-Fehlerpfad mit mailto-Fallback → Lead nicht verloren; SLA-Messung entfällt für diesen Fall (dokumentiert).
- Ehrlicher Status: Plan ist ready-for-execution für den Bau; Livegang hängt an zwei externen BLOCKERn außerhalb der Ausführungskontrolle.
