/* =========================================================================
   Abnahme des fertigen dist/-Baums.

   build.mjs prueft jede Seite waehrend des Zusammenbaus. Hier wird geprueft,
   was sich erst am Gesamtergebnis zeigt: verwaiste Dateien, Verweise ins
   Leere, Reste der Quellstruktur.  Beendet sich mit Code 1, wenn etwas
   nicht stimmt — damit taugt es als Tor vor einem Deploy.
   ========================================================================= */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ZIEL = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const SEITEN = ['index.html', 'impressum.html', 'datenschutz.html', 'en/index.html'];

const fehler = [];
const hinweise = [];
const F = (s) => fehler.push(s);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

async function existiert(p) { try { await stat(p); return true; } catch { return false; } }

async function verify() {
  console.log('\n\x1b[1mAbnahme dist/\x1b[0m');
  console.log('─'.repeat(70));

  if (!(await existiert(ZIEL))) { F('dist/ fehlt — erst "npm run build" ausfuehren'); return ende(); }

  const fontVerzeichnis = join(ZIEL, 'assets', 'fonts');
  const fontsVorhanden = (await existiert(fontVerzeichnis))
    ? new Set(await readdir(fontVerzeichnis)) : new Set();
  const fontsBenutzt = new Set();

  for (const seite of SEITEN) {
    const pfad = join(ZIEL, seite);
    if (!(await existiert(pfad))) { F(`${seite} fehlt in dist/`); continue; }
    const html = await readFile(pfad, 'utf8');

    /* --- nichts darf mehr extern nachgeladen werden --- */
    if (/<link[^>]+rel="stylesheet"/.test(html)) F(`${seite}: externes Stylesheet uebrig`);
    if (/<script[^>]+\bsrc=/.test(html))          F(`${seite}: externes Skript uebrig`);
    // Nur Attributpositionen pruefen. Die Datenschutzerklaerung nennt
    // assets/js/bds.js absichtlich im Fliesstext, wenn sie erklaert, wo der
    // ENDPOINT eingetragen wird — das ist Text, kein Ladeverweis.
    if (/(?:href|src|url\()\s*["']?[^"')]*assets\/css\//.test(html))
      F(`${seite}: Ladeverweis auf assets/css/ uebrig`);
    if (/(?:href|src|url\()\s*["']?[^"')]*assets\/js\//.test(html))
      F(`${seite}: Ladeverweis auf assets/js/ uebrig`);
    if (/\.\.\//.test(html.replace(/<script[\s\S]*?<\/script>/g, '')))
      F(`${seite}: relativer Pfad ../ ausserhalb des Skripts — zeigt ins Leere`);

    /* --- Schriftverweise muessen auf vorhandene Dateien zeigen --- */
    for (const m of html.matchAll(/assets\/fonts\/([^"')\s]+\.woff2)/g)) {
      const datei = basename(m[1]);
      fontsBenutzt.add(datei);
      if (!fontsVorhanden.has(datei)) F(`${seite}: Schrift referenziert, fehlt in dist/: ${datei}`);
      if (!/\.[0-9a-f]{8}\.woff2$/.test(datei)) F(`${seite}: Schrift ohne Inhalts-Hash: ${datei}`);
    }

    /* --- eingebettetes Skript muss gueltig sein --- */
    const skripte = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const [, code] of skripte) {
      if (!code.trim()) continue;
      try { new Function(code); } catch (e) { F(`${seite}: eingebettetes Skript ungueltig — ${e.message}`); }
      if (/<\/?script/i.test(code)) F(`${seite}: Skript-Tag im Skriptinhalt`);
    }
    if (seite === 'index.html' && !skripte.length) F('index.html: kein eingebettetes Skript');

    /* --- JSON-LD --- */
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { F(`${seite}: JSON-LD ungueltig — ${e.message}`); }
    }

    /* --- interne Verweise --- */
    for (const m of html.matchAll(/href="((?!https?:|mailto:|data:|#|\/\/)[^"]+)"/g)) {
      const ziel = m[1].split('#')[0];
      if (!ziel) continue;
      if (!(await existiert(join(ZIEL, ziel)))) F(`${seite}: Verweis ins Leere — ${ziel}`);
    }

    /* --- Sprachfassung: Auszeichnung, Umschalter, Verweise --- */
    const en = seite.startsWith('en/');
    if (!/<html lang="(de|en)">/.test(html)) F(`${seite}: <html lang> fehlt oder unbekannt`);
    if (en && !html.includes('<html lang="en">')) F('en/index.html: lang ist nicht "en"');
    if (!en && seite === 'index.html' && !html.includes('<html lang="de">')) F('index.html: lang ist nicht "de"');
    if (seite === 'index.html' || en) {
      for (const hl of ['de', 'en', 'x-default']) {
        if (!html.includes(`hreflang="${hl}"`)) F(`${seite}: hreflang="${hl}" fehlt`);
      }
      const s2 = html.match(/<a class="lang"[^>]*href="([^"]*)"[^>]*>([^<]*)</);
      if (!s2) F(`${seite}: Sprachumschalter fehlt`);
      else if (en && (s2[1] !== '/' || s2[2] !== 'DE')) F(`en: Umschalter zeigt auf ${s2[1]} mit "${s2[2]}" statt / und DE`);
      else if (!en && (s2[1] !== '/en/' || s2[2] !== 'EN')) F(`index: Umschalter zeigt auf ${s2[1]} mit "${s2[2]}" statt /en/ und EN`);
    }
    // Auf der englischen Seite duerfen keine relativen Verweise stehen: sie
    // liegt eine Ebene tiefer und wuerden dort ins Leere zeigen.
    if (en) {
      for (const m of html.matchAll(/(?:href|src)="(?!https?:|mailto:|data:|#|\/)([^"]+)"/g)) {
        F(`en/index.html: relativer Verweis "${m[1]}" — von /en/ aus falsch`);
      }
      if (/[äöüÄÖÜß]/.test(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ')))
        F('en/index.html: Umlaute im sichtbaren Text — vermutlich deutscher Rest');
    }

    /* --- SVG-Attribute in Grossschreibung --- */
    for (const attr of ['viewBox', 'startOffset', 'preserveAspectRatio']) {
      if (html.includes(attr.toLowerCase() + '=') && !html.includes(attr + '='))
        F(`${seite}: SVG-Attribut ${attr} kleingeschrieben`);
    }

    const roh = Buffer.byteLength(html);
    const gz = gzipSync(Buffer.from(html), { level: 9 }).length;
    console.log(`  ${seite.padEnd(20)} ${kb(roh).padStart(9)}  komprimiert ${kb(gz).padStart(9)}  ` +
                `${skripte.length} Skript, ${(html.match(/<style>/g) || []).length} Stilblock`);
  }

  /* --- verwaiste Schriften --- */
  for (const f of fontsVorhanden) {
    if (!fontsBenutzt.has(f)) hinweise.push(`Schrift liegt in dist/, wird aber nie referenziert: ${f}`);
  }

  console.log('─'.repeat(70));
  console.log(`  Schriften: ${fontsVorhanden.size} vorhanden, ${fontsBenutzt.size} referenziert`);
  ende();
}

function ende() {
  console.log('─'.repeat(70));
  for (const h of hinweise) console.log(`  \x1b[33m·\x1b[0m ${h}`);
  if (fehler.length) {
    for (const f of fehler) console.log(`  \x1b[31m✘\x1b[0m ${f}`);
    console.log(`\n\x1b[31mAbnahme fehlgeschlagen: ${fehler.length} Fehler\x1b[0m\n`);
    process.exit(1);
  }
  console.log('\n\x1b[32mAbnahme bestanden — keine Fehler\x1b[0m\n');
}

verify();
