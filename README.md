# Berlin Digital Systems — Website

Statische Website, ohne Build-Step und ohne npm-Abhängigkeiten. Ausgeliefert
wird der Ordner `site/` unverändert.

## Struktur

```
site/
  index.html            Startseite (Abschnitte 01–09)
  impressum.html        Rechtsseite — Inhalte ausstehend
  datenschutz.html      Rechtsseite — technische Abschnitte fertig, Angaben ausstehend
  assets/css/bds.css    Designsystem und alle Komponenten
  assets/css/fonts.css  @font-face, lokal
  assets/js/bds.js      Interaktion, keine Bibliotheken
  assets/fonts/         Archivo, IBM Plex Sans, IBM Plex Mono (SIL OFL, selbst gehostet)
```

Die drei Markdown-Dateien in der Wurzel sind **interne Unterlagen** (Vision,
Bauplan, Leistungs-Content) und gehören nicht ins Web-Root.

## Lokal ansehen

```bash
cd site && python3 -m http.server 8747
```

## Deployment

Railway baut über das `Dockerfile`: Caddy liefert `site/` aus und hört auf den
von Railway gesetzten `$PORT`. Konfiguration in `Caddyfile`.

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
- **Formular-Backend** — `ENDPOINT` in `assets/js/bds.js` ist leer. Solange es
  leer ist, öffnet das Formular das E-Mail-Programm des Besuchers; nichts geht
  an einen Server. Sobald dort eine URL steht, ändert sich der Übertragungsweg
  und die Datenschutzerklärung muss angepasst werden.
- **Preis** — im Hero steht „ab 995,–“. Der Wert stammt nicht aus dem
  Content-Dokument und ist vor dem Livegang zu bestätigen.
