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
  /* Manuelle Analyse-Anfrage: gebaut, aber noch nicht freigegeben — daher
     noindex wie der Wissensbereich. Der Vertrag dieser Strecke haengt nicht
     an dieser Tabelle, sondern am Tor G-1 weiter unten. */
  { pfad: 'website-analyse/index.html',    lang: 'de', kanonisch: '/website-analyse/',       noindex: true, paar: { partner: '/en/website-analyse/', schalter: 'EN' } },
  { pfad: 'en/website-analyse/index.html', lang: 'en', kanonisch: '/en/website-analyse/',    noindex: true, paar: { partner: '/website-analyse/',    schalter: 'DE' } },
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

  /* --- G-1: der Vertrag der manuellen Analyse-Anfrage ----------------------
     Der Wissensbereich darf wieder eine Website-Analyse anbieten, weil es sie
     gibt: ein Aufnahmeformular, das eine Mail ausloest, nach der ein Mensch
     die Analyse schreibt und das Ergebnis per E-Mail zurueckschickt. Kein
     Automat, keine Warteschlange, kein Abrufpunkt.

     Warum ein eigenes Tor: der Fehler, den PXK-28 gefunden hat, war nie ein
     Adress- oder Aufbaufehler. Adressen und Aufbau waren richtig, nur der
     Text versprach etwas, das es nicht gab — und solche Fehler bestehen jedes
     mechanische Tor. Geprueft wird deshalb der Vertrag selbst, in beide
     Richtungen: was dastehen MUSS und was nicht dastehen DARF. Eine reine
     Verbotsliste kennt nur die Formulierungen von heute; die von morgen
     liesse sie durch.

       G-1.1  die Analyse-Knoepfe des Wissensbereichs zeigen auf die
              Analyse-Route — je Sprache auf ihre eigene, nie auf den
              allgemeinen Kontaktweg;
       G-1.2  die Analyse-Route gibt es ueberhaupt, deutsch wie englisch;
       G-1.3  die Seite sagt, dass ein Mensch die Analyse erstellt und das
              Ergebnis per E-Mail kommt;
       G-1.4  und sie sagt nirgends, ein Automat liefere sie sofort;
       G-1.5  die drei Angaben, ohne die keine Analyse moeglich ist — Adresse
              der Website, Name, Rueckweg fuer das Ergebnis — stehen als
              Pflichtfelder im Formular;
       G-1.6  es gibt kein Auftrags-, Status- oder Abrufwerk: die Seite spricht
              mit genau einem Endpunkt, dem Kontaktweg, und nennt weder einen
              Auftrag noch einen Bericht zum Herunterladen.

     Jede Regel faellt aus, wenn ihr Gegenstand fehlt. Eine Regel ohne
     Gegenstand ist nicht bestanden, sondern ungeprueft. */

  /* Woertlich, aber nicht naiv: Grossschreibung, ein Zeilenumbruch mitten im
     Satz oder ein eingeschobenes <em> sollen die Regel nicht aushebeln.
     Darum wird jeder Text zweimal durchsucht — mit Auszeichnung und ohne. */
  const g1Flach = (s) => s.replace(/\s+/g, ' ').toLowerCase();
  const g1Blank = (s) => g1Flach(s.replace(/<[^>]*>/g, ' '));
  /* Das eingebettete Skriptbuendel ist auf jeder Seite dasselbe und gehoert
     keiner Seite; JSON-LD dagegen ist Inhalt und bleibt unter Beobachtung.
     Nur G-1.6 sieht die Seite ungefiltert — dort ist gerade das Buendel der
     Gegenstand. */
  const g1OhneBuendel = (s) => s
    .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  const g1Suche = (text, satz) =>
    g1Flach(text).includes(g1Flach(satz)) || g1Blank(text).includes(g1Flach(satz));
  /* Fuer die Zusagen zaehlt nur, was der Besucher liest. Eine Zusage, die
     allein in der Beschreibung im Kopf oder im JSON-LD steht, waere fuer ihn
     nicht da — das Tor bliebe gruen, waehrend die Seite sie sichtbar verloren
     hat. Gemessen an der Beschreibung im Kopf ist genau das passiert. */
  const g1Rumpf = (s) => {
    const i = s.search(/<body\b[^>]*>/i);
    return i < 0 ? null : s.slice(i);
  };

  const G1_ANALYSE = { de: '/website-analyse/', en: '/en/website-analyse/' };
  const G1_KONTAKTWEG = ['/#kontakt', '/en/#kontakt'];

  /* Kopf- und Abschlussknopf, in Dokumentreihenfolge. Der Abschluss heisst
     auf der Uebersicht anders als in den Beitraegen — beides ist freigegeben,
     deshalb eine Liste statt eines einzelnen Wortlauts. */
  const G1_WISSEN = {
    de: { kopf: 'Zur Website-Analyse',      schluss: ['Zur Website-Analyse', 'Eigene Website analysieren'] },
    en: { kopf: 'See the website analysis', schluss: ['See the website analysis', 'Analyse your own website'] },
  };

  /* Was die Analyse-Seite zusagen MUSS: von Hand erstellt, Rueckweg per Mail. */
  const G1_ZUSAGE = {
    de: ['Persönlich erstellt, kein automatischer Score', 'Ergebnis per E-Mail', 'nicht von einem Skript'],
    en: ['Prepared personally, no automated score', 'Results by email', 'not by a script'],
  };

  /* Was sie nicht sagen darf. Bewusst ohne "in Sekunden" / "in seconds": das
     steht legitim in der Rede ueber Ladezeit und waere ein Fehlalarm.
     "kein automatischer Score" bleibt erlaubt — verboten ist die Zusage,
     nicht ihre Verneinung. */
  const G1_VERBOTEN = {
    de: ['sofort automatisch', 'automatisch fertig', 'automatische Analyse', 'Analyse automatisch',
         'automatisch erstellt', 'automatisch generiert', 'Analyse sofort', 'sofort fertig',
         'Ergebnis sofort', 'Score wird berechnet', 'vollautomatisch'],
    en: ['instant analysis', 'instantly', 'automatically generated', 'automated analysis',
         'analysis automatically', 'automatically created', 'immediate result', 'fully automated'],
  };

  /* Pflichtfelder der Aufnahme. Ohne eines davon kann niemand eine Analyse
     schreiben oder sie zurueckschicken. */
  const G1_FELDER = [
    { name: 'url',     typ: 'url',   was: 'Adresse der Website' },
    { name: 'name',    typ: 'text',  was: 'Name' },
    { name: 'kontakt', typ: 'email', was: 'Rueckweg fuer das Ergebnis' },
  ];

  /* Der einzige Endpunkt, den es gibt. Alles andere waere ein Werk, das
     hinter der Seite nicht existiert. */
  const G1_ENDPUNKT = '/api/kontakt';
  const G1_AUTOMAT = ['pxapi', '/api/analyse', 'job-status', 'jobstatus', 'analysejob',
                      'analyse-job', 'jobid', 'job_id', 'download-report', 'report-download'];

  /* Welche Routen wohin gehoeren, sagt die Pruefliste, nicht ein fest
     verdrahteter Pfad: die deutsche Fassung erkennt man an ihrer Adresse, die
     englische an ihrem Partner. Eine spaetere Umbenennung nimmt die Regel mit. */
  const istWissen = (s) => s.kanonisch.startsWith('/wissen/')
    || (s.paar ? s.paar.partner.startsWith('/wissen/') : false);
  const istAnalyse = (s) => s.kanonisch === G1_ANALYSE[s.lang];
  const wissensrouten = SEITEN.filter(istWissen);
  const analyserouten = SEITEN.filter(istAnalyse);

  /* --- G-1.2: gibt es den Gegenstand ueberhaupt? --- */
  if (!wissensrouten.length) {
    F('G-1: keine Wissensroute in der Pruefliste — die Regel liefe ins Leere');
  }
  for (const l of ['de', 'en']) {
    if (!analyserouten.some((s) => s.lang === l))
      F(`G-1.2: keine ${l}-Analyse-Route (${G1_ANALYSE[l]}) in der Pruefliste — ` +
        'die Analyse-Knoepfe des Wissensbereichs zeigten ins Leere');
  }

  /* Zweite, unabhaengige Quelle: was liegt wirklich unter den Wurzeln von
     Wissen und Analyse? Eine ausgelieferte Seite, die niemand ins Register
     eingetragen hat, bliebe sonst von der ganzen Abnahme unberuehrt. Die
     Wurzeln kommen aus der Pruefliste selbst — je Bereich und Sprache der
     kuerzeste Pfad. */
  const g1Registriert = new Set([...wissensrouten, ...analyserouten].map((s) => s.pfad));
  const g1Wurzeln = [];
  for (const gruppe of [wissensrouten, analyserouten]) {
    for (const l of ['de', 'en']) {
      const kuerzeste = gruppe.filter((s) => s.lang === l)
        .sort((a, b) => a.pfad.length - b.pfad.length)[0];
      if (kuerzeste) g1Wurzeln.push(kuerzeste.pfad.replace(/\/?[^/]*$/, ''));
    }
  }
  const g1Gefunden = [];
  const g1Sammle = async (rel) => {
    let eintraege;
    try { eintraege = await readdir(join(ZIEL, rel), { withFileTypes: true }); } catch { return; }
    for (const e of eintraege) {
      const kind = `${rel}/${e.name}`;
      if (e.isDirectory()) await g1Sammle(kind);
      else if (e.name.endsWith('.html')) g1Gefunden.push(kind);
    }
  };
  for (const w of g1Wurzeln) await g1Sammle(w);
  for (const p of g1Gefunden) {
    if (!g1Registriert.has(p))
      F(`G-1: ${p} wird unter einer Wissens- oder Analysewurzel ausgeliefert, steht ` +
        'aber nicht in der Pruefliste — die Seite bliebe von der gesamten Abnahme unberuehrt');
  }

  /* --- G-1.1: die Knoepfe des Wissensbereichs --- */
  for (const eintrag of wissensrouten) {
    const pfad = join(ZIEL, eintrag.pfad);
    if (!(await existiert(pfad))) {
      F(`G-1.1: ${eintrag.pfad} fehlt in dist/ — die Regel bleibt dort ungeprueft`);
      continue;
    }
    const seite = g1OhneBuendel(await readFile(pfad, 'utf8'));
    const soll = G1_WISSEN[eintrag.lang];
    const ziel = G1_ANALYSE[eintrag.lang];
    const knoepfe = [...seite.matchAll(
      /<a class="btn[^"]*"[^>]*href="([^"]*)"[^>]*>\s*<span class="btn__label">([^<]*)<\/span>/g)];
    if (knoepfe.length !== 2) {
      F(`G-1.1: ${eintrag.pfad} traegt ${knoepfe.length} Knoepfe, erwartet 2 (Kopf und Abschluss)`);
      continue;
    }
    const [[, kopfZiel, kopfText], [, schlussZiel, schlussText]] = knoepfe;
    if (kopfText !== soll.kopf)
      F(`G-1.1: ${eintrag.pfad}: Kopfknopf heisst "${kopfText}", erwartet "${soll.kopf}"`);
    if (!soll.schluss.includes(schlussText))
      F(`G-1.1: ${eintrag.pfad}: Abschlussknopf heisst "${schlussText}", erwartet eines von ` +
        soll.schluss.map((s) => `"${s}"`).join(' oder '));
    for (const [nr, [, zeigtAuf, text]] of knoepfe.entries()) {
      if (zeigtAuf === ziel) continue;
      if (G1_KONTAKTWEG.includes(zeigtAuf))
        F(`G-1.1: ${eintrag.pfad}: Knopf ${nr + 1} "${text}" zeigt auf den allgemeinen ` +
          `Kontaktweg ${zeigtAuf} — eine Analyse-Zusage gehoert auf ${ziel}`);
      else
        F(`G-1.1: ${eintrag.pfad}: Knopf ${nr + 1} "${text}" zeigt auf ${zeigtAuf}, erwartet ${ziel}`);
    }
  }

  /* --- G-1.3 bis G-1.6: die Analyse-Seite selbst --- */
  for (const eintrag of analyserouten) {
    const pfad = join(ZIEL, eintrag.pfad);
    if (!(await existiert(pfad))) {
      F(`G-1.2: ${eintrag.pfad} fehlt in dist/ — die zugesagte Analyse-Route wird nicht ausgeliefert`);
      continue;
    }
    const roh = await readFile(pfad, 'utf8');
    const seite = g1OhneBuendel(roh);

    const rumpf = g1Rumpf(seite);
    if (rumpf === null)
      F(`G-1.3: ${eintrag.pfad} hat kein <body> — die Zusagen liessen sich im
        sichtbaren Teil nicht pruefen`.replace(/\s+/g, ' '));
    for (const satz of G1_ZUSAGE[eintrag.lang]) {
      if (rumpf !== null && !g1Suche(rumpf, satz))
        F(`G-1.3: ${eintrag.pfad} sagt nicht "${satz}" — ohne das steht dort ein ` +
          'Analyse-Angebot ohne erkennbare menschliche Erstellung');
    }
    for (const satz of G1_VERBOTEN[eintrag.lang]) {
      if (g1Suche(seite, satz))
        F(`G-1.4: ${eintrag.pfad} nennt "${satz}" — die Analyse entsteht von Hand, ` +
          'eine Sofort- oder Automatikzusage haette kein Gegenstueck dahinter');
    }

    /* G-1.5: Pflichtfelder. Gelesen wird das ausgelieferte Formular, nicht die
       Absicht — ein Feld, das der Minifier verschluckt haette, faellt hier auf. */
    const felder = new Map();
    for (const m of seite.matchAll(/<input\b[^>]*>/g)) {
      const n = m[0].match(/\bname="([^"]*)"/);
      if (n) felder.set(n[1], m[0]);
    }
    for (const { name, typ, was } of G1_FELDER) {
      const tag = felder.get(name);
      if (!tag) { F(`G-1.5: ${eintrag.pfad}: Pflichtfeld name="${name}" (${was}) fehlt im Formular`); continue; }
      if (!new RegExp(`\\btype="${typ}"`).test(tag))
        F(`G-1.5: ${eintrag.pfad}: Feld name="${name}" (${was}) hat nicht type="${typ}"`);
      if (!/\brequired\b/.test(tag))
        F(`G-1.5: ${eintrag.pfad}: Feld name="${name}" (${was}) ist nicht required — ` +
          'ohne die Angabe kann die Analyse nicht erstellt oder nicht zugestellt werden');
    }

    /* G-1.6: genau ein Endpunkt, und kein Auftragswerk. Hier bewusst gegen die
       ungefilterte Seite: das eingebettete Buendel ist der Gegenstand. */
    for (const m of roh.matchAll(/\/api\/[A-Za-z0-9_-]*/g)) {
      if (m[0] !== G1_ENDPUNKT)
        F(`G-1.6: ${eintrag.pfad} spricht mit ${m[0]} — die Aufnahme kennt nur ` +
          `${G1_ENDPUNKT}; ein zweiter Endpunkt waere ein Werk, das es nicht gibt`);
    }
    for (const wort of G1_AUTOMAT) {
      if (g1Flach(roh).includes(g1Flach(wort)))
        F(`G-1.6: ${eintrag.pfad} nennt "${wort}" — Auftrag, Status und Berichtabruf ` +
          'gehoeren zu einer Automatik, die es nicht gibt');
    }
  }

  /* Auch die Quelle traegt die Zusage nicht. Ein in einem Kommentar geparkter
     Satz ueberlebt dort, waehrend der Minifier ihn aus dist/ entfernt — die
     Pruefung oben saehe ihn nie. Deshalb hier, entgegen der sonstigen Regel
     dieser Datei, ein Blick auf site/. */
  const G1_SITE = join(fileURLToPath(new URL('..', import.meta.url)), 'site');
  let g1Quellen = [];
  try { g1Quellen = (await readdir(join(G1_SITE, 'wissen'))).filter((n) => n.endsWith('.html')); } catch { /* unten */ }
  if (!g1Quellen.length) {
    F('G-1: keine Wissensquelle unter site/wissen/ — die Quellpruefung liefe ins Leere');
  }
  const g1Analysequelle = 'website-analyse.html';
  if (!(await existiert(join(G1_SITE, g1Analysequelle)))) {
    F(`G-1.2: site/${g1Analysequelle} fehlt — die Analyse-Route haette keine Quelle`);
  } else {
    const roh = await readFile(join(G1_SITE, g1Analysequelle), 'utf8');
    for (const satz of G1_VERBOTEN.de) {
      if (g1Suche(roh, satz))
        F(`G-1.4: site/${g1Analysequelle} nennt "${satz}" — auch die Quelle sagt keine Automatik zu`);
    }
    for (const wort of G1_AUTOMAT) {
      if (g1Flach(roh).includes(g1Flach(wort)))
        F(`G-1.6: site/${g1Analysequelle} nennt "${wort}" — auch die Quelle kennt kein Auftragswerk`);
    }
  }
  for (const name of g1Quellen) {
    const roh = await readFile(join(G1_SITE, 'wissen', name), 'utf8');
    for (const satz of G1_VERBOTEN.de) {
      if (g1Suche(roh, satz))
        F(`G-1.4: site/wissen/${name} nennt "${satz}" — auch die Quelle sagt keine Automatik zu`);
    }
    /* Der Bauhinweis ist mit der Freigabe der Strecke gefallen. Er darf nicht
       ueber eine Ueberarbeitung zurueckkommen, ohne dass jemand es merkt. */
    if (/class="[^"]*\bwissen-status\b/.test(roh))
      F(`G-1: site/wissen/${name} traegt wieder einen wissen-status-Bauhinweis — ` +
        'der Wissensbereich zeigt keinen Aufbau-Status mehr an');
  }


  /* --- G-2: was die Analyse-Anfrage ueber sich selbst sagt ----------------
     G-1 prueft das Produktversprechen: von Hand erstellt, Ergebnis per Mail,
     kein Automat. G-2 prueft die zweite Sorte Zusage, die dieselbe Seite
     abgibt — die ueber den Umgang mit den Angaben und ueber die Zeit.

     Der Fehler, den PXK-30 gefunden hat, war wieder keiner der Adressen oder
     des Aufbaus. Die Seite zaehlte auf, was NICHT geschieht: nicht
     gespeichert, kein Drittanbieter-Formulardienst, keine Weitergabe, direkt
     ins Postfach. Belegt war davon nichts — die Strecke laeuft ueber die
     Hostingumgebung und einen Versanddienst, und im Postfach liegt die
     Anfrage sehr wohl. Daneben stand eine Frist ("Antwort in 1 Werktag"),
     die niemand misst.

     Solche Saetze bestehen jedes Tor, das nur Adressen und Aufbau kennt.
     Geprueft wird deshalb wieder der Vertrag selbst, in beide Richtungen:

       G-2.1  die Analyse-Seite behauptet keine Verarbeitung mehr, fuer die
              es keinen Beleg gibt;
       G-2.2  sie sagt stattdessen, was wirklich geschieht — und der Satz,
              der es sagt, verweist auf die Datenschutzerklaerung;
       G-2.3  sie sagt keine Frist zu;
       G-2.4  das Bestaetigungsfeld behauptet keine Rechtsgrundlage;
       G-2.5  die Datenschutzerklaerung kennt die Analyse-Anfrage und nennt
              die Felder, die sie wirklich erhebt;
       G-2.6  der Wissensbereich hat genau so viele Platzhalter wie zuvor —
              eine Aufraeumaktion an dieser Strecke darf dort nichts loeschen.

     G-2 sieht ausschliesslich die Analyse-Route und die
     Datenschutzerklaerung. Die Startseite traegt dieselben Saetze im
     eigenen Formular; sie gehoert nicht zu dieser Strecke und wird hier
     bewusst nicht mitgeprueft. Was dort steht, ist in PXK-30 ausdruecklich
     ausserhalb des Auftrags — und ein Tor, das mehr prueft als sein Auftrag
     deckt, faellt beim naechsten Lauf aus einem Grund um, den niemand
     bestellt hat.

     Der Laufzeitteil desselben Vertrags — Trockenlauf, delivered, Protokoll
     ohne Personenbezug — liegt nicht hier: diese Datei sieht nur dist/, und
     api/server.mjs steht dort nicht. Dafuer gibt es
     scripts/pruefe-formular.mjs, das den Dienst wirklich startet. */

  /* Was nicht mehr dastehen darf. Die Liste nennt die Behauptung, nicht die
     Formulierung von gestern: "nicht gespeichert" faengt auch eine spaetere
     Variante desselben Versprechens. */
  const G2_VERBOTEN = {
    de: ['direkt in unser Postfach', 'nicht gespeichert', 'Drittanbieter-Formulardienst',
         'keine Weitergabe', 'keine Daten an Dritte',
         'Antwort in 1 Werktag', 'innerhalb eines Werktags', 'in einem Werktag',
         'Ich bin damit einverstanden', 'Einwilligung ist jederzeit widerrufbar'],
    en: ['straight into our mailbox', 'not stored', 'third-party form service',
         'no sharing', 'no data to third parties',
         'Reply within 1 business day', 'within one business day', 'within one working day',
         'I consent', 'Consent can be withdrawn'],
  };

  /* Was dastehen MUSS. Ohne diese Saetze haette die Seite die falschen zwar
     verloren, aber nichts an ihre Stelle gesetzt — und eine Aufnahme, die
     ueber den Verbleib der Angaben schweigt, ist keine Verbesserung. */
  const G2_ZUSAGE = {
    de: ['Ihre Angaben werden über unsere Website-Infrastruktur verarbeitet',
         'per E-Mail an unser Postfach übermittelt',
         'genannten technischen Dienstleister eingebunden sein',
         'Ich habe zur Kenntnis genommen'],
    en: ['processed through our website infrastructure',
         'to our mailbox',
         'Technical service providers named in our',
         'I have read how my details are processed'],
  };

  /* Der Verweis gehoert IN den Satz ueber den Datenfluss, nicht irgendwohin
     auf die Seite. Ein Link im Fussbereich wuerde die Bedingung sonst
     miterfuellen, ohne dass der Satz selbst weiterfuehrt. */
  const G2_FLUSS = { de: 'Website-Infrastruktur', en: 'website infrastructure' };
  const G2_DATENSCHUTZ = '/datenschutz.html';

  for (const eintrag of analyserouten) {
    const pfad = join(ZIEL, eintrag.pfad);
    if (!(await existiert(pfad))) {
      F(`G-2: ${eintrag.pfad} fehlt in dist/ — die Regel bleibt dort ungeprueft`);
      continue;
    }
    const seite = g1OhneBuendel(await readFile(pfad, 'utf8'));
    const rumpf = g1Rumpf(seite);
    if (rumpf === null) {
      F(`G-2: ${eintrag.pfad} hat kein <body> — die Zusagen liessen sich nicht pruefen`);
      continue;
    }

    for (const satz of G2_VERBOTEN[eintrag.lang]) {
      if (g1Suche(seite, satz))
        F(`G-2.1/2.3/2.4: ${eintrag.pfad} nennt "${satz}" — diese Zusage hat kein ` +
          'Gegenstueck im tatsaechlichen Ablauf');
    }
    for (const satz of G2_ZUSAGE[eintrag.lang]) {
      if (!g1Suche(rumpf, satz))
        F(`G-2.2: ${eintrag.pfad} sagt nicht "${satz}" — ohne das bleibt offen, ` +
          'was mit den Angaben geschieht');
    }

    /* G-2.2: der Verweis im Satz selbst. Gesucht wird der Absatz, in dem von
       der Infrastruktur die Rede ist, und darin der Verweis. */
    const marke = g1Flach(G2_FLUSS[eintrag.lang]);
    const absaetze = [...rumpf.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[0]);
    const fluss = absaetze.filter((p) => g1Flach(p).includes(marke));
    if (!fluss.length) {
      F(`G-2.2: ${eintrag.pfad}: kein Absatz spricht vom Datenfluss ` +
        `("${G2_FLUSS[eintrag.lang]}") — der Verweis liesse sich nicht zuordnen`);
    } else if (!fluss.some((p) => p.includes(`href="${G2_DATENSCHUTZ}"`))) {
      F(`G-2.2: ${eintrag.pfad}: der Absatz ueber den Datenfluss verweist nicht auf ` +
        `${G2_DATENSCHUTZ} — wer die Dienstleister nennt, muss auch sagen wo`);
    }
  }

  /* Auch die Quelle darf die alten Zusagen nicht mehr tragen — ein in einem
     Kommentar geparkter Satz ueberlebt dort, waehrend der Minifier ihn aus
     dist/ entfernt. */
  if (await existiert(join(G1_SITE, g1Analysequelle))) {
    const roh = await readFile(join(G1_SITE, g1Analysequelle), 'utf8');
    /* Der Kommentar an der reparierten Stelle nennt die alten Formulierungen,
       um zu erklaeren, warum sie weg sind. Genau dieser Absatz ist ausgenommen
       — sonst muesste die Begruendung ungeschrieben bleiben. */
    const ohneBegruendung = roh.replace(/<!--[\s\S]*?-->/g, ' ');
    for (const satz of G2_VERBOTEN.de) {
      if (g1Suche(ohneBegruendung, satz))
        F(`G-2.1: site/${g1Analysequelle} nennt "${satz}" — auch die Quelle gibt ` +
          'diese Zusage nicht mehr');
    }
  }

  /* --- G-2.5: die Datenschutzerklaerung kennt die Aufnahme --------------- */
  const G2_DS_SEITE = 'datenschutz.html';
  const G2_DS_UEBERSCHRIFT = 'Anfrage einer Website-Analyse';
  const G2_DS_PFAD = join(ZIEL, G2_DS_SEITE);
  if (!(await existiert(G2_DS_PFAD))) {
    F(`G-2.5: ${G2_DS_SEITE} fehlt in dist/ — die Feldbeschreibung bliebe ungeprueft`);
  } else {
    const ds = await readFile(G2_DS_PFAD, 'utf8');
    const anfang = ds.search(new RegExp(`<h2>[^<]*${regexEscape(G2_DS_UEBERSCHRIFT)}[^<]*</h2>`));
    if (anfang < 0) {
      F(`G-2.5: ${G2_DS_SEITE} hat keinen Abschnitt "${G2_DS_UEBERSCHRIFT}" — die ` +
        'Aufnahme erhebt Angaben, die die Erklaerung nicht kennt');
    } else {
      /* Nur der eigene Abschnitt zaehlt. Name und E-Mail-Adresse stehen auch
         im Kontaktformular-Abschnitt darueber; wuerde die ganze Seite
         durchsucht, waere die Regel schon vor dieser Aenderung gruen
         gewesen und haette nie etwas geprueft. */
      const naechste = ds.slice(anfang + 4).search(/<h2\b/);
      const abschnitt = naechste < 0 ? ds.slice(anfang) : ds.slice(anfang, anfang + 4 + naechste);
      const G2_FELDER = [
        { muster: /<li>[^<]*Adresse \(URL\)[^<]*<\/li>/, was: 'Adresse (URL) der Website' },
        { muster: /<li>\s*Name\s*<\/li>/,                 was: 'Name' },
        { muster: /<li>[^<]*E-Mail-Adresse[^<]*<\/li>/,   was: 'E-Mail-Adresse' },
        { muster: /<li>[^<]*Anmerkungen[^<]*<\/li>/,      was: 'Anmerkungen (freiwillig)' },
      ];
      for (const { muster, was } of G2_FELDER) {
        if (!muster.test(abschnitt))
          F(`G-2.5: ${G2_DS_SEITE}, Abschnitt "${G2_DS_UEBERSCHRIFT}": das Feld ` +
            `${was} wird nicht aufgefuehrt — erhoben wird es trotzdem`);
      }
      if (!/freiwillig/i.test(abschnitt))
        F(`G-2.5: ${G2_DS_SEITE}, Abschnitt "${G2_DS_UEBERSCHRIFT}": Pflicht- und ` +
          'freiwillige Angaben werden nicht unterschieden');
    }
    /* Rechtssicherheit ist nichts, was eine Seite ueber sich selbst behaupten
       kann. Wo sie es doch tut, ist es Werbung im falschen Dokument. */
    for (const wort of ['DSGVO-konform', 'rechtssicher', 'datenschutzkonform']) {
      if (g1Flach(ds).includes(g1Flach(wort)))
        F(`G-2.5: ${G2_DS_SEITE} nennt "${wort}" — eine Erklaerung beschreibt die ` +
          'Verarbeitung, sie bescheinigt sie nicht');
    }
  }

  /* --- G-2.6: der Wissensbereich bleibt unangetastet --------------------- */
  const G2_PLATZHALTER_SOLL = 24;
  let g2Platzhalter = 0;
  for (const name of g1Quellen) {
    const roh = await readFile(join(G1_SITE, 'wissen', name), 'utf8');
    g2Platzhalter += (roh.match(/wissen-platzhalter/g) || []).length;
  }
  if (!g1Quellen.length) {
    F('G-2.6: keine Wissensquelle gelesen — die Zaehlung liefe ins Leere');
  } else if (g2Platzhalter !== G2_PLATZHALTER_SOLL) {
    F(`G-2.6: site/wissen/ traegt ${g2Platzhalter} Platzhalter, erwartet ` +
      `${G2_PLATZHALTER_SOLL} — der Wissensbereich gehoert nicht zu dieser Strecke ` +
      '(seine Platzhalter loest PXK-58)');
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
