/*!
 * MoorishPaginate v1.0 — seamless CMS pagination for moorishtimes.com
 * Replaces jquery.pjax 2.0.1 (archived upstream). Zero dependencies.
 *
 * Behavior: intercepts Webflow pagination links (.w-pagination-wrapper a),
 * fetches the target page, swaps the #seamless-replace container in place
 * (inside a View Transition where the browser supports it), updates the URL,
 * re-inits Webflow interactions once, and smooth-scrolls back to the top of
 * the list. Any failure (timeout, missing container, HTTP error) falls back
 * to a normal full navigation. Inert on pages without the container.
 */
(function () {
  'use strict';

  var SEL = '#seamless-replace';
  var SCROLL_TARGET = '#Beginarticles';
  var TIMEOUT_MS = 2500;
  var SCROLL_MS = 1000;

  if (window.__mtPaginate) return;            // paste-twice / double-load guard
  if (!document.querySelector(SEL)) return;   // no container on this page → stay inert
  window.__mtPaginate = true;

  function reinitWebflow() {
    try {
      if (window.Webflow && Webflow.require) Webflow.require('ix2').init();
    } catch (e) { /* ix2 absent — nothing to re-init */ }
  }

  // jQuery-free equivalent of the old $('html,body').animate(..., 1000)
  function scrollToList() {
    var t = document.querySelector(SCROLL_TARGET) || document.querySelector(SEL);
    if (!t) return;
    var from = window.pageYOffset || document.documentElement.scrollTop || 0;
    var to = t.getBoundingClientRect().top + from;
    var start;
    function step(ts) {
      if (start === undefined) start = ts;
      var p = Math.min((ts - start) / SCROLL_MS, 1);
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, from + (to - from) * eased);
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function swap(url, push) {
    var container = document.querySelector(SEL);
    if (!container) { window.location.href = url; return; }

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);

    fetch(url, { signal: ctrl.signal, credentials: 'same-origin' })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var next = doc.querySelector(SEL);
        if (!next) throw new Error('no ' + SEL + ' in response');

        function apply() {
          container.replaceWith(next);
          reinitWebflow();
        }

        var transitioned = document.startViewTransition
          ? document.startViewTransition(apply).finished.catch(function () {})
          : (apply(), Promise.resolve());

        return transitioned.then(function () {
          if (push) {
            // mark the current entry the first time, so Back can return to it seamlessly
            if (!window.history.state || !window.history.state.mtPaginate) {
              window.history.replaceState({ mtPaginate: true }, '', window.location.href);
            }
            window.history.pushState({ mtPaginate: true }, '', url);
          }
          if (doc.title) document.title = doc.title;
          scrollToList();
        });
      })
      .catch(function () {
        clearTimeout(timer);
        window.location.href = url;             // graceful degradation, always
      });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest('.w-pagination-wrapper a');
    if (!a || !a.href) return;
    if (a.target && a.target !== '_self') return;
    if (a.origin !== window.location.origin) return;
    e.preventDefault();
    swap(a.href, true);
  });

  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.mtPaginate) swap(window.location.href, false);
  });
})();
