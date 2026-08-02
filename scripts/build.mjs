/* =========================================================================
   Berlin Digital Systems — Build
   Quelle: site/   →   Auslieferung: dist/

   Was passiert:
     1. Schriften bekommen einen Inhalts-Hash im Dateinamen (Cache-Busting).
     2. fonts.css und bds.css werden zusammengelegt, minifiziert und als
        <style> in jede Seite eingebettet. Die url()-Pfade werden dabei von
        "../fonts/" auf "assets/fonts/" umgeschrieben — die eingebettete
        Fassung steht im Dokumentwurzel, nicht mehr in assets/css/.
     3. bds.js wird minifiziert und an derselben Stelle eingebettet, an der
        das <script defer> stand: als letztes Element vor </body>. Das Skript
        ist eine IIFE ohne readyState-Abfrage, damit ist das gleichwertig.
     4. Das HTML wird minifiziert — bewusst vorsichtig, siehe HTML_OPTIONEN.

   Ziel ist eine Auslieferung ohne einen einzigen vermeidbaren Roundtrip:
   HTML, CSS, JS und Symbole in einer Antwort, Schriften unveraenderlich
   danebengelegt.
   ========================================================================= */

import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const QUELLE = join(WURZEL, 'site');
const ZIEL   = join(WURZEL, 'dist');

const SEITEN = ['index.html', 'impressum.html', 'datenschutz.html'];

/* html-minifier-terser: die beiden erstgenannten Schalter sind hier nicht
   optional. Ohne caseSensitive werden SVG-Attribute kleingeschrieben und
   viewBox, startOffset, clipPath, patternUnits verlieren ihre Wirkung — das
   Sprite und das Kurvenband im Hero waeren zerstoert. conservativeCollapse
   laesst zwischen Elementen immer ein Leerzeichen stehen; das kostet ein paar
   hundert Byte und bewahrt die Wortabstaende zwischen Inline-Elementen. */
const HTML_OPTIONEN = {
  caseSensitive: true,
  keepClosingSlash: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  removeRedundantAttributes: false,
  removeAttributeQuotes: false,
  minifyCSS: false,            // bereits von esbuild erledigt
  minifyJS: false,             // bereits von esbuild erledigt
  processScripts: [],          // JSON-LD unangetastet lassen
  sortAttributes: false,
  sortClassName: false,
};

const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';
const log = (...a) => console.log(...a);

/* -------------------------------------------------------------------------
   Selbstpruefung je Seite. Deckt genau die Fehler ab, die beim Einbetten
   auftreten koennen und die man dem Ergebnis nicht ansieht.
   ------------------------------------------------------------------------- */
