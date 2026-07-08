/*!
 * MoorishGallery init v1.0 — populates article gallery sliders from their
 * hidden CMS collection wrappers. Replaces the 2021-era 7x inline paste on
 * the Articles Template (same behavior, one pinned file, up to 20 galleries).
 *
 * For each pair #MultiImageSliderN / #MultiImageCollectionWrapperN:
 * copies each CMS item's background-image onto the matching .w-slide,
 * trims excess slides, removes the whole slider when the gallery is empty,
 * strips arrows/nav when there is only one image, then reveals the slider.
 * The display layer (mt-gallery.js grid + lightbox) runs on top of this.
 */
(function () {
  function initSlider(n) {
    var $slider = $('#MultiImageSlider' + n);
    var $collectionWrapper = $('#MultiImageCollectionWrapper' + n);
    if (!$slider.length || !$collectionWrapper.length) return;
    var $slides = $slider.find('.w-slide');
    var $images = $collectionWrapper.find('.w-dyn-item');
    if (!$images.length) {
      $slider.remove();
    } else {
      var count = Math.min($images.length, $slides.length);
      for (var i = 0; i < count; i++) {
        $slides[i].style.backgroundImage = $images[i].style.backgroundImage;
      }
      for (var j = $slides.length; j > count; j--) {
        $slides[j - 1].remove();
      }
      if (count < 2) {
        $slider.find('.w-slider-arrow-left, .w-slider-arrow-right, .w-slider-nav').remove();
      }
      $slider.css('opacity', 1);
    }
    $collectionWrapper.remove();
  }
  $(function () {
    for (var n = 1; n <= 20; n++) {
      initSlider(n);
    }
  });
})();
