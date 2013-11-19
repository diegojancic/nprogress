/*! NProgress (c) 2013, Rico Sta. Cruz
 *  http://ricostacruz.com/nprogress */

 var NProgress;
;(function(factory) {

    NProgress = factory($);/*
  if (typeof module === 'function') {
    module.exports = factory(this.jQuery || require('jquery'));
  } else if (typeof define === 'function' && define.amd) {
    define(['jquery'], function($) {
      return factory($);
    });
  } else {
  }
*/
})(function($) {
  var NProgress = {};

  NProgress.version = '0.1.2';

  var Settings = NProgress.settings = {
    minimum: 0.08,
    easing: 'ease',
    positionUsing: '',
    speed: 200,
    trickle: true,
    trickleRate: 0.02,
    trickleSpeed: 800,
    showSpinner: true,
    template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
  };

  /**
   * Updates configuration.
   *
   *     NProgress.configure({
   *       minimum: 0.1
   *     });
   */
  NProgress.configure = function(options) {
    Object.extend(Settings, options);
    return this;
  };

  /**
   * Last number.
   */

  NProgress.status = null;

  NProgress.animationQueue = [];
  /**
   * Sets the progress bar status, where `n` is a number from `0.0` to `1.0`.
   *
   *     NProgress.set(0.4);
   *     NProgress.set(1.0);
   */

  NProgress.set = function(n) {
    var started = NProgress.isStarted();

    n = clamp(n, Settings.minimum, 1);
    NProgress.status = (n === 1 ? null : n);

    var $progress = NProgress.render(!started),
        $bar      = Element.select($progress, '[role="bar"]'),
        speed     = Settings.speed,
        ease      = Settings.easing;

    $progress.offsetWidth; /* Repaint */

	// Equivalent to jQuery's queue
	NProgress.animationQueue.push(function() {
      // Set positionUsing if it hasn't already been set
      if (Settings.positionUsing === '') Settings.positionUsing = NProgress.getPositioningCSS();

      // Add transition
      $bar.each(function(e) {e.setStyle(barPositionCSS(n, speed, ease))});

      if (n === 1) {
        // Fade out
        $progress.setStyle({ transition: 'none', opacity: 1 });
        $progress.offsetWidth; /* Repaint */
		
		var next = null;
		if (NProgress.animationQueue.length > 0) { 
			next = NProgress.animationQueue.shift();
		} 
		
        setTimeout(function() {
          $progress.setStyle({ transition: 'all '+speed+'ms linear', opacity: 0 });
          setTimeout(function() {
            NProgress.remove();
            if (next != null) next();
          }, speed);
        }, speed);
      } else {
        if (next != null) setTimeout(next, speed);
      }
    });

	if (NProgress.animationQueue.length == 1) { 
		NProgress.animationQueue.shift()();
	}

    return this;
  };

  NProgress.isStarted = function() {
    return typeof NProgress.status === 'number';
  };

  /**
   * Shows the progress bar.
   * This is the same as setting the status to 0%, except that it doesn't go backwards.
   *
   *     NProgress.start();
   *
   */
  NProgress.start = function() {
    if (!NProgress.status) NProgress.set(0);

    var work = function() {
      setTimeout(function() {
        if (!NProgress.status) return;
        NProgress.trickle();
        work();
      }, Settings.trickleSpeed);
    };

    if (Settings.trickle) work();

    return this;
  };

  /**
   * Hides the progress bar.
   * This is the *sort of* the same as setting the status to 100%, with the
   * difference being `done()` makes some placebo effect of some realistic motion.
   *
   *     NProgress.done();
   *
   * If `true` is passed, it will show the progress bar even if its hidden.
   *
   *     NProgress.done(true);
   */

  NProgress.done = function(force) {
    if (!force && !NProgress.status) return this;
    return NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
  };

  /**
   * Increments by a random amount.
   */

  NProgress.inc = function(amount) {
    var n = NProgress.status;

    if (!n) {
      return NProgress.start();
    } else {
      if (typeof amount !== 'number') {
        amount = (1 - n) * clamp(Math.random() * n, 0.1, 0.95);
      }

      n = clamp(n + amount, 0, 0.994);
      return NProgress.set(n);
    }
  };

  NProgress.trickle = function() {
    return NProgress.inc(Math.random() * Settings.trickleRate);
  };

  /**
   * Waits for all supplied jQuery promises and
   * increases the progress as the promises resolve.
   * 
   * @param $promise jQUery Promise
   */
  (function() {
    var initial = 0, current = 0;
    
    NProgress.promise = function($promise) {
      if (!$promise || $promise.state() == "resolved") {
        return this;
      }
      
      if (current == 0) {
        NProgress.start();
      }
      
      initial++;
      current++;
      
      $promise.always(function() {
        current--;
        if (current == 0) {
            initial = 0;
            NProgress.done();
        } else {
            NProgress.set((initial - current) / initial);
        }
      });
      
      return this;
    };
    
  })();

  /**
   * (Internal) renders the progress bar markup based on the `template`
   * setting.
   */

  NProgress.render = function(fromStart) {
    if (NProgress.isRendered()) return $("nprogress");
    $$('html')[0].addClassName('nprogress-busy');

    var $el = document.createElement("div");
	$el.id = 'nprogress';
    $el.innerHTML = Settings.template;

    var perc = fromStart ? '-100' : toBarPerc(NProgress.status || 0);

    $($el).select('[role="bar"]').each(function(e) {e.setStyle({
      transition: 'all 0 linear',
      transform: 'translate3d('+perc+'%,0,0)',
	  WebkitTransform: 'translate3d('+perc+'%,0,0)',
	  MozTransform: 'translate3d('+perc+'%,0,0)',
	  msTransform: 'translate3d('+perc+'%,0,0)',
	  OTransform: 'translate3d('+perc+'%,0,0)'
    })
	});

    if (!Settings.showSpinner)
      $el.select('[role="spinner"]').each(function(e) {e.remove()});

	$$('body')[0].insert($el);

    return $el;
  };

  /**
   * Removes the element. Opposite of render().
   */

  NProgress.remove = function() {
    $$('html')[0].removeClassName('nprogress-busy');
	var np = $('nprogress');
	if (np!=null) np.remove();
  };

  /**
   * Checks if the progress bar is rendered.
   */

  NProgress.isRendered = function() {
    return ($("nprogress") != null);
  };

  /**
   * Determine which positioning CSS rule to use.
   */

  NProgress.getPositioningCSS = function() {
    // Sniff on document.body.style
    var bodyStyle = document.body.style;

    // Sniff prefixes
    var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
                       ('MozTransform' in bodyStyle) ? 'Moz' :
                       ('msTransform' in bodyStyle) ? 'ms' :
                       ('OTransform' in bodyStyle) ? 'O' : '';

    if (vendorPrefix + 'Perspective' in bodyStyle) {
      // Modern browsers with 3D support, e.g. Webkit, IE10
      return 'translate3d';
    } else if (vendorPrefix + 'Transform' in bodyStyle) {
      // Browsers without 3D support, e.g. IE9
      return 'translate';
    } else {
      // Browsers without translate() support, e.g. IE7-8
      return 'margin';
    }
  };

  /**
   * Helpers
   */

  function clamp(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /**
   * (Internal) converts a percentage (`0..1`) to a bar translateX
   * percentage (`-100%..0%`).
   */

  function toBarPerc(n) {
    return (-1 + n) * 100;
  }


  /**
   * (Internal) returns the correct CSS for changing the bar's
   * position given an n percentage, and speed and ease from Settings
   */

  function barPositionCSS(n, speed, ease) {
    var barCSS;

    if (Settings.positionUsing === 'translate3d') {
      barCSS = { 
		transform: 'translate3d('+toBarPerc(n)+'%,0,0)',
		WebkitTransform: 'translate3d('+toBarPerc(n)+'%,0,0)',
		MozTransform: 'translate3d('+toBarPerc(n)+'%,0,0)',
		msTransform: 'translate3d('+toBarPerc(n)+'%,0,0)',
		OTransform: 'translate3d('+toBarPerc(n)+'%,0,0)'};
    } else if (Settings.positionUsing === 'translate') {
      barCSS = { 
		transform: 'translate('+toBarPerc(n)+'%,0)',
		WebkitTransform: 'translate('+toBarPerc(n)+'%,0)',
		MozTransform: 'translate('+toBarPerc(n)+'%,0)',
		msTransform: 'translate('+toBarPerc(n)+'%,0)',
		OTransform: 'translate('+toBarPerc(n)+'%,0)' };
    } else {
      barCSS = { 'margin-left': toBarPerc(n)+'%' };
    }

    barCSS.transition = 'all '+speed+'ms '+ease;

    return barCSS;
  }

  return NProgress;
});

