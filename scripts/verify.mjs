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

/* Jede ausgelieferte Seite mit ihren Erwartungen. `paar` verbindet die beiden
   Fassungen einer Quelle: der Umschalter der einen Seite muss exakt auf die
   andere zeigen. Seiten ohne `paar` sind einsprachig und tragen weder
   hreflang noch Umschalter. `kanonisch` ist der Pfad, den das canonical der
   fertigen Seite nennen muss. */
const DOMAIN = 'https://pixelkiez.de';
const SEITEN = [
  { pfad: 'index.html',                    lang: 'de', kanonisch: '/',                       paar: { partner: '/en/',                 schalter: 'EN' } },
  { pfad: 'en/index.html',                 lang: 'en', kanonisch: '/en/',                    paar: { partner: '/',                    schalter: 'DE' } },
  { pfad: 'website-analyse/index.html',    lang: 'de', kanonisch: '/website-analyse/',       paar: { partner: '/en/website-analyse/', schalter: 'EN' } },
  { pfad: 'en/website-analyse/index.html', lang: 'en', kanonisch: '/en/website-analyse/',    paar: { partner: '/website-analyse/',    schalter: 'DE' } },
  { pfad: 'impressum.html',                lang: 'de', kanonisch: '/impressum.html' },
  { pfad: 'datenschutz.html',              lang: 'de', kanonisch: '/datenschutz.html' },
];

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

  for (const eintrag of SEITEN) {
    const seite = eintrag.pfad;
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

    /* --- Sprachfassung: Auszeichnung, Canonical, Umschalter, Verweise --- */
    const en = eintrag.lang === 'en';
    if (!html.includes(`<html lang="${eintrag.lang}">`))
      F(`${seite}: <html lang="${eintrag.lang}"> fehlt`);
    if (!html.includes(`<link rel="canonical" href="${DOMAIN}${eintrag.kanonisch}">`))
      F(`${seite}: canonical zeigt nicht auf ${DOMAIN}${eintrag.kanonisch}`);
    if (eintrag.paar) {
      for (const hl of ['de', 'en', 'x-default']) {
        if (!html.includes(`hreflang="${hl}"`)) F(`${seite}: hreflang="${hl}" fehlt`);
      }
      const s2 = html.match(/<a class="lang"[^>]*href="([^"]*)"[^>]*>([^<]*)</);
      if (!s2) F(`${seite}: Sprachumschalter fehlt`);
      else if (s2[1] !== eintrag.paar.partner || s2[2] !== eintrag.paar.schalter)
        F(`${seite}: Umschalter zeigt auf ${s2[1]} mit "${s2[2]}" statt ${eintrag.paar.partner} und ${eintrag.paar.schalter}`);
    }
    // Seiten unterhalb der Wurzel duerfen keine relativen Verweise tragen:
    // sie liegen eine Ebene tiefer, relative Pfade zeigten dort ins Leere.
    if (seite.includes('/')) {
      for (const m of html.matchAll(/(?:href|src)="(?!https?:|mailto:|data:|#|\/)([^"]+)"/g)) {
        F(`${seite}: relativer Verweis "${m[1]}" — von /${seite.slice(0, seite.lastIndexOf('/'))}/ aus falsch`);
      }
    }
    if (en) {
      if (/[äöüÄÖÜß]/.test(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ')))
        F(`${seite}: Umlaute im sichtbaren Text — vermutlich deutscher Rest`);
    }

    /* --- Bildverweise muessen auf eine vorhandene Datei zeigen ---
       Bisher wurden nur Schriften geprueft. Dadurch blieb monatelang
       unbemerkt, dass das Firmenlogo im JSON-LD auf assets/img/og.png zeigte
       — eine Adresse, die es nie gab, weil ausgeliefert wird mit Inhalts-Hash.
       Der Seite sah man nichts an; es fehlte nur das Logo in allem, was
       Suchmaschinen daraus bauen. Genau diese Sorte Fehler gehoert in eine
       Abnahme, weil sie sich sonst niemandem zeigt. */
    for (const m of html.matchAll(/(?:https:\/\/[a-z0-9.-]+)?\/assets\/img\/([A-Za-z0-9._-]+)/g)) {
      if (!(await existiert(join(ZIEL, 'assets', 'img', m[1]))))
        F(`${seite}: Bildverweis zeigt ins Leere: assets/img/${m[1]}`);
    }

    /* --- SVG-Attribute in Grossschreibung --- */
    for (const attr of ['viewBox', 'startOffset', 'preserveAspectRatio']) {
      if (html.includes(attr.toLowerCase() + '=') && !html.includes(attr + '='))
        F(`${seite}: SVG-Attribut ${attr} kleingeschrieben`);
    }

    /* --- vorgepackte Nachbarn ---
       Fehlt die .br-Datei, liefert Caddy die Seite klaglos unverpackt aus.
       Das faellt niemandem auf — die Seite ist ja da —, kostet aber bei
       dieser Startseite rund 117 KB je Aufruf. Deshalb ein Fehler, kein
       Hinweis. */
    const roh = Buffer.byteLength(html);
    let brGroesse = 0;
    for (const [endung, name] of [['.br', 'Brotli'], ['.gz', 'gzip']]) {
      if (!(await existiert(pfad + endung))) {
        F(`${seite}: ${name}-Fassung ${basename(seite) + endung} fehlt — ` +
          'Caddy liefert die Seite dann unkomprimiert aus');
        continue;
      }
      const { size } = await stat(pfad + endung);
      if (size >= roh) F(`${seite}: ${name}-Fassung ist nicht kleiner als das Original`);
      if (endung === '.br') brGroesse = size;
    }

    const gz = gzipSync(Buffer.from(html), { level: 9 }).length;
    console.log(`  ${seite.padEnd(20)} ${kb(roh).padStart(9)}  gzip ${kb(gz).padStart(9)}  ` +
                `brotli ${kb(brGroesse).padStart(9)}  ` +
                `${skripte.length} Skript, ${(html.match(/<style>/g) || []).length} Stilblock`);
  }

  /* --- Funnel-Einstieg: die Startseite muss zur Analyse-Seite fuehren ---
     Der Einstieg ist ein GET-Formular (action) oder ein Link (href). Faellt
     er beim Ueberarbeiten der Startseite heraus, ist die Analyse-Seite von
     der Startseite aus unerreichbar — genau das soll hier auffallen. */
  if (await existiert(join(ZIEL, 'index.html'))) {
    const start = await readFile(join(ZIEL, 'index.html'), 'utf8');
    if (!/(?:href|action)="\/website-analyse\/"/.test(start))
      F('index.html: kein Einstieg zur Website-Analyse (/website-analyse/) gefunden');
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
