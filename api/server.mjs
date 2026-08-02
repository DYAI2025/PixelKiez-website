/* =========================================================================
   Berlin Digital Systems — Formular-Gegenstelle

   Nimmt die Anfrage aus dem Kontaktformular als JSON entgegen und stellt sie
   per SMTP ins Postfach zu. Absender ist das eigene Postfach, Antwortadresse
   die des Interessenten — ein Klick auf "Antworten" geht damit direkt an ihn.

   Bewusst ohne Framework: eine Route, eine Aufgabe. Jede Abhaengigkeit hier
   waere eine Angriffsflaeche mehr auf dem Weg zwischen Kunde und Postfach.

   Konfiguration ausschliesslich ueber Umgebungsvariablen — im Code steht
   kein einziges Geheimnis:

     SMTP_HOST      z. B. smtp.ionos.de
     SMTP_PORT      465 (implizites TLS) oder 587 (STARTTLS)
     SMTP_USER      das Postfach, ueber das versendet wird
     SMTP_PASS      dessen Kennwort
     MAIL_TO        wohin die Anfrage geht
     MAIL_FROM      Absenderadresse, muss zur SMTP-Domain passen
     ALLOWED_ORIGIN erlaubte Herkunft, z. B. https://berlin-digital-systems.de
     PORT           von Railway gesetzt

   Fehlen SMTP_HOST oder MAIL_TO, weist der Dienst Anfragen mit 503 ab. Das
   Formular zeigt dann die Adresse zum direkten Anschreiben. Eine Erfolgs-
   meldung ohne Zustellung gibt es bewusst nicht — eine lautlos verlorene
   Anfrage waere schlimmer als eine sichtbar gescheiterte.
   MAIL_DRYRUN=1 nimmt zu Testzwecken an, ohne zu versenden.
   ========================================================================= */

import { createServer } from 'node:http';
import nodemailer from 'nodemailer';

const PORT           = Number(process.env.PORT || 3000);
const SMTP_HOST      = process.env.SMTP_HOST || '';
const SMTP_PORT      = Number(process.env.SMTP_PORT || 465);
const SMTP_USER      = process.env.SMTP_USER || '';
const SMTP_PASS      = process.env.SMTP_PASS || '';
const MAIL_TO        = process.env.MAIL_TO || '';
const MAIL_FROM      = process.env.MAIL_FROM || SMTP_USER;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

// Fehlt der SMTP-Zugang, kann nichts zugestellt werden. Der Dienst meldet das
// dann als Fehler, damit das Formular auf den E-Mail-Pfad ausweicht und die
// Adresse zum direkten Anschreiben zeigt. Ein "Angekommen" ohne Zustellung
// waere die schlimmste Variante: die Anfrage waere lautlos verloren.
// MAIL_DRYRUN=1 erlaubt bewusstes Annehmen ohne Versand — nur zum Testen.
const NICHT_KONFIGURIERT = !SMTP_HOST || !MAIL_TO;
const DRYRUN = /^(1|true|ja)$/i.test(process.env.MAIL_DRYRUN || '');
const TROCKENLAUF = NICHT_KONFIGURIERT;

/* --- Grenzen ------------------------------------------------------------
   Alles, was von aussen kommt, bekommt eine Obergrenze. Ohne die waere ein
   einzelner Aufruf mit ein paar Megabyte genug, um den Dienst lahmzulegen. */
const MAX_BODY   = 16 * 1024;          // 16 KB reichen fuer jedes Formular
const MAX_FELD   = { name: 120, kontakt: 160, branche: 120, anliegen: 4000, quelle: 200 };
const FENSTER_MS = 10 * 60 * 1000;     // Ratenbegrenzung: Zeitfenster
const MAX_PRO_IP = 5;                  // und erlaubte Anfragen darin

const versuche = new Map();            // IP -> Zeitstempel[]

function darfSenden(ip) {
  const jetzt = Date.now();
  const liste = (versuche.get(ip) || []).filter((t) => jetzt - t < FENSTER_MS);
  if (liste.length >= MAX_PRO_IP) { versuche.set(ip, liste); return false; }
  liste.push(jetzt);
  versuche.set(ip, liste);
  // Aufraeumen, damit die Map nicht unbegrenzt waechst
  if (versuche.size > 5000) {
    for (const [k, v] of versuche) {
      if (!v.some((t) => jetzt - t < FENSTER_MS)) versuche.delete(k);
    }
  }
  return true;
}

