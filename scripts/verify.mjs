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
import { createContext, runInContext } from 'node:vm';

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
  { pfad: 'impressum.html',                lang: 'de', kanonisch: '/impressum.html' },
  { pfad: 'datenschutz.html',              lang: 'de', kanonisch: '/datenschutz.html' },
  /* Entwurfsseiten des Wissensbereichs: noindex ist Pflicht, sie stehen
     weder in der Sitemap noch in llms.txt und sind nicht von der
     Startseite verlinkt. */
  { pfad: 'wissen/index.html',                          lang: 'de', kanonisch: '/wissen/',                          noindex: true, paar: { partner: '/en/knowledge/',                       schalter: 'EN' } },
  { pfad: 'en/knowledge/index.html',                    lang: 'en', kanonisch: '/en/knowledge/',                    noindex: true, paar: { partner: '/wissen/',                            schalter: 'DE' } },
  { pfad: 'wissen/seo-geo-ai-visibility/index.html',    lang: 'de', kanonisch: '/wissen/seo-geo-ai-visibility/',    noindex: true, paar: { partner: '/en/knowledge/seo-geo-ai-visibility/', schalter: 'EN' } },
  { pfad: 'en/knowledge/seo-geo-ai-visibility/index.html', lang: 'en', kanonisch: '/en/knowledge/seo-geo-ai-visibility/', noindex: true, paar: { partner: '/wissen/seo-geo-ai-visibility/',   schalter: 'DE' } },
  { pfad: 'wissen/wie-ki-websites-liest/index.html',    lang: 'de', kanonisch: '/wissen/wie-ki-websites-liest/',    noindex: true, paar: { partner: '/en/knowledge/how-ai-reads-websites/', schalter: 'EN' } },
  { pfad: 'en/knowledge/how-ai-reads-websites/index.html', lang: 'en', kanonisch: '/en/knowledge/how-ai-reads-websites/', noindex: true, paar: { partner: '/wissen/wie-ki-websites-liest/',   schalter: 'DE' } },
  { pfad: 'wissen/answerability/index.html',            lang: 'de', kanonisch: '/wissen/answerability/',            noindex: true, paar: { partner: '/en/knowledge/answerability/',        schalter: 'EN' } },
  { pfad: 'en/knowledge/answerability/index.html',      lang: 'en', kanonisch: '/en/knowledge/answerability/',      noindex: true, paar: { partner: '/wissen/answerability/',              schalter: 'DE' } },
  { pfad: 'wissen/entity-trust/index.html',             lang: 'de', kanonisch: '/wissen/entity-trust/',             noindex: true, paar: { partner: '/en/knowledge/entity-trust/',         schalter: 'EN' } },
  { pfad: 'en/knowledge/entity-trust/index.html',       lang: 'en', kanonisch: '/en/knowledge/entity-trust/',       noindex: true, paar: { partner: '/wissen/entity-trust/',               schalter: 'DE' } },
  { pfad: 'wissen/agent-readiness/index.html',          lang: 'de', kanonisch: '/wissen/agent-readiness/',          noindex: true, paar: { partner: '/en/knowledge/agent-readiness/',      schalter: 'EN' } },
  { pfad: 'en/knowledge/agent-readiness/index.html',    lang: 'en', kanonisch: '/en/knowledge/agent-readiness/',    noindex: true, paar: { partner: '/wissen/agent-readiness/',            schalter: 'DE' } },
];

const fehler = [];
const hinweise = [];
const F = (s) => fehler.push(s);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
// Sonderzeichen eines Pfads entschaerfen, damit er woertlich in einen RegExp passt
const regexEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function existiert(p) { try { await stat(p); return true; } catch { return false; } }

/* -------------------------------------------------------------------------
   Kleiner Regel-Leser fuer eingebettetes CSS. Liefert Selektor,
   Deklarationen und die umschliessenden At-Regeln jeder Stilregel.
   Zeichenketten werden uebersprungen, damit eine geschweifte Klammer darin
   die Zaehlung nicht verschiebt.

   Die Bedingungen mitzufuehren ist kein Beiwerk: eine Regel, die nur unter
   @media (prefers-reduced-motion) sichtbar macht, sieht sonst aus wie eine
   Grundregel — und waere doch keine.

   Kein Parser fuer alle Faelle — genug fuer die eine Frage unten, und ohne
   neue Abhaengigkeit.
   ------------------------------------------------------------------------- */
