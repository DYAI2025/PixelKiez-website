# Pixelkiez Self-Service Website Analysis & AI Visibility Funnel — Implementierungsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Öffentlicher Marketing-Funnel: Homepage-Einstieg + bilinguale Landingpage `/website-analyse/`, später Self-Service-Audit mit E-Mail-Verifikation, asynchronem Diagnosis-Run und privatem Report.

**Architecture:** Statische Site (site/ → dist/ via scripts/build.mjs, kein Framework). Neue Seiten laufen über eine generalisierte Sprachpaar-Registry durch denselben Build (DE-Quelle → EN per Ersetzung). Audit-Backend kommt erst in Slice 4+ hinter einem stabilen API-Vertrag; die Website kennt Hermes nie direkt.

**Tech Stack:** Vanilla HTML/CSS/JS, esbuild + html-minifier-terser (Build), Node ≥18, Caddy (Auslieferung), separater Node-Formulardienst (`api/`, nodemailer).

---

## 0. Verifizierte Baseline (Slice 0, Stand 2026-08-30)

Alle Angaben gegen das lokale Repo geprüft. **FACT**, sofern nicht anders markiert.

**Git**
- Root: `/Users/benjaminpoersch/pixelkiez-website/PixelKiez-website`
- Default-Branch: `main` (origin/HEAD → origin/main), Remote `https://github.com/PixelKiez/PixelKiez-website.git`
- Baseline-SHA: `efb7d69ebca7e49c6cd65cb84bca33eb32d02e02` (lokal == origin/main nach `git fetch --all --prune`)
- Feature-Branch: `feat/pxk-self-service-analysis-funnel` (neu, von main)
- Working Tree bei Beginn: sauber bis auf untracked `.claude/` (Session-Telemetrie) und `CLAUDE.md` (in dieser Session per /init erzeugt)

