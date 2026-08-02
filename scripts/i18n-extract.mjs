/* Liest alle uebersetzbaren Zeichenketten aus site/index.html und schreibt
   sie als Geruest nach site/i18n/en.json. Bereits vorhandene Uebersetzungen
   bleiben erhalten, neue kommen mit leerem Wert dazu. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lieseStrings } from './i18n.mjs';

const W = fileURLToPath(new URL('..', import.meta.url));
const html = await readFile(join(W, 'site', 'index.html'), 'utf8');
const strings = lieseStrings(html);

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
