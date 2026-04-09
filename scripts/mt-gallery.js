/**
 * MT Gallery v2 — Transforms Webflow Sliders into grid galleries with lightbox
 * For The Moorish Times (moorishtimes.com)
 *
 * IMPORTANT: The existing slider code sets background-image on .w-slide divs
 * (not <img> elements). This script detects both patterns:
 * - background-image on slides (current site behavior)
 * - <img> inside slides (standard Webflow multi-image binding)
 */

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Wait for existing slider init script to run first
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }

  function init() {
    var sliders = document.querySelectorAll('[id^="MultiImageSlider"]');
    if (!sliders.length) return;

    hideEmptyGalleries(sliders);
    hideEmptySections();
    createLightbox();
    attachClickHandlers(sliders);
  }

  // ── Get image URL from a slide ────────────────────
  // Handles both background-image and <img> patterns

  function getSlideImageUrl(slide) {
    // Check for <img> first
    var img = slide.querySelector('img');
    if (img && img.src && !img.src.includes('placeholder')) {
      return img.src;
    }

    // Check background-image (inline style first, then computed)
    var bg = slide.style.backgroundImage;
    if (!bg || bg === 'none' || bg === '') {
      try { bg = getComputedStyle(slide).backgroundImage; } catch (e) { bg = ''; }
    }
    if (bg && bg !== 'none' && bg !== '') {
      var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  // ── Hide empty galleries ──────────────────────────

  function hideEmptyGalleries(sliders) {
    sliders.forEach(function (slider) {
      var slides = slider.querySelectorAll('.w-slide');
      var hasImages = false;

      slides.forEach(function (slide) {
        var url = getSlideImageUrl(slide);
        if (!url) {
          slide.style.display = 'none';
        } else {
          hasImages = true;
        }
      });

      if (!hasImages) {
        slider.classList.add('mt-gallery-empty');
        slider.style.display = 'none';
      } else {
        // Make slider visible (existing code sets opacity:0 initially)
        slider.style.opacity = '1';
      }
    });
  }

  // ── Hide empty content sections ───────────────────

  function hideEmptySections() {
    var richTexts = document.querySelectorAll('.w-richtext');
    richTexts.forEach(function (rt) {
      var parent = rt.closest('[class*="post-text"]') || rt;
      if (parent.classList.contains('references')) return;

      var content = rt.textContent.trim();
      var hasImages = rt.querySelector('img');
      var hasFigures = rt.querySelector('figure');

      if (!content && !hasImages && !hasFigures) {
        parent.style.display = 'none';
        var prev = parent.previousElementSibling;
        if (prev && (prev.classList.contains('divider') || prev.classList.contains('section-divider'))) {
          prev.style.display = 'none';
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
      '<button class="mt-lightbox__nav mt-lightbox__prev" aria-label="Image pr\u00e9c\u00e9dente">&#8249;</button>' +
      '<img class="mt-lightbox__img" alt="" />' +
      '<button class="mt-lightbox__nav mt-lightbox__next" aria-label="Image suivante">&#8250;</button>' +
      '<div class="mt-lightbox__counter"></div>';

    document.body.appendChild(lightbox);

    lightboxImg = lightbox.querySelector('.mt-lightbox__img');
    lightboxCounter = lightbox.querySelector('.mt-lightbox__counter');

    lightbox.querySelector('.mt-lightbox__close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    lightbox.querySelector('.mt-lightbox__prev').addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(-1);
    });
    lightbox.querySelector('.mt-lightbox__next').addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(1);
    });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    var touchStartX = 0;
    lightbox.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
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
    lightboxImg.src = src.replace(/\?.*$/, '');
    lightboxImg.alt = 'Image ' + (currentIndex + 1) + ' sur ' + currentImages.length;
    lightboxCounter.textContent = (currentIndex + 1) + ' / ' + currentImages.length;
  }

  // ── Click handlers ────────────────────────────────

  function attachClickHandlers(sliders) {
    sliders.forEach(function (slider) {
      var images = [];
      var slides = slider.querySelectorAll('.w-slide');

      slides.forEach(function (slide) {
        if (slide.style.display === 'none') return;
        var url = getSlideImageUrl(slide);
        if (url) images.push(url);
      });

      if (images.length === 0) return;

      var visibleIndex = 0;
      slides.forEach(function (slide) {
        if (slide.style.display === 'none') return;
        var url = getSlideImageUrl(slide);
        if (!url) return;

        var idx = visibleIndex;
        slide.style.cursor = 'pointer';
        slide.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openLightbox(images, idx);
        });
        visibleIndex++;
      });
    });
  }
})();