**Baseline-Gates**
- `npm run deps` → 20 + 1 Pakete, nosync-Symlink (Repo liegt NICHT unter ~/Documents; iCloud-Risiko gering, Konvention bleibt)
- `npm run build` → grün (537 ms, erzeugt zusätzlich `sitemap.xml` — README erwähnt das nicht)
- `npm run verify` → grün („Abnahme bestanden — keine Fehler")

**Build-Architektur (scripts/build.mjs, 594 Zeilen)**
- `SEITEN = ['index.html', 'impressum.html', 'datenschutz.html']` hart kodiert (Z. 15)
- CSS/JS werden minifiziert und **in jede Seite eingebettet**; Fonts/Bilder bekommen Inhalts-Hash; Schrift-/Bildverweise werden **wurzelabsolut** umgeschrieben (`/assets/fonts/…`, `/assets/img/…`)
- `pruefe(seite, html, jsMin)` (Z. 246): Selbstprüfung je Seite (keine Rest-`<link>`/`<script src>`, gültiges eingebettetes JS, JSON-LD parsebar, SVG-Attribute case-sensitiv)
- `baueEnglisch()` ist **index-spezifisch**: lang-Swap, Sprachumschalter-Ersatz (hart `href="/"`, „DE"), Impressum/Datenschutz-Links → wurzelabsolut, `setzeAlternates()` hart auf `/` und `/en/`, og:locale/og:url, JSON-LD-Übersetzungswalk
- Wurzeldateien (robots.txt, llms.txt, Icons, logo.png) ohne Hash kopiert; `sitemap.xml` aus hart kodierter Liste `sitemapEintraege` (4 URLs, Z. 394) mit **einem** hart kodierten hreflang-Alternates-Block (nur Homepage-Paar)
- Vorkomprimierung `.br`/`.gz` je Textdatei

**Verify-Architektur (scripts/verify.mjs, 170 Zeilen)**
- `SEITEN = ['index.html','impressum.html','datenschutz.html','en/index.html']` hart kodiert (Z. 16)
- Je Seite: nichts extern nachladbar, Schriften gehasht+vorhanden, eingebettetes Skript via `new Function()` gültig, JSON-LD parsebar, interne hrefs existieren in dist/ (stat — Verzeichnisse zählen als vorhanden), Bildverweise existieren, SVG-Case, `.br`/`.gz`-Nachbarn vorhanden und kleiner
- Sprachprüfungen **nur** für `index.html` und `en/*` (Z. 88): hreflang de/en/x-default, Umschalter hart kodiert (en → `href="/"` „DE"; de → `href="/en/"` „EN")
- `en/*`: keine relativen Verweise, keine Umlaute im sichtbaren Text
- **Kein Canonical-Check vorhanden**

**i18n**
- `scripts/i18n.mjs`: Zerleger (text/attr/tag/roh), gemeinsame Tabelle „deutscher Satz → englischer Satz"; ATTRIBUTE = alt/title/aria-label/placeholder/content/data-anliegen; UNVERAENDERT-Whitelist (u. a. „seo", „geo", „01"–„09")
- `scripts/i18n-extract.mjs`: liest **nur** `site/index.html` (+ JSON-LD-Strings), schreibt `site/i18n/en.json` (Merge, verschwundene Keys entfallen)
- `scripts/i18n-js.mjs`: übersetzt Strings in bds.js via `en.js.json`; `fehlend` UND `veraltet` sind fatal
- Impressum/Datenschutz bleiben bewusst deutsch

**Frontend**
- `site/index.html` (1041 Z.): Header (Brand → `#top`, Schnellkontakt-Button `data-open-contact`, Sprachumschalter, Burger-Menü mit 8 nummerierten Ankern 01–08), Hero mit Partikel-Canvas, Sektionen `#ausgangslage #leistungen #check #pakete #ablauf #im-detail #faq #kontakt`, Footer (relative Links `impressum.html`), Sticky-CTA, `<dialog id="kontakt-dialog">` mit Formular-Slot
- **Projekt-Check** (`#check`, „03 · Diagnose"): Chips-Auswahl → übergibt vorausgefüllt an Schnellkontakt — existierendes Muster „Interaktion ohne eigenes Backend"
- Kontaktformular POST `/api/kontakt` (JSON); Dienst akzeptiert `{name, kontakt, ausgangspunkt, anliegen, quelle, firma(Honeypot), consent:true}` (api/server.mjs Z. 99, 250–263)
- `site/impressum.html`: Muster für Unterseiten — reduzierter Header (Brand → `index.html`, „Zurück zur Startseite"), kein Menü, kein hreflang, canonical auf `.html`-Pfad
- **Newsletter-Versprechen** in `site/index.html:884` + bds.js:1393 („kein Newsletter …") — **NICHT anfassen** (Invariante I-4)
- `bds.js` (1401 Z., IIFE, ENDPOINT `/api/kontakt`): §1 Header/Nav, §2 Reveal, §3 Hero-Rotator, §3b Pixel-Drift, §4–7 Sektions-Interaktion, §8 Projekt-Check, §9 Schnellkontakt/Dialog/Versand — alles elementgeprüft, läuft auf Seiten ohne diese Elemente leer
- `bds.css` (~2400 Z., 18 nummerierte Abschnitte): Tokens, Buttons/Chips, Formular, Dialog, Rechtsseiten
- `serve.mjs`: Verzeichnis-URLs wie Caddy (`/pfad/` → `pfad/index.html`, ohne Endung → 301 auf `/pfad/`) → **saubere URLs funktionieren lokal und live ohne Zusatzkonfiguration**
- JSON-LD der Homepage nennt bereits „Generative Engine Optimization" und „Agent-Readiness" als Leistungen; llms.txt ebenso → das Analyse-Angebot passt zur bestehenden Positionierung

---

## 1. Invarianten (gelten für alle Slices)

- **I-1 Keine Hermes-Kopplung.** Website kennt nur einen stabilen Audit-Service-Vertrag (ab Slice 4). Kein Skill-Code, keine Skill-Dateien, keine zweite Audit-/Scoring-Engine im Repo.
- **I-2 Truth Discipline.** Keine erfundenen Scores, Provider-Claims oder Sichtbarkeitswerte. Begriffsleiter: Discoverability ≠ Extractability ≠ Answerability ≠ Observed AI Visibility. Kein Fake-Erfolg, keine vorgetäuschte Analyse.
- **I-3 Kein zukünftiger Skill-Contract wird erfunden.** AI-Visibility-Felder erst binden, wenn der dann aktuelle versionierte Contract vorliegt (Slice 7/8).
- **I-4 Newsletter-Aussage und Portfolio unangetastet.** Kein Opt-in, keine stille Änderung von index.html:884, kein Voice-Agent-Portfolio.
- **I-5 Kein Framework, keine neue Designbibliothek.** Neue Komponenten aus bds.css/bds.js ableiten.
- **I-6 Gates niemals abschwächen.** Build-/Verify-Prüfungen werden erweitert, nie gelockert.
- **I-7 Research-Gate.** Wissensseiten (Slice 2/3) ohne freigegebenes Research-Paket: noindex + kein Sitemap-Eintrag.
- **I-8 Git.** Nur Feature-Branch, keine Pushes/Merges/Deploys, kein reset --hard/stash, dist/ bleibt unversioniert (.gitignore: `dist/`).

---

## 2. Slice-Roadmap

| Slice | Inhalt | Status / Gate |
|---|---|---|
| 0 | Discovery, Baseline, dieser Plan | ✅ abgeschlossen (dieser Stand) |
| 1 | Homepage-Einstieg + bilinguale Landingpage `/website-analyse/`, kein Backend | Tasks unten |
| 2 | Knowledge-Hub-Struktur, 5 Content-Shells (noindex, ohne Sitemap), Kiezbot-Visual-Slot | nach Freigabe Slice 1 |
| 3 | Wissensseite KI-Crawler | **BLOCKED** bis extern geprüftes Research-Paket |
| 4 | Audit-API-Vertrag, Job-State-Modell, Persistenz-/Runtime-Entscheidung | nach Freigabe |
| 5 | E-Mail-Verifikation, Free-Audit-Entitlement, Consent | nach Freigabe |
| 6 | Secure URL Intake (SSRF/Redirect/Private-Net/Rate-Limit/Abuse) | nach Freigabe |
| 7 | Worker-Adapter an den DANN aktuellen Diagnosis-Contract | Contract lesen → binden |
| 8 | Versionierte AI-Visibility-Messung | **BLOCKED** bis Measurement-Contract |
| 9 | QA-gated PDF, private Report-URL, transaktionale E-Mail | nach Freigabe |
| 10 | Funnel-Analytics, SEO/GEO-Release (Sitemap/llms/hreflang final) | nach Freigabe |
| 11 | E2E, Browser-/Runtime-Verifikation, Rollback-/Release-Gate | nach Freigabe |

Review-Ping-Pong: Nach jedem Slice STOP + SLICE_HANDOFF; externer Review gibt frei.

---

## 3. Architekturentscheidungen für Slice 1

- **D-1 URL-Schema.** DE-Quelle `site/website-analyse.html` → `dist/website-analyse/index.html` (kanonisch `/website-analyse/`); EN → `dist/en/website-analyse/index.html` (`/en/website-analyse/`). serve.mjs und Caddy `file_server` bedienen Verzeichnis-URLs bereits. Beide Seiten liegen eine Ebene tief → **alle Verweise in der Quelle wurzelabsolut** (`/assets/…`, `/impressum.html`, `/#kontakt`).
- **D-2 Sprachpaar-Registry statt Einzelfall.** build.mjs bekommt `SPRACHPAARE = [{quelle, zielDe, zielEn, pfadDe, pfadEn}]` für Homepage + Landingpage; `baueEnglisch()` wird zu `baueEnglisch(paar, …)` parametrisiert (Umschalter-Ziel, canonical, alternates, og:url je Paar). `setzeAlternates(html, sprache, paar)`. i18n-extract liest alle Paar-Quellen in **eine** gemeinsame en.json (Zerleger dedupliziert identische Sätze — Header/Footer-Wiederholungen kosten nichts). Sitemap-Alternates je Eintrag statt global.
- **D-3 Homepage-Einstieg = schmales Band nach dem Hero** (nach `.vertrauen`, vor `#ausgangslage`) mit einer Zeile Copy, URL-Feld und CTA. **GET-Formular `action="/website-analyse/"`, Feld `name="url"`** → funktioniert ohne JavaScript (Landingpage liest `?url=` aus und belegt ihr Feld vor). Burger-Menü bleibt unverändert (keine Umnummerierung 01–08); zusätzlich ein Footer-Link. Begründung: prominent, aber die Webdesign-Positionierung der Homepage bleibt führend.
- **D-4 Landingpage-Conversion ohne Backend = ehrlicher bestehender Kontaktweg.** Die Landingpage trägt ein echtes Formular (URL + Name + E-Mail + Consent) → POST `/api/kontakt` mit `quelle:"website-analyse"` und der URL im Anliegen. Das ist derselbe funktionierende SMTP-Weg wie der Schnellkontakt; die Analyse wird bis Slice 7 manuell erstellt und per E-Mail beantwortet. Copy sagt genau das: **persönlich erstellte Analyse, Ergebnis per E-Mail** — kein Sofort-Score, kein Fake-Dashboard, kein „in 60 Sekunden". Muster identisch zum existierenden Projekt-Check (Chips → Schnellkontakt).
- **D-5 SEO.** Eigener Title/Description/H1, canonical + hreflang-Paar + x-default→DE, og:*, `robots: index,follow` (echte Inhaltsseite), **Sitemap-Eintrag ja** (beide URLs — Seite ist vollwertig; Abweichung vom „Sitemap erst Slice 10"-Vorbehalt hier bewusst, weil Build die Sitemap ohnehin generiert und Inkonsistenz teurer wäre). JSON-LD: nur ein `WebPage`-Knoten mit `isPartOf`/`about` auf die bestehende `@id`-Welt — **kein** erfundenes WebApplication/Service/Offer-Markup (deferred bis das Produkt real existiert). llms.txt bekommt einen Seiteneintrag.
- **D-6 TDD.** Erst verify.mjs tabellenbasiert generalisieren + neue Gates (RED), dann build.mjs + Seiten bauen (GREEN). Neue Gates: Seiten vorhanden, canonical je Seite, hreflang/Umschalter je Sprachpaar, wurzelabsolute Verweise für Seiten unterhalb der Wurzel, Homepage verlinkt `/website-analyse/`.

**Bewusst NICHT in Slice 1:** Audit-Backend, Auth, Entitlements, Newsletter, Kiezbot-Assets, Knowledge Hub, strukturierte Daten fürs Produkt, Änderungen am Formulardienst (api/ bleibt unangetastet — `quelle` wird bereits akzeptiert).

---

## 4. Slice-1-Tasks

Reihenfolge ist bindend. Nach jedem „Run"-Schritt Ausgabe prüfen; Abweichung = STOP, nicht weiterbauen.

### Task 1: Verify-Gates generalisieren und erweitern (RED)

**Files:** Modify `scripts/verify.mjs`

**Step 1.1:** `SEITEN`-Konstante (Z. 16) durch Tabelle ersetzen:

```js
/* Jede ausgelieferte Seite mit ihren Sprach-Erwartungen. `paar` verbindet
   die beiden Fassungen einer Quelle; Seiten ohne `paar` sind einsprachig. */
const SEITEN = [
  { pfad: 'index.html',                    lang: 'de', kanonisch: '/',                    paar: { partner: '/en/',              schalter: 'EN' } },
  { pfad: 'en/index.html',                 lang: 'en', kanonisch: '/en/',                 paar: { partner: '/',                 schalter: 'DE' } },
  { pfad: 'website-analyse/index.html',    lang: 'de', kanonisch: '/website-analyse/',    paar: { partner: '/en/website-analyse/', schalter: 'EN' } },
  { pfad: 'en/website-analyse/index.html', lang: 'en', kanonisch: '/en/website-analyse/', paar: { partner: '/website-analyse/',    schalter: 'DE' } },
  { pfad: 'impressum.html',                lang: 'de', kanonisch: '/impressum.html' },
  { pfad: 'datenschutz.html',              lang: 'de', kanonisch: '/datenschutz.html' },
];
```

**Step 1.2:** Schleifenkopf `for (const seite of SEITEN)` auf `seite.pfad` umstellen; `const en = seite.startsWith('en/')` ersetzen durch `seite.lang === 'en'` bzw. Tiefen-Check `seite.pfad.includes('/')`.

**Step 1.3:** Sprachblock (Z. 83–105) tabellengetrieben umbauen:
- `<html lang="${seite.lang}">` muss vorhanden sein (für ALLE Seiten).
- Wenn `seite.paar`: hreflang de/en/x-default vorhanden; Umschalter-Regex prüft `href === paar.partner` und Text `=== paar.schalter`.
- Canonical-Check NEU für alle Seiten: `html.includes(`<link rel="canonical" href="https://pixelkiez.de${seite.kanonisch}">`)` — sonst Fehler.
- Wurzelabsolut-Regel (bisher nur en): gilt jetzt für jede Seite mit `seite.pfad.includes('/')`; Umlaut-Prüfung weiterhin nur `lang === 'en'`.

**Step 1.4:** Neues Gate nach der Seitenschleife: Homepage muss den Funnel-Einstieg tragen:

```js
const start = await readFile(join(ZIEL, 'index.html'), 'utf8');
if (!/(?:href|action)="\/website-analyse\/"/.test(start))
  F('index.html: kein Einstieg zur Website-Analyse (/website-analyse/) gefunden');
```

**Step 1.5:** Run `npm run build && npm run verify`
Expected: Build grün (noch unverändert), Verify **FAIL** mit mindestens:
`website-analyse/index.html fehlt in dist/`, `en/website-analyse/index.html fehlt in dist/`, `index.html: kein Einstieg zur Website-Analyse`, Canonical-Fehler für impressum/datenschutz nur falls Format abweicht (vorher gegen Quelle prüfen — impressum trägt `https://pixelkiez.de/impressum.html`, passt).

**Step 1.6:** Commit: `git add scripts/verify.mjs && git commit` — Message: `Abnahme kennt Sprachpaare, Canonicals und den Analyse-Einstieg (rot bis Slice 1 steht)`.
*Anmerkung:* Ein bewusst roter Zwischenstand auf dem Feature-Branch ist hier akzeptiert (TDD-Schritt); wer das nicht will, staged Task 1 und committet erst nach Task 6 zusammen mit Grün. Entscheidung beim Ausführen dokumentieren.

### Task 2: build.mjs generalisieren

**Files:** Modify `scripts/build.mjs`, `scripts/i18n-extract.mjs`

**Step 2.1:** Registry einführen (ersetzt `SEITEN`-Rolle nur für Sprachlogik; einsprachige Seiten bleiben):

```js
const EINSPRACHIG = ['impressum.html', 'datenschutz.html'];
const SPRACHPAARE = [
  { quelle: 'index.html',           zielDe: 'index.html',                    zielEn: 'en/index.html',                 pfadDe: '/',                 pfadEn: '/en/' },
  { quelle: 'website-analyse.html', zielDe: 'website-analyse/index.html',    zielEn: 'en/website-analyse/index.html', pfadDe: '/website-analyse/', pfadEn: '/en/website-analyse/' },
];
```

**Step 2.2:** `setzeAlternates(html, sprache)` → `setzeAlternates(html, sprache, paar)`: hreflang-de auf `pfadDe`, -en auf `pfadEn`, x-default auf `pfadDe`; canonical je Sprache.

**Step 2.3:** Deutsche Seitenschleife über `EINSPRACHIG + SPRACHPAARE.map(p => p.quelle)`; Ziel via `zielDe` (mkdir recursive für Unterverzeichnisse); `setzeAlternates` für jede Paar-Quelle (nicht mehr `if (seite === 'index.html')`). Der Skript-Einbettungszweig ist bereits generisch (ersetzt wenn vorhanden, Pflicht nur für index.html) — unverändert lassen.

**Step 2.4:** `baueEnglisch()` → `baueEnglisch(paar, cssMin, jsRoh, jsEnMin, fontKarte, bildKarte, tabHtml, tabJs)` und je Paar aufrufen. Zu parametrisieren: Quelldatei, Umschalter-Ersatz (`href="${paar.pfadDe}"`), `setzeAlternates(html, 'en', paar)`, og:url auf `pfadEn`. Der Rewrite `href="(impressum|datenschutz)\.html"` → wurzelabsolut bleibt (greift auf der Landingpage-Quelle nicht, weil dort schon wurzelabsolut geschrieben wird — bewusst). `uebersetzeJs`/`jsEn` **einmal** vor der Schleife berechnen, nicht je Paar. Die `veraltet`-Prüfung der HTML-Tabelle existiert nicht (nur `fehlend` je Seite) — unverändert.

**Step 2.5:** JSON-LD-Übersetzungswalk: läuft generisch über das erste `application/ld+json` der Seite — funktioniert für die Landingpage mit; Guard ergänzen: Seite ohne JSON-LD überspringt den Walk statt zu werfen.

**Step 2.6:** `sitemapEintraege` erweitern und Alternates je Eintrag erzeugen:

```js
const sitemapEintraege = [
  { pfad: '/',                   quelle: 'index.html',           alternates: SPRACHPAARE[0] },
  { pfad: '/en/',                quelle: 'index.html',           alternates: SPRACHPAARE[0] },
  { pfad: '/website-analyse/',   quelle: 'website-analyse.html', alternates: SPRACHPAARE[1] },
  { pfad: '/en/website-analyse/',quelle: 'website-analyse.html', alternates: SPRACHPAARE[1] },
  { pfad: '/impressum.html',     quelle: 'impressum.html' },
  { pfad: '/datenschutz.html',   quelle: 'datenschutz.html' },
];
```

(x-default je Paar auf `pfadDe`; Ausgabeformat wie bisher.)

**Step 2.7:** `scripts/i18n-extract.mjs`: statt nur `site/index.html` über alle `SPRACHPAARE`-Quellen iterieren (Registry dorthin exportieren oder lokal duplizieren — Export aus build.mjs vermeiden, kleine gemeinsame Datei `scripts/seiten.mjs` ist der saubere Ort für `EINSPRACHIG`/`SPRACHPAARE`), Strings vereinigen, en.json mergen.

**Step 2.8:** Run `npm run build`
Expected: **FAIL** mit ENOENT für `site/website-analyse.html` (Quelle fehlt noch — beweist, dass die Registry greift).

### Task 3: DE-Landingpage `site/website-analyse.html`

**Files:** Create `site/website-analyse.html`; Modify `site/assets/css/bds.css` (neuer Abschnitt), ggf. `site/assets/js/bds.js` (§9-Erweiterung + URL-Vorbelegung)

**Step 3.1:** Head — vollständig, alle Pfade wurzelabsolut:

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Website-Analyse: Sichtbarkeit für Google und KI prüfen · Pixelkiez</title>
<meta name="description" content="Kostenlose Website-Analyse aus Berlin: Technik, SEO, GEO und KI-Auffindbarkeit. Persönlich erstellt, Ergebnis per E-Mail — keine automatischen Scores.">
<meta name="theme-color" content="#B6C7C4">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="https://pixelkiez.de/website-analyse/">
<!-- hreflang setzt der Build (setzeAlternates), wie auf der Startseite -->
```

og:*-Block analog Startseite (og:url `https://pixelkiez.de/website-analyse/`, eigener og:title/description, og.png wiederverwenden), Icons wie impressum.html, Font-Preloads wie index.html (Pfade `assets/fonts/…` relativ lassen? **Nein:** wurzelabsolut kann der Build nicht hashen — FACT: build.mjs ersetzt `href="assets/fonts/…"`-Muster. Preloads daher exakt wie in index.html RELATIV schreiben (`assets/fonts/…`); der Build schreibt sie auf gehashte wurzelabsolute Pfade um. Gleiches gilt für `assets/img/`-Verweise und die beiden Stylesheet-`<link>` (Build-Muster erwartet exakt `assets/css/fonts.css` + `assets/css/bds.css` nacheinander). **Nur** handgeschriebene Navigations-hrefs (`/`, `/impressum.html`, `/#kontakt`) sind wurzelabsolut.

JSON-LD (einziger neuer Knoten, keine Erfindungen):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://pixelkiez.de/website-analyse/#webpage",
  "url": "https://pixelkiez.de/website-analyse/",
  "name": "Website-Analyse: Sichtbarkeit für Google und KI prüfen",
  "inLanguage": "de-DE",
  "isPartOf": { "@id": "https://pixelkiez.de/#website" },
  "about": { "@id": "https://pixelkiez.de/#organisation" },
  "dateModified": "2026-08-30"
}
</script>
```

(`#website`-@id vor dem Schreiben in index.html verifizieren: `grep '"@id".*#website' site/index.html` — falls anders benannt, exakt übernehmen.)

**Step 3.2:** Body-Gerüst (Muster impressum.html-Header + Startseiten-Komponenten):
- Skip-Link, Header: Brand → `/`, rechts `<a class="lang" href="/en/website-analyse/" hreflang="en" lang="en" aria-label="Switch to English" data-lang-switch>EN</a>` + Schnellkontakt-Button. Kein Burger-Menü (Unterseiten-Muster).
- `<main>`: Auftakt (kicker „Kostenlose Analyse", H1 `Wie sichtbar ist Ihre Website — für Google und für KI?`, Lead: was die Analyse ist, wer sie erstellt, was sie kostet: nichts).
- Sektion „Was geprüft wird": 6 Karten (bestehende Kartenmuster aus §9/§12 der CSS nutzen): Website & Technik · SEO · GEO · KI-Auffindbarkeit · Answerability · Agent-Readiness. Je Karte 2–3 ehrliche erklärende Sätze (Begriffsleiter aus I-2 beachten; keine Provider-Behauptungen, keine Scores).
- Sektion „Was Sie erhalten": persönlich erstellte Einschätzung mit konkreten Befunden und priorisierten nächsten Schritten, per E-Mail, innerhalb der bekannten Reaktionszeit-Tonalität („qualifizierte Antwort", nicht „Sofort-Report").
- Sektion „So läuft es ab": 3 Schritte (URL angeben → wir sehen uns Ihre Website an → Ergebnis per E-Mail). Ehrlich: Mensch erstellt die Analyse.
- Formular-Sektion: Felder `#f-url` (type="url", required, vorbelegt aus `?url=`), `#f-name`, `#f-kontakt` (E-Mail), Honeypot `#f-firma`, Consent-Checkbox (Wortlaut vom Startseiten-Formular übernehmen), Submit „Analyse anfragen". Gleiche Klassen (`form`, `input`, `hint`, `btn btn--split btn--primary`).
- Footer: Kurzfassung des Startseiten-Footers, alle Links wurzelabsolut (`/impressum.html`, `/datenschutz.html`, `/#kontakt`, `/#leistungen`).
- `<script src="assets/js/bds.js" defer></script>` vor `</body>` (Build bettet ein).

**Step 3.3:** bds.js §9 minimal erweitern (vor dem Ändern §9 Z. 1230–1401 vollständig lesen):
- Wenn `#analyse-form` existiert: Submit-Handler analog Kontaktformular, Payload `{name, kontakt, anliegen: 'Website-Analyse angefragt für: ' + url, quelle: 'website-analyse', firma, consent}` an ENDPOINT; Erfolgs-/Fehlertexte über dieselbe `say()`-Mechanik; Fehlerpfad zeigt wie bisher die E-Mail-Adresse und behält Eingaben.
- Beim Laden: `new URLSearchParams(location.search).get('url')` → `#f-url` vorbelegen (nur wenn Feld existiert).
- Neue deutsche Strings ⇒ `site/i18n/en.js.json` ergänzen (Build erzwingt Vollständigkeit, `veraltet` beachten).

**Step 3.4:** bds.css: neuer nummerierter Abschnitt am Ende (vor §17/§18 einsortieren passt zur Nummernlogik nicht — ans Ende als `/* ---------- 19. Analyse-Seite + Analyse-Band ---------- */`), nur was Bestehendes nicht hergibt (URL-Zeile im Band, Kartenraster der Prüffelder falls §9-Muster nicht direkt passt). Token-Farben, WCAG AA halten.

### Task 4: Homepage-Einstieg

**Files:** Modify `site/index.html`

**Step 4.1:** Band nach `</section>` des Hero (nach `.vertrauen`, vor `#ausgangslage`):

```html
<!-- ===================== ANALYSE-EINSTIEG ===================== -->
<aside class="analyse-band" aria-labelledby="ab-titel">
  <div class="wrap analyse-band__in">
    <div>
      <h2 class="h-md" id="ab-titel">Wie sichtbar ist Ihre Website für Google und KI?</h2>
      <p class="small">Kostenlose Analyse: Technik, SEO, GEO und KI-Auffindbarkeit. Persönlich erstellt, Ergebnis per E-Mail.</p>
    </div>
    <form class="analyse-band__form" action="/website-analyse/" method="get">
      <label class="sr-only" for="ab-url">Adresse Ihrer Website</label>
      <input class="input" type="url" id="ab-url" name="url" placeholder="https://ihre-website.de" inputmode="url">
      <a hidden></a><!-- kein JS noetig: GET-Formular traegt die URL als ?url= zur Analyse-Seite -->
      <button type="submit" class="btn btn--split btn--primary"><span class="btn__label" data-label>Website analysieren</span><span class="btn__ico"><svg aria-hidden="true"><use href="#i-arrow-ur"/></svg><svg aria-hidden="true"><use href="#i-arrow-ur"/></svg></span></button>
    </form>
  </div>
</aside>
```

(`sr-only`-Klasse vorher in bds.css prüfen — falls nicht vorhanden, in Task 3.4 ergänzen. Das leere `<a hidden>` entfällt; nur echter Code, der Kommentar wandert an das `<form>`.)

**Step 4.2:** Footer, nav „Kontakt": Link `<a href="/website-analyse/">Website-Analyse</a>` vor „Projekt-Check" einfügen. Menü 01–08 unverändert (D-3).

### Task 5: Übersetzungen

**Step 5.1:** Run `npm run i18n` → neue Keys mit leerem Wert in `site/i18n/en.json`.
**Step 5.2:** Alle neuen Keys übersetzen (idiomatisches Englisch, Begriffe: „AI visibility", „answerability", „agent readiness"). `en.js.json` um neue bds.js-Strings ergänzen.
**Step 5.3:** Run `npm run build` — Expected: bricht ab, solange irgendein Wert leer ist; erst bei Vollständigkeit grün.

### Task 6: Gates + Vorschau

**Step 6.1:** Run `npm run build && npm run verify`
Expected: beide grün; Verify listet 6 Seiten inkl. `website-analyse/index.html` und `en/website-analyse/index.html`.
**Step 6.2:** Run `npm run serve` (Hintergrund) und prüfen:
- http://localhost:8080/ (Band sichtbar, GET-Formular führt zu /website-analyse/?url=…)
- http://localhost:8080/website-analyse/ (Vorbelegung aus ?url=, hreflang, Umschalter EN)
- http://localhost:8080/en/website-analyse/ (englisch, Umschalter DE)
Browser-Test nur behaupten, wenn wirklich im Browser ausgeführt (sonst NOT_BROWSER_VERIFIED; curl-Checks zählen als HTML-Verifikation, nicht als Browser-Test).
**Step 6.3:** `site/llms.txt`: Seiteneintrag ergänzen (`Website-Analyse → https://pixelkiez.de/website-analyse/` + EN-Zeile), Beschreibung faktentreu.

### Task 7: Abschluss

**Step 7.1:** Plan-Abschnitt „6. Slice-Log" aktualisieren (SHAs, Dateien, Ergebnisse).
**Step 7.2:** `git status` + `git diff` vollständig durchsehen: kein dist/, keine Secrets, nichts Unbeteiligtes.
**Step 7.3:** Commit(s) auf dem Feature-Branch, Message beschreibt den Slice (deutsch, Stil der bisherigen Historie, z. B. `Analyse-Funnel Slice 1: Einstieg auf der Startseite, zweisprachige Analyse-Seite, Sprachpaar-Build`). NICHT pushen.
**Step 7.4:** SLICE_HANDOFF im Pflichtformat ausgeben, STOP.

---

## 5. Offene Fragen (für Review, blockieren Slice 1 nicht)

- O-1: Copy-Feinschliff „persönlich erstellt" vs. spätere Automatisierung — Formulierung so gewählt, dass Slice 7 sie ersetzen kann, ohne dass sie heute falsch ist. OK?
- O-2: Sitemap-Aufnahme der Landingpage schon jetzt (D-5) statt Slice 10 — bestätigen.
- O-3: Domain ist weiterhin Platzhalter `pixelkiez.de` (bestehender BLOCKER B-02 in index.html:19) — Livegang-Thema, nicht Slice 1.
- O-4: `CLAUDE.md` + `docs/` einchecken (dieser Plan) — Konvention „interne Unterlagen liegen in der Wurzel als .md" existiert bereits (Bauplan/Vision); `docs/plans/` ist neu, aber sauber. OK?
- O-5: Band-Position nach dem Hero (D-3) — Alternative wäre Integration in Sektion 03 „Projekt-Check". Review entscheidet, Umbau ist klein.

## 6. Slice-Log (persistenter Ping-Pong-State)

### Slice 0 — abgeschlossen 2026-08-30
- Base SHA: `efb7d69ebca7e49c6cd65cb84bca33eb32d02e02` (== origin/main)
- Branch: `feat/pxk-self-service-analysis-funnel`
- Baseline: `npm run deps` ✅ · `npm run build` ✅ · `npm run verify` ✅
- Artefakte: dieser Plan; `CLAUDE.md` (aus /init, separater Commit)
- Erkenntnisse, die frühere Annahmen korrigieren: Build erzeugt bereits `sitemap.xml` (README schweigt dazu); Formulardienst akzeptiert bereits ein `quelle`-Feld; verify prüft bislang kein Canonical.

### Slice 1 — implementiert 2026-08-30, wartet auf externen Review
- Base SHA (Slice-0-Stand): `c63eb10` · Head SHA: siehe `git log` (Commit nach diesem Log-Update)
- **Geänderte/neue Dateien:**
  - `scripts/seiten.mjs` NEU — Seitenregister (EINSPRACHIG + SPRACHPAARE inkl. ldTausch)
  - `scripts/build.mjs` — Sprachpaar-Registry statt Einzelfall; `setzeAlternates(html, sprache, paar)`; `baueEnglisch(paar, mittel)` gibt `{html, benutzt}` zurück; JS-Übersetzung + `veraltet`-Prüfung (Union über alle Paare) in den Aufrufer verlegt; JSON-LD-Adress-Tausch über `paar.ldTausch`; EN-Fassung schreibt Wurzelverweise `href="/"`/`href="/#…"` auf `/en/…` um (vor dem Umschalter-Ersatz); Sitemap aus dem Register mit Alternates je Paar; Zielpfade in Unterverzeichnissen (mkdir)
  - `scripts/verify.mjs` — SEITEN als Tabelle (pfad/lang/kanonisch/paar); Canonical-Check für ALLE Seiten neu; Umschalter-/hreflang-Check je Paar; Wurzelabsolut-Regel für alle Seiten unterhalb der Wurzel; neues Gate: Startseite muss `/website-analyse/` verlinken
  - `scripts/i18n-extract.mjs` — liest alle SPRACHPAARE-Quellen in eine gemeinsame en.json
  - `site/website-analyse.html` NEU — Landingpage (Auftakt, Anfrage-Formular, 6 Prüffelder, 4-Stufen-Begriffsleiter, Nächster-Schritt, Footer); nur WebPage-JSON-LD, robots index,follow
  - `site/index.html` — Analyse-Band nach dem Hero (GET-Formular → `/website-analyse/?url=…`, skriptfrei funktionsfähig); Footer-Link „Website-Analyse"; Menü 01–08 unverändert
  - `site/assets/js/bds.js` — §9: `#f-url`-Vorbelegung aus `?url=`, Adresse wird dem Anliegen als `Website: …` vorangestellt; sonst unverändert (Formular-Handler, quelle=pathname greift automatisch)
  - `site/assets/css/bds.css` — neuer Abschnitt 19 (analyse-band, analyse-fakten, auftakt, pruef, leiter)
  - `site/i18n/en.json` — 57 neue Übersetzungen · `site/i18n/en.js.json` — `"Website: "`
  - `site/llms.txt` — zwei Seiteneinträge für die Analyse-Seite
- **Gates:** `npm run build` GRÜN (6 Seiten, Sitemap 6 Adressen) · `npm run verify` GRÜN (6 Seiten inkl. Canonical-/Paar-/Wurzelabsolut-Checks). TDD eingehalten: Verify-Gates zuerst rot (3 Fehler exakt wie geplant), dann grün gebaut.
- **Browser-verifiziert (Chrome, echte Sitzung, localhost:8080):** Band → GET `?url=` → Vorbelegung auf der Landingpage ✓ · required-Validierung ✓ · Fehlerpfad ohne Backend: ehrliche Fehlermeldung + Mail-Ausweich, Eingaben bleiben erhalten ✓ · Erfolgspfad gegen `api/` im Trockenlauf (`MAIL_DRYRUN=1`, Port 3010, `API_UPSTREAM` gesetzt): „Angekommen."-Status, Formular-Reset, Server-Log zeigt `Herkunft: /website-analyse/` und `Anliegen: Website: https://example.com` ✓ · EN-Landingpage und EN-Band gerendert ✓ · keine Konsolenfehler ✓
- **Abweichungen vom Plan:** verify-`SEITEN` ohne `skript:`-Flag umgesetzt (Skriptzahl wird weiter je Seite geloggt; hartes Gate nur für index wie zuvor). Task-1-Zwischencommit im roten Zustand NICHT gemacht — Brief §4 erlaubt Commits erst nach bestandenem Slice-Gate; alles in einem grünen Commit.
- **Erkenntnis:** Port 3000 ist auf dieser Maschine fremdbelegt — lokale api-Tests mit `PORT=3010` + `API_UPSTREAM=127.0.0.1:3010 npm run serve`.
- **Offen (unverändert aus Slice 0):** O-1 … O-5; Domain-Platzhalter B-02; Rechtstexte.
- **Nächster Slice:** 2 (Knowledge-Hub-Shells, noindex + ohne Sitemap, Kiezbot-Visual-Slot) — erst nach externer Freigabe.

### Slice 1 — externe Korrekturrunde 1, umgesetzt 2026-08-30
Review-Verdict CHANGES_REQUIRED, sechs Punkte:
1. **Worktree-Wahrheit:** `.claude/` (Session-Telemetrie) und die lokal verbleibende `CLAUDE.md` über `.git/info/exclude` ausgenommen (bewusst NICHT über das Projekt-`.gitignore`). `git status --short` ist leer.
2. **CLAUDE.md-Scope-Drift:** Kein Build-/Verify-/Auslieferungsbestandteil referenziert die Datei (`grep -rn 'CLAUDE\.md' scripts/ site/ api/ Dockerfile Caddyfile …` leer) → per normalem Commit wieder aus dem Branch-Diff entfernt; Datei bleibt lokal.
3. **EN-Link-Audit — Review-Verdacht bestätigt:** `dist/en/index.html` trug `action="/website-analyse/"` (Analyse-Band) und `href="/website-analyse/"` (Footer) auf die DEUTSCHE Fassung. Fix über das Paar-Konzept: der frühere Einzel-Rewrite (`href="/"`/`href="/#…"`) wurde durch eine Schleife über ALLE `SPRACHPAARE` ersetzt (href wie action, samt Ankern). Neues deterministisches Verify-Gate: englische Seiten dürfen keinen href/action auf einen deutschen Paar-Pfad tragen — ausgenommen der Sprachumschalter; Rechtsseiten stehen nicht im Register und bleiben absichtlich deutsch verlinkt. TDD: Gate zuerst rot (exakt die 2 Treffer, keine False Positives), dann Fix, dann grün.
4. **Responsive-Verifikation 390/768/1440, echte Browser:** Zwei Hürden dokumentiert: (a) interaktives Chrome-Fenster hat ~500 px Mindestbreite und der `localhost:8080`-Origin trug einen verstellten Seitenzoom (~50 %; Ausweg: `127.0.0.1` = frischer Origin); (b) `--headless --window-size=390` klemmt das Layout intern bei ~500 px — dessen 390er-Screenshots sind Artefakte. Belastbare Methode: Puppeteer-core (Scratchpad, keine Repo-Dependency) mit CDP-`setViewport` gegen das installierte Chrome 151. Messwerte: `innerWidth == scrollWidth` exakt bei 390/768/1440 auf Startseite, Landingpage und EN-Landingpage → kein horizontaler Overflow; Band-Input/-Button in allen Größen im Viewport, keine Überlappung; Fokus `#f-url` = 2px solid Akzent. Screenshots (Band 390/768/1440, Formular, Prüffelder 1-/2-/3-spaltig, Leiter, Schlusssektion, Footer, EN-Auftakt+Formular 390) gesichtet: saubere Wraps, nichts verdeckt, nichts abgeschnitten.
5. **Regression:** build + verify grün; Branch-Diff enthält kein `.claude/`, kein CLAUDE.md (netto), keinen fremden Scope.
6. **Review-Artefakt:** Patch nach `/tmp/pxk-slice-1-review.patch` erzeugt (Pfad + Größe im Handoff).
