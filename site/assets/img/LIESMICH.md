# Bilder

Hier hinein gehören Logo, Favicon und das Vorschaubild. Der Build kopiert
diesen Ordner mit Inhalts-Hash nach `dist/assets/img/`.

## Stand

| Datei | Format | Maße | Wofür | Stand |
|---|---|---|---|---|
| `logo.webp` | WebP verlustfrei, Graustufe + Alpha | 2006 × 465 | **nur der Auftakt** | liegt, aus `quelle/PK_logo-2172.png` |
| `logo-klein.webp` | WebP verlustfrei, Graustufe + Alpha | 480 × 111 | Kopf, Fußzeile, Rechtsseiten | liegt, aus derselben Quelle |
| ~~`logo-suche.png`~~ | PNG | 2000 × 2000 | Firmenlogo für Google | **verschoben nach `site/logo.png`**, siehe unten |
| `og.png` | PNG | 1200 × 630 | Vorschau, wenn jemand den Link verschickt | liegt, wird beim Logowechsel neu gesetzt |
| `logo.svg` | SVG | beliebig | ersetzt beide WebP, sobald vorhanden | **fehlt, wäre besser** |

Die Icons liegen **nicht** hier, sondern in `site/` selbst: `favicon.ico`,
`icon-512.png`, `apple-touch-icon.png`. Ebenso das Firmenlogo für die Suche,
`logo.png`. Grund siehe unten — es ist für beide derselbe.

## Warum Logo und Icons ohne Inhalts-Hash ausgeliefert werden

Der Build hängt jeder Datei unter `assets/` einen Inhalts-Hash an den Namen.
Für Schriften, CSS und Seitenbilder ist das richtig: ändert sich die Datei,
ändert sich der Name, und kein Browser liefert eine veraltete Fassung aus.

Für Logo und Favicon ist es **falsch**, und zwar nachweisbar. Google merkt
sich die Adresse beider Dateien und holt sie selten neu. Am 17.08.2026 wurde
das Motiv des Suchlogos überarbeitet. Damit sprang seine Adresse:

```
bis 17.08.   /assets/img/logo-suche.53244c14.png   →  seitdem HTTP 404
seit 17.08.  /assets/img/logo-suche.66301da4.png
```

Google hatte die Seite kurz zuvor erstmals erfasst und hielt damit eine tote
Adresse. Genau derselbe Fehler bestand beim Favicon.

**Regel: Beim Austausch die Datei ersetzen, den Dateinamen behalten.**

## Warum die Wortmarke in zwei Größen liegt

Gemessen wird sie an zwei sehr verschiedenen Stellen:

| Stelle | gerendert | braucht nativ (2×) |
|---|---|---|
| Auftakt, 1920er Schirm | 934 CSS-px | ~1870 |
| Auftakt, 1440er Schirm | 686 CSS-px | ~1370 |
| Kopf und Fußzeile | 95 CSS-px | ~190 |

Eine gemeinsame Datei müsste sich am Auftakt orientieren. Dann lüde jede
Rechtsseite 52 KB, um eine 95 px breite Marke zu zeigen. Deshalb zwei
Dateien: der Auftakt bekommt die große, alles andere die kleine.

Die große kostet 52 KB und das ist der Preis für echte Schärfe: Bei 980 px
Quellbreite stand der Auftakt auf einem 1920er Schirm bei Faktor 1,05 —
also hochgerechnet und sichtbar weich. Mit 2006 px sind es 2,15.

`near_lossless` spart hier 10 KB, quantisiert aber den Alphakanal von 240
auf 67 Stufen. Genau diesen Kanal tastet der Partikeleffekt ab. Nicht wert.

**Beide neu erzeugen**, wenn sich die Wortmarke ändert:

    magick quelle/PK_logo-2172.png -trim +repage -colorspace Gray \
      -channel A -level 3%,97% +channel /tmp/wm.png
    cwebp -lossless -exact -z 9 /tmp/wm.png -o logo.webp
    magick /tmp/wm.png -resize 480x -channel A -level 3%,97% +channel /tmp/wm-klein.png
    cwebp -lossless -exact -z 9 /tmp/wm-klein.png -o logo-klein.webp

Das `-level 3%,97%` ist kein Feinschliff, sondern nötig: die Lieferung vom
17. August hatte in der deckenden Innenfläche Alphawerte zwischen 252 und
255 statt durchgehend 255. Unsichtbar, aber jeder Punkt unterschied sich
vom Nachbarn — verlustfrei gepackt waren das 83 KB statt 53 KB.

