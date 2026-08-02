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
    res.setHeader('Cache-Control', pfad.startsWith('/assets/fonts/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=300');

    res.writeHead(200).end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, () => {
  console.log(`\n  dist/ laeuft auf  \x1b[1mhttp://localhost:${PORT}\x1b[0m`);
  console.log('  Beenden mit Strg+C\n');
});
