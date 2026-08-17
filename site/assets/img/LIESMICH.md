# Bilder

Hier hinein gehören Logo, Favicon und das Vorschaubild. Der Build kopiert
diesen Ordner mit Inhalts-Hash nach `dist/assets/img/`.

## Stand

| Datei | Format | Maße | Wofür | Stand |
|---|---|---|---|---|
| `logo.webp` | WebP verlustfrei, Graustufe + Alpha | 980 × 240 | Kopf, Fußzeile, Auftakt, Rechtsseiten | liegt, aus `quelle/PixelKiez-2000.png` freigestellt |
| `logo-suche.png` | PNG | 2000 × 2000 | Firmenlogo für Google, im JSON-LD als `#logo` | Übergangsfassung, siehe unten |
| `og.png` | PNG | 1200 × 630 | Vorschau, wenn jemand den Link verschickt | liegt, wird beim Logowechsel neu gesetzt |
| `favicon-32x32.png` | PNG | 32 × 32 | Browser-Tab und Suchergebnis | liegt, **für Google zu klein**, siehe unten |
| `logo.svg` | SVG | beliebig | ersetzt `logo.webp`, sobald vorhanden | **fehlt, wäre besser** |

## Das Logo, das Google rechts anzeigt

Zuständig ist der Knoten `#logo` im JSON-LD von `index.html` — ein
`ImageObject` mit `url`, `contentUrl`, `width`, `height`. Google holt das Bild
dort und setzt es rechts ins Wissensfeld, sofern zu dieser Domain überhaupt
eines entsteht. Das Markup ist die Voraussetzung, nicht die Garantie: ob ein
Wissensfeld erscheint, entscheidet Google anhand der Entität. Der praktische
Weg dorthin führt über ein bestätigtes Google-Unternehmensprofil mit
identischer Anschrift und Adresse — die steht dafür sichtbar in der Fußzeile
und nicht nur im Impressum.

Bedingungen an die Datei:

- **frei abrufbar und crawlbar.** Kein Login, kein Signed-URL mit Ablauf. Wird
  die Datei aus einem Bucket ausgeliefert, muss die `robots.txt` **dieser
  Hostadresse** den Abruf erlauben — die von `pixelkiez.de` gilt dort nicht.
- **mindestens 112 × 112 Pixel**, besser deutlich mehr.
- **möglichst quadratisch.** Das Wissensfeld schneidet quadratisch zu. Eine
  breite Wortmarke verliert dabei entweder die Enden oder steht in einem
  Rahmen, der oben und unten leer bleibt.
- Rasterformat. SVG wird dort nicht angezeigt.

**Was gebraucht wird:** ein quadratisches Zeichen, keine Wortmarke — ein
Monogramm oder das Pixelmotiv, das den Rahmen wirklich füllt. Die Wortmarke
ist 4,1 : 1 breit; im Quadrat bleiben rechnerisch 60 % der Höhe leer, ganz
egal wie groß man sie zieht.

**Übergangsfassung.** `logo-suche.png` trug die Wortmarke bis August in
Originalgröße mitten auf einer 2000er Fläche — sie füllte 49 % der Breite und
12 % der Höhe, das Bild wirkte klein und leer. Jetzt ist sie auf 86 % der
Breite gezogen. Das ist das Maximum, das mit einer Wortmarke geht, und bleibt
ein Behelf, bis ein quadratisches Zeichen vorliegt.

**Aus einem Railway-Bucket ausliefern:** im Knoten `#logo` `url` und
`contentUrl` auf die öffentliche Bucket-Adresse setzen, `width` und `height`
auf die echten Maße. Der Build lässt fremde Adressen unangetastet; nur
Adressen unter `pixelkiez.de/assets/img/` bekommen einen Inhalts-Hash. Zwei
Dinge dabei im Blick behalten: die Bucket-Adresse ändert sich, wenn der Bucket
neu angelegt wird, und die `robots.txt` des Bucket-Hosts liegt nicht in
eigener Hand. Bricht die Adresse weg, fällt das Logo still aus — der Seite
sieht man davon nichts an.

## Das Favicon ist für Google zu klein

Neben dem Suchergebnis steht nicht das Firmenlogo, sondern das Favicon. Google
verlangt dafür **48 × 48 Pixel oder ein Vielfaches davon** (96, 144, 192).
`favicon-32x32.png` liegt darunter und wird deshalb möglicherweise ignoriert —
dann steht dort ein grauer Platzhalter. Sobald das neue Logo vorliegt, gehört
daraus ein Favicon in 192 × 192 abgeleitet und zusätzlich verdrahtet.

Die Wortmarke lag bis August als PNG vor (14,2 KB). Verlustfrei nach WebP
gepackt sind es 8,5 KB — dieselben Bildpunkte, derselbe Alphakanal (Punkt für
Punkt nachgemessen), 39 % weniger Ladung. Verlustfrei ist hier keine
Vorsicht, sondern Notwendigkeit: der Auftakt tastet den Alphakanal ab, um die
Partikel zu setzen, und eine verlustbehaftete Fassung verschmierte die
Kanten der Wortmarke zu Rauschen am Rand des Felds.

Das Vorschaubild bleibt bewusst PNG. Nicht jeder Dienst, der eine
Linkvorschau baut, versteht WebP, und ein fehlendes Vorschaubild fiele mehr
ins Gewicht als die paar Kilobyte — geladen wird es ohnehin nie vom Besucher,
sondern nur vom Vorschaudienst.

Solange nur ein PNG vorliegt, begrenzt dessen echte Breite, wie groß der
Schriftzug im Auftakt werden kann. Bei 980 Pixeln ist bei rund 680 CSS-Pixeln
Schluss, darüber wird nur noch weichgerechnet. Mit einem SVG fiele diese
Grenze weg.

## Die Wortmarke trägt feine Gestaltungsdetails

Am **P** ist oben links eine Kerbe, und der **Punkt über dem ersten i** ist
kein voller Kreis, sondern eine Sichel mit einem Anbiss unten links. Das ist
so gewollt und gehört zur Marke.

Wer den Schriftzug verkleinert, rastert oder nachbaut, muss diese beiden
Stellen prüfen. Sie sind nur wenige Pixel groß und fallen als Erstes weg.
Der Partikeleffekt im Auftakt tastet das Logo deshalb im Ein-Pixel-Raster ab
und nicht gröber — bei zwei Pixeln verklumpen beide Details (gemessen:
Deckung 97,5 % gegen 100 %).

Ältere Lieferungen vom 3. und 4. August (`quelle/pixelkiez_logo.png` und die
`PixelKiez*.png` mit 773 × 179 großer Wortmarke) haben diese Details **noch
nicht** — dort sind P und i-Punkt geschlossen. Das ist die überholte Fassung,
nicht die richtige.

**Neues Logo einsetzen:** Datei nach `quelle/` legen und Bescheid geben. Sie
wird freigestellt, auf Graustufe mit Alpha gebracht und an allen vier Stellen
verdrahtet. Direkt `logo.webp` überschreiben geht auch, dann muss sie aber
schon freigestellt und beschnitten sein, sonst stimmen die Maßangaben im
Markup nicht mehr — und verlustfrei gepackt, sonst leidet die Abtastung im
Auftakt:

    cwebp -lossless -exact -z 9 neu.png -o logo.webp

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
