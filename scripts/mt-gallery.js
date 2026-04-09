/**
 * MT Gallery — Transforms Webflow Sliders into grid galleries with lightbox
 * For The Moorish Times (moorishtimes.com)
 *
 * How it works:
 * 1. Finds all sliders with id="MultiImageSlider*"
 * 2. Hides empty slides and marks empty sliders
 * 3. Adds click-to-open lightbox on each image
 * 4. Provides prev/next navigation and swipe support
 * 5. Hides empty content sections (RichText + gallery pairs)
 *
 * CSS handles the grid transformation via [id^="MultiImageSlider"] selectors.
 * This JS adds interactivity (lightbox, empty detection, lazy loading).
 */

(function () {
  'use strict';

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Only run on article pages
    const sliders = document.querySelectorAll('[id^="MultiImageSlider"]');
    if (!sliders.length) return;

    hideEmptyGalleries(sliders);
    hideEmptySections();
    createLightbox();
    attachClickHandlers(sliders);
    addLazyLoading(sliders);
  }

  // ── Hide empty galleries ──────────────────────────

  function hideEmptyGalleries(sliders) {
    sliders.forEach(function (slider) {
      var slides = slider.querySelectorAll('.w-slide');
      var hasImages = false;

      slides.forEach(function (slide) {
        var img = slide.querySelector('img');
        if (!img || !img.src || img.src.includes('placeholder')) {
          slide.style.display = 'none';
        } else {
          hasImages = true;
        }
      });

      if (!hasImages) {
        slider.classList.add('mt-gallery-empty');
        slider.style.display = 'none';
      }
    });
  }

  // ── Hide empty content sections ───────────────────
  // Finds RichText blocks with no content and hides them + their adjacent dividers

  function hideEmptySections() {
    var richTexts = document.querySelectorAll('.post-text');
    richTexts.forEach(function (rt) {
      // Skip references section and section 1 (always visible)
      if (rt.classList.contains('references')) return;
      if (rt.classList.contains('section-1')) return;

      var content = rt.textContent.trim();
      var hasImages = rt.querySelector('img');

      if (!content && !hasImages) {
        rt.style.display = 'none';

        // Hide adjacent section divider
        var prev = rt.previousElementSibling;
        if (prev && prev.classList.contains('divider')) {
          prev.style.display = 'none';
        }
        var next = rt.nextElementSibling;
        if (next && next.classList.contains('divider')) {
          next.style.display = 'none';
        }
      }
    });
  }

  // ── Lightbox ──────────────────────────────────────

  var lightbox = null;
  var lightboxImg = null;
  var lightboxCounter = null;
  var currentImages = [];
  var currentIndex = 0;

  function createLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'mt-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-label', 'Galerie d\'images');

    lightbox.innerHTML =
      '<button class="mt-lightbox__close" aria-label="Fermer">&times;</button>' +
      '<button class="mt-lightbox__nav mt-lightbox__prev" aria-label="Image précédente">&#8249;</button>' +
      '<img class="mt-lightbox__img" alt="" />' +
      '<button class="mt-lightbox__nav mt-lightbox__next" aria-label="Image suivante">&#8250;</button>' +
      '<div class="mt-lightbox__counter"></div>';

    document.body.appendChild(lightbox);

    lightboxImg = lightbox.querySelector('.mt-lightbox__img');
    lightboxCounter = lightbox.querySelector('.mt-lightbox__counter');

    // Close handlers
    lightbox.querySelector('.mt-lightbox__close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    // Navigation
    lightbox.querySelector('.mt-lightbox__prev').addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(-1);
    });
    lightbox.querySelector('.mt-lightbox__next').addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    // Touch/swipe support
    var touchStartX = 0;
    var touchEndX = 0;

    lightbox.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        navigate(diff > 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  function openLightbox(images, index) {
    currentImages = images;
    currentIndex = index;
    lightbox.setAttribute('data-count', images.length);
    showImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + currentImages.length) % currentImages.length;
    showImage();
  }

  function showImage() {
    var src = currentImages[currentIndex];
    // Request full-size image (remove Webflow transforms)
    lightboxImg.src = src.replace(/\?.*$/, '');
    lightboxImg.alt = 'Image ' + (currentIndex + 1) + ' sur ' + currentImages.length;
    lightboxCounter.textContent = (currentIndex + 1) + ' / ' + currentImages.length;
  }

  // ── Attach click handlers ─────────────────────────

  function attachClickHandlers(sliders) {
    sliders.forEach(function (slider) {
      var images = [];
      var slides = slider.querySelectorAll('.w-slide');

      slides.forEach(function (slide) {
        var img = slide.querySelector('img');
        if (img && img.src && !img.src.includes('placeholder') && slide.style.display !== 'none') {
          images.push(img.src);
        }
      });

      if (images.length === 0) return;

      var visibleIndex = 0;
      slides.forEach(function (slide) {
        if (slide.style.display === 'none') return;
        var img = slide.querySelector('img');
        if (!img) return;

        var idx = visibleIndex;
        slide.addEventListener('click', function () {
          openLightbox(images, idx);
        });
        visibleIndex++;
      });
    });
  }

  // ── Lazy loading ──────────────────────────────────

  function addLazyLoading(sliders) {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var images = entry.target.querySelectorAll('.w-slide img[loading]');
          images.forEach(function (img) {
            img.removeAttribute('loading');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px' });

    sliders.forEach(function (slider) {
      // Add lazy loading attribute to images not in viewport
      var images = slider.querySelectorAll('.w-slide img');
      images.forEach(function (img) {
        img.setAttribute('loading', 'lazy');
      });
      observer.observe(slider);
    });
  }
})();
