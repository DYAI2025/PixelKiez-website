/* =========================================================================
   Der Laufzeitvertrag der Formularstrecke (PXK-30).

   scripts/verify.mjs prueft dist/ — was auf den Seiten steht. Diese Datei
   prueft, was der Dienst TUT: sie startet api/server.mjs wirklich, je Fall
   in einem eigenen Prozess mit eigener Umgebung und eigenem Port, schickt
   eine echte Anfrage und misst Antwort, Netzverkehr und Protokoll.

   Drei Zusagen stehen hier auf dem Pruefstand:

     1. MAIL_DRYRUN verhindert jede Zustellung — auch bei vollstaendig
        eingerichtetem SMTP- ODER Resend-Zugang. Gemessen wird nicht der
        Quelltext, sondern der Netzverkehr: scripts/pruefung/netzsonde.mjs
        haengt sich vor fetch und net.Socket.prototype.connect.
     2. `delivered` sagt die Wahrheit: true nur nach echtem Versand.
     3. Kein Protokolleintrag enthaelt uebermittelte Angaben.

   Damit die Messung nicht aus dem falschen Grund gruen wird, faehrt jeder
   Riegel seinen Kanarienvogel mit: derselbe Fall OHNE MAIL_DRYRUN muss den
   Netzverkehr ausloesen, den der Trockenlauf verhindert. Bleibt der
   Kanarienvogel stumm, greift die Sonde nicht — und dann beweist kein
   einziger gruener Fall etwas.

   Fuer die PII-Zusage gibt es denselben Gegenbeweis von aussen:

     node scripts/pruefe-formular.mjs --kanarienvogel <alte-server.mjs>

   laesst dieselben Faelle gegen eine aeltere Fassung des Dienstes laufen und
   BESTEHT nur, wenn sie die Kennmarken im Protokoll findet. Eine Pruefung,
   die auch am kaputten Stand gruen ist, prueft nichts.

   Kein Netz, keine Zugangsdaten, keine Abhaengigkeit ausser der, die api/
   ohnehin hat.
   ========================================================================= */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL  = fileURLToPath(new URL('..', import.meta.url));
const SONDE   = join(WURZEL, 'scripts', 'pruefung', 'netzsonde.mjs');
const STANDARD_DIENST = join(WURZEL, 'api', 'server.mjs');

/* --- Kennmarken ---------------------------------------------------------
   Absichtlich unverwechselbar. Taucht eine davon im Protokoll auf, stammt
   sie aus der Anfrage — ein Zufallstreffer ist ausgeschlossen. */
const MARKE = {
  name:     'ZZNAMENSMARKE Mustermann',
  kontakt:  'zzmailmarke@example.org',
  telefon:  '+49 30 ZZTELEFONMARKE',
  adresse:  'https://zzadressmarke.example/pfad',
  freitext: 'ZZFREITEXTMARKE bitte besonders auf die Ladezeit achten',
};

/* So schickt die Analyse-Seite ihre Anfrage: die Webadresse steht im
   Anliegen, weil der Dienst kein eigenes Feld dafuer kennt (bds.js). */
const ANFRAGE = {
  name:     MARKE.name,
  kontakt:  MARKE.kontakt,
  anliegen: 'Website: ' + MARKE.adresse + '\n' + MARKE.freitext + '\n' + MARKE.telefon,
  consent:  true,
  quelle:   '/website-analyse/',
  ts:       '2026-09-03T00:00:00.000Z',
};

const SMTP_VOLL = {
  SMTP_HOST: '127.0.0.1',     // IP: der Dienst loest sonst auf Modulebene per DNS auf
  SMTP_PORT: '465',
  SMTP_USER: 'dienst@example.org',
  SMTP_PASS: 'geheim-nur-fuer-den-test',
  MAIL_TO:   'postfach@example.org',
  MAIL_FROM: 'dienst@example.org',
};
const RESEND_VOLL = {
  RESEND_KEY: 're_testschluessel_ohne_wirkung',
  MAIL_TO:    'postfach@example.org',
  MAIL_FROM:  'dienst@example.org',
};

