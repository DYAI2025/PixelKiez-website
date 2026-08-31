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

---

## 7. Slice 2 — Wissensbereich: Hub, fünf Content-Shells, Kiezbot-Bildsystem

> **For Claude:** REQUIRED SUB-SKILL: superpowers:executing-plans. Nur Slice 2 umsetzen, danach STOP + SLICE_HANDOFF (Format in 7.9). Slice 3 beginnt erst nach externer Freigabe.

**Gate-Stand:** SLICE_1_EXTERNAL_REVIEW = PASS — vom Nutzer am 2026-08-31 ausdrücklich bestätigt.
**Basis (verifiziert 2026-08-31):** Branch `feat/pxk-self-service-analysis-funnel`, HEAD `e5cfc4a2a11000fa83bc3ff2220159f5c3966d92`. Baseline `npm run build` GRÜN (6 Seiten, Sitemap 6 Adressen) · `npm run verify` GRÜN. Working Tree: nur untracked `knowledge/` (Research-Rohmaterial — **Unterstützungsmaterial, kein Publikationsvertrag**; wird NICHT committet, siehe Task 2.0).

### 7.0 Was Slice 2 ist — und was nicht

Slice 2 baut die Informationsarchitektur des Wissensbereichs: den Hub `/wissen/`, fünf Content-Shells darunter und das wiederverwendbare Kiezbot-Szenen-Gefäß mit EINEM Prototyp. Die Shells tragen Seitenzweck, H1, neutrale Einleitung, Abschnittsarchitektur und Platzhalter — **keine Fakten aus dem Research-Paket**.

