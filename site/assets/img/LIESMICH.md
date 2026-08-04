# Bilder

Hier hinein gehören Logo, Favicon und das Vorschaubild für geteilte Links.
Der Build kopiert diesen Ordner mit Inhalts-Hash nach `dist/assets/img/`.

## Was gebraucht wird

| Datei | Format | Maße | Wofür |
|---|---|---|---|
| `logo.svg` | SVG, einfarbig oder zweifarbig | beliebig, quadratisch oder breit | Kopfbereich und Footer |
| `og.png` | PNG oder JPG | **1200 × 630** | Vorschaubild beim Teilen (WhatsApp, LinkedIn, Slack) |
| `favicon.svg` | SVG, quadratisch | 32 × 32 Zeichenfläche | Browser-Tab |

## Hinweise

**SVG ist die erste Wahl** für Logo und Favicon: beliebig scharf, wenige
Kilobyte, und die Farben lassen sich per CSS an den hellen und den dunklen
Hintergrund anpassen. Ein PNG funktioniert auch, braucht dann aber die
doppelte Auflösung für scharfe Darstellung auf Retina-Displays.

**Das Vorschaubild muss ein Rasterbild sein.** WhatsApp, LinkedIn und Slack
zeigen kein SVG an. 1200 × 630 ist das Format, das alle drei erwarten.

**Keine Schrift ins Logo einbetten**, wenn es als SVG kommt: Der Text muss in
Pfade umgewandelt sein, sonst hängt die Darstellung davon ab, ob die Schrift
auf dem Gerät des Besuchers vorhanden ist. In den meisten Programmen heißt
das „Text in Pfade umwandeln" oder „Schrift konvertieren".

Sobald die Dateien hier liegen, verdrahte ich sie.