function stilRegeln(quelle) {
  // Kommentare zuerst weg: im ausgelieferten CSS gibt es keine, aber ein
  // Kommentar unmittelbar vor einer Regel wuerde sonst Teil des Selektors.
  const css = quelle.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const raus = [];
  const stapel = [];                 // {at:true,kopf} fuer At-Regeln, {at:false} sonst
  let i = 0, kopf = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < css.length && css[i] !== q) { i += css[i] === '\\' ? 2 : 1; }
      i++; continue;
    }
    if (c === '{') {
      const k = css.slice(kopf, i).trim();
      const istAt = k.startsWith('@');
      if (!istAt) {
        raus.push({
          selektor: k, start: i + 1, dekl: undefined,
          bedingungen: stapel.filter((s) => s.at).map((s) => s.kopf),
        });
      }
      stapel.push({ at: istAt, kopf: k });
      i++; kopf = i; continue;
    }
    if (c === '}') {
      const zu = stapel.pop();
      if (zu && zu.at === false) {
        for (let n = raus.length - 1; n >= 0; n--) {
          if (raus[n].dekl === undefined) { raus[n].dekl = css.slice(raus[n].start, i); break; }
        }
      }
      i++; kopf = i; continue;
    }
    i++;
  }
  return raus.filter((r) => r.dekl !== undefined);
}

/* -------------------------------------------------------------------------
   PXK-23: Das Einblenden beim Scrollen darf Inhalt nicht zur Geisel nehmen.

   Geprueft wird die Architektur, nicht die Optik — kein Suchen nach einer
   bestimmten Zeichenkette, sondern vier Aussagen ueber das ausgelieferte
   Dokument, die zusammen "ohne JavaScript sichtbar" ergeben:

     1. Keine Regel versteckt [data-reveal] — oder irgendetwas, dessen
        Sichtbarkeit an der Skript-Klasse .in haengt —, ohne unter dem
        Merkmal data-reveal-anim zu stehen.
     2. Es gibt eine Grundregel ohne dieses Merkmal, die sichtbar macht —
        und zwar bedingungslos, nicht erst unter einer Media Query. Nur
        unter prefers-reduced-motion sichtbar zu sein hilft dem Besucher
        ohne JavaScript nicht.
     3. Irgendein Skript der Seite setzt das Merkmal — und der Vorlauf im
        <head>, der es setzt, nimmt es zu DOMContentLoaded auch selbst
        wieder zurueck, wenn sich bis dahin niemand darum gekuemmert hat.
        Ohne dieses Zuruecknehmen bliebe ein Fehlschlag des Hauptskripts als
        leere Seite stehen. Geprueft wird das nicht am Quelltext, sondern am
        Verhalten (siehe vorlaufMaengel weiter unten).
     4. Gesetzt wird es im <head>. Weiter hinten waere die Seite bereits
        gemalt und der fertige Inhalt blitzte auf, bevor er sich versteckt.

   Faellt eine davon, kann eine Seite wieder leer ausgeliefert werden.
   ------------------------------------------------------------------------- */
const MERKMAL = 'data-reveal-anim';
const REVEAL_SEL = /\[data-reveal\](?![-\w])/;
const setzt = (c) => new RegExp(`setAttribute\\(\\s*["']${MERKMAL}["']`).test(c);

/* -------------------------------------------------------------------------
   Der ausgelieferte Vorlauf wird nicht gelesen, sondern ausgefuehrt.

   Punkt 3 stand frueher als Suche nach removeAttribute ueber alle Skripte
   der Seite. Das war zu grob und deckte genau den Fall nicht ab, um den es
   geht: bds.js enthaelt denselben Aufruf (in `aufgeben()`), und bds.js ist
   das Skript, dessen Ausbleiben der Rueckfall abfangen soll. Faellt der
   Rueckfall aus dem Vorlauf heraus, findet die Suche ihn weiterhin in
   bds.js und bleibt gruen — waehrend der Browser die Seite leer ausliefert,
   sobald bds.js blockiert wird oder beim Auswerten scheitert.

   Deshalb laeuft der Vorlauf hier wirklich: in einem eigenen vm-Kontext mit
   einem winzigen Ersatz-DOM, ohne Browser und ohne Zufall. Der Ersatz kennt
   nur, was der Vorlauf anfasst — documentElement mit den vier
   Merkmal-Methoden, addEventListener, matchMedia und IntersectionObserver.
   ------------------------------------------------------------------------- */
