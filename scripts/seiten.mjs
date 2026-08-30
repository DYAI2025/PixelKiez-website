/* =========================================================================
   Seitenregister — die eine Stelle, die weiss, welche Seiten es gibt.

   EINSPRACHIG: Seiten, die nur deutsch ausgeliefert werden (Rechtsseiten).

   SPRACHPAARE: Seiten, deren englische Fassung der Build aus der deutschen
   Quelle erzeugt. Jeder Eintrag traegt alles, was Build und Werkzeuge dafuer
   brauchen:

     quelle   Quelldatei unter site/
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
  {
    quelle: 'website-analyse.html',
    zielDe: 'website-analyse/index.html',
    zielEn: 'en/website-analyse/index.html',
    pfadDe: '/website-analyse/',
    pfadEn: '/en/website-analyse/',
    ldTausch: [
      ['/website-analyse/', '/en/website-analyse/'],
      ['/website-analyse/#webpage', '/en/website-analyse/#webpage'],
      // isPartOf zeigt auf den WebSite-Knoten der jeweiligen Sprachfassung
      ['/#website', '/en/#website'],
    ],
  },
];