**Research-Gate (hart):** In keine neue Quelle dürfen: Provider-Namen (ChatGPT, Claude, Gemini, Perplexity, Googlebot, GPTBot, OpenAI, Anthropic, Cloudflare …), Prozentzahlen, Marktstatistiken, Chunk-Größen, Ranking-Faktor-Behauptungen, „Plattform X kann Y nicht sehen", llms.txt-Wirksamkeitsaussagen, Traffic-/Conversion-Behauptungen, erfundene Scores, Garantie-Formulierungen, „immer"/„nie"/„kann nicht". Erlaubt sind strukturelle, gehedgte Aussagen („können unterschiedliche Darstellungen erhalten"). Task 2.8 prüft das per grep gegen Null.

**Indexierungs-Gate (hart):** Alle 12 neuen Seiten (6 DE + 6 EN) tragen `noindex`, stehen NICHT in sitemap.xml, NICHT in llms.txt, werden NICHT von der Startseite verlinkt. Lokal erreichbar für Review — mehr nicht.

**Explizit out of scope:** Slice 3 (echte Inhalte), `site/index.html` (bleibt byte-identisch — harte Invariante; wird eine Änderung technisch nötig: STOP und melden), Service-Kacheln, `/website-analyse/`-Funnel (keine Umgestaltung), api/, jegliches Backend, Analytics, Newsletter, Deploys, neue Dependencies, finale Kiezbot-Markenassets, kommerzielle Seiten wie `/leistungen/agent-readiness/`.

**Rollback:** ein einziger lokaler Commit (Brief §27); Rücknahme = `git revert <sha>`. Kein Zustand außerhalb des Repos; `dist/` wird ohnehin je Build neu erzeugt.

### 7.1 Architekturentscheidungen

- **D-7 Quellen & Routen.** Quellen liegen gebündelt unter `site/wissen/` (der Build liest `join(QUELLE, paar.quelle)` — Unterverzeichnisse funktionieren, geprüft gegen build.mjs/i18n-extract.mjs; kein Kopier-alles-Mechanismus, der lose Dateien mitzöge). Registrierung ausschließlich über `scripts/seiten.mjs`:

  | Quelle (`site/`) | zielDe (`dist/`) | pfadDe | zielEn (`dist/`) | pfadEn |
  |---|---|---|---|---|
  | `wissen/index.html` | `wissen/index.html` | `/wissen/` | `en/knowledge/index.html` | `/en/knowledge/` |
  | `wissen/seo-geo-ai-visibility.html` | `wissen/seo-geo-ai-visibility/index.html` | `/wissen/seo-geo-ai-visibility/` | `en/knowledge/seo-geo-ai-visibility/index.html` | `/en/knowledge/seo-geo-ai-visibility/` |
  | `wissen/wie-ki-websites-liest.html` | `wissen/wie-ki-websites-liest/index.html` | `/wissen/wie-ki-websites-liest/` | `en/knowledge/how-ai-reads-websites/index.html` | `/en/knowledge/how-ai-reads-websites/` |
  | `wissen/answerability.html` | `wissen/answerability/index.html` | `/wissen/answerability/` | `en/knowledge/answerability/index.html` | `/en/knowledge/answerability/` |
  | `wissen/entity-trust.html` | `wissen/entity-trust/index.html` | `/wissen/entity-trust/` | `en/knowledge/entity-trust/index.html` | `/en/knowledge/entity-trust/` |
  | `wissen/agent-readiness.html` | `wissen/agent-readiness/index.html` | `/wissen/agent-readiness/` | `en/knowledge/agent-readiness/index.html` | `/en/knowledge/agent-readiness/` |

- **D-8 EN-Routenfamilie `/en/knowledge/` mit übersetztem Slug für Seite 2.** Der Brief bevorzugt `/en/knowledge/`; die Registry trägt `pfadEn` frei und der EN-Link-Rewrite in build.mjs (Schleife über SPRACHPAARE, exakter Attribut-Match `(href|action)="pfadDe(#anker)?"`) bildet DE→EN pfadgenau ab — **kein Präfix-Risiko** (`href="/wissen/answerability/"` matcht nicht das Muster für `/wissen/`, weil nach dem Pfad `"` oder `#` stehen muss; verifiziert an build.mjs Z. 146–150). Abweichung vom Slice-1-Präzedenzfall (`/en/website-analyse/` behielt den deutschen Slug): dort gab es keine Vorgabe, hier gibt der Brief `/en/knowledge/` vor. Slugs 1, 4, 5 sind bereits englisch; nur Hub und Seite 2 übersetzen.
- **D-9 Entwurfsstatus über Registry-Flag `entwurf: true`.** Wirkung: (a) build.mjs überspringt den Sitemap-Eintrag; (b) die Quelle trägt `<meta name="robots" content="noindex">` (übersteht die i18n-Übersetzung unverändert — der content-Attribut-Filter in i18n.mjs Z. 110 verlangt „Buchstabe Leerzeichen Buchstabe", was auf `noindex` nicht zutrifft; verifiziert); (c) llms.txt und Startseite bleiben unangetastet. Canonical + hreflang-Paar bleiben gesetzt (der Build erzeugt sie ohnehin je Paar; konsistente Paare erfüllen Gate F, noindex neutralisiert die Indexwirkung). Spätere Freigabe = Flag entfernen + robots-Meta tauschen + llms.txt-Einträge — eigener, review-pflichtiger Slice.
- **D-10 Kein JSON-LD auf den Shells.** `ldTausch: []`; der JSON-LD-Walk und der dateModified-Ersatz in build.mjs sind No-Ops ohne Treffer (Regex-replace ohne Match; verifiziert). Strukturierte Daten kommen mit echtem, geprüftem Inhalt in Slice 3 — sie sollen nie mehr behaupten, als die Seite leistet (gleiche Linie wie D-5).
- **D-11 Kiezbot = Gefäß + ein Prototyp, kein Asset-Projekt.** Neue CSS-Komponente `figure.kiezbot-scene` (Bildfläche, Szenentitel, erklärende Bildunterschrift, responsive, keine Animation). EIN Prototyp auf `wie-ki-websites-liest`: inline-SVG aus lokalen Primitiven, Kiezbot als Pixelraster aus Rechtecken in Token-Farben, `aria-hidden="true"` — **die Aussage trägt die figcaption**, nie die Grafik allein. Kennzeichnung im Quelltext-Kommentar: Prototyp/Design-Beleg, keine finale Markenfigur. Keine externen Bilder, keine Bild-APIs, keine Anlehnung an fremde KI-Maskottchen.
- **D-12 Lernpfad statt Blogliste.** Kette Finden → Lesen → Antworten → Erkennen → Handeln, abgebildet auf Seiten 1–5. Hub verlinkt alle fünf (Karten + Kette); jede Shell verlinkt: Hub, die nächste Stufe (1→2→3→4→5→Hub) und zurückhaltend `/website-analyse/`. Kein Jeder-mit-jedem-Linkteppich.
- **D-13 Ein Commit am Schluss.** Brief §27 verlangt einen kohärenten Slice-Commit; der RED-Zwischenstand (Task 2.1/2.2) bleibt ungestaged bis alles grün ist (Slice-1-Präzedenzfall).

### 7.2 Task 2.0 — Vorbereitung Working Tree

**Step 1:** `knowledge/` lokal ausnehmen (Muster aus Slice-1-Korrekturrunde: Session-/Arbeitsmaterial über `.git/info/exclude`, NICHT über das Projekt-.gitignore):

```bash
echo 'knowledge/' >> .git/info/exclude
git status --short
```

Expected: leere Ausgabe. Das Research-Material bleibt lokal liegen und unversioniert.

### 7.3 Task 2.1 — Verify-Gates erweitern (RED)

**Files:** Modify `scripts/verify.mjs`

**Step 1:** In `SEITEN` (Z. 23–30) zwölf Einträge ergänzen, Feld `noindex: true` neu:

```js
  { pfad: 'wissen/index.html',                          lang: 'de', kanonisch: '/wissen/',                          noindex: true, paar: { partner: '/en/knowledge/',                       schalter: 'EN' } },
  { pfad: 'en/knowledge/index.html',                    lang: 'en', kanonisch: '/en/knowledge/',                    noindex: true, paar: { partner: '/wissen/',                            schalter: 'DE' } },
  { pfad: 'wissen/seo-geo-ai-visibility/index.html',    lang: 'de', kanonisch: '/wissen/seo-geo-ai-visibility/',    noindex: true, paar: { partner: '/en/knowledge/seo-geo-ai-visibility/', schalter: 'EN' } },
  { pfad: 'en/knowledge/seo-geo-ai-visibility/index.html', lang: 'en', kanonisch: '/en/knowledge/seo-geo-ai-visibility/', noindex: true, paar: { partner: '/wissen/seo-geo-ai-visibility/',   schalter: 'DE' } },
  { pfad: 'wissen/wie-ki-websites-liest/index.html',    lang: 'de', kanonisch: '/wissen/wie-ki-websites-liest/',    noindex: true, paar: { partner: '/en/knowledge/how-ai-reads-websites/', schalter: 'EN' } },
  { pfad: 'en/knowledge/how-ai-reads-websites/index.html', lang: 'en', kanonisch: '/en/knowledge/how-ai-reads-websites/', noindex: true, paar: { partner: '/wissen/wie-ki-websites-liest/',   schalter: 'DE' } },
  { pfad: 'wissen/answerability/index.html',            lang: 'de', kanonisch: '/wissen/answerability/',            noindex: true, paar: { partner: '/en/knowledge/answerability/',        schalter: 'EN' } },
  { pfad: 'en/knowledge/answerability/index.html',      lang: 'en', kanonisch: '/en/knowledge/answerability/',      noindex: true, paar: { partner: '/wissen/answerability/',              schalter: 'DE' } },
  { pfad: 'wissen/entity-trust/index.html',             lang: 'de', kanonisch: '/wissen/entity-trust/',             noindex: true, paar: { partner: '/en/knowledge/entity-trust/',         schalter: 'EN' } },
  { pfad: 'en/knowledge/entity-trust/index.html',       lang: 'en', kanonisch: '/en/knowledge/entity-trust/',       noindex: true, paar: { partner: '/wissen/entity-trust/',               schalter: 'DE' } },
  { pfad: 'wissen/agent-readiness/index.html',          lang: 'de', kanonisch: '/wissen/agent-readiness/',          noindex: true, paar: { partner: '/en/knowledge/agent-readiness/',      schalter: 'EN' } },
  { pfad: 'en/knowledge/agent-readiness/index.html',    lang: 'en', kanonisch: '/en/knowledge/agent-readiness/',    noindex: true, paar: { partner: '/wissen/agent-readiness/',            schalter: 'DE' } },
```

**Step 2:** Direkt nach dem Canonical-Check (Z. 102–103) den Entwurfsstatus prüfen:

```js
    /* --- Entwurfsseiten: noindex ist Pflicht, Indexfreigabe ein Fehler --- */
    if (eintrag.noindex) {
      if (!html.includes('<meta name="robots" content="noindex">'))
        F(`${seite}: noindex fehlt — Entwurfsseite waere indexierbar`);
      for (const m of html.matchAll(/<meta name="robots" content="([^"]*)">/g)) {
        if (!m[1].includes('noindex'))
          F(`${seite}: robots="${m[1]}" erlaubt Indexierung — Entwurfsstatus verletzt`);
      }
    }
```

*(Korrektur aus dem Quality-Review der Umsetzung: wertbasierte Prüfung statt loser Teilstring-Suche `content="index` — fängt auch `all`/Varianten, keine Fehltreffer aus fremden Attributen.)*

**Step 3:** Den hreflang-Anwesenheitscheck (Z. 105–107, Schleife über `['de','en','x-default']` mit `hreflang="${hl}"`-includes) durch einen **exakten** Check ersetzen — strengere Prüfung, keine Abschwächung. Format gegen dist verifiziert (`<link rel="alternate" hreflang="de" href="https://pixelkiez.de/…">`, übersteht die Minifizierung wörtlich):

```js
      const pfadDe = eintrag.lang === 'de' ? eintrag.kanonisch : eintrag.paar.partner;
      const pfadEn = eintrag.lang === 'en' ? eintrag.kanonisch : eintrag.paar.partner;
      for (const [hl, zielPfad] of [['de', pfadDe], ['en', pfadEn], ['x-default', pfadDe]]) {
        if (!html.includes(`<link rel="alternate" hreflang="${hl}" href="${DOMAIN}${zielPfad}">`))
          F(`${seite}: hreflang="${hl}" zeigt nicht auf ${DOMAIN}${zielPfad}`);
      }
```

**Step 4:** Nach dem Funnel-Einstiegs-Gate (Z. 184–192) drei Entwurfs-Gates ergänzen:

```js
  /* --- Entwurfs-Gates: unveroeffentlichte Wissensseiten duerfen weder in
     der Sitemap noch in llms.txt stehen und von keiner veroeffentlichten
     Seite verlinkt sein. Geprueft gegen dist/ — gegen das, was ausgeliefert
     wuerde, nicht gegen Absichten. Fehlt sitemap.xml oder llms.txt selbst,
     ist DAS der Fehler — ein Gate, das mit der Datei verschwindet, prueft
     nichts. Pfad-Treffer sind verankert (Trennzeichen danach), damit der
     Hub-Pfad /wissen/ nicht jeden Kind-Pfad mit-matcht. --- */
  const entwurfsPfade = SEITEN.filter((s) => s.noindex).map((s) => s.kanonisch);
  if (entwurfsPfade.length) {
    if (!(await existiert(join(ZIEL, 'sitemap.xml')))) F('sitemap.xml fehlt in dist/');
    else {
      const sitemap = await readFile(join(ZIEL, 'sitemap.xml'), 'utf8');
      for (const p of entwurfsPfade) {
        if (sitemap.includes(`${DOMAIN}${p}<`) || sitemap.includes(`${DOMAIN}${p}"`))
          F(`sitemap.xml nennt die Entwurfsseite ${p}`);
      }
    }
    if (!(await existiert(join(ZIEL, 'llms.txt')))) F('llms.txt fehlt in dist/');
    else {
      const llms = await readFile(join(ZIEL, 'llms.txt'), 'utf8');
      for (const p of entwurfsPfade) {
        if (new RegExp(regexEscape(p) + '(?![a-z0-9-])').test(llms))
          F(`llms.txt nennt die Entwurfsseite ${p}`);
      }
    }
    for (const veroeffentlicht of SEITEN.filter((s) => !s.noindex).map((s) => s.pfad)) {
      if (!(await existiert(join(ZIEL, veroeffentlicht)))) continue;
      const html = await readFile(join(ZIEL, veroeffentlicht), 'utf8');
      for (const p of entwurfsPfade) {
        const muster = new RegExp(`(?:href|action)="${regexEscape(p)}(?:#[^"]*)?"`);
        if (muster.test(html))
          F(`${veroeffentlicht}: verlinkt die unveroeffentlichte Wissensseite ${p}`);
      }
    }
  }
