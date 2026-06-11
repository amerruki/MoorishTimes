// The Moorish Times Cookie Consent Script — v2
// Self-contained consent banner wired to Google Consent Mode v2.
// Markup contract: [mtcc="banner"], [mtcc="allow"], [mtcc="deny"].
// Pairs with the inline "consent default" snippet in the site head,
// which reads the same cookie so returning visitors get the right
// consent state before GTM boots. This file only manages the banner
// and consent *updates*.

(function () {
  var COOKIE_NAME = 'moorishcookie';
  var COOKIE_DAYS = 365;
  var ACCEPTED = 'accepted';
  var REFUSED = 'refused';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? match[1] : null;
  }

  function setCookie(name, value, days) {
    var maxAge = days * 24 * 60 * 60;
    var attrs = ';path=/;max-age=' + maxAge + ';SameSite=Lax';
    if (location.protocol === 'https:') attrs += ';Secure';
    document.cookie = name + '=' + value + attrs;
  }

  // Use the gtag defined by the head snippet; fall back to a local stub
  // so consent updates still reach the dataLayer if the snippet is absent.
  function gtagCall() {
    if (typeof window.gtag === 'function') {
      window.gtag.apply(null, arguments);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(arguments);
    }
  }

  function updateConsent(granted) {
    var state = granted ? 'granted' : 'denied';
    gtagCall('consent', 'update', {
      ad_storage: state,
      analytics_storage: state,
      ad_user_data: state,
      ad_personalization: state
    });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: granted ? 'mtcc-allow' : 'mtcc-deny' });
  }

  function banner() {
    return document.querySelector('[mtcc="banner"]');
  }

  function showBanner() {
    var el = banner();
    if (el) el.style.display = 'flex';
  }

  function hideBanner() {
    var el = banner();
    if (el) el.style.display = 'none';
  }

  function choose(value, granted) {
    setCookie(COOKIE_NAME, value, COOKIE_DAYS);
    updateConsent(granted);
    hideBanner();
  }

  function init() {
    var consent = getCookie(COOKIE_NAME);

    if (consent === ACCEPTED || consent === REFUSED) {
      // Returning visitor: the head snippet already applied their state.
      // Banner stays hidden (its class hides it by default).
      hideBanner();
      return;
    }

    // First visit: defaults are denied (head snippet); show the banner.
    var allowBtn = document.querySelector('[mtcc="allow"]');
    var denyBtn = document.querySelector('[mtcc="deny"]');

    if (allowBtn) allowBtn.addEventListener('click', function (e) {
      e.preventDefault();
      choose(ACCEPTED, true);
    });
    if (denyBtn) denyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      choose(REFUSED, false);
    });

    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
