/* =========================================================================
   Zugangsdaten pruefen, bevor die Seite live geht.

   Prueft in drei Stufen und sagt bei jedem Fehler, woran es liegt:
     1. Sind alle noetigen Angaben gesetzt?
     2. Nimmt der Postausgangsserver die Anmeldung an?
     3. Kommt eine echte Testmail im Postfach an?

   Aufruf im Ordner api/:

     SMTP_HOST=smtp.ihr-hoster.de \
     SMTP_PORT=465 \
     SMTP_USER=website@ihre-domain.de \
     SMTP_PASS='...' \
     MAIL_TO=kontakt@ihre-domain.de \
     MAIL_FROM=website@ihre-domain.de \
     node mailtest.mjs

   Ohne --senden wird nur die Verbindung geprueft, keine Mail verschickt.

   MAIL_DRYRUN gilt auch hier. Der Dienst versendet nichts, solange die
   Variable gesetzt ist (siehe server.mjs); dieses Werkzeug ist der zweite
   Sender im Repository, und ein Riegel, der nur die Haelfte der Sender
   kennt, ist kein Riegel. Die Verbindungspruefung bleibt erlaubt — sie
   verschickt nichts —, der echte Versand mit --senden wird abgewiesen.
   ========================================================================= */

import nodemailer from 'nodemailer';

const senden = process.argv.includes('--senden');
const E = (n) => process.env[n] || '';

// Gleiche fail-closed-Lesart wie in server.mjs: alles ausser den
// ausdruecklichen Aus-Werten schaltet den Trockenlauf ein.
const DRYRUN = !/^(|0|false|nein|off|aus)$/i.test(String(process.env.MAIL_DRYRUN ?? '').trim());

const rot = (s) => `\x1b[31m${s}\x1b[0m`;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const fett = (s) => `\x1b[1m${s}\x1b[0m`;

console.log('\n' + fett('SMTP-Zugang pruefen') + '\n' + '─'.repeat(58));

/* --- Stufe 1: Vollstaendigkeit ---------------------------------------- */
const noetig = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
const fehlt = noetig.filter((n) => !E(n));
if (fehlt.length) {
  console.log(rot('  ✘ Es fehlen Angaben: ') + fehlt.join(', '));
  console.log('\n  Diese Werte stehen bei Ihrem Hoster unter "E-Mail" →');
  console.log('  "Postausgang" oder "SMTP". Ohne sie kann nichts versendet werden.\n');
  process.exit(1);
}

const PORT   = Number(E('SMTP_PORT') || 465);
const SICHER = E('SMTP_SECURE') ? /^(1|true|ja)$/i.test(E('SMTP_SECURE')) : PORT === 465;
const VON    = E('MAIL_FROM') || E('SMTP_USER');

console.log(`  Server        ${E('SMTP_HOST')}:${PORT}  (${SICHER ? 'implizites TLS' : 'STARTTLS'})`);
console.log(`  Anmeldung als ${E('SMTP_USER')}`);
console.log(`  Absender      ${VON}`);
console.log(`  Empfaenger    ${E('MAIL_TO')}`);

// Haeufige Stolperstelle: viele Hoster lehnen Mails ab, deren Absender nicht
// zu dem Postfach passt, ueber das angemeldet wurde.
const domVon  = VON.split('@')[1] || '';
const domUser = E('SMTP_USER').split('@')[1] || '';
if (domVon && domUser && domVon !== domUser) {
  console.log('\n  ' + rot('Achtung:') + ` MAIL_FROM (${domVon}) und SMTP_USER (${domUser})`);
  console.log('  gehoeren zu verschiedenen Domains. Die meisten Hoster lehnen das ab,');
  console.log('  und selbst wenn nicht, landet die Mail beim Empfaenger im Spam (SPF).');
}

const transport = nodemailer.createTransport({
  host: E('SMTP_HOST'), port: PORT, secure: SICHER,
  auth: { user: E('SMTP_USER'), pass: E('SMTP_PASS') },
  requireTLS: !SICHER,
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
});

/* --- Stufe 2: Verbindung und Anmeldung -------------------------------- */
console.log('\n' + '─'.repeat(58));
process.stdout.write('  Verbindung und Anmeldung … ');
try {
  await transport.verify();
  console.log(gruen('in Ordnung'));
} catch (e) {
  console.log(rot('fehlgeschlagen'));
  console.log('\n  ' + rot(e.message));
  const m = String(e.message).toLowerCase();
  console.log('\n  Woran es meistens liegt:');
  if (m.includes('enotfound') || m.includes('getaddrinfo'))
    console.log('  · Diesen Servernamen gibt es nicht — vermutlich ein Tippfehler.\n' +
                '    Den genauen Namen finden Sie beim Hoster unter "E-Mail" →\n' +
                '    "Postausgangsserver" oder "SMTP".');
  else if (m.includes('auth') || m.includes('535') || m.includes('credential'))
    console.log('  · Benutzername oder Kennwort stimmen nicht. Der Benutzername ist bei\n' +
                '    den meisten Hostern die vollstaendige E-Mail-Adresse.');
  else if (m.includes('timeout') || m.includes('econnrefused'))
    console.log('  · Server oder Port stimmen nicht. Ueblich sind 465 (implizites TLS)\n' +
                '    und 587 (STARTTLS). Probieren Sie den jeweils anderen.');
  else if (m.includes('certificate') || m.includes('self-signed'))
    console.log('  · Das Zertifikat des Servers passt nicht zum Hostnamen. Bitte den\n' +
                '    genauen Namen aus der Hoster-Dokumentation verwenden.');
  else
    console.log('  · Server, Port, Benutzername und Kennwort noch einmal vergleichen.');
  console.log('');
  process.exit(1);
}

/* --- Stufe 3: echte Testmail ------------------------------------------ */
if (senden && DRYRUN) {
  console.log('\n  ' + rot('MAIL_DRYRUN ist gesetzt — es wird nichts versendet.'));
  console.log('  Der Zugang wurde geprueft und funktioniert. Fuer eine echte');
  console.log('  Testmail bitte MAIL_DRYRUN entfernen (oder auf 0 setzen).\n');
  process.exit(1);
}

if (!senden) {
  console.log('\n  Der Zugang funktioniert. Fuer eine echte Testmail:');
  console.log('  ' + fett('node mailtest.mjs --senden') + '\n');
  process.exit(0);
}

process.stdout.write('  Testmail an ' + E('MAIL_TO') + ' … ');
try {
  const info = await transport.sendMail({
    from: VON, to: E('MAIL_TO'),
    subject: 'Testmail vom Kontaktformular',
    replyTo: 'test@example.org',
    text:
      'Diese Mail belegt, dass der Weg vom Formular in Ihr Postfach steht.\n\n' +
      'Bei einer echten Anfrage stehen hier Name, Kontakt, Ausgangspunkt und\n' +
      'Anliegen des Interessenten, und "Antworten" geht direkt an ihn.\n\n' +
      'Gesendet: ' + new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
  });
  console.log(gruen('abgeschickt'));
  console.log('  Kennung: ' + info.messageId);
  console.log('\n  ' + fett('Jetzt bitte im Postfach nachsehen — auch im Spam-Ordner.'));
  console.log('  Landet sie dort, fehlen SPF/DKIM fuer Ihre Domain. Ihr Hoster');
  console.log('  richtet das auf Nachfrage ein.\n');
} catch (e) {
  console.log(rot('fehlgeschlagen'));
  console.log('\n  ' + rot(e.message) + '\n');
  process.exit(1);
}
