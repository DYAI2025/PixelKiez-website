/* Kleiner Server fuer dist/ — zum Ansehen des Builds vor dem Deploy.
   Setzt dieselben Cache- und Sicherheitskopfzeilen wie der Caddyfile, damit
   das Verhalten dem der Auslieferung entspricht.
   Aufruf: npm run serve  [-- --port 8080] */

import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZIEL = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const argPort = process.argv.indexOf('--port');
const PORT = argPort > -1 ? Number(process.argv[argPort + 1]) : 8080;

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  // Ohne diesen Eintrag ginge die Sitemap als application/octet-stream
  // hinaus, und die Search Console weist sie ab. Caddy setzt den Typ im
  // Betrieb selbst richtig; die Vorschau soll das nicht anders zeigen.
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// Wie im Caddyfile: /api/* geht an den Formulardienst, alles andere kommt aus
// dist/. So laesst sich der ganze Weg vom Formular bis zur Mail lokal testen.
const API = process.env.API_UPSTREAM || '127.0.0.1:3000';

function anApi(req, res) {
  const [host, port] = API.split(':');
  const p = httpRequest({
    host, port: Number(port) || 3000, path: req.url, method: req.method,
    headers: { ...req.headers, host: API, 'x-forwarded-for': req.socket.remoteAddress },
  }, (a) => { res.writeHead(a.statusCode, a.headers); a.pipe(res); });
  p.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, fehler: 'Formulardienst nicht erreichbar' }));
  });
  req.pipe(p);
}

createServer(async (req, res) => {
  let pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pfad.startsWith('/api/')) return anApi(req, res);
  if (pfad.endsWith('/')) pfad += 'index.html';
  // Verzeichnis ohne Schraegstrich: umleiten wie Caddy es in der Auslieferung
  // tut, damit lokal dasselbe passiert wie live.
  else if (!extname(pfad)) {
    res.writeHead(301, { Location: pfad + '/' }); res.end(); return;
  }
  // Pfadausbruch verhindern
  const ziel = join(ZIEL, normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  if (!ziel.startsWith(ZIEL)) { res.writeHead(403).end('verboten'); return; }

  try {
    const s = await stat(ziel);
    if (!s.isFile()) throw new Error('kein File');
    const inhalt = await readFile(ziel);
    const ext = extname(ziel);

    res.setHeader('Content-Type', TYPEN[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    /* Schriften und Bilder tragen einen Inhalts-Hash im Namen, die duerfen
       ewig liegen bleiben. HTML dagegen nie: dies ist der Vorschau-Server,
       hier wird zwischen zwei Aufrufen neu gebaut. Mit max-age haelt der
       Browser eine alte oder halb geschriebene Fassung fest und man sucht
       den Fehler im Code, wo keiner ist. In Produktion setzt Caddy die
       Kopfzeilen, dort gilt weiterhin max-age=300. */
    res.setHeader('Cache-Control', pfad.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-store');

    /* Wie "file_server precompressed br gzip" in der Auslieferung: liegt ein
       fertig gepackter Nachbar bereit und nimmt der Browser die Kodierung an,
       geht dieser hinaus.

       Das ist kein Beiwerk. Ohne Kompression sieht man hier ein voellig
       anderes Bild als im Betrieb — die Startseite geht mit 144 KB statt 27 KB
       ueber die Leitung, und eine Messung an dieser Vorschau haelt fuer einen
       Engpass, was in Wirklichkeit keiner ist. */
    const kodierungen = String(req.headers['accept-encoding'] || '');
    for (const [endung, kodierung] of [['.br', 'br'], ['.gz', 'gzip']]) {
      if (!kodierungen.includes(kodierung)) continue;
      try {
        const gepackt = await readFile(ziel + endung);
        res.setHeader('Content-Encoding', kodierung);
        res.setHeader('Vary', 'Accept-Encoding');
        res.writeHead(200).end(gepackt);
        return;
      } catch { /* kein Nachbar — dann eben das Original */ }
    }

    res.writeHead(200).end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, () => {
  console.log(`\n  dist/ laeuft auf  \x1b[1mhttp://localhost:${PORT}\x1b[0m`);
  console.log('  Beenden mit Strg+C\n');
});