/* --- Saeuberung ---------------------------------------------------------
   Zeilenumbrueche muessen raus, bevor etwas in eine Kopfzeile wandert.
   Sonst liesse sich ueber den Namen ein zusaetzliches Bcc: einschleusen und
   die Anfrage ginge still an einen Dritten mit. */
// \u2028 und \u2029 sind in JavaScript ebenfalls Zeilenenden und werden von
// manchen Mailservern als solche gelesen — sie muessen genauso weg wie \r\n.
const einzeilig = (s, max) =>
  String(s == null ? '' : s).replace(/[\r\n\u2028\u2029]+/g, ' ').trim().slice(0, max);

const mehrzeilig = (s, max) =>
  String(s == null ? '' : s)
    .replace(/\r\n?/g, '\n')          // auch ein einzelnes \r
    .replace(/[\u2028\u2029]/g, '\n')
    .trim().slice(0, max);

// Bewusst nachsichtig: das Feld nimmt E-Mail ODER Telefonnummer entgegen.
const istMail = (s) => /^[^\s@,;:<>"']+@[^\s@,;:<>"']+\.[A-Za-z]{2,}$/.test(s);

/* --- SMTP --------------------------------------------------------------- */
// Ueblich ist 465 mit implizitem TLS und 587 mit STARTTLS. Manche Anbieter
// weichen davon ab, deshalb laesst sich SMTP_SECURE setzen; ohne Angabe
// entscheidet die Portnummer. Unverschluesselt versendet wird nie:
// requireTLS bricht ab, wenn ein Server kein STARTTLS anbietet.
const SICHER = process.env.SMTP_SECURE
  ? /^(1|true|ja)$/i.test(process.env.SMTP_SECURE)
  : SMTP_PORT === 465;

const transport = TROCKENLAUF ? null : nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SICHER,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  requireTLS: !SICHER,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

/* --- Antworten ---------------------------------------------------------- */
function kopfzeilen(req) {
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  // Nur setzen, wenn die Herkunft passt. Ohne ALLOWED_ORIGIN laeuft der
  // Dienst hinter dem eigenen Reverse-Proxy und braucht kein CORS.
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

const antwort = (req, res, code, daten) => {
  res.writeHead(code, kopfzeilen(req));
  res.end(JSON.stringify(daten));
};

/* --- Server ------------------------------------------------------------- */
const server = createServer((req, res) => {
  const pfad = new URL(req.url, 'http://x').pathname;

  if (req.method === 'OPTIONS') { res.writeHead(204, kopfzeilen(req)); res.end(); return; }

  if (pfad === '/api/health' || pfad === '/health') {
    return antwort(req, res, 200, {
      ok: true,
      versandbereit: !TROCKENLAUF,
      modus: NICHT_KONFIGURIERT ? (DRYRUN ? "Trockenlauf — nimmt an, versendet nicht" : "NICHT EINGERICHTET — Anfragen werden abgewiesen") : "versendet",
    });
  }

  if (pfad !== '/api/kontakt') return antwort(req, res, 404, { ok: false, fehler: 'unbekannter Pfad' });
  if (req.method !== 'POST')   return antwort(req, res, 405, { ok: false, fehler: 'nur POST' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
          || req.socket.remoteAddress || 'unbekannt';

  if (!darfSenden(ip)) return antwort(req, res, 429, { ok: false, fehler: 'zu viele Anfragen' });

  let roh = '', zuGross = false;
  req.on('data', (stueck) => {
    if (zuGross) return;
    roh += stueck;
    if (roh.length > MAX_BODY) {
      zuGross = true; roh = '';
      // Erst antworten, dann abschneiden. Umgekehrt saehe der Absender nur
      // einen abgerissenen Verbindungsversuch und wuesste nicht, warum.
      antwort(req, res, 413, { ok: false, fehler: 'Anfrage zu gross' });
      res.on('finish', () => req.destroy());
    }
  });

  req.on('end', async () => {
    if (zuGross) return;

    let d;
    try { d = JSON.parse(roh); } catch { return antwort(req, res, 400, { ok: false, fehler: 'kein gueltiges JSON' }); }
    if (!d || typeof d !== 'object') return antwort(req, res, 400, { ok: false, fehler: 'unerwartete Daten' });

    // Honigtopf: fuellt ihn etwas aus, war es kein Mensch. Nach aussen sieht
    // das aus wie Erfolg — ein Bot soll nicht lernen, woran er gescheitert ist.
    if (einzeilig(d.firma, 200) !== '') return antwort(req, res, 200, { ok: true });

    const name     = einzeilig(d.name, MAX_FELD.name);
    const kontakt  = einzeilig(d.kontakt, MAX_FELD.kontakt);
    const branche  = einzeilig(d.branche, MAX_FELD.branche);
    const quelle   = einzeilig(d.quelle, MAX_FELD.quelle);
    const anliegen = mehrzeilig(d.anliegen, MAX_FELD.anliegen);

    if (!name)    return antwort(req, res, 400, { ok: false, fehler: 'Name fehlt' });
    if (!kontakt) return antwort(req, res, 400, { ok: false, fehler: 'Kontaktangabe fehlt' });
    if (d.consent !== true) return antwort(req, res, 400, { ok: false, fehler: 'Einwilligung fehlt' });

    const text =
      'Neue Anfrage über die Website\n' +
      '─────────────────────────────\n\n' +
      'Name:      ' + name + '\n' +
      'Kontakt:   ' + kontakt + '\n' +
      'Branche:   ' + (branche || 'keine Angabe') + '\n' +
      'Herkunft:  ' + (quelle || '—') + '\n' +
      'Eingang:   ' + new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + '\n\n' +
      'Anliegen:\n' + (anliegen || '—') + '\n\n' +
      '─────────────────────────────\n' +
      'Einwilligung zur Kontaktaufnahme wurde erteilt.\n' +
      (istMail(kontakt)
        ? 'Ein Klick auf "Antworten" geht direkt an den Interessenten.'
        : 'Die Kontaktangabe ist keine E-Mail-Adresse — bitte telefonisch antworten.');

    if (NICHT_KONFIGURIERT) {
      if (DRYRUN) {
        console.log('[Trockenlauf] Anfrage angenommen, nicht versendet:\n' + text + '\n');
        return antwort(req, res, 200, { ok: true, hinweis: 'Trockenlauf — nicht versendet' });
      }
      console.error('Anfrage NICHT zustellbar — SMTP_HOST oder MAIL_TO fehlt. Von: ' + name);
      return antwort(req, res, 503, { ok: false, fehler: 'Versand nicht eingerichtet' });
    }

    try {
      await transport.sendMail({
        from: MAIL_FROM,                  // eigene Domain, sonst scheitert SPF
        to: MAIL_TO,
        subject: 'Website-Anfrage: ' + name + (branche ? ' · ' + branche : ''),
        text,
        // Nur setzen, wenn es wirklich eine Adresse ist. Sonst wuerde eine
        // Telefonnummer als Antwortadresse landen und die Antwort verpuffen.
        replyTo: istMail(kontakt) ? kontakt : undefined,
      });
      console.log('Anfrage zugestellt an ' + MAIL_TO + ' — von ' + name);
      return antwort(req, res, 200, { ok: true });
    } catch (e) {
      // Der Grund gehoert ins Protokoll, nicht in die Antwort: er verraet
      // sonst Einzelheiten der Mailinfrastruktur.
      console.error('Versand fehlgeschlagen:', e && e.message);
      return antwort(req, res, 502, { ok: false, fehler: 'Versand fehlgeschlagen' });
    }
  });
});

server.listen(PORT, () => {
  console.log('BDS-Formulardienst auf Port ' + PORT);
  console.log(TROCKENLAUF
    ? 'Modus: TROCKENLAUF — es wird nichts versendet (SMTP_HOST oder MAIL_TO fehlt)'
    : 'Modus: Versand über ' + SMTP_HOST + ':' + SMTP_PORT + ' an ' + MAIL_TO);
});