```

Dazu ein Helfer oben im Skript (ersetzt auch das bereits doppelt vorhandene Escape-Idiom im EN-Link-Gate): `const regexEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');`

*(Korrekturen aus dem Quality-Review der Umsetzung: (1) Treffer verankert — sonst falsches Rot mit irreführender Meldung, sobald später ein Kind veröffentlicht ist und der Hub Entwurf bleibt; (2) fehlende sitemap.xml/llms.txt ist ein Fehler, kein stilles Überspringen; (3) Entkopplungs-Gate läuft über ALLE veröffentlichten Seiten statt hart über die zwei Startseiten.)*

Damit sind die Brief-Gates abgedeckt: A/B/C (Seiten fehlen → „fehlt in dist/"), D (Sitemap), E (noindex), F (canonical exakt + hreflang exakt), G (Umschalter über `paar`), H (Wurzelabsolut-Regel für Seiten unterhalb der Wurzel greift bereits, gilt automatisch für die neuen Tiefen), I (interner-Verweis-Check greift bereits), J (Startseiten-Entkopplung).

**Step 5:** Run `npm run build && npm run verify`
Expected: Build grün (unverändert), Verify **FAIL mit exakt 12 Fehlern** `… fehlt in dist/` für die zwölf neuen Pfade — und KEINEM weiteren Fehler (die vier Bestandsseiten müssen die exakten hreflang-Checks bestehen; tun sie es nicht, dist-Format ansehen und den Check dem realen Format anpassen — nicht umgekehrt).

**Kein Commit** (D-13).

### 7.4 Task 2.2 — Registry + Sitemap-Skip

**Files:** Modify `scripts/seiten.mjs`, `scripts/build.mjs`

**Step 1:** In `seiten.mjs` die sechs Paare aus D-7 an `SPRACHPAARE` anhängen, jeweils mit `entwurf: true` und `ldTausch: []`. Davor diesen Kommentar:

```js
  /* --- Wissensbereich (Slice 2): Entwuerfe. entwurf:true heisst:
     kein Sitemap-Eintrag (build.mjs ueberspringt sie dort), die Quelle
     traegt noindex, kein llms.txt-Eintrag, keine Startseiten-Verlinkung.
     Die Freigabe eines spaeteren Slices entfernt das Flag und tauscht die
     robots-Meta. ldTausch bleibt leer, solange die Shells kein JSON-LD
     tragen (strukturierte Daten erst mit geprueftem Inhalt). */
```

Eintragsform (die übrigen fünf analog zur D-7-Tabelle):

```js
  {
    quelle: 'wissen/index.html',
    zielDe: 'wissen/index.html',
    zielEn: 'en/knowledge/index.html',
    pfadDe: '/wissen/',
    pfadEn: '/en/knowledge/',
    entwurf: true,
    ldTausch: [],
  },
```

**Step 2:** In `build.mjs` die Sitemap-Schleife (Z. 395) ergänzen:

```js
  for (const paar of SPRACHPAARE) {
    if (paar.entwurf) continue;   // Entwuerfe (noindex) stehen nicht in der Sitemap
```

**Step 3:** Run `npm run build`
Expected: **FAIL** mit ENOENT für `site/wissen/index.html` — Beweis, dass die Registry greift und die Quellen wirklich gebaut würden.

### 7.5 Task 2.3 — CSS: Abschnitt 20 (Wissen + Kiezbot-Szene)

**Files:** Modify `site/assets/css/bds.css` (neuer Abschnitt ans Ende, nach §19)

**Step 1:** §1 (Tokens) und die Muster `channel`, `pruef`, `leiter`, `analyse-fakten` in §19 vollständig lesen — die neuen Regeln benutzen ausschließlich vorhandene Token-Variablen (Farbwerte nie hart kodieren; WCAG AA halten, Akzent als Text nur in der dunklen Abstufung wie überall).

**Step 2:** Neuen Abschnitt anlegen. Struktur (Token-Namen beim Schreiben aus §1 übernehmen):

```css
/* ---------- 20. Wissen + Kiezbot-Szene ------------------------------------
   Editoriale Schicht: Hub /wissen/ und die Wissens-Shells. Baut auf den
   bestehenden Karten- und Leiter-Mustern auf; Neues nur, wo das Vorhandene
   nicht reicht. figure.kiezbot-scene ist das wiederverwendbare Gefaess fuer
   erklaerende Bildszenen; der enthaltene Kiezbot ist ein PROTOTYP als
   Design-Beleg, keine finale Markenfigur. Bewusst keine Animation: jede
   Szene muss im Stillstand vollstaendig verstaendlich sein. */

/* Entwurfs-Hinweis auf jeder Shell — sichtbar ehrlich, solange Inhalte fehlen */
.wissen-status{ /* mono-Schrift klein, Rahmen 1px, Innenabstand, gedaempfte Tinte */ }

/* Platzhalter fuer noch nicht freigegebene Inhalte */
.wissen-platzhalter{ /* gestrichelte Linie links, gedaempfte Tinte */ }

/* Kiezbot-Szene */
.kiezbot-scene{ margin:0; /* Rahmen, Innenabstand, Flaechenfarbe aus Tokens */ }
.kiezbot-scene__bild{ /* zentriert */ }
.kiezbot-scene__bild svg{ display:block; width:100%; height:auto; max-width:640px; margin-inline:auto; }
.kiezbot-scene figcaption{ /* small-Groesse, oben abgesetzt; <b> traegt den Szenentitel */ }

/* Reservierter Bildplatz auf Shells ohne fertige Szene */
.kiezbot-scene--slot .kiezbot-scene__bild{ /* gestrichelter Rahmen, Mindesthoehe ~160px, Hinweistext zentriert */ }

/* Weiterlesen-Reihe: zwei Karten nebeneinander, mobil untereinander */
.wissen-weiter{ display:grid; gap:14px; }
@media(min-width:720px){ .wissen-weiter{ grid-template-columns:1fr 1fr; } }
```

Für Hub-Karten und Lernpfad KEINE neuen Klassen: `pruef`/`channel` (Karten) und `leiter` (Kette) wiederverwenden; vorher prüfen, dass `leiter` mit 5 Einträgen umbricht (§19 lesen) — falls die Spaltenzahl hart auf 4 steht, in §20 eine Variante `.leiter--fuenf` ergänzen statt §19 anzufassen.

### 7.6 Task 2.4 — Die sechs Quellseiten

**Files:** Create `site/wissen/index.html`, `site/wissen/seo-geo-ai-visibility.html`, `site/wissen/wie-ki-websites-liest.html`, `site/wissen/answerability.html`, `site/wissen/entity-trust.html`, `site/wissen/agent-readiness.html`

**Gemeinsamer Kopf** (Muster website-analyse.html Z. 1–35, exakt diese Reihenfolge; Preloads/Stylesheets RELATIV `assets/…` — der Build hasht und schreibt wurzelabsolut um; nur handgeschriebene Navigations-hrefs sind wurzelabsolut):

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>«TITEL» · Pixelkiez Wissen</title>
<meta name="description" content="«BESCHREIBUNG»">
<meta name="theme-color" content="#B6C7C4">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://pixelkiez.de«PFAD_DE»"><!-- hreflang setzt der Build -->

<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="Pixelkiez">
<meta property="og:title" content="«TITEL» · Pixelkiez Wissen">
<meta property="og:description" content="«BESCHREIBUNG»">
<meta property="og:url" content="https://pixelkiez.de«PFAD_DE»">
<meta property="og:image" content="assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Pixelkiez">

<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="/icon-512.png" sizes="512x512">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<link rel="preload" href="assets/fonts/archivo-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/ibm-plex-sans-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/ibm-plex-mono-500-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/bds.css">

<!-- ENTWURF (Slice 2): Content-Shell ohne freigegebene Fakten — noindex,
     nicht in Sitemap oder llms.txt, nicht von der Startseite verlinkt.
     Bewusst KEIN JSON-LD, bis der Inhalt steht: strukturierte Daten sollen
     nie mehr behaupten, als die Seite leistet. -->
</head>
```

**Gemeinsames Gerüst** (Muster website-analyse.html): Skip-Link → Sprite-Teilmenge (benötigte Symbole aus website-analyse.html kopieren: mindestens `i-check`, `i-arrow-ur`, plus je Seite passende aus `i-layout`/`i-search`/`i-radio`/`i-chat`/`i-file`/`i-gate`) → Unterseiten-Header (Brand → `/`, Knopf `btn--sm` „Zur Website-Analyse" `href="/website-analyse/"`, Sprachumschalter `<a class="lang" href="«PFAD_EN»" hreflang="en" lang="en" aria-label="Switch to English" data-lang-switch>EN</a>`) → `<main id="main">` → Footer (wie website-analyse.html Z. 293–303, zusätzlich in der nav ein Link `<a href="/wissen/">Wissen</a>` NUR auf den Wissensseiten selbst) → `<script src="assets/js/bds.js" defer></script>` (kein JS-Neucode; `data-reveal` funktioniert damit, §2 läuft elementgeprüft leer, wo nichts ist).

**Shell-Hauptteil je Kind-Seite** (Reihenfolge bindend — Brief §13):

1. Auftakt: `kicker` = `Wissen · Schritt «N» von 5 — «STUFE»`, H1, `lead` = Kernfrage ausformuliert, danach `<p class="wissen-status" data-reveal>Dieser Beitrag ist in Vorbereitung. Die inhaltlichen Abschnitte werden nach fachlicher Prüfung ergänzt.</p>`
2. „Was Sie hier verstehen werden" — `analyse-fakten`-Liste, 3 Punkte (strukturell, faktenfrei).
3. 3–5 geplante Abschnitte: je `<section class="section">` mit `h2`, EINEM neutralen Orientierungssatz und `<p class="small wissen-platzhalter">Dieser Abschnitt folgt nach fachlicher Prüfung.</p>`
4. Bildplatz: Seite 2 trägt die echte Kiezbot-Szene (Task 2.5); Seiten 1/3/4/5 je einen reservierten Platz:
   ```html
   <figure class="kiezbot-scene kiezbot-scene--slot" data-reveal>
     <div class="kiezbot-scene__bild" aria-hidden="true"><span class="small">Bildszene in Vorbereitung</span></div>
     <figcaption><b>«SZENENTITEL»</b> «EIN SATZ, WAS DIE SZENE SPÄTER ZEIGT»</figcaption>
   </figure>
   ```
5. „Wo steht Ihre eigene Website?" — Bezug zur Analyse, zurückhaltend, ohne behauptete Befunde: ein Satz („Die kostenlose Website-Analyse sieht sich genau diese Fragen an Ihrer Website an.") + Button `href="/website-analyse/"` „Zur Website-Analyse".
6. „Weiterlesen" — `wissen-weiter` mit zwei `channel`-Karten: nächste Stufe + Hub (`/wissen/`, „Zur Übersicht: der ganze Lernpfad").
7. Quellen-Platzhalter: `<p class="small wissen-platzhalter">Belege und Quellen werden mit den geprüften Inhalten ergänzt.</p>`

**Inhalts-Tabelle** (Titel/H1/Kernfrage sind Vorgabe; Formulierungen dürfen beim Schreiben geglättet werden, solange das Research-Gate hält — kein Provider-Name, keine Zahl, kein „immer/nie/kann nicht"):

| Seite | Schritt/Stufe | H1 | Kernfrage (lead) | Geplante Abschnitte (h2) |
|---|---|---|---|---|
| seo-geo-ai-visibility | 1 · Finden | SEO, GEO, AI Visibility: drei Begriffe, drei Fragen | Was unterscheidet klassisches SEO, GEO und AI Visibility — und wie hängen sie zusammen? | Drei Begriffe, drei Fragen · Wo sie sich überschneiden · AI Visibility: Messung, nicht Optimierung · Warum klassische Suche weiter zählt · Was sich beobachten lässt — und was nicht |
| wie-ki-websites-liest | 2 · Lesen | Wie KI eine Website liest | Was sehen Crawler, KI-Suchsysteme und Browser-Agenten, wenn sie eine Website abrufen? | Nicht jeder maschinelle Besucher kommt mit derselben Absicht · Was in der ersten Antwort ankommt · Rendern oder direkt lesen · Informationen finden oder eine Website benutzen · Von technischer Erreichbarkeit zu beobachteter Sichtbarkeit |
| answerability | 3 · Antworten | Answerability: Beantwortet Ihre Website konkrete Fragen? | Kann eine Website Maschinen eine klare, belastbare Antwort auf eine konkrete Kundenfrage geben? | Lesbar ist nicht gleich antwortfähig · Was eine Antwort explizit macht · Kontext und Mehrdeutigkeit · Belege und faktische Stützung · Wie Pixelkiez Answerability einschätzt |
| entity-trust | 4 · Erkennen | Entity Trust: Weiß die Maschine, wer Sie sind? | Können Maschinen Unternehmen, Leistungen, Ort, Personen und Fakten hinter einer Website zuverlässig zuordnen? | Weiß das System, wer Sie sind? · Unternehmen, Ort, Leistungen, Personen · Konsistenz über Quellen hinweg · Strukturierte Daten und externe Bestätigung · Beobachtbar oder erschlossen |
| agent-readiness | 5 · Handeln | Agent-Readiness: Kann eine KI Ihre Website benutzen? | Kann ein KI-Agent eine Website nicht nur lesen, sondern tatsächlich benutzen? | Lesen oder handeln · Navigation und semantische Struktur · Formulare und bedienbare Elemente · Anmeldung und Transaktionen als spätere Reifestufe · Was heute praktikabel ist — und was Experiment bleibt |

Weiterlesen-Kette: 1→2, 2→3, 3→4, 4→5, 5→1 („Der Anfang des Pfads") — plus Hub auf jeder Seite.

**Hub `site/wissen/index.html`:** gleicher Kopf («TITEL» = „Wissen: Sichtbarkeit für Suche, KI und Agenten", «PFAD_DE» = `/wissen/`). Hauptteil:

1. Auftakt: kicker „Pixelkiez Wissen", H1 „Sichtbarkeit verstehen: Suche, KI-Systeme, Agenten", lead: Websites werden heute nicht mehr nur von Menschen und klassischen Suchmaschinen interpretiert — auch KI-Suchsysteme und Agenten rufen sie ab, lesen sie und handeln mit ihnen. Dieser Bereich erklärt, was das für eine Website bedeutet — als zusammenhängender Lernpfad, nicht als Schlagwortsammlung. Danach `wissen-status`-Hinweis (Bereich im Aufbau).
2. Lernpfad: `ol class="leiter"` mit 5 Einträgen — `«01 · Finden»` bis `«05 · Handeln»`, je `h3` = Seitentitel-Kurzform als Link auf die Kind-Seite, `small` = Kernfrage in einem Satz.
3. Karten: `pruef`-Raster mit 5 `channel`-Karten (Icon, verlinkte `h3`, Kernfrage) — Karten und Leiter verlinken dieselben fünf Ziele; das ist gewollt (zwei Einstiege, ein Graph).
4. Zurückhaltender Analyse-Verweis (wie Punkt 5 der Shells).
5. Footer wie oben.

Startseite `site/index.html` wird NICHT angefasst (Invariante; das Verify-Gate aus Task 2.1 Step 4 erzwingt die Entkopplung zusätzlich in dist).

### 7.7 Task 2.5 — Kiezbot-Prototyp auf `wie-ki-websites-liest`

**Files:** Modify `site/wissen/wie-ki-websites-liest.html` (Szene ersetzt dort den `--slot`-Platzhalter, positioniert nach dem ersten geplanten Abschnitt)

```html
<!-- KIEZBOT-PROTOTYP (Slice 2): Design-Beleg fuer das Szenen-Gefaess, keine
     finale Markenfigur. Nur lokale SVG-Primitive, Farben aus den Tokens per
     CSS-Klassen. Die Grafik ist dekorativ (aria-hidden) — die Aussage traegt
     die Bildunterschrift; wer die Grafik nicht sieht, verliert nichts. -->
<figure class="kiezbot-scene" data-reveal>
  <div class="kiezbot-scene__bild" aria-hidden="true">
    <svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round">
      <!-- links: ein Dokument (die Website) -->
      <g class="kb-dok">
        <rect x="24" y="60" width="150" height="180" rx="6"/>
        <rect x="40" y="78" width="80" height="12" rx="2" class="kb-akzent"/>
        <line x1="40" y1="110" x2="158" y2="110"/><line x1="40" y1="128" x2="158" y2="128"/>
        <line x1="40" y1="146" x2="130" y2="146"/><line x1="40" y1="176" x2="158" y2="176"/>
        <line x1="40" y1="194" x2="158" y2="194"/><rect x="40" y="212" width="60" height="16" rx="3"/>
      </g>
      <!-- Mitte: Kiezbot als Pixelraster (Prototyp) -->
      <g class="kb-bot">
        <rect x="284" y="118" width="12" height="12"/><rect x="296" y="118" width="12" height="12"/><rect x="308" y="118" width="12" height="12"/><rect x="320" y="118" width="12" height="12"/><rect x="332" y="118" width="12" height="12"/>
        <rect x="284" y="130" width="12" height="12"/><rect x="332" y="130" width="12" height="12"/>
        <rect x="284" y="142" width="12" height="12"/><rect x="296" y="142" width="12" height="12" class="kb-akzent"/><rect x="320" y="142" width="12" height="12" class="kb-akzent"/><rect x="332" y="142" width="12" height="12"/>
        <rect x="284" y="154" width="12" height="12"/><rect x="332" y="154" width="12" height="12"/>
        <rect x="284" y="166" width="12" height="12"/><rect x="296" y="166" width="12" height="12"/><rect x="308" y="166" width="12" height="12"/><rect x="320" y="166" width="12" height="12"/><rect x="332" y="166" width="12" height="12"/>
        <rect x="308" y="100" width="12" height="12" class="kb-akzent"/>
      </g>
      <!-- Verbindungen -->
      <g class="kb-linie">
        <path d="M174 150 H 278"/>
        <path d="M350 150 H 400 M400 150 C 430 150 430 84 460 84"/>
        <path d="M400 150 H 460"/>
        <path d="M400 150 C 430 150 430 216 460 216"/>
      </g>
      <!-- rechts: drei Lesarten desselben Dokuments -->
      <g class="kb-lesart">
        <rect x="464" y="48" width="152" height="72" rx="6"/>
        <rect x="478" y="62" width="52" height="30" rx="3" class="kb-akzent"/><line x1="540" y1="68" x2="602" y2="68"/><line x1="540" y1="84" x2="602" y2="84"/><line x1="478" y1="104" x2="602" y2="104"/>
        <rect x="464" y="132" width="152" height="52" rx="6"/>
        <line x1="478" y1="148" x2="602" y2="148"/><line x1="478" y1="162" x2="580" y2="162"/><line x1="478" y1="176" x2="602" y2="176"/>
        <rect x="464" y="196" width="152" height="72" rx="6"/>
        <rect x="478" y="210" width="124" height="16" rx="3"/><rect x="478" y="234" width="124" height="16" rx="3"/><rect x="478" y="258" width="56" height="0"/>
      </g>
    </svg>
  </div>
  <figcaption>
    <b>Szene 1 — Ein Dokument, mehrere Lesarten.</b>
    Verschiedene maschinelle Besucher können unterschiedliche Darstellungen derselben Website erhalten: gerendert mit Layout, als reiner Text oder als strukturierte Felder. Welche Lesart ankommt, entscheidet mit darüber, was von einer Website verstanden wird.
  </figcaption>
</figure>
```

In §20 dazu die Strichklassen (Token-Farben): `.kiezbot-scene__bild [class^="kb-"]{stroke:…}` / `.kb-akzent{fill:…}` — Konturen in Tinte, Akzentflächen in der Akzentfarbe, Hintergrund transparent. Beim Umsetzen frei nachjustieren (Abstände, Rundungen); die Struktur „1 Dokument → Kiezbot → 3 Lesarten" ist die Vorgabe. Keine Animation, kein Text IM SVG (Übersetzbarkeit + Zugänglichkeit: alles Sprachliche steht in figcaption).

### 7.8 Task 2.6 — Übersetzungen

**Step 1:** Run `npm run i18n` → neue Keys (erwartet grob 120–200) mit leerem Wert in `site/i18n/en.json`.
**Step 2:** Alle neuen Werte füllen. Idiomatisch, Begriffe: „AI visibility", „answerability", „entity trust", „agent readiness". Fachbegriffe, die deutsch = englisch sind („Answerability", „Entity Trust", „Kiezbot" …), als Selbst-Zuordnung eintragen (Wert = Key) — KEINE Änderung an der UNVERAENDERT-Liste in i18n.mjs nötig. `en.js.json` bleibt unberührt (kein neuer JS-String).
**Step 3:** Run `npm run build` — Expected: rot, solange ein Wert leer ist; danach grün. Die EN-Gegenproben des Builds (Umlaute, deutsche Restwörter) müssen ohne Sonderbehandlung bestehen.

### 7.9 Task 2.7 — Gates, Beweise, Browser

**Step 1:** Run `npm run build && npm run verify`
Expected: beide GRÜN; Verify listet 18 Seiten (6 alt + 12 neu).

**Step 2:** Deterministische dist-Beweise (Ausgaben wörtlich ins Handoff):

```bash
grep -c 'wissen\|knowledge' dist/sitemap.xml || echo LEER            # Erwartung: 0/LEER
for f in dist/wissen/index.html dist/wissen/*/index.html dist/en/knowledge/index.html dist/en/knowledge/*/index.html; do printf '%s %s\n' "$f" "$(grep -c 'content="noindex"' "$f")"; done   # Erwartung: 12 Zeilen, je 1
grep -cE '(href|action)="/(wissen|en/knowledge)' dist/index.html dist/en/index.html || echo ENTKOPPELT   # Erwartung: je 0
grep -c 'wissen\|knowledge' dist/llms.txt || echo LEER               # Erwartung: 0/LEER
```

**Step 3:** `npm run serve` (Hintergrund) und ECHTE Browser-Verifikation (Chrome, 1440×900 / 768×1024 / 390×844) auf: `/wissen/`, allen fünf Kind-Seiten, `/en/knowledge/` und mindestens `/en/knowledge/how-ai-reads-websites/`. Prüfen: kein horizontaler Overflow (innerWidth == scrollWidth), Hierarchie/Karten lesbar, Kiezbot-Szene korrekt skaliert, Weiterlesen-Links und Analyse-CTA führen richtig, Sprachumschalter beidseitig korrekt, Konsole leer, keine gebrochenen Requests. Nur behaupten, was wirklich im Browser lief (Slice-1-Regel; 390er-Breite ggf. wieder per CDP-setViewport, siehe Korrekturrunde 1 Punkt 4).

### 7.10 Task 2.8 — Claim-Audit (vor dem Commit)

```bash
grep -rniE '(chatgpt|claude|gemini|perplexity|copilot|googlebot|gptbot|bingbot|openai|anthropic|cloudflare|llms\.txt|[0-9]+ ?%|prozent|garant|immer|niemals|(kann|koennen|können) nicht)' site/wissen/
```

Erwartung: **keine Ausgabe** (Exit 1). Jeder Treffer wird entfernt oder in einen späteren, research-freigegebenen Slice verschoben — es gibt keine „erklärbaren" Treffer in den Shells. Zusätzlich Sichtprüfung der sechs Quellen auf Zahlen, Daten, Ranking-/Traffic-/Conversion-Aussagen und Garantie-Ton.

### 7.11 Task 2.9 — Log, Commit, Handoff

**Step 1:** Abschnitt „Slice 2 — Log" unten anfügen (Base/Head-SHA, Dateien, Routen, Gate-Ergebnisse, Browser-Beweise, Abweichungen, offene Fragen). Frühere Slice-Einträge unangetastet lassen.
**Step 2:** `git status --short` + `git diff` vollständig durchsehen: kein `dist/`, kein `knowledge/`, kein `site/index.html`-Diff, nichts Unbeteiligtes.
**Step 3:** EIN Commit, Message im Stil der Historie, z. B.: `Analyse-Funnel Slice 2: Wissensbereich als Entwurf — Hub, fünf Shells, Kiezbot-Szene (noindex, ohne Sitemap)`. NICHT pushen, nicht mergen, nicht deployen.
**Step 4:** SLICE_HANDOFF im Pflichtformat des Briefs ausgeben (slice/status, repository, external_gate, baseline, implemented, knowledge_routes, indexing, service_architecture, kiezbot, changed_files, validation, browser, claim_audit, git, architecture_decisions, truth_and_limits, open_questions, risks, recommended_next_slice, CLAUDE_CONTEXT, REVIEW_REQUEST) — Werte aus den realen Kommando-Ausgaben, nicht aus dem Gedächtnis. Danach STOP; Slice 3 (Research-Inhalte, Indexierung, Sitemap, Startseiten-Navigation) beginnt erst nach externer Freigabe.

### 7.12 Offene Fragen an den Review (blockieren Slice 2 nicht)

- O-6: EN-Familie `/en/knowledge/` mit übersetztem Slug für Seite 2 (D-8) — bestätigen, bevor die Seiten indexierbar werden (Umbenennen ist vor der Freigabe billig, danach teuer).
- O-7: Schrittfolge des Lernpfads (Finden→Lesen→Antworten→Erkennen→Handeln) und die deutsche Stufenbenennung — redaktionell OK?
- O-8: `wissen-status`-Hinweis („in Vorbereitung") auf den Shells — gewünschte Formulierung fürs externe Review?

### Slice 2 — Log, implementiert 2026-08-31, wartet auf externen Review

- Base SHA: `e5cfc4a2a11000fa83bc3ff2220159f5c3966d92` · Head SHA: siehe `git log` (Commit nach diesem Log-Update) · Branch `feat/pxk-self-service-analysis-funnel`
- Gate-Stand: SLICE_1_EXTERNAL_REVIEW = PASS (Nutzer, 2026-08-31). Baseline vor Beginn: build ✅ verify ✅ (6 Seiten).
- **Geänderte/neue Dateien:**
  - `scripts/verify.mjs` — 12 Entwurfsseiten in der SEITEN-Tabelle (`noindex: true`); noindex-Gate (Exakt-String + wertbasierte robots-Prüfung); hreflang-Prüfung von Anwesenheit auf exakte Zieladressen verschärft; `regexEscape`-Helfer; Entwurfs-Gates: sitemap.xml (Treffer per Trennzeichen verankert), llms.txt (Lookahead gegen Präfix-Bluten), Verlinkungs-Gate über ALLE veröffentlichten Seiten; fehlende sitemap.xml/llms.txt sind jetzt selbst Fehler
  - `scripts/seiten.mjs` — 6 Sprachpaare mit `entwurf: true`, `ldTausch: []`; Doku des Flags (nur Sitemap-Skip automatisch, Rest erzwingt verify)
  - `scripts/build.mjs` — eine Zeile: Sitemap-Schleife überspringt `entwurf`-Paare
  - `site/wissen/` NEU — `index.html` (Hub: Lernpfad-Leiter 01–05, 5 Karten, Analyse-Hinweis) + 5 Shells (Auftakt mit Schritt-Kicker, „Was Sie hier verstehen werden", 5 geplante Abschnitte mit je einem Orientierungssatz + Platzhalter, Bildplatz, Analyse-CTA, Weiterlesen-Kette 1→2→3→4→5→1 + Hub, Quellen-Platzhalter). Alle Seiten: noindex, KEIN JSON-LD, kein Jahr im Footer, Kommentar „Maschinenlisten" statt des wörtlichen Dateinamens (Claim-Grep-Sauberkeit)
  - `site/assets/css/bds.css` — §20 (+71 Zeilen): wissen-status, wissen-platzhalter, kiezbot-scene (+ --slot, kb-*-Strichklassen, `.leiter h3 a`-Affordanz, wissen-weiter); nur Token-Farben, keine Animation
  - `site/i18n/en.json` — 140 neue Übersetzungen (443 gesamt, 303 unverändert; 1 Eintrag nur Komma/Position). „Wissen" → „Knowledge" passend zur URL-Familie
- **Kiezbot:** Prototyp-Szene „Ein Dokument, mehrere Lesarten" auf wie-ki-websites-liest — inline-SVG (Dokument → Pixelraster-Bot → drei Lesarten), aria-hidden, Aussage in der figcaption, im Quelltext als Prototyp/kein finales Markenzeichen markiert. Kein Drittanbieter-Asset, keine Animation.
- **Gates:** TDD eingehalten — verify zuerst rot (exakt 12 × „fehlt in dist/", kein weiterer Fehler), Registry-RED per ENOENT belegt, Entwurfs-Gates per Canary einmal rot gesehen (Verankerung bewiesen: injizierter Hub-Pfad meldete NICHT die Kinder). Endstand: `npm run build` GRÜN (18 Seiten) · `npm run verify` GRÜN. dist-Beweise: sitemap.xml 6 `<loc>`, 0 × wissen/knowledge · 12 Seiten je 1 × `content="noindex"` · Startseiten DE+EN 0 Links auf Entwürfe · llms.txt 0 Treffer.
- **Browser-verifiziert:** Chrome (echte Sitzung, 127.0.0.1:8080) Desktop 1440 alle 6 DE + EN-Hub + EN-Kind: Umschalter, CTA-Ziele (`/en/website-analyse/` auf EN), Kiezbot-Szene, Hub-Leiter — keine Konsolenfehler. Responsive per Puppeteer-core/CDP-setViewport (Scratchpad, Chrome installiert): 8 Seiten × 1440/768/390 = 24 Kombis, innerWidth == scrollWidth überall, 0 Konsolenfehler, 0 gescheiterte Requests; Screenshots 390/768 gesichtet (Szene skaliert, Status-Box umbricht sauber).
- **Beobachtung (kein Slice-2-Defekt):** In einem frischen Automations-Tab feuert der Reveal-IntersectionObserver beim allerersten Seitenaufruf nicht (Inhalte bleiben opacity 0 bis zum ersten Scroll); identisch auf der extern reviewten Bestandsseite /website-analyse/ reproduziert, nach Reload überall korrekt. Einordnung: Automations-/First-Load-Artefakt derselben Familie wie der in efb7d69 behobene Partikel-Fall; auf echten Erstbesuchen nicht nachgewiesen. Fürs Review notiert.
- **Vorbestehender Befund (außerhalb Slice-Scope, nicht angefasst):** Die EN-Fehlermeldung des Kontaktformulars ist halb übersetzt (bds.js:1412 f. — drei String-Literale, en.js.json übersetzt nur das erste; auf der EN-Startseite sichtbar bei fehlgeschlagenem Versand; auf den Wissensseiten toter Code). Empfehlung: eigener kleiner Fix-Slice.
- **Abweichungen vom Plan:** Quality-Review-Korrekturen in verify.mjs (Verankerung, fehlende-Datei-Fehler, wertbasierte robots-Prüfung, Gate über alle veröffentlichten Seiten) wurden in Abschnitt 7.3 zurückgeschrieben — Plan und Code stimmen überein. Kein `.leiter--fuenf` nötig (Leiter ist 2-spaltig). Kein twitter:*-Block auf Entwürfen (Head-Parität vor Freigabe prüfen).
- **Claim-Audit:** Quellen `site/wissen/` 0 Treffer (Provider, Zahlen, Jahre, Garantie-/Absolutwörter; einzige Grep-Ausnahme: SVG-Namespace-URI). en.json: „What can be observed — and what cannot." als epistemische Messgrenzen-Aussage eingestuft (deutsches Original „— und was nicht"), kein Plattform-Claim.
- **Arbeitsumgebung:** `knowledge/` (Research-Rohmaterial) bleibt unversioniert, lokal über `.git/info/exclude` ausgenommen (Muster aus Slice-1-Korrekturrunde).
- **Offen für Review:** O-6 (EN-Slugs), O-7 (Stufenbenennung), O-8 (Status-Wortlaut) + die zwei Beobachtungen oben.
- **Nächster Slice:** 3 — erste research-freigegebene Inhalte; erst nach externer Freigabe. Indexierung, Sitemap, llms.txt und Startseiten-Navigation bleiben bis dahin unangetastet.
