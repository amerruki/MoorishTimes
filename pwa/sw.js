/* MoorishSW v2.0 — The Moorish Times service worker.
 *
 * Deliberately boring: a pure network passthrough that holds ZERO caches,
 * so a Webflow publish can never be masked by a stale service-worker layer.
 * Two jobs only: the branded offline page below (when a navigation fails
 * offline), and — since v2.0 — Web Push: show the notification composed by
 * the backend (lib/webpush/compose.ts shape) and open the article on tap.
 * Subscribing happens in MoorishPush.js (page-side); this file never asks
 * for permission.
 *
 * Served same-origin at moorishtimes.com/sw.js by the `mt-pwa` Cloudflare
 * zone worker (commit-pinned jsDelivr proxy). Kill switch: repin the zone
 * worker to serve pwa/sw-noop.js instead.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Hygiene: this worker owns no caches — clear anything a previous version left behind.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('moorish-')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // subresources: untouched passthrough
  event.respondWith(
    fetch(event.request).catch(() => offlineResponse(new URL(event.request.url)))
  );
});

self.addEventListener('push', (event) => {
  // Payload: {title, body, url, tag, locale, section} — unknown fields ignored.
  // Always show something: Safari revokes the subscription on silent pushes.
  let n = null;
  try {
    n = event.data ? event.data.json() : null;
  } catch (e) {
    n = null;
  }
  const title = (n && n.title) || 'The Moorish Times';
  const options = {
    body: (n && n.body) || '',
    icon: '/pwa/icons/icon-192-v2.png',
    badge: '/pwa/icons/badge-96.png',
    tag: (n && n.tag) || 'mt-news',
    data: { url: (n && n.url) || '/' },
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if ('setAppBadge' in navigator) {
      try { await navigator.setAppBadge(); } catch (e) { /* badge is garnish */ }
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    if ('clearAppBadge' in navigator) {
      try { await navigator.clearAppBadge(); } catch (e) { /* ignore */ }
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

function offlineResponse(url) {
  const en = url.pathname === '/en' || url.pathname.startsWith('/en/');
  const t = en
    ? { lang: 'en', title: 'You are offline', body: 'The connection dropped. This page will be waiting once the network returns.', retry: 'Try again' }
    : { lang: 'fr', title: 'Vous êtes hors ligne', body: 'La connexion s’est interrompue. Cette page vous attendra dès que le réseau reviendra.', retry: 'Réessayer' };
  const html = `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#151515">
<title>${t.title} — The Moorish Times</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#151515;color:#fff;text-align:center;
    font-family:'Open Sans',-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif}
  .plate{padding:48px 28px;max-width:26em}
  .star{font-size:56px;line-height:1;color:#7C6F65}
  .mark{margin:22px 0 0;font-family:'Quicksand',ui-rounded,-apple-system,'Segoe UI',sans-serif;
    font-weight:600;font-size:15px;letter-spacing:.32em;text-indent:.32em;color:#fff}
  .rule{width:72px;height:2px;background:rgba(255,255,255,.92);border:0;margin:26px auto}
  h1{margin:0 0 12px;font-size:24px;font-weight:700}
  p{margin:0 0 30px;font-size:15px;line-height:1.65;color:#C9C4BC}
  button{appearance:none;border:0;border-radius:3px;cursor:pointer;
    background:#1D7BBC;color:#fff;padding:11px 30px;font:600 14px/1 inherit;letter-spacing:.04em}
  button:hover{background:#125A8C}
</style>
</head>
<body>
<div class="plate">
  <div class="star">۞</div>
  <p class="mark">THE MOORISH TIMES</p>
  <hr class="rule">
  <h1>${t.title}</h1>
  <p>${t.body}</p>
  <button onclick="location.reload()">${t.retry}</button>
</div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