function pruefe(seite, html, jsMin) {
  const fehler = [];

  if (/<link[^>]+rel="stylesheet"/.test(html))
    fehler.push('ein <link rel="stylesheet"> ist uebrig — CSS wurde nicht eingebettet');
  if (/<script[^>]+\bsrc=/.test(html))
    fehler.push('ein <script src=…> ist uebrig — JS wurde nicht eingebettet');
  if (/\.\.\/fonts\//.test(html))
    fehler.push('unaufgeloester Pfad ../fonts/ — die eingebettete Fassung wuerde die Schriften nicht finden');
  // Jeder echte Dateiverweis auf eine Schrift — in href= wie in url() — muss
  // den Inhalts-Hash tragen. type="font/woff2" ist kein Dateiverweis.
  for (const m of html.matchAll(/assets\/fonts\/([^"')\s]+\.woff2)/g)) {
    if (!/\.[0-9a-f]{8}\.woff2$/.test(m[1]))
      fehler.push(`Schriftverweis ohne Inhalts-Hash: ${m[1]}`);
  }

  // Das eingebettete Skript muss fuer sich genommen gueltig sein. Genau hier
  // waere die $&-Ersetzung aufgefallen.
  const skripte = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
  for (const [, code] of skripte) {
    if (!code.trim()) continue;
    try { new Function(code); }
    catch (e) { fehler.push(`eingebettetes Skript ist syntaktisch ungueltig: ${e.message}`); }
    if (code.includes('<script') || code.includes('</script'))
      fehler.push('im eingebetteten Skript steht ein Skript-Tag — Ersetzung hat sich selbst zerlegt');
  }
  if (seite === 'index.html') {
    if (!skripte.length) fehler.push('kein eingebettetes Skript gefunden');
    else if (skripte.every(([, c]) => c.length < jsMin.length * 0.9))
      fehler.push('eingebettetes Skript ist deutlich kuerzer als erwartet');
  }

  // JSON-LD muss den Durchlauf unbeschadet ueberstehen
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); }
    catch (e) { fehler.push(`JSON-LD ungueltig: ${e.message}`); }
  }

  // SVG-Attribute in Grossschreibung muessen erhalten bleiben
  for (const attr of ['viewBox', 'startOffset', 'clipPath', 'patternUnits', 'gradientUnits']) {
    if (html.includes(attr.toLowerCase() + '=') && !html.includes(attr + '='))
      fehler.push(`SVG-Attribut ${attr} wurde kleingeschrieben — Darstellung waere zerstoert`);
  }

  if (fehler.length) throw new Error(`${seite}:\n    · ` + fehler.join('\n    · '));
}

async function build() {
  const t0 = Date.now();
  log('\n\x1b[1mBerlin Digital Systems — Build\x1b[0m');
  log('─'.repeat(66));

  await rm(ZIEL, { recursive: true, force: true });
  await mkdir(join(ZIEL, 'assets', 'fonts'), { recursive: true });

  /* ---- 1. Schriften mit Inhalts-Hash ------------------------------------ */
  const fontVerzeichnis = join(QUELLE, 'assets', 'fonts');
  const fontDateien = (await readdir(fontVerzeichnis)).filter((f) => f.endsWith('.woff2')).sort();
  const fontKarte = new Map();          // alter Name → neuer Name
  let fontBytes = 0;

  for (const datei of fontDateien) {
    const inhalt = await readFile(join(fontVerzeichnis, datei));
    const hash = createHash('sha256').update(inhalt).digest('hex').slice(0, 8);
    const neu = `${basename(datei, extname(datei))}.${hash}${extname(datei)}`;
    await copyFile(join(fontVerzeichnis, datei), join(ZIEL, 'assets', 'fonts', neu));
    fontKarte.set(datei, neu);
    fontBytes += inhalt.length;
  }
  log(`Schriften    ${fontDateien.length} Dateien mit Inhalts-Hash   ${kb(fontBytes)}`);

  /* ---- 2. CSS: zusammenlegen, Pfade umschreiben, minifizieren ----------- */
  const fontsCss = await readFile(join(QUELLE, 'assets', 'css', 'fonts.css'), 'utf8');
  const bdsCss   = await readFile(join(QUELLE, 'assets', 'css', 'bds.css'), 'utf8');
  const cssRoh   = fontsCss + '\n' + bdsCss;

  // ../fonts/x.woff2  →  assets/fonts/x.<hash>.woff2
  let ersetzungen = 0;
  const cssPfade = cssRoh.replace(/url\((['"]?)\.\.\/fonts\/([^'")]+)\1\)/g, (treffer, q, datei) => {
    const neu = fontKarte.get(datei);
    if (!neu) throw new Error(`Schrift referenziert, aber nicht vorhanden: ${datei}`);
    ersetzungen++;
    return `url(${q}assets/fonts/${neu}${q})`;
  });
  if (ersetzungen === 0) throw new Error('Keine Schriftpfade umgeschrieben — Muster passt nicht mehr.');

  // target esnext: nur minifizieren, keine Syntax herunterstufen. Sonst
  // koennte esbuild color(srgb ...), :has() oder @media umschreiben.
  const cssMin = (await esbuild.transform(cssPfade, {
    loader: 'css', minify: true, target: 'esnext',
  })).code.trim();
  log(`CSS          ${kb(cssRoh.length)} → ${kb(cssMin.length)}   ${ersetzungen} Schriftpfade umgeschrieben`);

  /* ---- 3. JS minifizieren ---------------------------------------------- */
  const jsRoh = await readFile(join(QUELLE, 'assets', 'js', 'bds.js'), 'utf8');
  // es2015 statt esnext: der Quelltext ist durchgehend ES5. So kann der
  // Minifizierer keine Pfeilfunktionen einstreuen, die aeltere Browser
  // ausschliessen wuerden.
  const jsMin = (await esbuild.transform(jsRoh, {
    loader: 'js', minify: true, target: 'es2015',
  })).code.trim();
  log(`JS           ${kb(jsRoh.length)} → ${kb(jsMin.length)}`);

  /* ---- 4. Seiten zusammenbauen ----------------------------------------- */
  log('─'.repeat(66));
  let summeVorher = 0, summeNachher = 0;

  for (const seite of SEITEN) {
    let html = await readFile(join(QUELLE, seite), 'utf8');
    const vorher = Buffer.byteLength(html);

    /* 4a. Beide Stylesheet-Verweise durch einen <style>-Block ersetzen.
           fonts.css steht zuerst — die Reihenfolge bleibt erhalten, weil
           beim Zusammenlegen genauso vorgegangen wurde. */
    const linkMuster = /[ \t]*<link rel="stylesheet" href="assets\/css\/fonts\.css">\s*\n[ \t]*<link rel="stylesheet" href="assets\/css\/bds\.css">/;
    if (!linkMuster.test(html)) throw new Error(`${seite}: Stylesheet-Verweise nicht gefunden`);
    // Ersetzungs-FUNKTION, nicht -Zeichenkette: in einer Ersetzungszeichenkette
    // sind $&, $', $`, $1..$9 Sonderfolgen. Minifiziertes CSS/JS enthaelt sie
    // ohne weiteres — $&& entsteht schon aus einer Variablen namens $.
    html = html.replace(linkMuster, () => `<style>${cssMin}</style>`);

    /* 4b. Schrift-Vorladehinweise auf die gehashten Namen ziehen */
    html = html.replace(/href="assets\/fonts\/([^"]+\.woff2)"/g, (treffer, datei) => {
      const neu = fontKarte.get(datei);
      if (!neu) throw new Error(`${seite}: Vorladehinweis auf unbekannte Schrift ${datei}`);
      return `href="assets/fonts/${neu}"`;
    });

    /* 4c. Skript einbetten, an genau derselben Stelle */
    if (html.includes('<script src="assets/js/bds.js" defer></script>')) {
      html = html.replace('<script src="assets/js/bds.js" defer></script>', () => `<script>${jsMin}</script>`);
    } else if (seite === 'index.html') {
      throw new Error('index.html: Skriptverweis nicht gefunden');
    }

    /* 4d. HTML minifizieren */
    html = await minifyHtml(html, HTML_OPTIONEN);

    /* 4e. Selbstpruefung. Ein Build, der Kaputtes als Erfolg meldet, ist
           wertlos — deshalb bricht er hier ab statt zu warnen. */
    pruefe(seite, html, jsMin);

    await writeFile(join(ZIEL, seite), html, 'utf8');
    const nachher = Buffer.byteLength(html);
    summeVorher += vorher; summeNachher += nachher;
    log(`${seite.padEnd(20)} ${kb(vorher)} → ${kb(nachher)}   (mit eingebettetem CSS/JS)`);
  }

  /* ---- 5. Bilanz -------------------------------------------------------- */
  log('─'.repeat(66));
  const quelleGesamt = summeVorher + Buffer.byteLength(cssRoh) + Buffer.byteLength(jsRoh) + fontBytes;
  const zielGesamt   = summeNachher + fontBytes;
  log(`Quelle gesamt ${kb(quelleGesamt)}     Auslieferung ${kb(zielGesamt)}`);
  log(`Anfragen beim Erstaufruf: 1 HTML + ${fontDateien.length} Schriften (vorher 1 + 2 CSS + 1 JS + ${fontDateien.length})`);
  log(`\nFertig in ${Date.now() - t0} ms → dist/\n`);
}

build().catch((e) => { console.error('\n\x1b[31mBuild abgebrochen:\x1b[0m', e.message, '\n'); process.exit(1); });
