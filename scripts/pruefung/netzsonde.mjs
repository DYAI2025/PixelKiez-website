/* =========================================================================
   Netzsonde — wird dem Formulardienst per --import vorgeschaltet.

   Sie ersetzt die beiden einzigen Wege, auf denen dieser Prozess nach aussen
   telefonieren kann, durch Aufzeichner:

     globalThis.fetch            → der Weg ueber Resend (HTTPS)
     net.Socket.prototype.connect → der Weg ueber SMTP (nodemailer oeffnet
                                    seinen Socket ueber net.connect bzw.
                                    tls.connect, beide landen hier)

   Warum das reicht: die Sonde laeuft NUR im Kindprozess des Dienstes.
   Eingehende Verbindungen — der Testclient, der den Dienst aufruft — gehen
   nicht durch connect(), sondern durch den Zuhoerer. Der Testclient selbst
   lebt im Elternprozess und sieht diese Sonde nie.

   Jeder Versuch wird in die Datei unter PXK_SONDE_LOG geschrieben, eine
   JSON-Zeile je Versuch. Was danach passiert, sagt PXK_SONDE_MODUS:

     blockieren   (Vorgabe) der Versuch schlaegt fehl — nichts geht hinaus
     gelingen     fetch liefert eine erfolgreiche Antwort zurueck; so laesst
                  sich eine echte Zustellung nachstellen, ohne eine zu senden

   Die Sonde ist Pruefwerkzeug und wird nie mit ausgeliefert: sie liegt unter
   scripts/, nicht unter api/, und kein Dockerfile kopiert sie.
   ========================================================================= */

import { appendFileSync } from 'node:fs';
import net from 'node:net';

const LOG   = process.env.PXK_SONDE_LOG || '';
const MODUS = process.env.PXK_SONDE_MODUS || 'blockieren';

const notiere = (eintrag) => {
  if (!LOG) return;
  try { appendFileSync(LOG, JSON.stringify(eintrag) + '\n'); } catch { /* Test laeuft weiter */ }
};

/* --- Weg 1: HTTPS ------------------------------------------------------- */
globalThis.fetch = async (ziel, optionen) => {
  const url = typeof ziel === 'string' ? ziel : String(ziel && ziel.url ? ziel.url : ziel);
  notiere({ was: 'fetch', url, methode: (optionen && optionen.method) || 'GET' });
  if (MODUS === 'gelingen') {
    return new Response(JSON.stringify({ id: 'sonde-vorgetaeuscht' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  throw new Error('SONDE: fetch blockiert');
};

/* --- Weg 2: TCP --------------------------------------------------------- */
/* tls.connect legt intern einen net.Socket an und ruft dessen connect auf —
   ein Riegel an dieser einen Stelle deckt implizites TLS (465) und STARTTLS
   (587) gleichermassen ab. */
const echtesConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const erstes = Array.isArray(args[0]) ? args[0][0] : args[0];
  const port = erstes && typeof erstes === 'object' ? erstes.port : args[0];
  const host = erstes && typeof erstes === 'object' ? erstes.host : args[1];
  notiere({ was: 'socket.connect', port: port ?? null, host: host ?? null });
  if (MODUS === 'gelingen') return echtesConnect.apply(this, args);
  throw new Error('SONDE: ausgehende Verbindung blockiert');
};