function laufVorlauf(code) {
  const merkmale = new Map();
  const lauscher = [];
  const wurzel = {
    setAttribute: (n, v) => { merkmale.set(n, String(v)); },
    getAttribute: (n) => (merkmale.has(n) ? merkmale.get(n) : null),
    removeAttribute: (n) => { merkmale.delete(n); },
    hasAttribute: (n) => merkmale.has(n),
  };
  /* Der Fall, um den es geht: Beobachter vorhanden, Bewegung nicht
     reduziert — nur dann spannt der Vorlauf den Vorzustand ueberhaupt auf,
     und nur dann braucht er den Rueckfall. */
  const kontext = createContext({
    window: { IntersectionObserver: function () {}, matchMedia: () => ({ matches: false }) },
    document: { documentElement: wurzel, addEventListener: (typ, fn) => { lauscher.push([typ, fn]); } },
  });
  runInContext(code, kontext, { timeout: 2000 });
  return {
    merkmal: () => (merkmale.has(MERKMAL) ? merkmale.get(MERKMAL) : null),
    uebernimm: (wert) => { merkmale.set(MERKMAL, wert); },   // das tut bds.js, wenn der Beobachter steht
    feuere: (typ) => {
      const treffer = lauscher.filter(([t]) => t === typ);
      for (const [, fn] of treffer) fn({ type: typ });
      return treffer.length;
    },
  };
}

/* Liefert die Liste dessen, was am Verhalten eines Vorlaufs fehlt — leer
   heisst: er deckt den Ausfall von bds.js ab. */
function vorlaufMaengel(code) {
  const maengel = [];
  let lauf;
  try { lauf = laufVorlauf(code); }
  catch (e) { return [`der Vorlauf wirft beim Ausfuehren (${e.message})`]; }

  if (lauf.merkmal() !== 'bereit')
    maengel.push(`er spannt den Vorzustand nicht auf (${MERKMAL} steht nach dem Lauf auf ${JSON.stringify(lauf.merkmal())} statt "bereit")`);

  /* Ab hier laeuft KEIN weiteres Skript — das ist der ganze Punkt: genau so
     sieht die Seite aus, wenn bds.js nicht ankommt. */
  if (!lauf.feuere('DOMContentLoaded'))
    maengel.push('er meldet sich nicht auf DOMContentLoaded an — bleibt bds.js aus, nimmt niemand den Vorzustand zurueck');
  else if (lauf.merkmal() !== null)
    maengel.push(`er nimmt ${MERKMAL} zu DOMContentLoaded nicht zurueck (steht danach auf ${JSON.stringify(lauf.merkmal())}) — bleibt bds.js aus, bliebe der Inhalt unsichtbar`);

  /* Die Gegenrichtung derselben Zeile: hat bds.js den Vorzustand
     uebernommen ("an"), darf der Rueckfall ihm nicht dazwischenfahren,
     sonst faellt das Einblenden bei jedem Aufruf aus. */
  try {
    const zweit = laufVorlauf(code);
    if (zweit.merkmal() === 'bereit') {
      zweit.uebernimm('an');
      zweit.feuere('DOMContentLoaded');
      if (zweit.merkmal() !== 'an')
        maengel.push(`er raeumt ${MERKMAL} auch dann ab, wenn bds.js es bereits auf "an" uebernommen hat — das Einblenden fiele bei jedem Aufruf aus`);
    }
  } catch (e) { maengel.push(`der zweite Lauf wirft (${e.message})`); }

  return maengel;
}

