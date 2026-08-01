# VISION — Berlin Digital Systems Website v1
*Stand 28.07.2026 · Grundlage: Leistungsplan v1 (Fokus-Portfolio) & BDS-Leistungen-Website-Content.md · Scope-Änderung dieses Dokuments: **ohne Marketing/Ads**, Branchenset mit **Psychotherapiepraxen***

---

## 1. Zweck in einem Satz

**Die Website ist unser bester Vertriebsmitarbeiter:** Sie repräsentiert die Agentur auf Senior-Niveau, beweist unsere Arbeitsweise durch ihre eigene Qualität — und verwandelt Besucher mit minimaler Hürde in qualifizierte Anfragen.

## 2. Die drei Funktionen der Website

1. **Leadmaschine:** Jede Sektion führt zu genau zwei Handlungen — Projekt-Check (geführt, 3 Fragen) oder Schnellkontakt (Formular, unter 60 Sekunden ausfüllbar). Öffentliches Versprechen: qualifizierte Antwort innerhalb eines Werktags.
2. **Beweisstück:** Design, Ladezeit, Struktur und Auffindbarkeit der eigenen Seite sind das erste Arbeitsbeispiel. Was wir verkaufen (SEO, GEO, konvertierende Pfade), muss die Seite selbst vorleben — inklusive eigener strukturierter Daten und KI-Auffindbarkeit.
3. **Vorqualifizierung:** Die Seite sortiert vor. Klare Branchenprofile, ehrliche Nicht-Angebote und der Projekt-Check sorgen dafür, dass Erstgespräche mit passenden, vorinformierten Interessenten stattfinden.

## 3. Angebot auf der Website (verbindlicher Scope)

**Vier Leistungsfelder + Betreuung:**

| Feld | Kernversprechen |
|---|---|
| Webdesign & Redesign | Websites, die konvertieren — One-Pager, Business-Website, Redesign mit Ranking-Schutz |
| Recruiting & Bewerbungen | Mitarbeiter über die eigene Seite: 2-Minuten-Bewerbung, Google-for-Jobs |
| SEO | Gefunden werden bei Google: Technik, Inhalte, Standort |
| GEO & Agent-Readiness | Sichtbar in KI-Suchen (ChatGPT, Perplexity, Copilot) und nutzbar für KI-Agenten |
| Betreuung (Retainer) | Care / Sichtbarkeit / Recruiting — definierter Umfang, Monatsbericht |

**Nicht auf der Website (v1):** SEA/Google Ads, Instagram/Meta Ads, Performance-Pakete, Creative-Pakete, Automatisierung. Diese Felder erscheinen weder in Navigation noch Leistungen noch Preisen. Die Nicht-Angebote-Sektion nennt „Werbeanzeigen-Management" ausdrücklich, um Fehlanfragen zu vermeiden.

## 4. Branchen (sechs Profile)

| Branche | Kernproblem auf der Seite | Unser Dreh |
|---|---|---|
| **Arztpraxen** | Telefonlast, unsortierte Anliegen, unsichtbare Selbstzahlerleistungen | Termin-Triage, Bewertungen, lokale + KI-Sichtbarkeit, MFA-Recruiting |
| **Psychotherapiepraxen** | Anfrageflut bei vollem Kalender: unpassende Therapieplatz-Anfragen kosten täglich Zeit | **Anfrage-Filter statt Lead-Maximierung**: strukturierte Erstanfrage (Kasse/Privat/Selbstzahler, Verfahren, Kapazitätsstatus), Wartelisten-Kommunikation, würdevolle, sensible Sprache |
| **Hotellerie** | OTA-Provisionen, schwache Direktbuchung | Direktbuchungspfad, Agent-Readiness für KI-Reiseassistenten |
| **Handwerk** | Unpassende Kleinanfragen, unbesetzte Stellen | Anfrage-Filter (Region/Größe/Budget), Recruiting mit 2-Minuten-Bewerbung |
| **Baubetriebe** | Lange Zyklen, Anfragen ohne verwertbare Projektdaten | Projekt-Konfigurator mit Plan-Upload, Referenzseiten, getrennte Recruiting-Funnels |
| **Gastronomie** | Plattformabhängigkeit, PDF-Speisekarte, No-Shows | Eigene Reservierung, HTML-Speisekarte (KI-lesbar), Events & Gutscheine |

