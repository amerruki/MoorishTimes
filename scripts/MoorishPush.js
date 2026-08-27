// MoorishPush v1.0 — publication-alert opt-in for the installed web app.
//
// Shows a small bell in the INSTALLED app only (display-mode: standalone);
// the plain website is untouched. iOS is excluded entirely — the native app
// owns push there. The browser's permission dialog fires only on the reader's
// tap, never on load. Subscriptions register with the Webflow Cloud backend
// (/app-api/v1/web-push/*), which fans out on every publish (MoorishSW v2.0
// shows the notification). Clicking the active bell unsubscribes.
//
// Loaded commit-pinned from jsDelivr in the site-wide footer, like its
// siblings. Placement and glyph live in the CONFIG block below.

(function () {
  'use strict';

  var CONFIG = {
    // Bottom-right, clear of the site's .up-button (which sits in the corner).
    offsetBottom: '88px',
    offsetRight: '16px',
    glyph: '۞', // ۞ rub el hizb — the house mark
    copy: {
      fr: { on: 'Recevoir les alertes de parution', off: 'Alertes activées — toucher pour arrêter', done: 'Alertes activées' },
      en: { on: 'Get publication alerts', off: 'Alerts on - tap to stop', done: 'Alerts on' },
    },
    minVisits: 2, // engagement gate: bell appears from the reader's Nth visit
  };

  // ---- gates --------------------------------------------------------------
  if (!/(^|\.)moorishtimes\.com$/.test(location.hostname)) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  var standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (!standalone) return;

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return; // the native app owns iOS push

  // The installed app is open: anything announced has been seen.
  if ('clearAppBadge' in navigator) {
    try { navigator.clearAppBadge(); } catch (e) { /* garnish */ }
  }

  var EN = location.pathname === '/en' || location.pathname.indexOf('/en/') === 0;
  var T = EN ? CONFIG.copy.en : CONFIG.copy.fr;
  var API = location.origin + '/app-api/v1';
  var LS_VISITS = 'mt-push-visits';
  var LS_SYNCED = 'mt-push-synced-at';
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  var visits = 0;
  try {
    visits = (parseInt(localStorage.getItem(LS_VISITS) || '0', 10) || 0) + 1;
    localStorage.setItem(LS_VISITS, String(visits));
  } catch (e) { visits = CONFIG.minVisits; } // storage unavailable: don't hide forever

  // ---- helpers ------------------------------------------------------------
  function b64urlToUint8(s) {
    var pad = s.length % 4 === 0 ? '' : '===='.slice(s.length % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function subscriptionPayload(sub) {
    var j = sub.toJSON();
    return {
      endpoint: j.endpoint,
      keys: { p256dh: j.keys.p256dh, auth: j.keys.auth },
      locale: EN ? 'en' : 'fr',
    };
  }

  function registerWithBackend(sub) {
    return fetch(API + '/web-push/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(subscriptionPayload(sub)),
    }).then(function (r) {
      if (r.ok) { try { localStorage.setItem(LS_SYNCED, String(Date.now())); } catch (e) {} }
      return r.ok;
    });
  }

  // ---- bell ---------------------------------------------------------------
  var bell = null;

  function styleBell(active) {
    bell.setAttribute('aria-label', active ? T.off : T.on);
    bell.title = active ? T.off : T.on;
    bell.style.background = active ? '#1D7BBC' : '#151515';
    bell.style.color = active ? '#fff' : '#F8DB5A';
    bell.style.borderColor = active ? '#1D7BBC' : 'rgba(255,255,255,.28)';
  }

  function makeBell(active) {
    bell = document.createElement('button');
    bell.id = 'mt-push-bell';
    bell.type = 'button';
    bell.textContent = CONFIG.glyph;
    var s = bell.style;
    s.position = 'fixed';
    s.bottom = CONFIG.offsetBottom;
    s.right = CONFIG.offsetRight;
    s.zIndex = '999';
    s.width = '42px';
    s.height = '42px';
    s.borderRadius = '50%';
    s.border = '1px solid';
    s.font = '20px/40px sans-serif';
    s.textAlign = 'center';
    s.padding = '0';
    s.cursor = 'pointer';
    s.boxShadow = '0 2px 10px rgba(0,0,0,.35)';
    s.transition = 'transform .15s ease, background .2s ease';
    bell.onmouseenter = function () { s.transform = 'scale(1.08)'; };
    bell.onmouseleave = function () { s.transform = 'scale(1)'; };
    styleBell(active);
    bell.addEventListener('click', onTap);
    document.body.appendChild(bell);
  }

  function flash(text) {
    bell.title = text;
    bell.setAttribute('aria-label', text);
  }

  function onTap() {
    bell.disabled = true;
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) {
          // Active bell tapped: unsubscribe both sides.
          return fetch(API + '/web-push/subscriptions', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          }).catch(function () {}).then(function () {
            return existing.unsubscribe();
          }).then(function () { styleBell(false); });
        }
        return Notification.requestPermission().then(function (perm) {
          if (perm !== 'granted') return; // reader said no; bell stays passive
          return fetch(API + '/web-push/vapid-public-key')
            .then(function (r) { return r.json(); })
            .then(function (j) {
              return reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: b64urlToUint8(j.key),
              });
            })
            .then(function (sub) { return registerWithBackend(sub); })
            .then(function (ok) {
              if (ok) { styleBell(true); flash(T.done); }
            });
        });
      });
    }).catch(function () { /* leave the bell as-is; next tap retries */ })
      .then(function () { bell.disabled = false; });
  }

  // ---- boot ---------------------------------------------------------------
  window.addEventListener('load', function () {
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (sub) {
        makeBell(true);
        // Weekly re-sync keeps the registry's updated_at fresh.
        var last = 0;
        try { last = parseInt(localStorage.getItem(LS_SYNCED) || '0', 10) || 0; } catch (e) {}
        if (Date.now() - last > WEEK_MS) registerWithBackend(sub);
      } else if (Notification.permission !== 'denied' && visits >= CONFIG.minVisits) {
        makeBell(false);
      }
    }).catch(function () { /* no SW yet: nothing to offer */ });
  });
})();
