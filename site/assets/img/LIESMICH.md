# Bilder

Hier hinein gehören Logo, Favicon und das Vorschaubild. Der Build kopiert
diesen Ordner mit Inhalts-Hash nach `dist/assets/img/`.

## Stand

| Datei | Format | Maße | Wofür | Stand |
|---|---|---|---|---|
| `logo.png` | PNG, Graustufe + Alpha | 980 × 240 | Kopf, Fußzeile, Auftakt, Rechtsseiten | liegt, aus `quelle/PixelKiez-2000.png` freigestellt |
| `og.png` | PNG | 1200 × 630 | Vorschau, wenn jemand den Link verschickt | liegt, wird beim Logowechsel neu gesetzt |
| `logo.svg` | SVG | beliebig | ersetzt `logo.png`, sobald vorhanden | **fehlt, wäre besser** |

Solange nur ein PNG vorliegt, begrenzt dessen echte Breite, wie groß der
Schriftzug im Auftakt werden kann. Bei 980 Pixeln ist bei rund 680 CSS-Pixeln
Schluss, darüber wird nur noch weichgerechnet. Mit einem SVG fiele diese
Grenze weg.

**Neues Logo einsetzen:** Datei nach `quelle/` legen und Bescheid geben. Sie
wird freigestellt, auf Graustufe mit Alpha gebracht und an allen vier Stellen
verdrahtet. Direkt `logo.png` überschreiben geht auch, dann muss sie aber
schon freigestellt und beschnitten sein, sonst stimmen die Maßangaben im
Markup nicht mehr.

## Warum das Vorschaubild bei Instagram weniger zählt

Instagram zeigt Linkvorschauen nur an einer Stelle: wenn jemand die Adresse
**in einer Direktnachricht** verschickt. In Beiträgen sind Links gar nicht
anklickbar, und beim Link in der Biografie tippen Besucher direkt durch,
ohne Vorschau.

Wichtig ist das Bild trotzdem, nur eben nicht für Instagram selbst: Es
erscheint überall sonst, wo die Adresse auftaucht — in einer E-Mail-Signatur,
in einer Nachricht, in Suchergebnissen. Ohne Bild steht dort nur der graue
Kasten mit dem Domainnamen.

## Was nicht hierher gehört

Das **Instagram-Profilbild** ist eine Sache von Instagram, nicht der Website.
Es braucht ein Quadrat, mindestens 320 × 320, besser 1080 × 1080, und wird
rund beschnitten. Legen Sie dafür eine eigene Datei an, das Website-Logo
passt dort meist nicht ohne Anpassung hinein.

## Hinweise zum Format

**SVG ist die erste Wahl** für Logo und Favicon: beliebig scharf, wenige
Kilobyte, und die Farben lassen sich per CSS an hellen wie dunklen Grund
anpassen. Ein PNG geht auch, braucht dann aber die doppelte Auflösung, damit
es auf Retina-Displays scharf bleibt.

**Schrift im SVG muss in Pfade umgewandelt sein.** Sonst hängt die
Darstellung davon ab, ob die Schrift auf dem Gerät des Besuchers liegt. In
den meisten Programmen heißt das „Text in Pfade umwandeln" oder „Schrift
konvertieren".

**Das Vorschaubild muss ein Rasterbild sein** — SVG wird dort nirgends
angezeigt.

Sobald die Dateien hier liegen, werden sie verdrahtet.
