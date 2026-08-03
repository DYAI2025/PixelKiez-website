/* Liest alle uebersetzbaren Zeichenketten aus site/index.html und schreibt
   sie als Geruest nach site/i18n/en.json. Bereits vorhandene Uebersetzungen
   bleiben erhalten, neue kommen mit leerem Wert dazu. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lieseStrings } from './i18n.mjs';

const W = fileURLToPath(new URL('..', import.meta.url));
const html = await readFile(join(W, 'site', 'index.html'), 'utf8');

/* Textknoten und Attribute holt lieseStrings. Das JSON-LD steckt in einem
   <script>, das der Zerleger bewusst nicht anfasst — seine Beschreibungen
   sind aber genauso Inhalt und muessen mit. Ohne diesen Zweig verwarf jeder
   Lauf die vorhandenen JSON-LD-Uebersetzungen. */
function ldStrings(quelle) {
  const m = quelle.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  const raus = [];
  const geh = (o) => {
    if (Array.isArray(o)) return o.forEach(geh);
    if (o && typeof o === 'object') return Object.values(o).forEach(geh);
    if (typeof o !== 'string') return;
    // Nur Saetze, keine Bezeichner, Adressen oder Codes
    if (/\s/.test(o) && !/^https?:/.test(o) && /[a-zA-ZäöüÄÖÜß]/.test(o)) raus.push(o);
  };
  geh(JSON.parse(m[1]));
  return raus;
}

const strings = [...new Set([...lieseStrings(html), ...ldStrings(html)])];

let alt = {};
try { alt = JSON.parse(await readFile(join(W, 'site', 'i18n', 'en.json'), 'utf8')); } catch {}

const neu = {};
let uebernommen = 0, offen = 0;
for (const s of strings) {
  neu[s] = alt[s] || '';
  if (neu[s]) uebernommen++; else offen++;
}
const entfallen = Object.keys(alt).filter((k) => !(k in neu));

await mkdir(join(W, 'site', 'i18n'), { recursive: true });
await writeFile(join(W, 'site', 'i18n', 'en.json'), JSON.stringify(neu, null, 2) + '\n', 'utf8');

console.log(`  ${strings.length} Zeichenketten · ${uebernommen} bereits übersetzt · ${offen} offen`);
if (entfallen.length) console.log(`  ${entfallen.length} nicht mehr in der Seite: ${entfallen.slice(0,3).join(' | ')}`);
