/*!
 * MoorishTweet v1.0 — X/Twitter embeds that survive the Webflow Editor.
 * Zero dependencies. Companion to the news desk's sourced dispatches.
 *
 * Why: the canonical X embed is a <blockquote class="twitter-tweet"> carrying the
 * tweet text, and the Webflow EDITOR destroys it. Opening a CMS item in the Editor
 * re-sanitises its rich text and strips unknown classes, so "twitter-tweet"
 * disappears, widgets.js finds nothing to upgrade, and the blockquote's innards
 * spill into the article as orphan "— Outlet (@handle) 31 de julio de 2026" lines
 * (2026-07-31: it also unwrapped one blockquote and swallowed the paragraph above
 * it, dropping the lettrine onto a tweet credit). Only the PRIMARY locale is hit —
 * the Editor never writes the secondary — so the damage is silent and asymmetric.
 *
 * The fix is to stop depending on markup the Editor can rewrite. A plain <a href>
 * is the one thing every rich-text sanitiser preserves, so that becomes the carrier:
 * put a bare status link alone in its own paragraph and this script turns it into a
 * real embed at runtime. Nothing to strip, nothing to unwrap.
 *
 * Behavior: for each STANDALONE link to x.com/twitter.com …/status/<id> (a link
 * that is the whole paragraph — links inside prose stay links), builds a .mt-tweet
 * host, moves the paragraph inside it as visible fallback, and asks the X widget
 * factory to render the tweet there. The fallback link is removed only once the
 * embed actually renders, so a blocked or slow widgets.js degrades to a plain
 * attributed link rather than a hole. Replies are hidden (conversation: none) and
 * tracking is off (dnt). Inert on pages with no status links; idempotent.
 */
(function () {
  "use strict";

  var WIDGETS = "https://platform.twitter.com/widgets.js";
  // …/status/<id> and the legacy …/statuses/<id>; query strings are ignored.
  var STATUS = /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\/]+\/status(?:es)?\/(\d+)/i;
  var DONE = "data-mt-tweet";

  function tweetId(href) {
    var m = (href || "").match(STATUS);
    return m ? m[1] : null;
  }

  // A link becomes a card only when it IS the paragraph. This keeps ordinary
  // in-text citations ("as @LeDesk_ma reported") as links, and means an author
  // opts in simply by putting the URL on a line of its own.
  function isStandalone(link) {
    var block = link.parentNode;
    if (!block || block.nodeType !== 1) return false;
    if (block.tagName !== "P" && block.tagName !== "DIV") return false;
    if (block.getElementsByTagName("a").length !== 1) return false;
    return block.textContent.replace(/\s+/g, "") === link.textContent.replace(/\s+/g, "");
  }

  function loadWidgets() {
    // Twitter's own bootstrap: safe to call repeatedly, and gives us twttr.ready
    // even before the script lands.
    var t = window.twttr || {};
    if (document.getElementById("twitter-wjs")) return t;
    var first = document.getElementsByTagName("script")[0];
    var js = document.createElement("script");
    js.id = "twitter-wjs";
    js.src = WIDGETS;
    js.async = true;
    js.charset = "utf-8";
    if (first && first.parentNode) first.parentNode.insertBefore(js, first);
    else document.body.appendChild(js);
    t._e = t._e || [];
    t.ready = t.ready || function (f) { t._e.push(f); };
    window.twttr = t;
    return t;
  }

  function render(host, id, fallback) {
    window.twttr.widgets
      .createTweet(id, host, {
        conversation: "none",       // the article is the context, not the reply thread
        dnt: true,                  // no personalisation signal sent back to X
        align: "center",
        lang: (document.documentElement.lang || "fr").slice(0, 2)
      })
      .then(function (el) {
        // Keep the link if the widget declined to render (deleted/protected tweet).
        if (el && fallback && fallback.parentNode === host) host.removeChild(fallback);
      })
      .catch(function () { /* fallback link stays visible */ });
  }

  function init() {
    var links = document.querySelectorAll('a[href*="/status/"], a[href*="/statuses/"]');
    var found = 0;

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (link.getAttribute(DONE)) continue;
      var id = tweetId(link.getAttribute("href"));
      if (!id || !isStandalone(link)) continue;

      var block = link.parentNode;
      if (!block.parentNode) continue;
      link.setAttribute(DONE, id);

      var host = document.createElement("div");
      host.className = "mt-tweet";
      host.setAttribute("data-tweet-id", id);
      block.parentNode.insertBefore(host, block);
      host.appendChild(block);                       // visible fallback until it renders
      found++;

      (function (h, tid, fb) {
        loadWidgets();
        if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) {
          render(h, tid, fb);
        } else {
          window.twttr.ready(function () { render(h, tid, fb); });
        }
      })(host, id, block);
    }
    return found;
  }

  function start() {
    init();
    // Article bodies are static, but MoorishPaginate REPLACES the listing node, so
    // observe a stable ancestor rather than anything that can be swapped out.
    if (window.MutationObserver) {
      var timer = null;
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(init, 150);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