**Besonderheit Psychotherapie:** Das Segment hat Nachfrageüberhang — wir verkaufen dort keine „mehr Anfragen", sondern **Entlastung und Passung**. Tonalität streng seriös, keine Marketing-Sprache, Datenschutz prominent. Das ist zugleich der Beweis, dass unser Filter-Prinzip in beide Richtungen funktioniert.
*(Update 28.07.: Baubetriebe auf Nutzerentscheid als volles sechstes Profil aufgenommen.)*

## 5. Lead-Funnel-Vision

**Prinzip: maximal zwei Klicks bis zur Kontaktmöglichkeit, von jeder Stelle der Seite.**

1. **Projekt-Check (primär):** 3 Chip-Fragen (Branche → größtes Thema → Zeitrahmen) → Live-Systemempfehlung → übergibt vorausgefüllt an das Schnellkontakt-Formular.
2. **Schnellkontakt-Formular (überall erreichbar):** maximal 5 Felder — Name, E-Mail *oder* Telefon, Branche (vorbelegt aus Projekt-Check), Anliegen (frei, optional), Datenschutz-Checkbox. Absenden in unter 60 Sekunden. Kein Pflicht-Telefonfeld, keine Firmenfeld-Bürokratie, kein Captcha-Rätsel (Honeypot statt Nutzerhürde).
3. **Sticky-Schnellkontakt:** dezenter, permanent sichtbarer Button (mobil wie Desktop), öffnet das Formular als Overlay — der „schnelle Kontakt" aus dem Auftrag, wörtlich genommen.
4. **Direktkanäle:** E-Mail-Adresse klickbar; Erstgespräch-Versprechen (30 Min, vorbereitet, keine Verkaufsshow).

**Verarbeitung:** Formular sendet an einen Webhook auf eigener Infrastruktur (n8n, interne Nutzung) → sofortige Benachrichtigung (Mail + Telegram) → Antwort-SLA 1 Werktag wird gemessen. Kein Drittanbieter-Formulardienst, keine Daten außerhalb eigener Systeme (ASSUMPTION: n8n-Instanz verfügbar; Alternative im Bauplan).

## 6. Design- und Erlebnis-Vision

- **Bestehendes Designsystem bleibt:** Papierweiß + grünstichiges Tintenschwarz + Systemgrün; Archivo / IBM Plex Sans / IBM Plex Mono; typografiegeführt, Premium durch Reduktion.
- **Signatur bleibt der Lead-Filter** (Canvas-Animation): Er erzählt jetzt beide Geschichten — mehr passende Anfragen (Handwerk, Gastro, Hotel) *und* weniger unpassende (Psychotherapie, Praxen).
- **Motion diszipliniert:** vorhandene Reveals, Marquee, Zähler, Prozess-Linie, Accordion — vollständige `prefers-reduced-motion`-Abschaltung, Performance-Budget vor Effekt (LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms).
- **Vertrauen ohne Fiktion:** keine erfundenen Testimonials oder Logos. Beispielszenarien (klar gekennzeichnet) + vier schriftliche Zusagen, bis echte Fallstudien sie ersetzen.

## 7. Erfolgskriterien (messbar ab Launch)

| KPI | Zielwert v1 (ASSUMPTION) |
|---|---|
| Qualifizierte Anfragen / Monat | ≥ 8 nach 90 Tagen |
| Projekt-Check-Abschlussquote (gestartet → gesendet) | ≥ 35 % |
| Formular-Abschlussquote (geöffnet → gesendet) | ≥ 50 % |
| Antwortzeit auf Anfragen | 100 % ≤ 1 Werktag |
| Core Web Vitals | alle „gut" (Feld- oder Lab-Daten) |
| Eigene KI-Auffindbarkeit | dokumentierte Testabfragen: BDS wird korrekt beschrieben |

## 8. Nicht-Ziele der Website v1

Kein Blog/Magazin zum Start · kein Kundenlogin/Portal · keine Mehrsprachigkeit · kein Chatbot · keine Ads-Landingpages · keine Preisrechner · kein CMS-Ausbau vor Marktbeweis.

## 9. North Star

> **Ein Betrieb mit einem echten Engpass versteht in 90 Sekunden, dass wir sein Problem kennen — und braucht danach weniger als 60 Sekunden, um uns zu erreichen.**
