/* MoorishSW v1.0 — The Moorish Times service worker.
 *
 * Deliberately boring: a pure network passthrough that holds ZERO caches,
 * so a Webflow publish can never be masked by a stale service-worker layer.
 * Its only job is the branded offline page below, shown when a navigation
 * fails because the reader has no connection.
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