/* --- Buchfuehrung ------------------------------------------------------- */
const fehler = [];
const zeilen = [];
const F = (fall, satz) => fehler.push(`${fall}: ${satz}`);

/* Ein Haken darf nur stehen, wenn dieser Fall wirklich nichts gemeldet hat.
   Vorher waren `fehler` und `zeilen` zwei unabhaengige Listen und ok() lief
   am Ende jedes Blocks bedingungslos — ein durchgefallener Fall bekam damit
   Haken UND Kreuz. Der Rueckgabewert des Laufs stimmte, die Ausgabe log.
   Jede Meldung traegt den Fallnamen als Vorsatz; daran haengt die Abfrage. */
const ok = (fall, satz) => {
  if (fehler.some((f) => f.startsWith(`${fall}: `))) return;
  zeilen.push(`  \x1b[32m✔\x1b[0m ${fall} — ${satz}`);
};

let naechsterPort = 39200;
const port = () => naechsterPort++;

/* --- einen Fall fahren --------------------------------------------------
   Eigener Prozess je Fall: api/server.mjs liest die Umgebung auf Modulebene
   und beginnt beim Import zu lauschen. Zwei Konfigurationen in einem Prozess
   gibt es nicht. */
async function fahre({ dienst, umgebung, modus = 'blockieren', koerper = ANFRAGE, pfad = '/api/kontakt', methode = 'POST', ordner }) {
  const p = port();
  const log = join(ordner, `sonde-${p}.jsonl`);
  await writeFile(log, '');

  const kind = spawn(process.execPath, ['--import', SONDE, dienst], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      PORT: String(p),
      PXK_SONDE_LOG: log,
      PXK_SONDE_MODUS: modus,
      ...umgebung,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ausgabe = '';
  kind.stdout.on('data', (b) => { ausgabe += b; });
  kind.stderr.on('data', (b) => { ausgabe += b; });

  /* Warten, bis der Dienst wirklich lauscht — nicht blind schlafen. */
  const bereit = await new Promise((fertig) => {
    const frist = setTimeout(() => fertig(false), 15000);
    const pruefe = () => {
      if (/auf Port \d+/.test(ausgabe)) { clearTimeout(frist); fertig(true); }
    };
    kind.stdout.on('data', pruefe);
    kind.on('exit', () => { clearTimeout(frist); fertig(false); });
    pruefe();
  });

  let antwort = null;
  if (bereit) {
    try {
      const r = await fetch(`http://127.0.0.1:${p}${pfad}`, {
        method: methode,
        headers: methode === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: methode === 'POST' ? JSON.stringify(koerper) : undefined,
      });
      const roh = await r.text();
      let j = null;
      try { j = JSON.parse(roh); } catch { /* bleibt null */ }
      antwort = { status: r.status, roh, j };
    } catch (e) {
      antwort = { status: 0, roh: 'Anfrage fehlgeschlagen: ' + e.message, j: null };
    }
  }

  /* Erst nachsehen, dann warten. Ein Kind, das beim Start abgestuerzt ist,
     hat sein 'exit' laengst gesendet — ein danach angehaengter Zuhoerer
     hoert es nie und der Lauf bliebe stehen. Genau der Fall, in dem der
     Bericht "der Dienst kam nicht zum Lauschen" gebraucht wird, waere damit
     unerreichbar. Die Frist ist der zweite Riegel. */
  kind.kill('SIGKILL');
  await new Promise((fertig) => {
    if (kind.exitCode !== null || kind.signalCode !== null) { fertig(); return; }
    const frist = setTimeout(fertig, 5000);
    kind.once('exit', () => { clearTimeout(frist); fertig(); });
  });
  await new Promise((fertig) => setTimeout(fertig, 30));

  const rohLog = await readFile(log, 'utf8');
  const treffer = rohLog.split('\n').filter(Boolean).map((z) => JSON.parse(z));
  return { bereit, antwort, treffer, ausgabe };
}

/* --- Zusicherungen ------------------------------------------------------ */
let messungen = 0;

function messungBrauchbar(fall, e) {
  if (!e.bereit) { F(fall, `der Dienst kam nicht zum Lauschen. Ausgabe:\n${e.ausgabe}`); return false; }
  if (e.antwort === null) { F(fall, 'keine Antwort gemessen'); return false; }
  if (e.antwort.status === 0) { F(fall, e.antwort.roh); return false; }
  messungen++;
  return true;
}

function pruefeStatus(fall, e, soll) {
  if (e.antwort.status !== soll)
    F(fall, `HTTP ${e.antwort.status}, erwartet ${soll} — Antwort: ${e.antwort.roh}`);
}

/* delivered wird auf ZWEI Dinge geprueft: dass das Feld ueberhaupt da ist,
   und welchen Wert es hat. Ohne die erste Haelfte bestuende die Pruefung
   auch gegen einen Dienst, der das Feld gar nicht kennt — und genau dessen
   Antwort laesst ein aelteres Formular "Angekommen" zeigen. */
function pruefeDelivered(fall, e, soll) {
  const j = e.antwort.j;
  if (!j || typeof j !== 'object') { F(fall, `keine JSON-Antwort: ${e.antwort.roh}`); return; }
  if (!Object.prototype.hasOwnProperty.call(j, 'delivered')) {
    F(fall, `die Antwort traegt kein Feld "delivered": ${e.antwort.roh}`); return;
  }
  if (j.delivered !== soll)
    F(fall, `delivered ist ${JSON.stringify(j.delivered)}, erwartet ${soll} — ${e.antwort.roh}`);
}

function pruefeKeinVersand(fall, e) {
  if (e.treffer.length !== 0)
    F(fall, `${e.treffer.length} Versandversuch(e) trotz Trockenlauf: ${JSON.stringify(e.treffer)}`);
}

function pruefeVersuch(fall, e, was) {
  const passend = e.treffer.filter((t) => t.was === was);
  if (passend.length !== 1)
    F(fall, `${passend.length} Versuche ueber "${was}", erwartet genau 1 — ` +
      `${JSON.stringify(e.treffer)}. Ohne diesen Kanarienvogel beweist kein ` +
      'Trockenlauf-Fall etwas: eine nicht greifende Sonde sieht genauso aus.');
  return passend;
}

/* Gesucht wird nicht nur die vollstaendige Angabe, sondern auch ihr
   kennzeichnender Teil. Ein Protokoll, das den Namen auf 40 Zeichen kuerzt
   oder nur die Domain der Adresse nennt, hat trotzdem Personenbezug — eine
   Suche nach der ganzen Zeichenkette liesse genau das durch. */
const TEILMARKEN = {
  name:     ['ZZNAMENSMARKE'],
  kontakt:  ['zzmailmarke', 'example.org'],
  telefon:  ['ZZTELEFONMARKE'],
  adresse:  ['zzadressmarke'],
  freitext: ['ZZFREITEXTMARKE'],
};

function pruefeOhnePersonenbezug(fall, e) {
  const gefunden = Object.entries(MARKE).filter(([feld, wert]) =>
    e.ausgabe.includes(wert) || (TEILMARKEN[feld] || []).some((t) => e.ausgabe.includes(t)));
  if (gefunden.length)
    F(fall, `im Protokoll stehen uebermittelte Angaben: ${gefunden.map(([n]) => n).join(', ')}\n` +
      `      Ausgabe:\n${e.ausgabe.split('\n').map((z) => '        ' + z).join('\n')}`);
  return gefunden;
}

/* ========================================================================= */
async function lauf(dienst, kanarienvogel) {
  const ordner = await mkdtemp(join(tmpdir(), 'pxk30-'));
  const marken = [];
  try {
    /* --- 1. MAIL_DRYRUN gegen einen vollstaendigen SMTP-Zugang --------- */
    {
      const fall = 'T1 Trockenlauf trotz SMTP-Zugang';
      const e = await fahre({ dienst, ordner, umgebung: { ...SMTP_VOLL, MAIL_DRYRUN: '1' } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 200);
        pruefeDelivered(fall, e, false);
        pruefeKeinVersand(fall, e);
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'HTTP 200, delivered:false, kein Socket, kein Personenbezug');
      }
    }

    /* --- 2. MAIL_DRYRUN gegen einen vollstaendigen Resend-Zugang ------- */
    {
      const fall = 'T2 Trockenlauf trotz Resend-Zugang';
      const e = await fahre({ dienst, ordner, umgebung: { ...RESEND_VOLL, MAIL_DRYRUN: '1' } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 200);
        pruefeDelivered(fall, e, false);
        pruefeKeinVersand(fall, e);
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'HTTP 200, delivered:false, kein fetch, kein Personenbezug');
      }
    }

    /* --- 3. Kanarienvogel SMTP: ohne MAIL_DRYRUN MUSS es hinausgehen --- */
    {
      const fall = 'T3 Kanarienvogel SMTP';
      const e = await fahre({ dienst, ordner, umgebung: { ...SMTP_VOLL } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 502);
        pruefeDelivered(fall, e, false);
        pruefeVersuch(fall, e, 'socket.connect');
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'genau 1 Socket-Versuch — die Sonde greift');
      }
    }

    /* --- 4. Kanarienvogel Resend -------------------------------------- */
    {
      const fall = 'T4 Kanarienvogel Resend';
      const e = await fahre({ dienst, ordner, umgebung: { ...RESEND_VOLL } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 502);
        pruefeDelivered(fall, e, false);
        const t = pruefeVersuch(fall, e, 'fetch');
        if (t.length === 1 && !String(t[0].url).startsWith('https://api.resend.com/'))
          F(fall, `fetch ging an ${t[0].url}, erwartet https://api.resend.com/…`);
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'genau 1 fetch an api.resend.com — die Sonde greift');
      }
    }

    /* --- 5. echte Zustellung: delivered MUSS true sein ----------------- */
    {
      const fall = 'T5 gelungene Zustellung';
      const e = await fahre({ dienst, ordner, umgebung: { ...RESEND_VOLL }, modus: 'gelingen' });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 200);
        pruefeDelivered(fall, e, true);
        pruefeVersuch(fall, e, 'fetch');
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'HTTP 200, delivered:true nach echtem Versandweg');
      }
    }

    /* --- 6. nicht eingerichtet: abweisen, nicht still annehmen --------- */
    {
      const fall = 'T6 Versand nicht eingerichtet';
      const e = await fahre({ dienst, ordner, umgebung: { MAIL_DRYRUN: '0' } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 503);
        pruefeDelivered(fall, e, false);
        pruefeKeinVersand(fall, e);
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        ok(fall, 'HTTP 503, delivered:false — der Fehlerpfad bleibt erhalten');
      }
    }

    /* --- 7. der Schalter faellt zur sicheren Seite --------------------- */
    {
      const fall = 'T7 MAIL_DRYRUN=yes (Tippfehler)';
      const e = await fahre({ dienst, ordner, umgebung: { ...SMTP_VOLL, MAIL_DRYRUN: 'yes' } });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 200);
        pruefeDelivered(fall, e, false);
        pruefeKeinVersand(fall, e);
        ok(fall, 'ein unbekannter Wert schaltet den Trockenlauf EIN, nicht aus');
      }
    }

    /* --- 8. und laesst sich ausdruecklich abschalten ------------------- */
    {
      const fall = 'T8 MAIL_DRYRUN=0 schaltet ab';
      const e = await fahre({ dienst, ordner, umgebung: { ...SMTP_VOLL, MAIL_DRYRUN: '0' } });
      if (messungBrauchbar(fall, e)) {
        pruefeVersuch(fall, e, 'socket.connect');
        ok(fall, 'der Aus-Wert wird gehoert — der Riegel ist kein Einbahnschalter');
      }
    }

    /* --- 9. fehlende Bestaetigung ------------------------------------- */
    {
      const fall = 'T9 Bestaetigung fehlt';
      const e = await fahre({
        dienst, ordner,
        umgebung: { ...SMTP_VOLL, MAIL_DRYRUN: '1' },
        koerper: { ...ANFRAGE, consent: false },
      });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 400);
        pruefeDelivered(fall, e, false);
        pruefeKeinVersand(fall, e);
        marken.push(pruefeOhnePersonenbezug(fall, e).length);
        if (e.antwort.j && /einwilligung/i.test(String(e.antwort.j.fehler)))
          F(fall, `die Meldung "${e.antwort.j.fehler}" behauptet weiterhin eine Einwilligung`);
        ok(fall, 'HTTP 400 ohne Versand, Meldung ohne Rechtsgrundlagen-Behauptung');
      }
    }

    /* --- 10. die Auskunft widerspricht dem Verhalten nicht ------------- */
    {
      const fall = 'T10 /api/health im Trockenlauf';
      const e = await fahre({
        dienst, ordner,
        umgebung: { ...SMTP_VOLL, MAIL_DRYRUN: '1' },
        pfad: '/api/health', methode: 'GET',
      });
      if (messungBrauchbar(fall, e)) {
        pruefeStatus(fall, e, 200);
        const j = e.antwort.j || {};
        if (j.versandbereit !== false)
          F(fall, `versandbereit ist ${JSON.stringify(j.versandbereit)}, erwartet false`);
        if (!/trockenlauf/i.test(String(j.modus)))
          F(fall, `modus meldet "${j.modus}" — der Dienst versendet aber nichts`);
        ok(fall, 'versandbereit:false und ein Modus, der zum Verhalten passt');
      }
    }
  } finally {
    await rm(ordner, { recursive: true, force: true });
  }

  /* Der Gegenbeweis fuer die PII-Zusage. Gegen den reparierten Dienst darf
     keine Kennmarke auftauchen; gegen den alten MUESSEN welche auftauchen —
     sonst sucht die Pruefung nach etwas, das sie ohnehin nie faende. */
  const gesamt = marken.reduce((a, b) => a + b, 0);
  if (kanarienvogel) {
    if (messungen === 0) {
      /* Kein einziger Fall kam bis zu einer Antwort. Dann sagt die Zaehlung der
         Kennmarken nichts aus — sie waere null, weil nichts lief, nicht weil
         nichts leckte. Das ist ein anderer Befund und muss anders heissen. */
      const ausgaben = fehler.slice(0, 2).join('\n      ');
      fehler.length = 0;
      fehler.push(
        'KANARIENVOGEL NICHT MESSBAR: kein einziger Fall kam bis zu einer Antwort — ' +
        'der angegebene Dienst startete nicht. Die PII-Regel wurde damit nicht ' +
        `gegengeprueft.\n      ${ausgaben}`);
    } else if (gesamt === 0) {
      fehler.length = 0;
      fehler.push(
        'KANARIENVOGEL STUMM: die alte Fassung des Dienstes hinterliess keine einzige ' +
        'Kennmarke im Protokoll. Damit prueft die PII-Regel nichts — sie waere auch ' +
        'gruen, wenn sie gar nicht suchte.');
    } else {
      fehler.length = 0;
      zeilen.length = 0;
      ok('KANARIENVOGEL', `die alte Fassung hinterliess ${gesamt} Kennmarke(n) im Protokoll — ` +
        'die PII-Regel greift nachweislich');
    }
  }
}

