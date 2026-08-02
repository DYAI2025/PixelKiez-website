# Berlin Digital Systems — Website

Statische Website mit Build-Schritt. Bearbeitet wird `site/`, ausgeliefert
wird `dist/`. Die Auslieferung lädt CSS und JavaScript nicht nach, sondern
trägt beides eingebettet — pro Seite genügt eine Antwort.

## Struktur

```
site/                     Quelle — hier wird gearbeitet
  index.html              Startseite (Abschnitte 01–09)
  impressum.html          Rechtsseite — Inhalte ausstehend
  datenschutz.html        Rechtsseite — Angaben ausstehend
  assets/css/bds.css      Designsystem und alle Komponenten
  assets/css/fonts.css    @font-face, lokal
  assets/js/bds.js        Interaktion, keine Bibliotheken
  assets/fonts/           Archivo, IBM Plex Sans, IBM Plex Mono (SIL OFL)

scripts/
  build.mjs               Build inkl. Selbstprüfung je Seite
  verify.mjs              Abnahme des fertigen dist/-Baums
  serve.mjs               dist/ lokal ansehen, mit Auslieferungs-Kopfzeilen

dist/                     Ergebnis — nicht im Repo, wird erzeugt
```

Die drei Markdown-Dateien in der Wurzel sind **interne Unterlagen** (Vision,
Bauplan, Leistungs-Content) und gehören nicht ins Web-Root.

## Befehle

```bash
npm install         # einmalig
npm run build       # site/ → dist/
npm run verify      # dist/ abnehmen (Exit 1 bei Fehlern)
npm run serve       # dist/ auf http://localhost:8080 ansehen
npm run clean       # dist/ löschen
```

Vor einem Deploy: `npm run build && npm run verify`.

## Was der Build macht

1. **Schriften bekommen einen Inhalts-Hash** im Dateinamen
   (`archivo-var-latin.7150c0ec.woff2`). Ändert sich eine Schrift, ändert
   sich ihr Name — deshalb dürfen sie ein Jahr unveränderlich zwischen­
   gespeichert werden.
2. **CSS wird zusammengelegt, minifiziert und eingebettet.** Die `url()`-Pfade
   werden dabei von `../fonts/` auf `assets/fonts/` umgeschrieben, weil die
   eingebettete Fassung im Dokumentwurzel steht.
3. **JavaScript wird minifiziert und eingebettet**, an genau der Stelle, an
   der vorher `<script defer>` stand: als letztes Element vor `</body>`. Das
   Skript ist eine IIFE ohne `readyState`-Abfrage, damit ist das gleichwertig.
4. **HTML wird minifiziert** — bewusst vorsichtig. Zwei Schalter sind nicht
   optional: `caseSensitive` (sonst verlieren `viewBox`, `startOffset` und
   `preserveAspectRatio` ihre Wirkung und das SVG-Sprite ist zerstört) und
   `conservativeCollapse` (bewahrt Wortabstände zwischen Inline-Elementen).

Der Build **bricht ab**, wenn eine Einbettung fehlschlägt: übrig gebliebene
`<link>`/`<script src>`, unaufgelöste Schriftpfade, syntaktisch ungültiges
eingebettetes Skript, zerstörtes JSON-LD oder kleingeschriebene SVG-Attribute.

## Wirkung

| | vorher | Build |
|---|---|---|
| Anfragen beim Erstaufruf | 8 | 5 |
| Übertragung Startseite | 258 KB | 226 KB |
| Startseite komprimiert | 17,0 KB + 21,3 KB Mittel | 28,5 KB |

Nur 4 der 8 Schriften werden geladen — `unicode-range` hält die
`latin-ext`-Varianten zurück, bis entsprechende Zeichen vorkommen.

Der Preis: die Folgeseiten tragen das CSS erneut (Impressum 2,9 → 10,8 KB
komprimiert), weil es nicht mehr getrennt zwischengespeichert wird.

## Kontaktformular

Der Weg vom Formular ins Postfach:

```
Besucher → POST /api/kontakt → Caddy → Formulardienst (api/) → SMTP → Postfach
```

Der Dienst in `api/` nimmt die Anfrage als JSON entgegen, prüft sie und stellt
sie per SMTP zu. **Gespeichert wird nichts** — die Anfrage wird weitergereicht
und verworfen. Absender ist das eigene Postfach, `Reply-To` die Adresse des
Interessenten: ein Klick auf „Antworten“ geht damit direkt an ihn.