function pruefeReveal(seite, html, skripte) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const alle = stilRegeln(css);
  const regeln = alle.filter((r) => REVEAL_SEL.test(r.selektor));
  if (!regeln.length) return;                       // Seite kennt kein Reveal

  const verbirgt = (d) =>
    /(?:^|;)\s*opacity\s*:\s*(?:0|0?\.0+)\s*(?:!important)?\s*(?:;|$)/.test(d) ||
    /(?:^|;)\s*visibility\s*:\s*hidden/.test(d) ||
    /(?:^|;)\s*display\s*:\s*none/.test(d);
  const zeigt = (d) => /(?:^|;)\s*opacity\s*:\s*(?:1|100%)/.test(d);
  const gedeckt = (sel) => sel.includes(`[${MERKMAL}]`);

  /* Dieselbe Frage fuer den Rest der Reveal-Familie. Die Klasse .in vergibt
     ausschliesslich das Reveal-Skript; wer seine Sichtbarkeit daran haengt,
     ist ohne Skript unsichtbar, auch wenn er kein data-reveal traegt. Genau
     so verschwanden die Merkmale der Preiskarten.

     Verglichen wird von rechts, Kompaktselektor fuer Kompaktselektor: der
     versteckende Selektor muss im .in-Selektor (ohne .in gelesen) enthalten
     sein. `.pack ul li` steckt so in `.pack.in ul li`, `.pack__badge` in
     `.pack.in .pack__badge`. */
  const ohneIn = (s) => s.replace(/\.in(?![-\w])/g, '').replace(/\s+/g, ' ').trim();
  const teile = (s) => ohneIn(s).split(/\s+/).filter(Boolean);
  const stecktIn = (versteck, kandidat) => {
    const a = teile(versteck), b = teile(kandidat);
    if (!a.length || a.length > b.length) return false;
    for (let n = 1; n <= a.length; n++) {
      const av = a[a.length - n], bv = b[b.length - n];
      const stuecke = av.match(/[.#[][^.#[\s]*|^[a-z]+/g) || [av];
      if (!stuecke.every((t) => bv.includes(t))) return false;
    }
    return true;
  };
  const mitIn = alle.filter((r) => /\.in(?![-\w])/.test(r.selektor));
  const anIn = alle.filter((r) => !r.bedingungen.length && !gedeckt(r.selektor)
    && verbirgt(r.dekl) && mitIn.some((k) => stecktIn(r.selektor, k.selektor)));
  if (anIn.length)
    F(`${seite}: ${anIn.length} Regel(n) verstecken unbedingt, obwohl ihre Sichtbarkeit an der Skript-Klasse .in haengt — ohne JavaScript bliebe das unsichtbar: ${anIn.map((r) => r.selektor).slice(0, 4).join(' · ')}`);

  const offen = regeln.filter((r) => verbirgt(r.dekl) && !gedeckt(r.selektor));
  if (offen.length)
    F(`${seite}: [data-reveal] wird ohne ${MERKMAL} versteckt — ohne JavaScript bliebe der Inhalt unsichtbar (${offen[0].selektor})`);

  if (!regeln.some((r) => !gedeckt(r.selektor) && zeigt(r.dekl) && !r.bedingungen.length))
    F(`${seite}: keine bedingungslose Grundregel, die [data-reveal] ohne ${MERKMAL} sichtbar macht`);

  if (!regeln.some((r) => gedeckt(r.selektor))) return;   // kein Vorzustand, nichts weiter zu decken

  const code = skripte.join('\n');
  /* Setzt die Seite das Merkmal gar nicht, kann sie auch nichts verstecken —
     das ist der Zustand von Impressum und Datenschutz, die das gemeinsame
     CSS mitbekommen, aber kein Skript tragen. Fail-open ist dort ohne
     weiteres Zutun erfuellt. Ab hier geht es nur noch um Seiten, die den
     Vorzustand tatsaechlich aufspannen. */
  if (!setzt(code)) return;

  const kopfEnde = html.search(/<\/head>/i);
  const kopfSkripte = [...html.slice(0, kopfEnde === -1 ? 0 : kopfEnde)
    .matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const vorlaeufe = kopfSkripte.filter(setzt);
  if (!vorlaeufe.length) {
    F(`${seite}: ${MERKMAL} wird erst nach dem <head> gesetzt — der fertige Inhalt blitzte auf, bevor er sich versteckt`);
    return;
  }

  /* Wer den Vorzustand aufspannt, schuldet auch das Zuruecknehmen. Deshalb
     muss JEDER Vorlauf den Ausfall von bds.js allein abdecken — ein zweiter,
     der nur setzt, waere ein Loch, das kein anderer stopfen kann. */
  for (const vorlauf of vorlaeufe) {
    const maengel = vorlaufMaengel(vorlauf);
    if (maengel.length)
      F(`${seite}: der Vorlauf im <head> deckt den Ausfall von bds.js nicht ab — ${maengel.join('; ')}`);
  }
}

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

    /* --- Reveal bleibt fail-open (PXK-23) --- */
    pruefeReveal(seite, html, skripte.map(([, c]) => c));

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
    /* --- Entwurfsseiten: noindex ist Pflicht, Indexfreigabe ein Fehler --- */
    if (eintrag.noindex) {
      if (!html.includes('<meta name="robots" content="noindex">'))
        F(`${seite}: noindex fehlt — Entwurfsseite waere indexierbar`);
      for (const m of html.matchAll(/<meta name="robots" content="([^"]*)">/g)) {
        if (!m[1].includes('noindex'))
          F(`${seite}: robots="${m[1]}" erlaubt Indexierung — Entwurfsstatus verletzt`);
      }
    }
    /* --- Wissensbereich: Themennetz, kein Kurs (Slice 2.1) ---
       Der Bereich ist als zusammenhaengendes Themensystem beschlossen, nicht
       als sequenzieller Lernpfad. Kurs-Wortlaut kaeme bei einer Ueberarbeitung
       leicht zurueck — deshalb hier gegen dist/ verankert. */
    if (eintrag.noindex) {
      const kursMuster = eintrag.lang === 'en'
        ? [/learning path/i, /five steps/i, /step \d of 5/i]
        : [/Lernpfad/, /fünf Schritte/, /Schritt \d von 5/,
           /01 · Finden/, /02 · Lesen/, /03 · Antworten/, /04 · Erkennen/, /05 · Handeln/];
      for (const m of kursMuster) {
        if (m.test(html))
          F(`${seite}: Kurs-Framing /${m.source}/ — Wissensbereich ist ein Themennetz, kein Lernpfad`);
      }
    }
    if (eintrag.paar) {
      const pfadDe = eintrag.lang === 'de' ? eintrag.kanonisch : eintrag.paar.partner;
      const pfadEn = eintrag.lang === 'en' ? eintrag.kanonisch : eintrag.paar.partner;
      for (const [hl, zielPfad] of [['de', pfadDe], ['en', pfadEn], ['x-default', pfadDe]]) {
        if (!html.includes(`<link rel="alternate" hreflang="${hl}" href="${DOMAIN}${zielPfad}">`))
          F(`${seite}: hreflang="${hl}" zeigt nicht auf ${DOMAIN}${zielPfad}`);
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

      /* Englische Seiten verweisen auf englische Fassungen. Ein href oder
         action auf einen deutschen Paar-Pfad schickt den Besucher mitten im
         englischen Auftritt auf die deutsche Seite — erlaubt ist das nur dem
         Sprachumschalter (der genau dafuer da ist) und den bewusst deutsch
         gehaltenen Rechtsseiten. */
      const ohneSchalter = html.replace(/<a class="lang"[^>]*data-lang-switch>[^<]*<\/a>/, '');
      const dePfade = SEITEN.filter((s) => s.lang === 'de' && s.paar).map((s) => s.kanonisch);
      for (const dePfad of dePfade) {
        const muster = new RegExp(
          `(?:href|action)="${regexEscape(dePfad)}(?:#[^"]*)?"`, 'g');
        for (const m of ohneSchalter.matchAll(muster)) {
          F(`${seite}: Verweis ${m[0]} auf die deutsche Fassung — muss auf /en/… zeigen`);
        }
      }
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

  /* --- Entwurfs-Gates: unveroeffentlichte Wissensseiten duerfen weder in
     der Sitemap noch in llms.txt stehen und von keiner veroeffentlichten
     Seite verlinkt sein. Geprueft gegen dist/ — gegen das, was ausgeliefert
     wuerde, nicht gegen Absichten. --- */
  const entwurfsPfade = SEITEN.filter((s) => s.noindex).map((s) => s.kanonisch);
  if (entwurfsPfade.length) {
    /* Der Build erzeugt sitemap.xml und llms.txt immer — fehlt eine davon,
       ist das selbst ein Fehler. Ein Gate, das mit der Datei verschwindet,
       prueft nichts. */
    if (!(await existiert(join(ZIEL, 'sitemap.xml')))) {
      F('sitemap.xml fehlt in dist/');
    } else {
      const sitemap = await readFile(join(ZIEL, 'sitemap.xml'), 'utf8');
      for (const p of entwurfsPfade) {
        // verankert auf < bzw. ": /wissen/ ist Praefix jeder Unterseite
        if (sitemap.includes(`${DOMAIN}${p}<`) || sitemap.includes(`${DOMAIN}${p}"`))
          F(`sitemap.xml nennt die Entwurfsseite ${p}`);
      }
    }
    if (!(await existiert(join(ZIEL, 'llms.txt')))) {
      F('llms.txt fehlt in dist/');
    } else {
      const llms = await readFile(join(ZIEL, 'llms.txt'), 'utf8');
      for (const p of entwurfsPfade) {
        if (new RegExp(regexEscape(p) + '(?![a-z0-9-])').test(llms))
          F(`llms.txt nennt die Entwurfsseite ${p}`);
      }
    }
  }
  for (const seitenPfad of SEITEN.filter((s) => !s.noindex).map((s) => s.pfad)) {
    if (!(await existiert(join(ZIEL, seitenPfad)))) continue;
    const html = await readFile(join(ZIEL, seitenPfad), 'utf8');
    for (const p of entwurfsPfade) {
      const muster = new RegExp(`(?:href|action)="${regexEscape(p)}(?:#[^"]*)?"`);
      if (muster.test(html))
        F(`${seitenPfad}: verlinkt die unveroeffentlichte Wissensseite ${p}`);
    }
  }

  /* --- D-1: der Wissensbereich fuehrt nur zum allgemeinen Kontaktweg ---
     Die Wissensseiten werben nicht mit einem Self-Service-Angebot. Ihr
     Kopfknopf und ihre Abschluesse fuehren zum Kontakt; eine zugesagte
     Website-Analyse waere ein Versprechen ohne Gegenstueck dahinter.

     Ein eigenes Tor, weil der vorige Stand saemtliche mechanischen Tore
     bestand und die Zusage trotzdem trug: Adressen und Aufbau waren
     richtig, nur der Text versprach etwas anderes.

     Geprueft wird beides — dass die verbotenen Wendungen fehlen UND dass
     die zugesagten Knoepfe dastehen. Eine reine Verbotsliste kennt nur die
     drei Formulierungen von damals; die vierte haette sie durchgelassen. */
  const D1_VERBOTEN = [
    'kostenlose Website-Analyse',
    'Zur Website-Analyse',
    'Eigene Website analysieren',
    'free website analysis',
    'See the website analysis',
    'Analyse your own website',
  ];
  /* Reihenfolge im Dokument: erst der Kopfknopf, dann der Abschluss. */
  const D1_ERWARTET = {
    de: { ziel: '/#kontakt',    knoepfe: ['Schnellkontakt', 'Website besprechen'] },
    en: { ziel: '/en/#kontakt', knoepfe: ['Quick contact', 'Discuss your website'] },
  };

  /* Woertlich, aber nicht naiv: Grossschreibung, ein Zeilenumbruch mitten im
     Satz oder ein eingeschobenes <em> sollen die Regel nicht aushebeln.
     Darum wird jeder Text zweimal durchsucht — mit Auszeichnung und ohne. */
  const d1Flach = (s) => s.replace(/\s+/g, ' ').toLowerCase();
  const d1Blank = (s) => d1Flach(s.replace(/<[^>]*>/g, ' '));
  /* Das eingebettete Skriptbuendel ist auf jeder Seite dasselbe und gehoert
     keiner Seite; JSON-LD dagegen ist Inhalt und bleibt unter Beobachtung. */
  const d1OhneBuendel = (s) => s
    .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  const d1Suche = (text, satz) =>
    d1Flach(text).includes(d1Flach(satz)) || d1Blank(text).includes(d1Flach(satz));

  /* Welche Routen zum Wissensbereich gehoeren, sagt das Register, nicht ein
     fest verdrahteter Pfad: die deutsche Fassung erkennt man an ihrer
     Adresse, die englische an ihrem Partner. Eine spaetere Umbenennung des
     englischen Pfades nimmt die Regel damit mit. */
  const istWissen = (s) => s.kanonisch.startsWith('/wissen/')
    || (s.paar ? s.paar.partner.startsWith('/wissen/') : false);
  const wissensrouten = SEITEN.filter(istWissen);
  /* Eine Regel ohne Gegenstand ist nicht bestanden, sondern ungeprueft. */
  if (!wissensrouten.length) {
    F('D-1: keine Wissensroute in der Pruefliste — die Regel liefe ins Leere');
  }

  /* Zweite, unabhaengige Quelle: was liegt wirklich unter den Wissenswurzeln?
     Eine ausgelieferte Seite, die niemand ins Register eingetragen hat,
     wuerde sonst von der ganzen Abnahme nie angefasst. Die Wurzeln kommen
     aus dem Register selbst — je Sprache der kuerzeste Wissenspfad. */
  const d1Registriert = new Set(wissensrouten.map((s) => s.pfad));
  const d1Wurzeln = ['de', 'en']
    .map((l) => wissensrouten.filter((s) => s.lang === l)
      .sort((a, b) => a.pfad.length - b.pfad.length)[0])
    .filter(Boolean).map((s) => s.pfad.replace(/\/?[^/]*$/, ''));
  const d1Gefunden = [];
  const d1Sammle = async (rel) => {
    let eintraege;
    try { eintraege = await readdir(join(ZIEL, rel), { withFileTypes: true }); } catch { return; }
    for (const e of eintraege) {
      const kind = `${rel}/${e.name}`;
      if (e.isDirectory()) await d1Sammle(kind);
      else if (e.name.endsWith('.html')) d1Gefunden.push(kind);
    }
  };
  for (const w of d1Wurzeln) await d1Sammle(w);
  for (const p of d1Gefunden) {
    if (!d1Registriert.has(p))
      F(`D-1: ${p} wird unter einer Wissenswurzel ausgeliefert, steht aber nicht ` +
        'in der Pruefliste — die Seite bliebe von der gesamten Abnahme unberuehrt');
  }

  for (const eintrag of wissensrouten) {
    const pfad = join(ZIEL, eintrag.pfad);
    if (!(await existiert(pfad))) {
      F(`D-1: ${eintrag.pfad} fehlt in dist/ — die Regel bleibt dort ungeprueft`);
      continue;
    }
    const seite = d1OhneBuendel(await readFile(pfad, 'utf8'));
    for (const satz of D1_VERBOTEN) {
      if (d1Suche(seite, satz))
        F(`D-1: ${eintrag.pfad} nennt weiterhin "${satz}" — der Wissensbereich ` +
          'fuehrt nur zum allgemeinen Kontaktweg, nicht zu einer zugesagten Analyse');
    }
    const soll = D1_ERWARTET[eintrag.lang];
    const knoepfe = [...seite.matchAll(
      /<a class="btn[^"]*"[^>]*href="([^"]*)"[^>]*>\s*<span class="btn__label">([^<]*)<\/span>/g)];
    if (knoepfe.length !== soll.knoepfe.length) {
      F(`D-1: ${eintrag.pfad} traegt ${knoepfe.length} Kontaktknoepfe, erwartet ` +
        `${soll.knoepfe.length} (Kopf und Abschluss)`);
      continue;
    }
    knoepfe.forEach(([, ziel, text], i) => {
      if (text !== soll.knoepfe[i])
        F(`D-1: ${eintrag.pfad}: Knopf ${i + 1} heisst "${text}", erwartet "${soll.knoepfe[i]}"`);
      if (ziel !== soll.ziel)
        F(`D-1: ${eintrag.pfad}: Knopf "${text}" zeigt auf ${ziel}, erwartet ${soll.ziel}`);
    });
  }

  /* Auch die Quelle traegt die Zusage nicht. Ein in einem Kommentar
     geparkter Satz ueberlebt dort, waehrend der Minifier ihn aus dist/
     entfernt — die Pruefung oben saehe ihn nie. Deshalb hier, entgegen der
     sonstigen Regel dieser Datei, ein Blick auf site/. */
  const D1_QUELLE = join(fileURLToPath(new URL('..', import.meta.url)), 'site', 'wissen');
  let d1Quellen = [];
  try { d1Quellen = (await readdir(D1_QUELLE)).filter((n) => n.endsWith('.html')); } catch { /* unten */ }
  if (!d1Quellen.length) {
    F('D-1: keine Wissensquelle unter site/wissen/ — die Quellpruefung liefe ins Leere');
  }
  for (const name of d1Quellen) {
    const roh = await readFile(join(D1_QUELLE, name), 'utf8');
    for (const satz of D1_VERBOTEN) {
      if (d1Suche(roh, satz))
        F(`D-1: site/wissen/${name} nennt "${satz}" — auch die Quelle traegt die Zusage nicht`);
    }
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