Danach die Bildmaße im Markup nachziehen: `width`/`height` an allen fünf
`<img>`-Stellen (`index.html` 3×, `impressum.html`, `datenschutz.html`).
Stimmen sie nicht, rechnet der Browser den Platzhalter falsch und das
Layout springt beim Laden.

## Warum der Auftakt nicht aus einem Bucket kommen darf

Der Partikeleffekt zeichnet `logo.webp` in eine Leinwand und liest sie mit
`getImageData()` wieder aus (`bds.js`, Abschnitt 3b). Käme das Bild von
einer fremden Adresse ohne CORS-Kopfzeilen, wäre die Leinwand verdorben und
der Aufruf würfe einen Sicherheitsfehler. Ein `try` fängt ihn ab, der Effekt
bliebe aber ersatzlos aus. Die Wortmarke gehört deshalb ins Repo, nicht in
einen Bucket. Für das Google-Logo gilt das nicht, das liest kein Skript.

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

**Übergangsfassung.** `logo.png` (bis 18.08. `logo-suche.png`) trug die Wortmarke bis August in
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
Das frühere `favicon-32x32.png` lag darunter und wurde deshalb ignoriert —
in der Trefferliste stand ein grauer Platzhalter statt des Motivs.

Seit dem Umbau liegen drei Dateien in `site/` und werden vom Build ohne
Inhalts-Hash in die Wurzel kopiert:

| Datei | Maße | Wofür |
|---|---|---|
| `favicon.ico` | 48, 32, 16 in einer Datei | Trefferliste bei Google, Browser-Tab |
| `icon-512.png` | 512 × 512 | hochauflösende Anzeigen, Lesezeichen |
| `apple-touch-icon.png` | 180 × 180 | Startbildschirm iOS, randlos deckend |

Zwei Dinge sind dabei nicht verhandelbar:

**Die Adresse muss fest bleiben.** Google holt das Favicon selten neu und
merkt sich dabei die Adresse. Läge es unter `assets/img/`, bekäme es einen
Inhalts-Hash — und der ändert sich bei jeder Motivänderung. Die gemerkte
Adresse liefe dann auf 404 und die Trefferliste bliebe ohne Icon.

**`/favicon.ico` muss existieren.** Diesen Pfad fragen Googlebot und jeder
Browser von sich aus ab, auch ohne `<link>` im Kopf. Fehlt die Datei, ist das
ein 404 bei jedem Seitenaufruf.

Das Motiv selbst ist zwei schlichte Quadrate auf `#B4C3BF`, schwarz `#000000`
über orange `#F94A2C`, Kantenlänge je 26 % der Fläche, Eckenradius 18,75 %.
Die 26 % sind bewusst so groß: Google rendert das Favicon real bei etwa 16 bis
18 Pixeln, und bei den früheren 12,5 % blieben davon zwei kaum sichtbare
Punkte übrig.

Verlustfrei ist hier keine Vorsicht, sondern Notwendigkeit: der Auftakt
tastet den Alphakanal ab, um die Partikel zu setzen, und eine
verlustbehaftete Fassung verschmierte die Kanten der Wortmarke zu Rauschen
am Rand des Felds.

Das Vorschaubild bleibt bewusst PNG. Nicht jeder Dienst, der eine
Linkvorschau baut, versteht WebP, und ein fehlendes Vorschaubild fiele mehr
ins Gewicht als die paar Kilobyte — geladen wird es ohnehin nie vom Besucher,
sondern nur vom Vorschaudienst.

Solange nur ein Rasterbild vorliegt, begrenzt dessen echte Breite, wie groß
der Schriftzug im Auftakt werden kann. Bei 2006 Pixeln reicht es bis rund
1000 CSS-Pixel bei doppelter Punktdichte — das deckt jeden gängigen Schirm.
Mit einem SVG fiele die Grenze ganz weg, und beide WebP entfielen.

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

Die aktuelle Quelle ist `quelle/PK_logo-2172.png` (Lieferung vom 17. August,
2172 × 724 mit transparentem Rand, Inhalt 2006 × 465). Beide Details sind
darin vorhanden und wurden gegen die Vorgängerfassung nachgemessen.

**Neues Logo einsetzen:** Datei nach `quelle/` legen und Bescheid geben. Die
beiden WebP entstehen daraus mit den Befehlen weiter oben, danach die
Bildmaße im Markup nachziehen.

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
