/* open-os — interactions.
   Progressive enhancement: the site is fully readable without JS or GSAP.
   Everything motion-related respects prefers-reduced-motion. */
(function () {
    'use strict';

    document.documentElement.classList.add('js');

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----- Nav state ----- */
    var nav = document.querySelector('.site-nav');
    function onScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ----- Reveals ----- */
    var reveals = document.querySelectorAll('.reveal');

    if (reducedMotion) {
        reveals.forEach(function (el) { el.classList.add('revealed'); });
        return; // no parallax, no tilt
    }

    var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

    if (hasGsap) {
        window.gsap.registerPlugin(window.ScrollTrigger);

        window.ScrollTrigger.batch('.reveal', {
            start: 'top 88%',
            once: true,
            onEnter: function (batch) {
                batch.forEach(function (el, i) {
                    setTimeout(function () { el.classList.add('revealed'); }, i * 90);
                });
            }
        });

        /* The journey: the page starts on the explorer at the base of the
           canyon and ascends toward the light as you scroll to the end.
           The image is bottom-anchored, so moving it down (positive y)
           reveals its upper part. */
        var BG_RATIO = 1.7768; /* artwork height / width */
        var bgImg = document.querySelector('.page-bg img');

        function bgSize() {
            /* Wide enough to cover the viewport, tall enough to leave at
               least half a viewport of travel on tall/narrow screens. */
            var w = Math.max(window.innerWidth, window.innerHeight * 1.5 / BG_RATIO);
            return { width: w, travel: w * BG_RATIO - window.innerHeight };
        }

        function applyBgSize() {
            bgImg.style.width = bgSize().width + 'px';
        }

        applyBgSize();
        window.ScrollTrigger.addEventListener('refreshInit', applyBgSize);

        window.gsap.fromTo(bgImg,
            { xPercent: -50, y: 0 },
            {
                xPercent: -50,
                y: function () { return bgSize().travel; },
                ease: 'none',
                scrollTrigger: {
                    trigger: document.documentElement,
                    start: 0,
                    end: 'max',
                    scrub: 0.6,
                    invalidateOnRefresh: true
                }
            }
        );

        /* Hero content sinks and fades as the journey begins */
        window.gsap.to('.hero-content', {
            y: 90,
            opacity: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: '75% top', scrub: true }
        });
    } else {
        /* Fallback: IntersectionObserver reveals, static background */
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        reveals.forEach(function (el) { observer.observe(el); });
    }

    /* ----- Pointer tilt on device frames (fine pointers only) ----- */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('[data-tilt]').forEach(function (el) {
            var pending = null;
            el.addEventListener('pointermove', function (e) {
                if (pending) return;
                pending = requestAnimationFrame(function () {
                    var r = el.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width - 0.5;
                    var py = (e.clientY - r.top) / r.height - 0.5;
                    el.style.transform =
                        'perspective(900px) rotateX(' + (-py * 4).toFixed(2) + 'deg)' +
                        ' rotateY(' + (px * 5).toFixed(2) + 'deg) translateY(-3px)';
                    pending = null;
                });
            });
            el.addEventListener('pointerleave', function () {
                if (pending) { cancelAnimationFrame(pending); pending = null; }
                el.style.transform = '';
            });
        });
    }
})();
