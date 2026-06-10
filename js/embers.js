/* open-os — ember field.
   A WebGL layer of golden sparks rising toward the light, floating between
   the artwork and the content. They drift apart around the pointer and rush
   upward with scroll velocity.
   Progressive enhancement: skipped entirely on reduced-motion, and any
   failure (no WebGL, blocked CDN) leaves the site untouched. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var host = document.querySelector('.page-bg');
    if (!host) return;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) {
        return;
    }

    var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    host.appendChild(renderer.domElement);

    var CAM_Z = 12;
    var FOV = 50;
    var camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);

    var scene = new THREE.Scene();

    function visibleSpan() {
        var h = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
        return { y: h + 5, x: h * camera.aspect + 5 };
    }

    var COUNT = window.innerWidth < 768 ? 320 : 750;
    var span = visibleSpan();

    var pos = new Float32Array(COUNT * 3);
    var aSize = new Float32Array(COUNT);
    var aPhase = new Float32Array(COUNT);
    var aMix = new Float32Array(COUNT);
    var aSpeed = new Float32Array(COUNT);

    for (var i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * span.x;
        pos[i * 3 + 1] = (Math.random() - 0.5) * span.y;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 9;
        aSize[i] = 5 + Math.pow(Math.random(), 2.2) * 16;
        aPhase[i] = Math.random();
        aMix[i] = Math.random() < 0.16 ? 1 : 0;     /* a few circuit-cyan sparks */
        aSpeed[i] = 0.12 + Math.random() * 0.4;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute('aMix', new THREE.BufferAttribute(aMix, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));

    var uniforms = {
        uTime: { value: 0 },
        uDrift: { value: 0 },        /* accumulated travel (speeds up with scroll) */
        uRush: { value: 0 },         /* smoothed scroll velocity 0..1 */
        uMouse: { value: new THREE.Vector2(999, 999) },
        uSpanY: { value: span.y },
        uPixelRatio: { value: DPR }
    };

    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: [
            'attribute float aSize;',
            'attribute float aPhase;',
            'attribute float aMix;',
            'attribute float aSpeed;',
            'uniform float uTime;',
            'uniform float uDrift;',
            'uniform float uRush;',
            'uniform vec2 uMouse;',
            'uniform float uSpanY;',
            'uniform float uPixelRatio;',
            'varying float vAlpha;',
            'varying float vMix;',
            'void main() {',
            '    vec3 p = position;',
            '    p.y = mod(p.y + uDrift * aSpeed + uSpanY * 0.5, uSpanY) - uSpanY * 0.5;',
            '    p.x += sin(uTime * 0.35 + aPhase * 6.2832) * 0.45;',
            /*   pointer repulsion — sparks part around the cursor */
            '    vec2 d = p.xy - uMouse;',
            '    float dist = length(d);',
            '    float force = smoothstep(2.6, 0.0, dist);',
            '    p.xy += (d / max(dist, 0.001)) * force * 1.5;',
            '    vec4 mv = modelViewMatrix * vec4(p, 1.0);',
            '    gl_Position = projectionMatrix * mv;',
            '    gl_PointSize = aSize * (1.0 + 0.35 * uRush) * uPixelRatio * (10.0 / -mv.z);',
            '    float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aSpeed * 2.0) + aPhase * 40.0);',
            '    vAlpha = (0.22 + 0.55 * tw) * (1.0 + 0.5 * uRush);',
            '    vMix = aMix;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying float vAlpha;',
            'varying float vMix;',
            'void main() {',
            '    float d = length(gl_PointCoord - 0.5);',
            '    float a = pow(smoothstep(0.5, 0.0, d), 2.4);',
            '    vec3 gold = vec3(1.0, 0.76, 0.38);',
            '    vec3 cyan = vec3(0.52, 0.83, 1.0);',
            '    gl_FragColor = vec4(mix(gold, cyan, vMix), a * vAlpha);',
            '}'
        ].join('\n')
    });

    scene.add(new THREE.Points(geo, material));

    /* ----- Pointer: repulsion target + camera parallax ----- */
    var mouseNDC = new THREE.Vector2(0, 0);
    var hasPointer = false;

    window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        hasPointer = true;
        mouseNDC.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    }, { passive: true });

    function mouseWorld() {
        var halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
        return new THREE.Vector2(mouseNDC.x * halfH * camera.aspect, mouseNDC.y * halfH);
    }

    /* ----- Scroll velocity → rush ----- */
    var lastScroll = window.scrollY;
    var rush = 0;

    /* ----- Loop ----- */
    var clock = new THREE.Clock();
    var raf = null;

    function frame() {
        var dt = Math.min(clock.getDelta(), 0.05);
        uniforms.uTime.value += dt;

        var sc = window.scrollY;
        var vel = Math.abs(sc - lastScroll) / Math.max(dt, 0.001);
        lastScroll = sc;
        rush += (Math.min(vel / 2400, 1) - rush) * Math.min(dt * 4, 1);
        uniforms.uRush.value = rush;

        /* base upward drift, accelerated while scrolling */
        uniforms.uDrift.value += dt * (0.9 + rush * 7.0);

        if (hasPointer) {
            var mw = mouseWorld();
            uniforms.uMouse.value.lerp(mw, Math.min(dt * 6, 1));
            camera.position.x += (mouseNDC.x * 0.55 - camera.position.x) * Math.min(dt * 3, 1);
            camera.position.y += (mouseNDC.y * 0.3 - camera.position.y) * Math.min(dt * 3, 1);
            camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.uSpanY.value = visibleSpan().y;
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            clock.stop();
        } else if (!raf) {
            clock.start();
            raf = requestAnimationFrame(frame);
        }
    });
})();
