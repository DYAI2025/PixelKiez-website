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

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';
import { uebersetze } from './i18n.mjs';
import { uebersetzeJs } from './i18n-js.mjs';

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

const DOMAIN = 'https://pixelkiez.de';

/* -------------------------------------------------------------------------
   Sprachverweise. Beide Fassungen nennen sich gegenseitig und sich selbst —
   ohne x-default weiss eine Suchmaschine nicht, welche sie Besuchern ohne
   passende Spracheinstellung zeigen soll.
   ------------------------------------------------------------------------- */
function setzeAlternates(html, sprache) {
  const zeilen = [
    `<link rel="alternate" hreflang="de" href="${DOMAIN}/">`,
    `<link rel="alternate" hreflang="en" href="${DOMAIN}/en/">`,
    `<link rel="alternate" hreflang="x-default" href="${DOMAIN}/">`,
  ].join('\n');
  const kanonisch = sprache === 'en' ? `${DOMAIN}/en/` : `${DOMAIN}/`;
  // Kanonische Adresse auf die eigene Fassung ziehen, danach die Verweise
  return html.replace(/<link rel="canonical" href="[^"]*">/, () =>
    `<link rel="canonical" href="${kanonisch}">\n${zeilen}`);
}

/* -------------------------------------------------------------------------
   Englische Fassung. Erzeugt aus derselben Quelle wie die deutsche — es gibt
   bewusst keine zweite HTML-Datei, die man vergessen koennte nachzupflegen.
   ------------------------------------------------------------------------- */
