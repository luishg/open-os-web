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

    /* ----- Starfield (behind all content; hero photo covers it) ----- */
    var canvas = document.createElement('canvas');
    canvas.className = 'stars';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    var ctx = canvas.getContext('2d');
    var stars = [];
    var raf = null;

    function buildStars() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var count = Math.round(window.innerWidth * window.innerHeight / 9000);
        stars = [];
        for (var i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: Math.random() * 1.1 + 0.2,
                base: Math.random() * 0.5 + 0.15,
                amp: Math.random() * 0.35,
                ph: Math.random() * Math.PI * 2,
                sp: Math.random() * 0.9 + 0.3,
                warm: Math.random() < 0.12
            });
        }
    }

    function drawStars(t) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var a = s.base + (reducedMotion ? 0 : Math.sin(s.ph + t * 0.001 * s.sp) * s.amp);
            if (a <= 0) continue;
            ctx.globalAlpha = Math.min(a, 1);
            ctx.fillStyle = s.warm ? '#fcd34d' : '#cfe5ff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, 6.2832);
            ctx.fill();
        }
    }

    function loop(t) {
        drawStars(t);
        raf = requestAnimationFrame(loop);
    }

    buildStars();
    if (reducedMotion) {
        drawStars(0);
    } else {
        raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', function () {
        buildStars();
        if (reducedMotion) drawStars(0);
    });
    document.addEventListener('visibilitychange', function () {
        if (reducedMotion) return;
        if (document.hidden) {
            cancelAnimationFrame(raf);
        } else {
            raf = requestAnimationFrame(loop);
        }
    });

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

        /* Hero: photo drifts up slower than the page, content sinks and fades */
        window.gsap.to('.hero-media img', {
            yPercent: -10,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
        window.gsap.to('.hero-content', {
            y: 90,
            opacity: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: '75% top', scrub: true }
        });

        /* Orbit band: Earth rises as the band scrolls through the viewport */
        window.gsap.to('.orbit-media img', {
            yPercent: -13,
            ease: 'none',
            scrollTrigger: { trigger: '.orbit-band', start: 'top bottom', end: 'bottom top', scrub: true }
        });

        /* Screenshots drift gently inside their column */
        document.querySelectorAll('.mission-visual').forEach(function (el) {
            window.gsap.fromTo(el, { y: 40 }, {
                y: -20,
                ease: 'none',
                scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    } else {
        /* Fallback: IntersectionObserver reveals, no parallax */
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