Fällt der Dienst aus, zeigt das Formular die E-Mail-Adresse zum direkten
Anschreiben und behält die Eingaben. Es geht nichts lautlos verloren.

**Schutzmaßnahmen:** Honeypot-Feld, Ratenbegrenzung (5 Anfragen je IP in
10 Minuten), Größenbegrenzung (16 KB), Längenbegrenzung je Feld, Entfernung
aller Zeilenumbrüche vor dem Einsetzen in Kopfzeilen (sonst ließe sich über
den Namen ein fremdes `Bcc:` einschleusen), TLS-Zwang beim Versand.

### Einzurichten

Umgebungsvariablen des Formulardienstes — **keine davon gehört in den Code**:

| Variable | Beispiel | Bedeutung |
|---|---|---|
| `SMTP_HOST` | `smtp.ionos.de` | Postausgangsserver der eigenen Mail-Domain |
| `SMTP_PORT` | `465` | 465 implizites TLS, 587 STARTTLS |
| `SMTP_SECURE` | *(leer)* | nur setzen, wenn der Anbieter vom Portschema abweicht |
| `SMTP_USER` | `website@ihre-domain.de` | Postfach, über das versendet wird |
| `SMTP_PASS` | *(Kennwort)* | dazugehöriges Kennwort |
| `MAIL_TO` | `kontakt@ihre-domain.de` | wohin die Anfragen gehen |
| `MAIL_FROM` | `website@ihre-domain.de` | Absender, muss zur SMTP-Domain passen (sonst scheitert SPF) |

Am Webdienst zusätzlich `API_UPSTREAM` auf den Formulardienst im privaten
Netz zeigen lassen, z. B. `bds-api.railway.internal:3000`.

Solange `SMTP_HOST` oder `MAIL_TO` fehlt, läuft der Dienst im **Trockenlauf**:
Er nimmt an, prüft und protokolliert, versendet aber nicht. `/api/health`
zeigt den Modus an.

## Deployment

Zwei Dienste:

1. **Website** — `Dockerfile` in der Wurzel, zweistufig: Stufe 1 führt
   `npm ci && npm run build` aus, Stufe 2 kopiert nur `dist/` in ein
   Caddy-Image. Node und `node_modules` landen nicht in der Auslieferung.
   Caddy liefert die Seite aus und reicht `/api/*` an den Formulardienst
   weiter — dadurch ist es für den Browser dieselbe Herkunft wie die Seite,
   ohne CORS und ohne zweite Domain.
2. **Formulardienst** — `api/Dockerfile`, eigener Dienst. Getrennt, damit ein
   Ausfall des Mailwegs die Website nicht mitnimmt.

## Designsystem

| Rolle | Wert |
|---|---|
| Hauptfarbe | `#B6C7C4` |
| Schwarz | `#0E1413` |
| Nebenfarbe | `#EC5D43` |
| Nebenfarbe als Text | `#8F2410` (hält 4,5:1 auf der Hauptfarbe) |
| Display / Fließtext / Label | Archivo · IBM Plex Sans · IBM Plex Mono |

Alle Textkontraste erfüllen WCAG AA. Wer Farben ändert, prüft das nach.

## Offene Punkte vor dem Livegang

- **Rechtstexte** — Impressum und Datenschutz enthalten `[FREIGABE AUSSTEHEND]`.
  Ohne vollständiges Impressum ist eine gewerbliche Seite in Deutschland
  abmahnfähig (§ 5 DDG).
- **Domain** — Canonical, Open Graph und JSON-LD zeigen auf den Platzhalter
  `berlin-digital-systems.de`.
- **SMTP-Zugang** — der Formulardienst läuft bis zum Setzen von `SMTP_HOST`
  und `MAIL_TO` im Trockenlauf und versendet nichts. Ohne diese Angaben
  erreicht Sie keine Anfrage.
- **Datenschutzerklärung, Abschnitt 4** — trägt `[ENTWURF — VOR LIVEGANG
  RECHTLICH PRÜFEN]`. Zu ergänzen sind Hosting-Anbieter als Auftragsverarbeiter
  (Art. 28 DSGVO), gegebenenfalls die Grundlage einer Drittlandübermittlung,
  der E-Mail-Anbieter und eine konkrete Speicherfrist.
- **Preis** — im Hero steht „ab 995,–". Der Wert stammt nicht aus dem
  Content-Dokument und ist vor dem Livegang zu bestätigen.
