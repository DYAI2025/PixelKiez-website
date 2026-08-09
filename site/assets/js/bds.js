/* =========================================================================
   Pixelkiez — Interaktion
   Keine externen Bibliotheken. Alles degradiert gutartig.
   ========================================================================= */
(function () {
  'use strict';

  /* --- Konfiguration ------------------------------------------------------
     ENDPOINT nimmt das Formular als JSON entgegen und stellt es per SMTP ins
     Postfach zu (siehe api/server.mjs). Der Pfad ist bewusst relativ: Caddy
     leitet /api/* an den Formulardienst weiter, fuer den Browser ist es
     dieselbe Herkunft wie die Seite — kein CORS, keine zweite Domain.

     Scheitert die Uebertragung — Dienst nicht erreichbar, Mailserver
     gestoert —, faengt der catch-Zweig das ab und nennt die Adresse zum
     direkten Anschreiben. Es geht also nie eine Anfrage lautlos verloren.

     Auf leer gesetzt, oeffnet das Formular stattdessen das E-Mail-Programm
     des Besuchers; dann verlaesst kein Datenpaket den Browser.
     ------------------------------------------------------------------------ */
  var ENDPOINT = '/api/kontakt';
  var MAILTO   = 'kontakt@pixelkiez.de';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Schriftmessung braucht geladene Fonts — aber nie laenger als 2 s warten,
  // sonst bleibt eine Animation aus, wenn ein Face haengt.
  var whenFontsReady = function (cb) {
    var done = false;
    var run = function () { if (!done) { done = true; cb(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else window.addEventListener('load', run);
    window.setTimeout(run, 2000);
  };

  /* Der Auftakt braucht kein Skript: gewechselt wird unter voller Deckung
     des Wischblocks, es gibt also nichts zu messen und nichts zu treffen.
     Alles dazu steht im CSS unter "7a. Auftakt". */

  /* --- 1. Header + Mobilnavigation -------------------------------------- */
  var header = $('.header');
  var onScroll = function () {
    header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var burger = $('.burger');
  var menu = $('.menu');
  if (burger && menu) {
    var setNav = function (open) {
      menu.dataset.open = open ? 'true' : 'false';
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      // Zugeklappt ist das Panel nur auf 1px gestaucht, nicht entfernt: ohne
      // inert blieben die neun Links in der Tabreihenfolge und der Fokus
      // wanderte durch unsichtbare Ziele.
      menu.inert = !open;
    };
    setNav(menu.dataset.open === 'true');   // Ausgangszustand aus dem Markup uebernehmen
    burger.addEventListener('click', function () {
      setNav(menu.dataset.open !== 'true');
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    // ESC schliesst, ausserdem ein Klick ausserhalb des Kopfbereichs
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.dataset.open === 'true') { setNav(false); burger.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (menu.dataset.open === 'true' && !header.contains(e.target)) setNav(false);
    });
  }

  /* --- 2. Reveal beim Scrollen ------------------------------------------ */
  var reveals = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        ro.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el, i) {
      el.style.setProperty('--d', (i % 6) * 55 + 'ms');
      ro.observe(el);
    });
  }

  /* --- 3. Rotierende Headline (Portierung animated-hero.tsx) ------------
     Vorlage: setTimeout 2000 ms, Index laeuft zyklisch; bereits gezeigte
     Woerter wandern nach oben (-y), kommende warten unten (+y).
     ---------------------------------------------------------------------- */
  (function rotator() {
    var box = $('#hero-rotator');
    if (!box || reduced) return;                 // reduced-motion: CSS zeigt den Volltext
    var items = $$('.rot__item', box);
    if (items.length < 2) return;
    var i = 0, timer = null;

    var show = function (next) {
      items.forEach(function (el, n) {
        el.classList.toggle('is-active', n === next);
        el.classList.toggle('is-past', n < next);
      });
      i = next;
    };
    var tick = function () {
      timer = window.setTimeout(function () {
        show(i === items.length - 1 ? 0 : i + 1);
        tick();
      }, 2000);
    };
    var stop = function () { if (timer) { window.clearTimeout(timer); timer = null; } };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? (timer || tick()) : stop();
      }, { threshold: 0.1 }).observe(box);
    } else { tick(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : (timer || tick());
    });
  })();

  /* --- 3b. Pixel Drift auf der Wortmarke --------------------------------
     Portierung des Originkit-Bausteins "Pixel Drift" (React/Canvas) auf
     schlichtes JavaScript. Ein Unterschied zur Vorlage, und es ist der
     entscheidende: dort ist die Vorlage gezeichneter Text, hier ist sie die
     Logodatei selbst. Abgetastet wird also das Bild — jeder Bildpunkt mit
     Deckkraft ueber 128 im Raster 150/Dichte wird ein Partikel. Die Form
     bleibt dadurch exakt die des gelieferten Logos, nichts wird nachgebaut.

     Aus der Vorlage uebernommen:
       · Startpunkte auf einem Ring ausserhalb der Flaeche
       · ratenbasierter Aufbauwert statt Zeitleiste — laesst sich mitten in
         der Bewegung umkehren, ohne zu springen
       · Abstossung nach Zeigergeschwindigkeit, Ziel auf dem Radiusrand
       · Ruecklauf 0.97 je Bild, Geschwindigkeitszerfall 0.88
       · Farbeimer statt Farbwechsel je Partikel

     Bei reduzierter Bewegung passiert gar nichts, dann bleibt das Bild
     stehen. Ebenso, wenn die Abtastung nichts findet.
     ---------------------------------------------------------------------- */
  (function pixelDrift () {
    var hero = $('.hero');
    if (!hero || reduced) return;
    var bild = $('.hero__logo', hero);
    var leinwand = $('.hero__logo-drift', hero);
    if (!bild || !leinwand) return;
    var ctx = leinwand.getContext('2d');
    if (!ctx) return;

    /* Fester Ton, das Schwarz der Seite. Nicht aus dem Bild mitteln: die
       Datei traegt reines Schwarz, das ist ein anderer Ton als dieser, und
       der Auftakt saehe damit anders aus als bisher. */
    var FARBEN  = ['#0E1413'];
    /* Zwei Punkte Zellenabstand. Ein Punkt bildete die Wortmarke zwar genauer
       ab — die Kerbe oben am P und der Anbiss am Punkt des ersten i kamen
       sauber durch, Deckung 100 % statt 97,5 % —, aber die Kaesten wurden
       dabei so klein, dass der Effekt seinen Charakter verlor. Die groebere
       Koernung ist gewollt. */
    var RASTER  = 2;     // Abstand zweier Zellenmitten in Pixeln
    /* Anteil der Zelle, den der Kasten ausfuellt. Unter eins bleibt zwischen
       den Kaesten Luft und der Hintergrund kommt durch — das Feld liest sich
       dann als Raster und nicht als Flaeche. Die Kaesten bleiben dabei auf
       ihren Zellenmitten, die Luecke verteilt sich also gleichmaessig. */
    var FUELLUNG = 0.75;
    var RADIUS  = 50;    // Wirkradius des Zeigers
    var KRAFT   = 30;    // Staerke des Stosses
    var AUFBAU  = 1000;  // Millisekunden bis das Feld steht

    var anzahl = 0, ox, oy, sx, sy, px, py, repX, repY, farbe;
    var cssW = 0, cssH = 0, dpr = 1, maxWeg = 0;
    var wert = 0, letzter = null, verborgen = true, rueckwaerts = false;
    var zx = -99999, zy = -99999, aktiv = false;
    var vorX = -99999, vorY = -99999, tempo = 0, glattX = -99999, glattY = -99999;
    var raf = null, sichtbar = false;

    /* Lage des Bildes INNERHALB der Leinwand. Die Leinwand spannt ueber den
       ganzen Hero, das Bild sitzt irgendwo darin — nur diesen Ausschnitt
       tasten wir ab, alles andere ist leer und kostete nur Zeit. */
    var bx = 0, by = 0, bw = 0, bh = 0;

    var abtasten = function () {
      if (bw <= 0 || bh <= 0 || !bild.naturalWidth) return false;
      var ab = document.createElement('canvas');
      ab.width  = Math.max(1, Math.round(bw * dpr));
      ab.height = Math.max(1, Math.round(bh * dpr));
      var abCtx = ab.getContext('2d', { willReadFrequently: true });
      if (!abCtx) return false;
      abCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      abCtx.clearRect(0, 0, bw, bh);
      abCtx.drawImage(bild, 0, 0, bw, bh);

      var daten;
      try { daten = abCtx.getImageData(0, 0, ab.width, ab.height).data; }
      catch (e) { return false; }          // fremde Herkunft — dann bleibt das Bild

      /* Flaechenmittel statt Punktprobe.

         Vorher wurde EIN Bildpunkt je Zelle gefragt und bei Treffer das ganze
         Quadrat gemalt. Das rundet nach aussen: liegt die Zelle nur mit einer
         Ecke im Buchstaben, wird sie trotzdem voll. Die Striche wurden dadurch
         fetter und die Punze im P lief zu. Jetzt zaehlt der Anteil der Zelle,
         der wirklich im Buchstaben liegt — ueber die Haelfte wird gemalt,
         darunter nicht. Das ist dieselbe Regel, nach der ein Bild verkleinert
         wird, und sie traegt die Form treu. */
      var zelle = Math.max(1, Math.round(RASTER * dpr));   // Zellenkante in Bildpunkten
      var spaltenW = ab.width, zeilenH = ab.height;

      var deckung = function (gx, gy) {
        var summe = 0, n = 0, ex = Math.min(gx + zelle, spaltenW), ey = Math.min(gy + zelle, zeilenH);
        for (var yy = gy; yy < ey; yy++) {
          var basis = yy * spaltenW;
          for (var xx = gx; xx < ex; xx++) { summe += daten[(basis + xx) * 4 + 3]; n++; }
        }
        return n ? summe / (n * 255) : 0;
      };

      var x, y, i, treffer = 0;
      var spalten = Math.ceil(bw / RASTER), zeilen = Math.ceil(bh / RASTER);
      var maske = new Uint8Array(spalten * zeilen);

      for (y = 0; y < zeilen; y++) {
        for (x = 0; x < spalten; x++) {
          var gx = Math.round(x * RASTER * dpr), gy = Math.round(y * RASTER * dpr);
          if (deckung(gx, gy) >= 0.5) { maske[y * spalten + x] = 1; treffer++; }
        }
      }
      if (!treffer) return false;

      var duenner = treffer > 60000 ? Math.ceil(treffer / 60000) : 1;
      var platz = Math.min(treffer, 60000);
      ox = new Float32Array(platz); oy = new Float32Array(platz);
      sx = new Float32Array(platz); sy = new Float32Array(platz);
      px = new Float32Array(platz); py = new Float32Array(platz);
      repX = new Float32Array(platz); repY = new Float32Array(platz);
      farbe = new Uint8Array(platz);

      /* Startpunkte auf einem Ring weit AUSSERHALB der Leinwand. Weil die
         Leinwand den ganzen Hero abdeckt, liegt dieser Ring jenseits des
         Bildschirms — die Partikel kommen also wirklich von draussen. */
      var mx = cssW / 2, my = cssH / 2;
      var weit = Math.sqrt(cssW * cssW + cssH * cssH) * 0.62;
      var halbeZelle = RASTER / 2;

      i = 0;
      var gesehen = 0;
      for (y = 0; y < zeilen && i < platz; y++) {
        for (x = 0; x < spalten && i < platz; x++) {
          if (!maske[y * spalten + x]) continue;
          if (gesehen % duenner === 0) {
            /* Auf die MITTE der Zelle, nicht auf ihre Ecke: gezeichnet wird
               um diesen Punkt herum, sonst saesse jedes Quadrat einen halben
               Rasterschritt zu weit oben links. */
            ox[i] = bx + x * RASTER + halbeZelle;
            oy[i] = by + y * RASTER + halbeZelle;
            var w = Math.random() * Math.PI * 2;
            var r = weit * (1 + Math.random() * 0.7);
            sx[i] = mx + Math.cos(w) * r;
            sy[i] = my + Math.sin(w) * r;
            px[i] = sx[i]; py[i] = sy[i];
            farbe[i] = 0;
            i++;
          }
          gesehen++;
        }
      }
      anzahl = i;
      wert = 0; letzter = null;
      return anzahl > 0;
    };

    var messen = function () {
      var lr = leinwand.getBoundingClientRect();
      var br = bild.getBoundingClientRect();
      if (lr.width <= 0 || lr.height <= 0 || br.width <= 0) return false;
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      cssW = Math.round(lr.width); cssH = Math.round(lr.height);
      /* Lage und Groesse des Bildes NICHT runden. Das Bild sitzt selten auf
         ganzen Punkten — hier etwa 127,36 von oben bei 120,41 Hoehe. Auf
         ganze Punkte gerundet verschiebt sich das Partikelfeld gegen das
         Bild, und bei doppelter Punktdichte ist das ein sichtbarer halber
         Kasten. Gerundet wird erst dort, wo es sein muss: bei der Groesse
         der Abtastflaeche in Bildpunkten. */
      bx = br.left - lr.left;
      by = br.top - lr.top;
      bw = br.width;
      bh = br.height;
      leinwand.width  = Math.round(cssW * dpr);
      leinwand.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Kein Partikel darf bis an die Leinwandkante. Bemessen am kuerzesten
         Abstand des Bildes zum Rand, gedeckelt auf das Dreifache des
         Wirkradius — sonst risse der Zeiger bei viel Platz Loecher, die
         groesser sind als das Logo selbst. */
      var luft = Math.min(bx, by, cssW - (bx + bw), cssH - (by + bh));
      maxWeg = Math.max(8, Math.min(luft - RASTER - 2, RADIUS * 3));
      return abtasten();
    };

    var eimer = FARBEN.map(function () { return []; });

    var zeichnen = function () {
      ctx.clearRect(0, 0, cssW, cssH);
      /* Kantenlaenge gleich Rasterabstand: die Quadrate stossen luecken-
         los aneinander. Kleinere Quadrate liessen das Logo loechrig wirken,
         groessere wuerden es aufdicken.

         Aufgerundet auf ganze BILDPUNKTE, nicht CSS-Punkte. Ein Quadrat von
         einem CSS-Punkt liegt sonst je nach Lage des Bildes auf halben
         Bildpunkten, und der Browser rechnet es ueber zwei Reihen weich —
         gemessen kam kein einziger Punkt voll deckend heraus, das Logo waere
         blasser als seine Vorlage. Gezeichnet wird deshalb unten auf dem
         Bildpunktgitter eingerastet. */
      var zellD  = Math.max(1, Math.round(RASTER * dpr));         // Zellenabstand in Bildpunkten
      var kastD  = Math.max(1, Math.round(zellD * FUELLUNG));     // Kastenkante in Bildpunkten
      // Mindestens ein Bildpunkt Luft, sonst stossen die Kaesten trotz
      // FUELLUNG wieder aneinander — bei kleinem Raster rundet sonst alles
      // auf denselben Wert.
      if (kastD >= zellD && zellD > 1) kastD = zellD - 1;
      var kante = kastD / dpr, halb = kante / 2;

      var jetzt = window.performance ? performance.now() : Date.now();
      var dt = Math.min(64, Math.max(0, jetzt - (letzter === null ? jetzt : letzter)));
      letzter = jetzt;
      var ziel = rueckwaerts ? 0 : 1;
      if (wert < ziel) wert = Math.min(ziel, wert + dt / AUFBAU);
      else if (wert > ziel) wert = Math.max(ziel, wert - dt / AUFBAU);
      if (rueckwaerts && wert <= 0) verborgen = true;
      if (verborgen) return;

      var baut = wert < 1;
      var anteil = wert;

      var stoss = tempo;
      tempo *= 0.88;
      var wirkt = !baut && aktiv;
      if (wirkt) {
        var lerp = Math.max(0.08, 0.3 - stoss * 0.006);
        if (glattX < -9000) { glattX = zx; glattY = zy; }
        else { glattX += (zx - glattX) * lerp; glattY += (zy - glattY) * lerp; }
      } else { glattX = -99999; glattY = -99999; }
      var rGrenze = Math.max(6, Math.min(RADIUS, maxWeg * 0.85));
      var rGrenzeQ = rGrenze * rGrenze;

      var b, i;
      for (b = 0; b < eimer.length; b++) eimer[b].length = 0;

      for (i = 0; i < anzahl; i++) {
        var oxi = ox[i], oyi = oy[i];
        if (baut) {
          px[i] = sx[i] + (oxi - sx[i]) * anteil;
          py[i] = sy[i] + (oyi - sy[i]) * anteil;
          eimer[farbe[i]].push(i);
          continue;
        }
        var inZone = false;
        if (wirkt) {
          var dx = oxi - glattX, dy = oyi - glattY;
          var q = dx * dx + dy * dy;
          if (q > 0 && q < rGrenzeQ) {
            var d = Math.sqrt(q), nx = dx / d, ny = dy / d;
            var schub = Math.min(maxWeg, (1 - d / rGrenze) * stoss * KRAFT * 0.05);
            repX[i] += nx * schub; repY[i] += ny * schub;
            repX[i] += (nx * (rGrenze - d) - repX[i]) * 0.06;
            repY[i] += (ny * (rGrenze - d) - repY[i]) * 0.06;
            inZone = true;
          }
        }
        if (!inZone) { repX[i] *= 0.97; repY[i] *= 0.97; }
        var wq = repX[i] * repX[i] + repY[i] * repY[i];
        if (wq > maxWeg * maxWeg) {
          var f = maxWeg / Math.sqrt(wq);
          repX[i] *= f; repY[i] *= f;
        }
        px[i] = oxi + repX[i];
        py[i] = oyi + repY[i];
        eimer[farbe[i]].push(i);
      }

      ctx.globalAlpha = baut ? Math.min(1, Math.max(0, anteil)) : 1;
      for (b = 0; b < eimer.length; b++) {
        if (!eimer[b].length) continue;
        ctx.fillStyle = FARBEN[b];
        for (var k = 0; k < eimer[b].length; k++) {
          var j = eimer[b][k];
          /* Auf ganze Bildpunkte einrasten. Der Versatz betraegt hoechstens
             einen halben Bildpunkt und ist damit unsichtbar; ohne ihn waere
             jeder Kasten weichgerechnet. */
          ctx.fillRect(Math.round((px[j] - halb) * dpr) / dpr,
                       Math.round((py[j] - halb) * dpr) / dpr,
                       kante, kante);
        }
      }
      ctx.globalAlpha = 1;
    };

    var schleife = function () { zeichnen(); raf = requestAnimationFrame(schleife); };
    var start = function () { if (raf === null) { letzter = null; raf = requestAnimationFrame(schleife); } };
    var halt  = function () { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };

    /* Der Zeiger wird am Hero abgefragt, nicht an der Leinwand. Haenge die
       Abfrage an der Leinwand, begaenne und endete die Wirkung an deren
       Kante — man saehe das Rechteck, auch wenn es unsichtbar ist. */
    hero.addEventListener('pointermove', function (e) {
      var rect = leinwand.getBoundingClientRect();
      var skX = rect.width  > 0 ? cssW / rect.width  : 1;
      var skY = rect.height > 0 ? cssH / rect.height : 1;
      var mx = (e.clientX - rect.left) * skX, my = (e.clientY - rect.top) * skY;
      if (vorX > -9000) {
        var ddx = mx - vorX, ddy = my - vorY;
        tempo = Math.sqrt(ddx * ddx + ddy * ddy);
      }
      vorX = mx; vorY = my; zx = mx; zy = my; aktiv = true;
    });
    var weg = function () { zx = -99999; zy = -99999; aktiv = false; vorX = -99999; vorY = -99999; };
    hero.addEventListener('pointerleave', weg);
    hero.addEventListener('pointercancel', weg);

    var anwerfen = function () {
      if (!messen()) return;               // Abtastung leer — Bild bleibt stehen
      hero.dataset.drift = 'an';
      verborgen = false; rueckwaerts = false;
      if (sichtbar) start();
    };

    // Erst wenn das Bild wirklich da ist, sonst tastet man eine leere Flaeche ab
    if (bild.complete && bild.naturalWidth) anwerfen();
    else bild.addEventListener('load', anwerfen);

    // Nur laufen lassen, solange der Hero im Bild ist — das spart Rechenzeit
    // beim Scrollen. Der Zustand bleibt dabei ABSICHTLICH stehen: der Aufbau
    // gehoert zum Seitenaufruf, nicht zum Scrollen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        sichtbar = e[0].isIntersecting;
        if (sichtbar) start(); else halt();
      }, { threshold: 0 }).observe(leinwand);
    } else { sichtbar = true; start(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) halt(); else if (sichtbar) start();
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (hero.dataset.drift === 'an') messen(); }, 200);
    });
  })();

  /* --- 4. Laufband auf der Kurve ----------------------------------------
     startOffset wandert ins Negative: die Schrift laeuft entgegen der
     Zeichenrichtung der Kurve, also von rechts nach links. Nach genau einer
     Wortfolge springt der Wert zurueck — der Uebergang ist damit nahtlos.
     ---------------------------------------------------------------------- */
  (function heroBand() {
    var txt = $('#heroband-text');
    if (!txt) return;
    var path = txt.querySelector('textPath');
    var repeats = parseInt(txt.dataset.repeats, 10) || 4;
    var period = 0, off = 0, raf = null, live = false;

    var measure = function () {
      try {
        var total = txt.getComputedTextLength();
        if (total > 0) period = total / repeats;
      } catch (e) { period = 0; }
    };
    var draw = function () { path.setAttribute('startOffset', off.toFixed(1)); };
    var step = function () {
      off -= 0.5;
      if (period && off <= -period) off += period;
      draw();
      raf = requestAnimationFrame(step);
    };
    var stop = function () { if (raf) { cancelAnimationFrame(raf); raf = null; } live = false; };
    var start = function () { if (live || reduced) return; live = true; raf = requestAnimationFrame(step); };

    var ready = function () {
      measure();
      if (reduced) { draw(); return; }          // Ruhebild: Wortfolge steht still
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          e[0].isIntersecting ? start() : stop();
        }, { threshold: 0.01 }).observe(txt);
      } else { start(); }
      document.addEventListener('visibilitychange', function () {
        document.hidden ? stop() : start();
      });
    };

    whenFontsReady(ready);   // misst erst mit geladener Schrift, wartet aber nicht ewig

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(measure, 200);
    });
  })();

  /* --- 5. Block-Reveal der Ueberschriften (Portierung text-block-animation)
     Statt GSAP SplitText: Woerter einpacken, nach ihrer Zeilenlage gruppieren,
     je Zeile eine Huelle mit Farbblock bauen. Ausgeloest bei "top 85%" wie in
     der Vorlage. Der Text bleibt im DOM unveraendert lesbar.
     ---------------------------------------------------------------------- */
  (function textBlocks() {
    var heads = $$('[data-textblock]');
    if (!heads.length) return;
    if (reduced) return;                       // ohne Bewegung bleibt die Ueberschrift schlicht stehen

    var split = function (el) {
      var words = el.textContent.trim().split(/\s+/);
      if (words.length < 1) return false;
      el.textContent = '';
      var spans = words.map(function (w, i) {
        var sp = document.createElement('span');
        sp.textContent = i < words.length - 1 ? w + ' ' : w;
        el.appendChild(sp);
        return sp;
      });
      // nach tatsaechlicher Zeilenlage gruppieren
      var lines = [], cur = null, top = null;
      spans.forEach(function (sp) {
        var t = Math.round(sp.offsetTop);
        if (top === null || Math.abs(t - top) > 4) { cur = []; lines.push(cur); top = t; }
        cur.push(sp);
      });
      el.textContent = '';
      lines.forEach(function (ws, i) {
        var line = document.createElement('span');
        line.className = 'tb__line';
        line.style.setProperty('--n', i);
        var inner = document.createElement('span');
        inner.className = 'tb__inner';
        ws.forEach(function (w) { inner.appendChild(w); });
        var block = document.createElement('span');
        block.className = 'tb__block';
        // Aus einzelnen Ecken der Farbleiste ist ein Quadrat herausgebissen —
        // nie aus allen vieren, je Zeile eine andere Auswahl. Wirkt wie ein
        // kleiner Pixelfehler, bleibt aber reproduzierbar.
        var CORNERS = [
          [['right', 'top'], ['left', 'bottom']],
          [['left', 'top'], ['right', 'bottom']],
          [['right', 'bottom']],
          [['left', 'top'], ['left', 'bottom']]
        ];
        CORNERS[i % CORNERS.length].forEach(function (c) {
          var nick = document.createElement('i');
          nick.style[c[0]] = '0';
          nick.style[c[1]] = '0';
          block.appendChild(nick);
        });
        line.appendChild(inner);
        line.appendChild(block);
        el.appendChild(line);
      });
      el.dataset.split = 'true';
      return true;
    };

    var arm = function () {
      heads.forEach(function (h) { split(h); });
      if (!('IntersectionObserver' in window)) {
        heads.forEach(function (h) { h.classList.add('is-in'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -15% 0px' });    // entspricht start: "top 85%"
      heads.forEach(function (h) { io.observe(h); });
    };

    whenFontsReady(arm);     // Zeilenumbruch stimmt erst mit geladener Schrift
  })();

  /* --- 6. Saeulen im Detailabschnitt ------------------------------------
     Immer genau eine offen: ein Klick zieht die angeklickte auf und schliesst
     die vorige. Das Raster erledigt die Verdraengung, hier faellt nur die
     Zustandsverwaltung an.
     ---------------------------------------------------------------------- */
  (function pillars() {
    var box = $('.pil');
    if (!box) return;
    var items = $$('.pil__i', box);
    var wide = function () { return window.matchMedia('(min-width:900px)').matches; };

    var open = function (item) {
      items.forEach(function (o) {
        var on = o === item;
        o.dataset.open = on ? 'true' : 'false';
        $('.pil__btn', o).setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    };

    // Hover mit Absicht: erst nach kurzem Verweilen umschalten. Ohne die
    // Verzoegerung springt die Auswahl weiter, waehrend sich das Raster noch
    // verschiebt — dabei rutschen Saeulen unter dem Zeiger durch.
    var timer = null;
    var HOLD = 170;
    items.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (!wide() || item.dataset.open === 'true') return;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { open(item); }, HOLD);
      });
      item.addEventListener('mouseleave', function () { window.clearTimeout(timer); });
      $('.pil__btn', item).addEventListener('click', function () {
        window.clearTimeout(timer);
        if (wide()) { open(item); return; }
        var was = item.dataset.open === 'true';
        open(was ? null : item);            // schmal: auch alles zu erlaubt
      });
      $('.pil__btn', item).addEventListener('focus', function () {
        if (wide()) open(item);
      });
    });
    // Verlaesst der Zeiger den Streifen, bleibt die zuletzt gewaehlte offen.
    box.addEventListener('mouseleave', function () { window.clearTimeout(timer); });
  })();

  /* --- 7. Leistungskarten: gleiche Hoehe --------------------------------
     Der Vorhang liegt absolut ueber der Karte, seine Hoehe zaehlt also nicht
     zum Fluss. Damit nichts abgeschnitten wird, bekommen alle vier Karten die
     Hoehe des groessten Vorhang-Inhalts. Kein Klick-Umschalter: geoeffnet
     wird ausschliesslich per Hover oder Tastaturfokus.
     ---------------------------------------------------------------------- */
  (function curtainCards() {
    var cards = $$('.crc');
    if (!cards.length) return;
    var measure = function () {
      var max = 0;
      cards.forEach(function (c) { c.style.removeProperty('height'); });
      cards.forEach(function (c) {
        [$('.crc__open', c), $('.crc__rest', c)].forEach(function (layer) {
          if (layer && layer.scrollHeight > max) max = layer.scrollHeight;
        });
      });
      cards.forEach(function (c) { c.style.height = Math.ceil(max) + 'px'; });
    };
    whenFontsReady(measure);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(measure, 180);
    });
  })();

  /* --- 7b. Karussellpunkte ----------------------------------------------
     Auf schmalen Ansichten laufen Branchen und Leistungen als waagerechte
     Bahn mit Einrastpunkten. Gewischt wird per CSS scroll-snap; hier wird
     nur angezeigt, an welcher Stelle man steht. Die Punkte sind im Markup
     aria-hidden — sie sind Orientierung, kein Bedienelement, und sollen
     keine zusaetzlichen Tabstopps erzeugen. Faellt das Skript aus, laesst
     sich weiterhin wischen, nur die Anzeige fehlt.
     ---------------------------------------------------------------------- */
  (function karussell() {
    $$('[data-dots]').forEach(function (dots) {
      var bahn = $(dots.dataset.dots);
      if (!bahn) return;
      var karten = Array.prototype.slice.call(bahn.children);
      if (karten.length < 2) return;

      // Punkte sind Schalter, keine blosse Anzeige. Etwas, das wie ein
      // Bedienelement aussieht und auf Antippen nicht reagiert, wirkt wie ein
      // Fehler — und in einem Karussell erwartet man genau diese Bedienung.
      karten.forEach(function (k, n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', dots.dataset.beschriftung
          ? dots.dataset.beschriftung.replace('%', String(n + 1))
          : 'Karte ' + (n + 1));
        b.addEventListener('click', function () {
          k.scrollIntoView({ block: 'nearest', inline: 'start',
                             behavior: reduced ? 'auto' : 'smooth' });
        });
        dots.appendChild(b);
      });
      var punkte = Array.prototype.slice.call(dots.children);

      var aktiv = -1;
      var sync = function () {
        var r = bahn.getBoundingClientRect();
        var mitte = r.left + r.width / 2;
        var beste = Infinity, treffer = 0;
        karten.forEach(function (k, n) {
          var kr = k.getBoundingClientRect();
          var d = Math.abs(kr.left + kr.width / 2 - mitte);
          if (d < beste) { beste = d; treffer = n; }
        });
        if (treffer === aktiv) return;
        aktiv = treffer;
        punkte.forEach(function (p, n) { p.className = n === treffer ? 'on' : ''; });
      };

      var wartet = false;
      bahn.addEventListener('scroll', function () {
        if (wartet) return;
        wartet = true;
        window.requestAnimationFrame(function () { wartet = false; sync(); });
      }, { passive: true });

      // Tastatur: der Browser scrollt eine fokussierte Karte nur dann heran,
      // wenn sie voellig ausserhalb liegt. Angeschnittene Karten laesst er
      // stehen — der Fokus sass dann auf einem Knopf, der zu zwei Dritteln
      // aus dem Bild ragte. Deshalb hier selbst heranholen.
      bahn.addEventListener('focusin', function (e) {
        for (var i = 0; i < karten.length; i++) {
          if (!karten[i].contains(e.target)) continue;
          var kr = karten[i].getBoundingClientRect();
          var br = bahn.getBoundingClientRect();
          if (kr.left < br.left - 1 || kr.right > br.right + 1) {
            karten[i].scrollIntoView({
              block: 'nearest', inline: 'start',
              behavior: reduced ? 'auto' : 'smooth'
            });
          }
          return;
        }
      });

      window.addEventListener('resize', sync);
      sync();
    });
  })();

  /* --- 8. Projekt-Check -------------------------------------------------- */
  var BRANCHEN = {
    praxis:   'Arztpraxen & ZMVZ',
    hotel:    'Hotellerie',
    bau:      'Baubetriebe & Handwerk',
    gastro:   'Gastronomie',
    startup:  'Startups',
    andere:   'Andere Branche'
  };

  var DREH = {
    praxis:   'Anliegen-Triage vor dem Telefon, Ihr Buchungstool bleibt die Terminmaschine. Dazu Selbstzahlerseiten und MFA-Recruiting; für Psychotherapiepraxen die strukturierte Erstanfrage mit Kassensitz, Verfahren und Kapazitätsstatus.',
    hotel:    'Direktbuchungspfad zur bestehenden Booking-Engine, dazu Event- und Tagungsanfragen mit Personenzahl und Budgetrahmen.',
    bau:      'Projekt-Konfigurator mit Projektart, Größenordnung, Zeitfenster und Plan-Upload sowie getrennte Recruiting-Funnels für gewerbliche Rollen und Bauleitung.',
    gastro:   'Eigene Reservierung, echte HTML-Speisekarte statt PDF sowie Event-, Catering- und Gutscheinstrecken.',
    startup:  'Klares Nutzenversprechen statt Buzzwords, eine Landingpage je Zielgruppe und ein Anfragepfad, dessen Abschlussquote vom ersten Tag an messbar ist.',
    andere:   'Im Erstgespräch prüfen wir ehrlich, ob unser Vorgehen zu Ihrem Engpass passt.'
  };

  var THEMEN = {
    sichtbarkeit: {
      label: 'Wir werden nicht gefunden',
      title: 'Sichtbarkeits-Paket',
      mods: ['Website-Check bzw. Redesign', 'SEO-Ausbau', 'Local SEO', 'GEO-Setup'],
      entry: 'Einstieg über das GEO-/Sichtbarkeits-Audit.',
    },
    filter: {
      label: 'Zu viele unpassende Anfragen',
      title: 'System-Website mit Anfrage-Filter',
      mods: ['System-Website mit strukturierter Erstanfrage', 'Anliegen-Triage oder Projekt-Konfigurator', 'SEO-Fundament', 'GEO-Grundsetup'],
      entry: 'Einstieg über die Diagnose: Wir definieren die Filterlogik, bevor ein Angebot entsteht.',
    },
    recruiting: {
      label: 'Wir bekommen keine neuen Bewerber',
      title: 'Recruiting-Paket',
      mods: ['Recruiting-System', '60-Sekunden-Bewerbung', 'Google-for-Jobs-Setup', 'Recruiting-Begleitung'],
      entry: 'Kostenloser Quick-Check im Erstgespräch: Wir testen Ihre aktuelle Bewerbungsstrecke live am Handy.',
    },
    website: {
      label: 'Webseite ist alt oder es existiert noch keine',
      title: 'Launch- & Redesign-Paket',
      mods: ['One-Page- oder Business-Website bzw. Redesign', 'SEO-Fundament', 'GEO-Grundsetup', 'Google-Business-Profil'],
      entry: 'Einstieg über die Diagnose im Erstgespräch, mit erster Analyse Ihres aktuellen Auftritts.',
    },
    verwaltung: {
      label: 'Zu viel Telefon und Verwaltung',
      title: 'System-Website mit Anliegen-Triage',
      mods: ['System-Website mit Anliegen-Triage', 'Anbindung an Ihr Termin- oder Buchungssystem', 'Leistungs- bzw. Selbstzahlerseiten', 'SEO-Fundament'],
      entry: 'Einstieg über die Diagnose: Welche Anliegen binden heute die meiste Zeit?',
    },
    plattform: {
      label: 'Zu abhängig von Plattformen',
      title: 'System-Website mit eigenem Buchungspfad',
      mods: ['System-Website mit Direktbuchungs- oder Reservierungspfad', 'Anbindung Ihrer bestehenden Engine', 'GEO-Setup & Agent-Readiness', 'Local SEO'],
      entry: 'Einstieg über das GEO-/Sichtbarkeits-Audit.',
    }
  };

  var ZEIT = {
    sofort:  { label: 'So schnell wie möglich', line: 'Kurzfristig, wir melden uns innerhalb eines Werktags mit Einschätzung und möglichen Startterminen.' },
    quartal: { label: 'Im nächsten Quartal',    line: 'Nächstes Quartal, wir liefern die Diagnose jetzt, damit das Angebot zum Start bereitliegt.' },
    offen:   { label: 'Wir orientieren uns',    line: 'Offener Zeitrahmen, Sie erhalten eine Einschätzung ohne Termindruck.' }
  };

  var pick = { branche: '', thema: '', zeit: '' };
  var out = $('#check-result');

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var render = function () {
    if (!out) return;
    var n = (pick.branche ? 1 : 0) + (pick.thema ? 1 : 0) + (pick.zeit ? 1 : 0);
    var meter = '<span class="pc__meter" aria-hidden="true">' +
      [0, 1, 2].map(function (i) { return '<i class="' + (i < n ? 'on' : '') + '"></i>'; }).join('') + '</span>';

    if (n < 3) {
      var missing = !pick.branche ? 'Branche' : (!pick.thema ? 'Ihr Thema' : 'Ihr Zeitrahmen');
      out.innerHTML = '<div class="pc__wait">' + meter +
        '<span class="pc__hint">Noch offen: <em class="q">' + missing +
        '</em>, danach sehen Sie hier Ihr passendes System.</span></div>';
      return;
    }

    var t = THEMEN[pick.thema];
    out.innerHTML =
      '<div class="pc__res">' +
        '<div>' + meter +
          '<h3 class="h-md">' + esc(t.title) + '</h3>' +
          '<p class="pc__hint">' + esc(DREH[pick.branche]) + '</p>' +
          '<ul class="pc__mods">' + t.mods.map(function (m) {
            return '<li>' + ICON_CHECK + '<span>' + esc(m) + '</span></li>';
          }).join('') + '</ul>' +
        '</div>' +
        '<div class="pc__side">' +
          '<p class="pc__note">' + esc(ZEIT[pick.zeit].line) + '</p>' +
          '<button type="button" class="btn btn--split btn--primary btn--sm" id="check-handoff">' +
            '<span class="btn__label">An Schnellkontakt übergeben</span>' +
            '<span class="btn__ico"><svg aria-hidden="true"><use href="#i-arrow-ur"/></svg>' +
            '<svg aria-hidden="true"><use href="#i-arrow-ur"/></svg></span></button>' +
          '<p class="pc__note">' + esc(t.entry) + '</p>' +
        '</div>' +
      '</div>';

    $('#check-handoff').addEventListener('click', handoff);
  };

  /* --- Schrittweise Anzeige auf schmalen Ansichten ----------------------
     Alle drei Fragen gleichzeitig offen kosteten 1288px, ein Drittel davon
     Leerraum neben den langen Themen-Beschriftungen. Beantwortete Fragen
     zeigen deshalb nur noch den gewaehlten Chip; Fragetext und uebrige Chips
     treten zurueck.

     Bewusst ohne neues Bedienelement: der gewaehlte Chip bleibt stehen und
     ist selbst der Schalter, mit dem sich die Gruppe wieder oeffnet. Damit
     entstehen weder zusaetzliche Tabstopps noch Markup, das auf dem Desktop
     mitgeschleppt und wieder versteckt werden muesste.
     ---------------------------------------------------------------------- */
  var fragen = $$('.pc__q');
  var schmal = function () { return window.matchMedia('(max-width:899px)').matches; };

  // Je Frage eine Zeile fuer die getroffene Wahl. Sie steht im zugeklappten
  // Zustand rechts neben der Nummer und ersetzt dort die Chipreihe.
  fragen.forEach(function (q) {
    var s = document.createElement('span');
    s.className = 'pc__pick';
    q.insertBefore(s, $('.pc__ask', q));
  });

  var gruppeVon = function (q) { var b = $('[data-check]', q); return b && b.dataset.check; };
  var offeneFrage = fragen[0] || null;

  var zeigeSchritte = function () {
    fragen.forEach(function (q) {
      var g = gruppeVon(q);
      var wahl = g && pick[g];
      var zu = schmal() && q !== offeneFrage;

      q.dataset.erledigt = zu ? 'true' : 'false';
      $('.pc__pick', q).textContent = wahl
        ? ($$('[data-check="' + g + '"][data-value="' + wahl + '"]')[0] || {}).textContent || ''
        : '';

      // Zugeklappt traegt die Zeile selbst die Bedienung. Das kostet keinen
      // zusaetzlichen Tabstopp, sondern spart welche: die bis zu sieben Chips
      // darin sind ausgeblendet und damit ohnehin nicht mehr erreichbar.
      if (zu) {
        q.setAttribute('role', 'button');
        q.setAttribute('tabindex', '0');
        q.setAttribute('aria-expanded', 'false');
      } else {
        q.removeAttribute('role');
        q.removeAttribute('tabindex');
        q.removeAttribute('aria-expanded');
      }
    });
  };

  var oeffne = function (q) { offeneFrage = q; zeigeSchritte(); };

  fragen.forEach(function (q) {
    q.addEventListener('click', function (e) {
      if (q.dataset.erledigt === 'true' && !e.target.closest('[data-check]')) oeffne(q);
    });
    q.addEventListener('keydown', function (e) {
      if (q.dataset.erledigt !== 'true') return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oeffne(q); }
    });
  });

  // Beim Wechsel zwischen schmal und breit den Zustand nachziehen: auf dem
  // Desktop stehen alle drei Fragen nebeneinander und duerfen nicht zuklappen.
  window.addEventListener('resize', function () {
    if (!schmal()) offeneFrage = null;
    else if (!offeneFrage) offeneFrage = fragen[0];
    zeigeSchritte();
  });

  $$('[data-check]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.check, value = btn.dataset.value;
      var q = btn.closest('.pc__q');

      $$('[data-check="' + group + '"]').forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === btn));
      });
      pick[group] = value;

      // Weiter zur ersten noch unbeantworteten Frage. Ist keine mehr offen,
      // klappen alle zu und das Ergebnis bekommt den Platz.
      offeneFrage = null;
      for (var i = 0; i < fragen.length; i++) {
        var g = gruppeVon(fragen[i]);
        if (g && !pick[g]) { offeneFrage = fragen[i]; break; }
      }
      zeigeSchritte();
      render();
    });
  });
  zeigeSchritte();
  render();

  /* --- 9. Schnellkontakt: Dialog, Uebergabe, Versand -------------------- */
  var dlg   = $('#kontakt-dialog');
  var slot  = $('#dialog-slot');
  var host  = $('#form-host');
  var form  = $('#kontaktform');
  var status = $('#form-status');
  var submit = $('#form-submit');
  var section = $('#kontakt');

  var inView = function (el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 90;
  };

  var openDialog = function () {
    if (!dlg || !form || dlg.open) return;
    slot.appendChild(form);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    window.setTimeout(function () { $('#f-name').focus(); }, 40);
  };
  var closeDialog = function () {
    if (!dlg || !dlg.open) return;
    dlg.close();
  };
  if (dlg) {
    dlg.addEventListener('close', function () { if (form) host.appendChild(form); });
    $$('[data-dialog-close]').forEach(function (b) { b.addEventListener('click', closeDialog); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDialog(); });
  }

  // Zentraler Einstieg: sichtbare Sektion bekommt Vorrang vor dem Overlay
  var openContact = function () {
    if (inView(section) && form && host.contains(form)) {
      section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduced ? 0 : 420);
    } else {
      openDialog();
    }
  };
  $$('[data-open-contact]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      /* Ein Knopf darf sein Anliegen mitgeben — dann steht es schon im
         Formular und die Anfrage kommt beschriftet an, statt als leeres Feld.
         Nur setzen, wenn noch nichts drinsteht: sonst ueberschriebe ein
         zweiter Klick, was jemand schon getippt hat. */
      var vorgabe = b.getAttribute('data-anliegen');
      var feld = $('#f-anliegen');
      if (vorgabe && feld && !feld.value.trim()) feld.value = vorgabe;
      openContact();
    });
  });

  function handoff() {
    var b = $('#f-branche'), a = $('#f-anliegen');
    if (b && pick.branche) b.value = pick.branche;
    if (a) {
      var t = THEMEN[pick.thema];
      a.value = 'Projekt-Check: ' + BRANCHEN[pick.branche] + ' · ' + t.label + ' · ' + ZEIT[pick.zeit].label +
                '\nEmpfehlung: ' + t.title;
    }
    openContact();
  }

  // Sticky-Button: erst nach dem Hero einblenden, in der Kontaktsektion wieder aus
  var sticky = $('.sticky-cta');
  if (sticky) {
    var hero = $('.hero');
    var inHero = false, inKontakt = false;
    var syncSticky = function () {
      var aus = (inHero || inKontakt);
      sticky.dataset.hidden = aus ? 'true' : 'false';
      /* Der Knopf im Kopf und der schwebende Knopf fuehren zum selben
         Formular. Sobald der schwebende erscheint, verschwindet der obere —
         sonst stuenden zwei gleiche Angebote gleichzeitig auf dem Schirm. */
      if (header) header.dataset.cta = aus ? 'an' : 'aus';
    };
    if ('IntersectionObserver' in window) {
      if (hero) new IntersectionObserver(function (e) {
        inHero = e[0].isIntersecting; syncSticky();
      }, { threshold: 0.25 }).observe(hero);
      if (section) new IntersectionObserver(function (e) {
        inKontakt = e[0].isIntersecting; syncSticky();
      }, { threshold: 0.14 }).observe(section);
      inHero = true; syncSticky();
    }
  }

  var say = function (kind, html) {
    if (!status) return;
    status.dataset.kind = kind;
    status.dataset.show = 'true';
    status.innerHTML =
      (kind === 'ok'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>'
      ) + '<span>' + html + '</span>';
  };

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.busy === 'true') return;

      var data = new FormData(form);
      if (String(data.get('firma') || '').trim() !== '') return;      // Honeypot: still verwerfen
      if (!form.reportValidity()) return;

      var payload = {
        name:     String(data.get('name') || '').trim(),
        kontakt:  String(data.get('kontakt') || '').trim(),
        branche:  BRANCHEN[data.get('branche')] || String(data.get('branche') || ''),
        anliegen: String(data.get('anliegen') || '').trim(),
        consent:  data.get('consent') === 'on',
        ts:       new Date().toISOString(),
        quelle:   window.location.pathname + (pick.thema ? ' · projekt-check' : '')
      };

      var label = $('[data-label]', submit);   // nur die Beschriftung tauschen, Icon bleibt stehen
      form.dataset.busy = 'true';
      submit.disabled = true;
      if (!submit.dataset.idle) submit.dataset.idle = label.textContent;
      label.textContent = 'Wird gesendet …';
      status.dataset.show = 'false';

      var done = function () {
        form.dataset.busy = 'false';
        submit.disabled = false;
        label.textContent = submit.dataset.idle;
      };

      // Ohne konfiguriertes Backend: Nachricht im E-Mail-Programm vorbereiten.
      if (!ENDPOINT) {
        window.location.href = 'mailto:' + MAILTO +
          '?subject=' + encodeURIComponent('Anfrage über die Website von ' + payload.name) +
          '&body=' + encodeURIComponent(
            'Name: '     + payload.name +
            '\nKontakt: '  + payload.kontakt +
            '\nBranche: '  + (payload.branche || 'keine Angabe') +
            '\n\nAnliegen:\n' + (payload.anliegen || 'keine Angabe') +
            '\n\nGesendet über das Kontaktformular'
          );
        done();
        say('ok', '<strong>Ihr E-Mail-Programm öffnet sich</strong> mit der fertigen Nachricht, bitte einmal absenden. Falls nichts passiert, schreiben Sie direkt an <a href="mailto:' +
                  MAILTO + '">' + MAILTO + '</a>.');
        return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset();
        done();
        say('ok', '<strong>Angekommen.</strong> Sie erhalten innerhalb eines Werktags eine qualifizierte Antwort, kein Newsletter und kein unangekündigter Verkaufsanruf.');
      }).catch(function () {
        done();
        say('err', 'Die Übertragung hat nicht geklappt. Schreiben Sie uns bitte direkt an <a href="mailto:' + MAILTO +
                   '?subject=Anfrage%20über%20die%20Website">' + MAILTO + '</a>, wir antworten genauso schnell.');
      });
    });
  }
})();