async function baueEnglisch(cssMin, jsRoh, fontKarte, bildKarte) {
  const tabHtml = JSON.parse(await readFile(join(QUELLE, 'i18n', 'en.json'), 'utf8'));
  const tabJs   = JSON.parse(await readFile(join(QUELLE, 'i18n', 'en.js.json'), 'utf8'));
  let html = await readFile(join(QUELLE, 'index.html'), 'utf8');

  /* --- Text --- */
  const t = uebersetze(html, tabHtml);
  if (t.fehlend.length) throw new Error(
    'index.html enthaelt Text ohne Uebersetzung. Nach einer Aenderung am\n' +
    '    deutschen Text bitte "npm run i18n" ausfuehren und en.json ergaenzen:\n    · ' +
    t.fehlend.slice(0, 6).map((s) => s.slice(0, 90)).join('\n    · '));
  html = t.html;
  const benutzt = new Set(t.benutzt);   // wird unten um das JSON-LD ergaenzt

  /* --- Skript --- */
  const j = uebersetzeJs(jsRoh, tabJs);
  if (j.fehlend.length) throw new Error(
    'bds.js enthaelt Zeichenketten ohne Uebersetzung (en.js.json ergaenzen):\n    · ' +
    j.fehlend.slice(0, 6).map((s) => s.slice(0, 90)).join('\n    · '));
  if (j.veraltet.length) throw new Error(
    'en.js.json enthaelt Zeichenketten, die es in bds.js nicht mehr gibt:\n    · ' +
    j.veraltet.slice(0, 6).map((s) => s.slice(0, 90)).join('\n    · '));
  const jsEn = (await esbuild.transform(j.js, { loader: 'js', minify: true, target: 'es2015' })).code.trim();

  /* --- Dokumentsprache --- */
  html = html.replace('<html lang="de">', '<html lang="en">');
  if (!html.includes('<html lang="en">')) throw new Error('en: <html lang="de"> nicht gefunden');

  /* --- Umschalter zeigt jetzt zurueck aufs Deutsche --- */
  const schalter = /<a class="lang"[^>]*data-lang-switch>[^<]*<\/a>/;
  if (!schalter.test(html)) throw new Error('en: Sprachumschalter nicht gefunden');
  html = html.replace(schalter, () =>
    '<a class="lang" href="/" hreflang="de" lang="de" aria-label="Auf Deutsch wechseln" data-lang-switch>DE</a>');

  /* --- Rechtsseiten bleiben deutsch und liegen im Wurzelverzeichnis.
         Ein relativer Verweis zeigte von /en/ aus auf /en/impressum.html. --- */
  html = html.replace(/href="(impressum|datenschutz)\.html"/g, (m, n) => `href="/${n}.html"`);

  /* --- Sprachverweise und kanonische Adresse --- */
  html = setzeAlternates(html, 'en');
  html = html.replace(/<meta property="og:locale" content="[^"]*">/, () =>
    '<meta property="og:locale" content="en_GB">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, () =>
    `<meta property="og:url" content="${DOMAIN}/en/">`);

  /* --- JSON-LD: die Beschreibungen darin sind ebenfalls Inhalt --- */
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (treffer, roh) => {
    const daten = JSON.parse(roh);
    const offen = [];
    const geh = (o) => {
      if (Array.isArray(o)) return o.map(geh);
      if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) o[k] = geh(o[k]);
        return o;
      }
      if (typeof o !== 'string') return o;
      if (tabHtml[o]) { benutzt.add(o); return tabHtml[o]; }
      // Deutsch gebliebene Saetze melden — Eigennamen und URLs nicht
      if (/\s/.test(o) && /[äöüßÄÖÜ]|\b(der|die|das|und|für|mit|Ihre|Sie)\b/.test(o)) offen.push(o);
      return o;
    };
    const uebersetzt = geh(daten);
    // Sprache und Adresse im strukturierten Datensatz mitziehen
    let s = JSON.stringify(uebersetzt)
      .replace(/"inLanguage":"de(-DE)?"/g, '"inLanguage":"en"')
      .replace(new RegExp(`"${DOMAIN}/"`, 'g'), `"${DOMAIN}/en/"`);

    /* Seitenbezogene Kennungen muessen sich unterscheiden: die englische und
       die deutsche Startseite sind zwei Dokumente. Truegen beide dieselbe
       @id, waere fuer eine Suchmaschine unklar, welches gemeint ist.

       Entitaetsbezogene Kennungen bleiben dagegen bewusst gleich —
       Unternehmen, Gruender, Logo und die Leistungen sind auf beiden Seiten
       dieselbe Sache, und genau diese Gleichheit verknuepft die Fassungen.

       Der Austausch laeuft ueber die Zeichenkette und trifft damit die
       Definition und jeden Verweis darauf in einem Zug. */
    for (const anker of ['seite', 'pfad', 'faq', 'website']) {
      s = s.split(`"${DOMAIN}/#${anker}"`).join(`"${DOMAIN}/en/#${anker}"`);
    }
    if (offen.length) throw new Error(
      'JSON-LD enthaelt deutschen Text ohne Uebersetzung:\n    · ' +
      offen.slice(0, 5).map((x) => x.slice(0, 90)).join('\n    · '));
    return `<script type="application/ld+json">${s}</script>`;
  });

  /* --- Erst jetzt, mit beiden Ergebnissen, laesst sich sagen, welche
         Eintraege niemand mehr braucht. --- */
  const veraltet = Object.keys(tabHtml).filter((k) => !benutzt.has(k));
  if (veraltet.length) throw new Error(
    'en.json enthaelt Saetze, die weder im Text noch im JSON-LD vorkommen.\n' +
    '    Vermutlich wurde der deutsche Text geaendert — bitte "npm run i18n"\n' +
    '    ausfuehren und die Eintraege anpassen:\n    · ' +
    veraltet.slice(0, 6).map((x) => x.slice(0, 90)).join('\n    · '));

  /* --- Mittel einbetten, wie bei der deutschen Fassung --- */
  const linkMuster = /[ \t]*<link rel="stylesheet" href="assets\/css\/fonts\.css">\s*\n[ \t]*<link rel="stylesheet" href="assets\/css\/bds\.css">/;
  html = html.replace(linkMuster, () => `<style>${cssMin}</style>`);
  html = html.replace(/href="assets\/fonts\/([^"]+\.woff2)"/g, (m, datei) => {
    const neu = fontKarte.get(datei);
    if (!neu) throw new Error(`en: Vorladehinweis auf unbekannte Schrift ${datei}`);
    return `href="/assets/fonts/${neu}"`;
  });
  html = html.replace(/(href|src|content)="assets\/img\/([^"]+)"/g, (treffer, attr, datei) => {
    const n = bildKarte.get(datei);
    if (!n) throw new Error(`en: Verweis auf unbekanntes Bild assets/img/${datei}`);
    const ziel = attr === 'content' ? `${DOMAIN}/assets/img/${n}` : `/assets/img/${n}`;
    return `${attr}="${ziel}"`;
  });
  html = html.replace('<script src="assets/js/bds.js" defer></script>', () => `<script>${jsEn}</script>`);

  html = await minifyHtml(html, HTML_OPTIONEN);
  pruefe('en/index.html', html, jsEn);

  /* Letzte Gegenprobe: kein offensichtliches Deutsch im sichtbaren Text */
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  const deutsch = sichtbar.match(/\b(werden|wurde|nicht|Ihre|Ihnen|wir|unsere|Betriebe|Anfragen|Website ist)\b/g);
  if (deutsch) throw new Error(`en/index.html enthaelt noch deutschen Text: ${[...new Set(deutsch)].join(', ')}`);

  return html;
}

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

  /* ---- 1b. Bilder: Logo, Vorschaubild, Favicon ------------------------- */
  const bildVerzeichnis = join(QUELLE, 'assets', 'img');
  const bildKarte = new Map();
  let bildBytes = 0;
  try {
    const bilder = (await readdir(bildVerzeichnis))
      .filter((f) => /\.(svg|png|jpe?g|webp|ico)$/i.test(f)).sort();
    if (bilder.length) await mkdir(join(ZIEL, 'assets', 'img'), { recursive: true });
    for (const datei of bilder) {
      const inhalt = await readFile(join(bildVerzeichnis, datei));
      const hash = createHash('sha256').update(inhalt).digest('hex').slice(0, 8);
      const neu = `${basename(datei, extname(datei))}.${hash}${extname(datei)}`;
      await copyFile(join(bildVerzeichnis, datei), join(ZIEL, 'assets', 'img', neu));
      bildKarte.set(datei, neu);
      bildBytes += inhalt.length;
    }
    if (bilder.length) log(`Bilder       ${bilder.length} Dateien mit Inhalts-Hash   ${kb(bildBytes)}`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;   // Ordner darf fehlen, solange nichts darauf zeigt
  }

  /* ---- 1c. Wurzeldateien: robots.txt, llms.txt, sitemap.xml -------------
     Diese drei fragt eine Suchmaschine oder ein Agent als Erstes ab, noch
     bevor er eine Seite laedt. Ohne Inhaltshash, denn ihre Namen sind
     festgelegt, und ohne Umschreibung, denn sie enthalten keine Verweise
     auf gehashte Mitteldateien. */
  const WURZELDATEIEN = ['robots.txt', 'llms.txt'];
  for (const datei of WURZELDATEIEN) {
    await copyFile(join(QUELLE, datei), join(ZIEL, datei));
  }

  /* Die Sitemap nennt jede ausgelieferte Seite genau einmal und verknuepft
     die beiden Sprachfassungen wechselseitig — einseitige Verweise wertet
     Google nicht. lastmod kommt aus der Aenderungszeit der Quelldatei. */
  const sitemapEintraege = [
    { pfad: '/',                  quelle: 'index.html',       sprachen: true,  gewicht: '1.0' },
    { pfad: '/en/',               quelle: 'index.html',       sprachen: true,  gewicht: '0.8' },
    { pfad: '/impressum.html',    quelle: 'impressum.html',   sprachen: false, gewicht: '0.3' },
    { pfad: '/datenschutz.html',  quelle: 'datenschutz.html', sprachen: false, gewicht: '0.3' },
  ];
  const alternates = [
    `    <xhtml:link rel="alternate" hreflang="de" href="${DOMAIN}/"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/"/>`,
  ].join('\n');

  const urls = [];
  for (const e of sitemapEintraege) {
    const { mtime } = await stat(join(QUELLE, e.quelle));
    urls.push(
      '  <url>\n' +
      `    <loc>${DOMAIN}${e.pfad}</loc>\n` +
      `    <lastmod>${mtime.toISOString().slice(0, 10)}</lastmod>\n` +
      (e.sprachen ? alternates + '\n' : '') +
      `    <priority>${e.gewicht}</priority>\n` +
      '  </url>'
    );
  }
  await writeFile(join(ZIEL, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') + '\n</urlset>\n', 'utf8');
  log(`Wurzel       robots.txt, llms.txt, sitemap.xml (${urls.length} Adressen)`);

  /* ---- 2. CSS: zusammenlegen, Pfade umschreiben, minifizieren ----------- */
  const fontsCss = await readFile(join(QUELLE, 'assets', 'css', 'fonts.css'), 'utf8');
  const bdsCss   = await readFile(join(QUELLE, 'assets', 'css', 'bds.css'), 'utf8');
  const cssRoh   = fontsCss + '\n' + bdsCss;

  // ../fonts/x.woff2  →  /assets/fonts/x.<hash>.woff2
  //
  // Wurzelabsolut, nicht relativ: das CSS wird in die Seite eingebettet und
  // gilt damit relativ zum Dokument. Die englische Fassung liegt unter /en/ —
  // ein relativer Pfad zeigte dort auf /en/assets/fonts/ und die Schriften
  // waeren nicht auffindbar.
  let ersetzungen = 0;
  const cssPfade = cssRoh.replace(/url\((['"]?)\.\.\/fonts\/([^'")]+)\1\)/g, (treffer, q, datei) => {
    const neu = fontKarte.get(datei);
    if (!neu) throw new Error(`Schrift referenziert, aber nicht vorhanden: ${datei}`);
    ersetzungen++;
    return `url(${q}/assets/fonts/${neu}${q})`;
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

    /* 4b. Schrift-Vorladehinweise auf die gehashten Namen ziehen, ebenfalls
           wurzelabsolut — siehe Begruendung beim CSS. */
    html = html.replace(/href="assets\/fonts\/([^"]+\.woff2)"/g, (treffer, datei) => {
      const neu = fontKarte.get(datei);
      if (!neu) throw new Error(`${seite}: Vorladehinweis auf unbekannte Schrift ${datei}`);
      return `href="/assets/fonts/${neu}"`;
    });

    /* 4b-2. Bildverweise auf die gehashten Namen ziehen */
    // og:image braucht eine vollstaendige Adresse: viele Dienste, die eine
    // Vorschau erzeugen, lesen relative Pfade nicht auf.
    html = html.replace(/(href|src|content)="assets\/img\/([^"]+)"/g, (treffer, attr, datei) => {
      const n = bildKarte.get(datei);
      if (!n) throw new Error(`${seite}: Verweis auf unbekanntes Bild assets/img/${datei}`);
      const ziel = attr === 'content' ? `${DOMAIN}/assets/img/${n}` : `/assets/img/${n}`;
      return `${attr}="${ziel}"`;
    });

    /* 4c. Skript einbetten, an genau derselben Stelle */
    if (html.includes('<script src="assets/js/bds.js" defer></script>')) {
      html = html.replace('<script src="assets/js/bds.js" defer></script>', () => `<script>${jsMin}</script>`);
    } else if (seite === 'index.html') {
      throw new Error('index.html: Skriptverweis nicht gefunden');
    }

    /* 4d. Sprachverweise: jede Seite nennt ihre Gegenstuecke. Auf den
           Rechtsseiten gibt es keine englische Fassung, dort entfaellt es. */
    if (seite === 'index.html') html = setzeAlternates(html, 'de');

    /* 4e. HTML minifizieren */
    html = await minifyHtml(html, HTML_OPTIONEN);
    pruefe(seite, html, jsMin);

    await writeFile(join(ZIEL, seite), html, 'utf8');
    const nachher = Buffer.byteLength(html);
    summeVorher += vorher; summeNachher += nachher;
    log(`${seite.padEnd(20)} ${kb(vorher)} → ${kb(nachher)}   (mit eingebettetem CSS/JS)`);
  }

  /* ---- 4f. Englische Fassung ------------------------------------------- */
  const enHtml = await baueEnglisch(cssMin, jsRoh, fontKarte, bildKarte);
  await mkdir(join(ZIEL, 'en'), { recursive: true });
  await writeFile(join(ZIEL, 'en', 'index.html'), enHtml, 'utf8');
  summeNachher += Buffer.byteLength(enHtml);
  log(`en/index.html        ${'—'.padStart(9)} → ${kb(Buffer.byteLength(enHtml))}   (aus der deutschen Quelle erzeugt)`);

  /* ---- 5. Bilanz -------------------------------------------------------- */
  log('─'.repeat(66));
  const quelleGesamt = summeVorher + Buffer.byteLength(cssRoh) + Buffer.byteLength(jsRoh) + fontBytes;
  const zielGesamt   = summeNachher + fontBytes;
  log(`Quelle gesamt ${kb(quelleGesamt)}     Auslieferung ${kb(zielGesamt)}`);
  log(`Anfragen beim Erstaufruf: 1 HTML + ${fontDateien.length} Schriften (vorher 1 + 2 CSS + 1 JS + ${fontDateien.length})`);
  log(`\nFertig in ${Date.now() - t0} ms → dist/\n`);
}

build().catch((e) => { console.error('\n\x1b[31mBuild abgebrochen:\x1b[0m', e.message, '\n'); process.exit(1); });
