/* =========================================================================
   Seitenregister — die eine Stelle, die weiss, welche Seiten es gibt.

   EINSPRACHIG: Seiten, die nur deutsch ausgeliefert werden (Rechtsseiten).

   SPRACHPAARE: Seiten, deren englische Fassung der Build aus der deutschen
   Quelle erzeugt. Jeder Eintrag traegt alles, was Build und Werkzeuge dafuer
   brauchen:

     quelle   Quelldatei unter site/
     entwurf  optional: true fuer unveroeffentlichte Seiten — der Build
              erzeugt sie, laesst sie aber aus der Sitemap heraus
     zielDe   Zielpfad der deutschen Fassung unter dist/
     zielEn   Zielpfad der englischen Fassung unter dist/
     pfadDe   oeffentlicher Pfad der deutschen Fassung (canonical, hreflang)
     pfadEn   oeffentlicher Pfad der englischen Fassung
     ldTausch Adress-Austausche im JSON-LD der englischen Fassung, als Paare
              [deutscher Pfad, englischer Pfad]. Der Build ersetzt jeweils die
              exakte, in Anfuehrungszeichen stehende Adresse "DOMAIN + Pfad".
              Seitenbezogene Kennungen (#seite, #webpage, ...) muessen
              wechseln — die englische und die deutsche Fassung sind zwei
              Dokumente. Entitaetsbezogene Kennungen (#organisation, #logo,
              #gruender) bleiben absichtlich gleich: es ist dieselbe Sache,
              und genau diese Gleichheit verknuepft die Fassungen.

   scripts/build.mjs und scripts/i18n-extract.mjs lesen dieses Register;
   scripts/verify.mjs prueft das Ergebnis mit einer eigenen, bewusst
   unabhaengigen Tabelle — Abnahme und Erzeugung sollen sich nicht
   gegenseitig bestaetigen koennen.
   ========================================================================= */

export const EINSPRACHIG = ['impressum.html', 'datenschutz.html'];

export const SPRACHPAARE = [
  {
    quelle: 'index.html',
    zielDe: 'index.html',
    zielEn: 'en/index.html',
    pfadDe: '/',
    pfadEn: '/en/',
    ldTausch: [
      ['/', '/en/'],
      ['/#seite', '/en/#seite'],
      ['/#pfad', '/en/#pfad'],
      ['/#faq', '/en/#faq'],
      ['/#website', '/en/#website'],
    ],
  },
  /* --- Manuelle Analyse-Anfrage (PXK-28).
     Ein Aufnahmeformular, kein Self-Service: die Anfrage geht als Mail an
     Pixelkiez, die Analyse entsteht dort von Hand, das Ergebnis kommt per
     E-Mail zurueck. Es gibt keinen Auftrag, keine Warteschlange und keinen
     Abrufpunkt fuer ein Ergebnis — die Seite verspricht deshalb auch keinen.
     entwurf:true wie im Wissensbereich: die Strecke ist gebaut, aber noch
     nicht freigegeben (siehe Datenschutz-Vorbehalt, PXK-30). Die Freigabe
     entfernt das Flag und tauscht die robots-Meta.
     ldTausch: nur die seitenbezogenen Adressen wechseln; #organisation und
     #website bleiben gleich, es ist dieselbe Sache. */
  {
    quelle: 'website-analyse.html',
    zielDe: 'website-analyse/index.html',
    zielEn: 'en/website-analyse/index.html',
    pfadDe: '/website-analyse/',
    pfadEn: '/en/website-analyse/',
    entwurf: true,
    ldTausch: [
      ['/website-analyse/', '/en/website-analyse/'],
      ['/website-analyse/#webpage', '/en/website-analyse/#webpage'],
    ],
  },
  /* --- Wissensbereich (Slice 2): Entwuerfe. entwurf:true heisst:
     kein Sitemap-Eintrag (build.mjs ueberspringt sie dort), die Quelle
     traegt noindex, kein llms.txt-Eintrag, keine Startseiten-Verlinkung.
     Nur der Sitemap-Eintrag folgt automatisch aus dem Flag; die uebrigen
     drei Punkte erzwingt scripts/verify.mjs.
     Die Freigabe eines spaeteren Slices entfernt das Flag und tauscht die
     robots-Meta. ldTausch bleibt leer, solange die Shells kein JSON-LD
     tragen (strukturierte Daten erst mit geprueftem Inhalt). */
  {
    quelle: 'wissen/index.html',
    zielDe: 'wissen/index.html',
    zielEn: 'en/knowledge/index.html',
    pfadDe: '/wissen/',
    pfadEn: '/en/knowledge/',
    entwurf: true,
    ldTausch: [],
  },
  {
    quelle: 'wissen/seo-geo-ai-visibility.html',
    zielDe: 'wissen/seo-geo-ai-visibility/index.html',
    zielEn: 'en/knowledge/seo-geo-ai-visibility/index.html',
    pfadDe: '/wissen/seo-geo-ai-visibility/',
    pfadEn: '/en/knowledge/seo-geo-ai-visibility/',
    entwurf: true,
    ldTausch: [],
  },
  {
    quelle: 'wissen/wie-ki-websites-liest.html',
    zielDe: 'wissen/wie-ki-websites-liest/index.html',
    zielEn: 'en/knowledge/how-ai-reads-websites/index.html',
    pfadDe: '/wissen/wie-ki-websites-liest/',
    pfadEn: '/en/knowledge/how-ai-reads-websites/',
    entwurf: true,
    ldTausch: [],
  },
  {
    quelle: 'wissen/answerability.html',
    zielDe: 'wissen/answerability/index.html',
    zielEn: 'en/knowledge/answerability/index.html',
    pfadDe: '/wissen/answerability/',
    pfadEn: '/en/knowledge/answerability/',
    entwurf: true,
    ldTausch: [],
  },
  {
    quelle: 'wissen/entity-trust.html',
    zielDe: 'wissen/entity-trust/index.html',
    zielEn: 'en/knowledge/entity-trust/index.html',
    pfadDe: '/wissen/entity-trust/',
    pfadEn: '/en/knowledge/entity-trust/',
    entwurf: true,
    ldTausch: [],
  },
  {
    quelle: 'wissen/agent-readiness.html',
    zielDe: 'wissen/agent-readiness/index.html',
    zielEn: 'en/knowledge/agent-readiness/index.html',
    pfadDe: '/wissen/agent-readiness/',
    pfadEn: '/en/knowledge/agent-readiness/',
    entwurf: true,
    ldTausch: [],
  },
];
