// The Moorish Times Cookie Consent Script

(function() {
  const COOKIE_NAME = 'moorishcookie';
  const COOKIE_EXPIRY = 365; // days

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  }

  function showBanner() {
    const banner = document.querySelector('[fs-cc="banner"]');
    if (banner) banner.style.display = 'flex';
  }

  function hideBanner() {
    const banner = document.querySelector('[fs-cc="banner"]');
    if (banner) banner.style.display = 'none';
  }

  function handleAllow() {
    setCookie(COOKIE_NAME, 'granted', COOKIE_EXPIRY);
    hideBanner();
  }

  function handleDeny() {
    setCookie(COOKIE_NAME, 'denied', COOKIE_EXPIRY);
    hideBanner();
  }

  function init() {
    const consent = getCookie(COOKIE_NAME);

    if (!consent) {
      showBanner();
      document.querySelector('[fs-cc="allow"]')?.addEventListener('click', handleAllow);
      document.querySelector('[fs-cc="deny"]')?.addEventListener('click', handleDeny);
    } else {
      hideBanner();
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
