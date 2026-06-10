# open-os.com

Portfolio aspiracional de proyectos personales ("mission log"). Estética: exploración
espacial de lo desconocido — arte fantástico, casi-negro de alto contraste, acentos
oro/cian extraídos de la propia obra de fondo. **Sin build step**: HTML/CSS/JS plano
servido por GitHub Pages (push a `main` = deploy, dominio en `CNAME`).

## Estructura

```
index.html        Página única: nav → hero → principles → missions (M-01…M-05) → window-band → footer
privacy.html      Política de privacidad (Chrome Web Store). Usa los mismos tokens CSS.
css/style.css     Todo el sistema de diseño (tokens en :root al inicio)
js/main.js        Nav, reveals, parallax del fondo, tilt de los frames (GSAP)
js/embers.js      Campo de ascuas WebGL (three.js, módulo ES independiente)
images/           Artwork responsive + capturas de proyectos + favicon + og-cover
```

## Concepto clave: el viaje vertical

Todo el sitio recorre **una única obra vertical** (3764×6688, el explorador en el
cañón de circuitos) colocada en `.page-bg` (fixed). GSAP ScrollTrigger la panea de
abajo (explorador, hero) hacia arriba (la luz, footer) con `scrub` durante todo el
scroll. La lógica y el ratio de la imagen (`BG_RATIO = 1.7768`) viven en `js/main.js`;
si se cambia el artwork hay que actualizar ese ratio, el `width/height` del `<img>`,
el fallback CSS `width: max(100vw, 84.5vh)` y la variable `--bg-ratio`.

La imagen original lleva **degradado a negro arriba** para que el pan nunca muestre
un corte en viewports muy verticales. Fuente: `~/Downloads/big_background_degrad.png`
(no está en el repo por tamaño).

## Librerías (CDN jsdelivr, sin bundler)

- **GSAP 3.13 + ScrollTrigger** (`js/main.js`): pan del fondo, reveals por lotes,
  hundimiento del hero. Carga con `defer`; si el CDN falla hay fallback a
  IntersectionObserver y fondo estático.
- **three.js 0.180** (`js/embers.js`, `type="module"`): 750 partículas (320 en móvil)
  con ShaderMaterial propio, blending aditivo, un solo draw call. Interacción:
  repulsión al puntero + parallax de cámara, y "rush" ascendente proporcional a la
  velocidad de scroll. DPR cap 1.75, pausa con pestaña oculta.

**Todo es mejora progresiva**: sin JS el sitio es completamente legible (composición
estática del explorador); con `prefers-reduced-motion` se desactivan parallax, ascuas,
reveals y animaciones (regla global en CSS + guardas en ambos JS).

## Sistema de diseño (tokens en `:root` de style.css)

- Fondo `--bg: #010205`; paneles glass casi opacos `--panel: rgba(2,4,9,.86)` + blur.
- Acentos: `--amber` (oro, la columna de luz — CTAs, índices, guion del logo) y
  `--accent` (cian circuito — kickers, subtítulos).
- Tipos: Space Grotesk (display), Inter (cuerpo), JetBrains Mono (etiquetas
  "telemetría": kickers, chips de estado, links flecha). Google Fonts.
- Capturas de proyectos siempre dentro de un frame `.device` (`device-browser` o
  `device-terminal`) con barra y URL en mono; efecto tilt vía `data-tilt`.
- Grano fílmico: `body::after` con SVG feTurbulence inline.

## Pipeline de imágenes (ImageMagick + ffmpeg)

Cada foto grande se sirve como `<picture>` AVIF → WebP → JPEG con srcset:

```bash
magick fuente.png -level 1%,100% graded.png                 # leve profundizado de negros
magick graded.png -resize ${W}x -quality 78 -strip out.jpg  # y -quality 75 para .webp
ffmpeg -i out.jpg -c:v libaom-av1 -still-picture 1 -crf 32 -b:v 0 -cpu-used 6 \
       -pix_fmt yuv420p out.avif
```

Anchos del fondo: 1080/1600/2560/3764. `og-cover.jpg` (1200×630) se recorta de la
zona del explorador. Capturas de proyectos: PNG original + `.webp` (q85).

## Verificación antes de desplegar

Servir con `python3 -m http.server` y revisar con Playwright (headless Chromium con
`--enable-unsafe-swiftshader` para WebGL). Checklist que se ha venido manteniendo:

1. **axe-core** (wcag2a/aa/21aa + best-practice) en `/` y `/privacy.html` → 0 violaciones.
2. 0 errores de consola; canvas de ascuas presente (y **ausente** con reduced-motion).
3. Render desktop (1440×900) y móvil (390×844) en hero, misiones, window-band y footer.
4. Funciona sin JavaScript (todos los `.reveal` visibles).

## Contenido

Los textos de proyectos son el contenido canónico — al editar, respetarlos (títulos,
estados, métricas de Uptodown, enlaces). El orden de las misiones es deliberado:
Index, LLM Extension, cli, Soul Protocol, Uptodown. Los paneles alternan texto/visual
automáticamente (`nth-of-type(even)`), así que basta añadir un `article.mission.panel`
más para un proyecto nuevo.
