/* =========================================================================
   Berlin Digital Systems — Interaktion
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
  var MAILTO   = 'kontakt@berlin-digital-systems.de';

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

      karten.forEach(function () { dots.appendChild(document.createElement('i')); });
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
    psycho:   'Psychotherapiepraxen',
    hotel:    'Hotellerie',
    handwerk: 'Handwerk',
    bau:      'Baubetriebe',
    gastro:   'Gastronomie',
    andere:   'Andere Branche'
  };

  var DREH = {
    praxis:   'Anliegen-Triage vor dem Telefon — Ihr Buchungstool bleibt die Terminmaschine. Dazu Selbstzahlerseiten und MFA-Recruiting.',
    psycho:   'Strukturierte Erstanfrage mit Kassensitz/Privat, Verfahren und Kapazitätsstatus. Ziel ist Entlastung und Passung, nicht mehr Anfragen.',
    hotel:    'Direktbuchungspfad zur bestehenden Booking-Engine, dazu Event- und Tagungsanfragen mit Personenzahl und Budgetrahmen.',
    handwerk: 'Benannte Projekt-Konfiguratoren mit Eckdaten, Budgetrahmen und Foto-Upload — plus Karriereseiten mit 60-Sekunden-Bewerbung.',
    bau:      'Projekt-Konfigurator mit Projektart, Größenordnung, Zeitfenster und Plan-Upload sowie getrennte Recruiting-Funnels.',
    gastro:   'Eigene Reservierung, echte HTML-Speisekarte statt PDF sowie Event-, Catering- und Gutscheinstrecken.',
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
      label: 'Wir finden keine Leute',
      title: 'Recruiting-Paket',
      mods: ['Recruiting-System', '60-Sekunden-Bewerbung', 'Google-for-Jobs-Setup', 'Recruiting-Begleitung'],
      entry: 'Kostenloser Quick-Check im Erstgespräch: Wir testen Ihre aktuelle Bewerbungsstrecke live am Handy.',
    },
    website: {
      label: 'Website ist alt — oder es gibt keine',
      title: 'Launch- & Redesign-Paket',
      mods: ['One-Page- oder Business-Website bzw. Redesign', 'SEO-Fundament', 'GEO-Grundsetup', 'Google-Business-Profil'],
      entry: 'Einstieg über die Diagnose im Erstgespräch — mit erster Analyse Ihres aktuellen Auftritts.',
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
    sofort:  { label: 'So schnell wie möglich', line: 'Kurzfristig — wir melden uns innerhalb eines Werktags mit Einschätzung und möglichen Startterminen.' },
    quartal: { label: 'Im nächsten Quartal',    line: 'Nächstes Quartal — wir liefern die Diagnose jetzt, damit das Angebot zum Start bereitliegt.' },
    offen:   { label: 'Wir orientieren uns',    line: 'Offener Zeitrahmen — Sie erhalten eine Einschätzung ohne Termindruck.' }
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
        '</em> — danach sehen Sie hier Ihr passendes System.</span></div>';
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

  $$('[data-check]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.check, value = btn.dataset.value;
      $$('[data-check="' + group + '"]').forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === btn));
      });
      pick[group] = value;
      render();
    });
  });
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
    b.addEventListener('click', function (e) { e.preventDefault(); openContact(); });
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
      sticky.dataset.hidden = (inHero || inKontakt) ? 'true' : 'false';
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
          '?subject=' + encodeURIComponent('Anfrage über die Website — ' + payload.name) +
          '&body=' + encodeURIComponent(
            'Name: '     + payload.name +
            '\nKontakt: '  + payload.kontakt +
            '\nBranche: '  + (payload.branche || 'keine Angabe') +
            '\n\nAnliegen:\n' + (payload.anliegen || '—') +
            '\n\n— gesendet über das Kontaktformular'
          );
        done();
        say('ok', '<strong>Ihr E-Mail-Programm öffnet sich</strong> mit der fertigen Nachricht — bitte einmal absenden. Falls nichts passiert, schreiben Sie direkt an <a href="mailto:' +
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
        say('ok', '<strong>Angekommen.</strong> Sie erhalten innerhalb eines Werktags eine qualifizierte Antwort — kein Newsletter, kein unangekündigter Verkaufsanruf.');
      }).catch(function () {
        done();
        say('err', 'Die Übertragung hat nicht geklappt. Schreiben Sie uns bitte direkt an <a href="mailto:' + MAILTO +
                   '?subject=Anfrage%20über%20die%20Website">' + MAILTO + '</a> — wir antworten genauso schnell.');
      });
    });
  }
})();
