// The Moorish Times Cookie Consent Script

(function() {
  const COOKIE_NAME = 'moorishcookie';
  const COOKIE_EXPIRY = 365; // days
  const CONSENT_STATES = {
    ACCEPTED: 'accepted',
    REFUSED: 'refused',
    PENDING: 'pending'
  };

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
    const banner = document.querySelector('[mtcc="banner"]');
    if (banner) banner.style.display = 'flex';
  }

  function hideBanner() {
    const banner = document.querySelector('[mtcc="banner"]');
    if (banner) banner.style.display = 'none';
  }

  function updateGAConsent(state) {
    window.dataLayer = window.dataLayer || [];
    
    if (state === CONSENT_STATES.ACCEPTED) {
      // Full tracking with all features
      gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted'
      });
    } else {
      // Refused or Pending: anonymous visit tracking only (no personal data)
      gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied'
      });
    }
  }

  function handleAllow() {
    setCookie(COOKIE_NAME, CONSENT_STATES.ACCEPTED, COOKIE_EXPIRY);
    updateGAConsent(CONSENT_STATES.ACCEPTED);
    hideBanner();
  }

  function handleDeny() {
    setCookie(COOKIE_NAME, CONSENT_STATES.REFUSED, COOKIE_EXPIRY);
    updateGAConsent(CONSENT_STATES.REFUSED);
    hideBanner();
  }

  function init() {
    const consent = getCookie(COOKIE_NAME);

    if (!consent) {
      // First visit: show banner and set default anonymous tracking
      showBanner();
      updateGAConsent(CONSENT_STATES.PENDING);
      
      const allowBtn = document.querySelector('[mtcc="allow"]');
      const denyBtn = document.querySelector('[mtcc="deny"]');
      
      if (allowBtn) allowBtn.addEventListener('click', handleAllow);
      if (denyBtn) denyBtn.addEventListener('click', handleDeny);
    } else {
      // Returning visitor: respect their choice
      hideBanner();
      updateGAConsent(consent);
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