/* ========================================================================= */
const argumente = process.argv.slice(2);
const kIndex = argumente.indexOf('--kanarienvogel');
const kanarienvogel = kIndex >= 0;
const dienst = kanarienvogel ? argumente[kIndex + 1] : STANDARD_DIENST;

if (!dienst || !existsSync(dienst)) {
  console.error(`\n\x1b[31mDienst nicht gefunden: ${dienst}\x1b[0m\n`);
  process.exit(1);
}

console.log('\n\x1b[1mFormularstrecke — Laufzeitvertrag\x1b[0m');
console.log('─'.repeat(70));
console.log(`  Dienst: ${dienst}${kanarienvogel ? '   \x1b[33m(Kanarienvogel-Lauf)\x1b[0m' : ''}`);
console.log('─'.repeat(70));

await lauf(dienst, kanarienvogel);

for (const z of zeilen) console.log(z);
console.log('─'.repeat(70));
if (fehler.length) {
  for (const f of fehler) console.log(`  \x1b[31m✘\x1b[0m ${f}`);
  console.log(`\n\x1b[31mLaufzeitvertrag verletzt: ${fehler.length} Fehler\x1b[0m\n`);
  process.exit(1);
}
console.log('\n\x1b[32mLaufzeitvertrag eingehalten — keine Fehler\x1b[0m\n');
