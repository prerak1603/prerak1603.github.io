/* =========================================================================
   Prerak Nain — Portfolio
   main.js — nav, HUD scroll-trace, boot sequence, stat reveal, 3D field
   ========================================================================= */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) document.documentElement.classList.add('smooth-scroll');

  /* ---------------- mobile nav ---------------- */
  (function () {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  })();

  /* ---------------- scroll-spy active nav link ---------------- */
  (function () {
    var navLinkEls = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    if (!navLinkEls.length) return;
    var sections = navLinkEls
      .map(function (a) {
        var id = a.getAttribute('href').replace('#', '');
        return document.getElementById(id);
      })
      .filter(Boolean);
    if (!sections.length) return;

    var byId = {};
    navLinkEls.forEach(function (a) { byId[a.getAttribute('href').replace('#', '')] = a; });

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinkEls.forEach(function (a) { a.classList.remove('active'); });
            var link = byId[entry.target.id];
            if (link) link.classList.add('active');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(function (s) { spy.observe(s); });
  })();

  /* ---------------- HUD scroll-trace ring ---------------- */
  var hudRing = document.getElementById('hudRing');
  var tracePercent = document.getElementById('tracePercent');
  var traceSection = document.getElementById('traceSection');
  var CIRCUMFERENCE = 2 * Math.PI * 76;
  var ZONE_SIGNAL = '#A78BFA';
  var ZONE_AMBER = '#FAC775';
  var ZONE_CORAL = '#FF5470';

  function zoneColor(pct) {
    if (pct < 33) return ZONE_SIGNAL;
    if (pct < 70) return ZONE_AMBER;
    return ZONE_CORAL;
  }

  var sectionEls = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));

  function currentSectionLabel() {
    var y = window.scrollY + window.innerHeight * 0.35;
    var current = sectionEls[0];
    for (var i = 0; i < sectionEls.length; i++) {
      if (sectionEls[i].offsetTop <= y) current = sectionEls[i];
    }
    return current ? (current.dataset.node || current.id).toUpperCase() : 'HERO';
  }

  var lastZone = null;

  function updateTrace() {
    if (!hudRing) return;
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    var arcLength = (pct / 100) * CIRCUMFERENCE;
    hudRing.setAttribute('stroke-dasharray', arcLength + ' ' + CIRCUMFERENCE);

    // Only touch stroke/filter/text-shadow (all paint-expensive, filter
    // especially so) when the colour zone actually changes, not on every
    // scroll pixel — that was competing with the WebGL render loop for
    // main-thread time and made the sticky nav / fixed HUD visibly lag
    // behind during scroll.
    var zone = zoneColor(pct);
    if (zone !== lastZone) {
      lastZone = zone;
      hudRing.style.stroke = zone;
      hudRing.style.filter = 'drop-shadow(0 0 5px ' + zone + ')';
      if (tracePercent) {
        tracePercent.style.color = zone;
        tracePercent.style.textShadow = '0 0 12px ' + zone + '99';
      }
    }
    if (tracePercent) tracePercent.textContent = String(Math.round(pct)).padStart(2, '0');
    if (traceSection) traceSection.textContent = currentSectionLabel();
  }

  // rAF-throttled scroll handler: at most one updateTrace per frame,
  // however many scroll events the browser fires in between.
  var traceScheduled = false;
  function onScroll() {
    if (traceScheduled) return;
    traceScheduled = true;
    requestAnimationFrame(function () {
      updateTrace();
      traceScheduled = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  updateTrace();

  /* sparkles orbiting the HUD ring */
  var sparkleGroup = document.getElementById('sparkleGroup');
  if (sparkleGroup && !reduceMotion) {
    var SPARKLE_COUNT = 6;
    var sparkles = [];
    for (var i = 0; i < SPARKLE_COUNT; i++) {
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', ZONE_SIGNAL);
      sparkleGroup.appendChild(dot);
      sparkles.push({ el: dot, offset: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.5 });
    }
    var t = 0;
    (function animateSparkles() {
      t += 0.02;
      var pct = parseInt((tracePercent && tracePercent.textContent) || '0', 10) || 0;
      var color = zoneColor(pct);
      sparkles.forEach(function (s) {
        var angle = t * s.speed + s.offset;
        var r = 76;
        var x = 84 + r * Math.cos(angle);
        var y = 84 + r * Math.sin(angle);
        s.el.setAttribute('cx', x);
        s.el.setAttribute('cy', y);
        s.el.setAttribute('fill', color);
        var flicker = (Math.sin(t * 3 + s.offset) + 1) / 2;
        s.el.setAttribute('opacity', (0.2 + flicker * 0.8).toFixed(2));
      });
      requestAnimationFrame(animateSparkles);
    })();
  }

  /* ---------------- stat bar reveal ---------------- */
  (function () {
    var charSection = document.getElementById('about');
    if (!charSection) return;
    var bars = charSection.querySelectorAll('.stat-bar-fill');
    if (!bars.length) return;
    if (reduceMotion) {
      bars.forEach(function (bar) { bar.style.width = bar.getAttribute('data-w') + '%'; });
      return;
    }
    var statObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            bars.forEach(function (bar) { bar.style.width = bar.getAttribute('data-w') + '%'; });
            statObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    statObserver.observe(charSection);
  })();

  /* ---------------- boot sequence ---------------- */
  (function () {
    var bootOverlay = document.getElementById('bootOverlay');
    var bootText = document.getElementById('bootText');
    if (!bootOverlay) return;

    if (reduceMotion) {
      bootOverlay.classList.add('hide');
      return;
    }
    var bootMessages = ['INITIALIZING', 'LOADING PROFILE', 'SYSTEMS ONLINE'];
    var bootStep = 0;
    var bootInterval = setInterval(function () {
      bootStep++;
      if (bootStep < bootMessages.length && bootText) {
        bootText.innerHTML = bootMessages[bootStep] + '<span class="cursor"></span>';
      }
    }, 500);
    setTimeout(function () {
      clearInterval(bootInterval);
      bootOverlay.classList.add('hide');
    }, 1600);
  })();

  /* ---------------- 3D particle field + ship ---------------- */
  (function () {
    var canvasEl = document.getElementById('bgCanvas');
    if (!canvasEl || typeof THREE === 'undefined') return;

    // Skip the whole WebGL scene for reduced-motion users — it's a
    // decorative background, not content, so the honest accessible move
    // is to not run it rather than freeze-frame it.
    if (reduceMotion) {
      canvasEl.style.display = 'none';
      return;
    }

    // ---- adaptive quality: fewer particles on small screens / weaker devices
    var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    var isSmallScreen = window.innerWidth < 760;
    var lowCores = (navigator.hardwareConcurrency || 8) <= 4;
    var lowEnd = isCoarsePointer || isSmallScreen || lowCores;

    var PARTICLE_COUNT = lowEnd ? 140 : 360;
    var activeCount = PARTICLE_COUNT; // can shrink further via runtime auto-downgrade below
    var LINK_DIST = 3.2;
    var LINE_UPDATE_EVERY = lowEnd ? 14 : 8;
    var GRID_CELL = LINK_DIST; // grid cell size == link distance, so only 3x3x3 neighborhood can possibly link
    var GRID_OFFSET = 64; // shifts negative cell coords into positive range for integer packing
    var GRID_STRIDE = 128; // must exceed the max cells spanned on any axis

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0714, 0.025);

    var camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 18;

    // Antialiasing on a point/line field is barely visible under additive
    // blending glow, but it roughly doubles fragment-shader cost — not
    // worth it here, on any device tier.
    var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowEnd ? 1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var positions = new Float32Array(PARTICLE_COUNT * 3);
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    var points = new THREE.Points(geometry, material);
    scene.add(points);

    var lineGeom = new THREE.BufferGeometry();
    var lineMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending
    });
    var lineMesh = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(lineMesh);

    // ---- low-poly ship
    var shipGroup = new THREE.Group();
    var shipMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, wireframe: true, transparent: true, opacity: 0.5 });
    var shipMatSolid = new THREE.MeshBasicMaterial({ color: 0x1a1530, transparent: true, opacity: 0.88 });

    var bodyGeom = new THREE.ConeGeometry(0.46, 2.5, 7);
    var body = new THREE.Mesh(bodyGeom, shipMatSolid);
    body.rotation.x = Math.PI / 2;
    shipGroup.add(body);
    var bodyWire = new THREE.Mesh(bodyGeom, shipMat);
    bodyWire.rotation.x = Math.PI / 2;
    shipGroup.add(bodyWire);

    var wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.7, -0.32);
    wingShape.lineTo(1.5, 0.22);
    wingShape.lineTo(0.28, 0.28);
    wingShape.lineTo(0, 0);
    var wingGeom = new THREE.ShapeGeometry(wingShape);

    var wingL = new THREE.Mesh(wingGeom, shipMatSolid);
    wingL.position.set(0, 0, -0.18);
    wingL.rotation.y = Math.PI / 2;
    shipGroup.add(wingL);
    var wingLWire = new THREE.Mesh(wingGeom, shipMat);
    wingLWire.position.copy(wingL.position);
    wingLWire.rotation.copy(wingL.rotation);
    shipGroup.add(wingLWire);

    var wingR = wingL.clone();
    wingR.position.set(0, 0, 0.18);
    wingR.rotation.y = -Math.PI / 2;
    shipGroup.add(wingR);
    var wingRWire = new THREE.Mesh(wingGeom, shipMat);
    wingRWire.position.copy(wingR.position);
    wingRWire.rotation.copy(wingR.rotation);
    shipGroup.add(wingRWire);

    // small stabilizer fin for a slightly more resolved silhouette
    var finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.6, 0);
    finShape.lineTo(0.15, 0.55);
    finShape.lineTo(0, 0.55);
    var finGeom = new THREE.ShapeGeometry(finShape);
    var fin = new THREE.Mesh(finGeom, shipMatSolid);
    fin.position.set(-0.05, 0.05, 0.7);
    fin.rotation.y = Math.PI / 2;
    shipGroup.add(fin);
    var finWire = new THREE.Mesh(finGeom, shipMat);
    finWire.position.copy(fin.position);
    finWire.rotation.copy(fin.rotation);
    shipGroup.add(finWire);

    var engineGeom = new THREE.CircleGeometry(0.3, 16);
    var engineMat = new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    var engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.set(0, 0, 1.3);
    shipGroup.add(engine);

    var engineGlowGeom = new THREE.CircleGeometry(0.56, 16);
    var engineGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending });
    var engineGlow = new THREE.Mesh(engineGlowGeom, engineGlowMat);
    engineGlow.position.set(0, 0, 1.36);
    shipGroup.add(engineGlow);

    shipGroup.scale.set(1.3, 1.3, 1.3);
    shipGroup.position.set(6, 3, -8);
    shipGroup.rotation.set(0.15, 2.3, 0.1);
    scene.add(shipGroup);

    var shipT = 0;
    var mouseX = 0,
      mouseY = 0;
    window.addEventListener(
      'pointermove',
      function (e) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );

    // ---- real spatial partitioning for the particle-link graph.
    // Bucket every particle into a uniform grid keyed by an integer-packed
    // cell id (no string concatenation/parsing on the hot path); for each
    // particle we only ever test the 27 neighbouring cells (3x3x3), never
    // the full particle set. This replaces an O(n^2) all-pairs scan with
    // an approximately O(n) pass, and reuses one Map instance across
    // frames instead of allocating fresh bucket arrays every time.
    var grid = new Map();
    var cellOf = new Int16Array(PARTICLE_COUNT * 3); // cached cx,cy,cz per particle

    function packKey(cx, cy, cz) {
      return (cx + GRID_OFFSET) + (cy + GRID_OFFSET) * GRID_STRIDE + (cz + GRID_OFFSET) * GRID_STRIDE * GRID_STRIDE;
    }

    function rebuildGrid() {
      grid.forEach(function (bucket) { bucket.length = 0; });
      var pos = geometry.attributes.position.array;
      for (var p = 0; p < activeCount; p++) {
        var cx = Math.floor(pos[p * 3] / GRID_CELL);
        var cy = Math.floor(pos[p * 3 + 1] / GRID_CELL);
        var cz = Math.floor(pos[p * 3 + 2] / GRID_CELL);
        cellOf[p * 3] = cx;
        cellOf[p * 3 + 1] = cy;
        cellOf[p * 3 + 2] = cz;
        var key = packKey(cx, cy, cz);
        var bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(p);
      }
    }

    var NEIGHBOUR_OFFSETS = (function () {
      var offs = [];
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          for (var dz = -1; dz <= 1; dz++) offs.push([dx, dy, dz]);
        }
      }
      return offs;
    })();

    function updateLines() {
      rebuildGrid();
      var pos = geometry.attributes.position.array;
      var linePositions = [];

      grid.forEach(function (bucket) {
        if (!bucket.length) return;
        var i0 = bucket[0];
        var cx = cellOf[i0 * 3],
          cy = cellOf[i0 * 3 + 1],
          cz = cellOf[i0 * 3 + 2];

        for (var a = 0; a < bucket.length; a++) {
          var i = bucket[a];
          for (var n = 0; n < NEIGHBOUR_OFFSETS.length; n++) {
            var off = NEIGHBOUR_OFFSETS[n];
            var nbBucket = grid.get(packKey(cx + off[0], cy + off[1], cz + off[2]));
            if (!nbBucket) continue;
            for (var b = 0; b < nbBucket.length; b++) {
              var j = nbBucket[b];
              // i<j guarantees each pair is tested exactly once across the
              // whole grid — no separate "seen" set needed.
              if (j <= i) continue;

              var dxp = pos[i * 3] - pos[j * 3];
              var dyp = pos[i * 3 + 1] - pos[j * 3 + 1];
              var dzp = pos[i * 3 + 2] - pos[j * 3 + 2];
              var dist = Math.sqrt(dxp * dxp + dyp * dyp + dzp * dzp);
              if (dist < LINK_DIST) {
                linePositions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
              }
            }
          }
        }
      });

      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    }

    var frame = 0;
    var lastTime = performance.now();
    var paused = false;

    // pause the render loop entirely when the tab isn't visible —
    // no point spending battery animating an invisible canvas
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (!paused) {
        lastTime = performance.now();
        requestAnimationFrame(animate3D);
      }
    });

    // ---- runtime auto-downgrade: measure real frame times for the first
    // ~40 frames and, if this device (or a software-rendered/sandboxed
    // WebGL context) genuinely can't sustain them, shrink the active
    // particle count and thin out link-line updates further. Static
    // device-category heuristics (screen size, core count) can't catch a
    // desktop with no real GPU acceleration — this can.
    var fpsSamples = 0;
    var fpsAccum = 0;
    var qualityLocked = false;

    function maybeDowngrade(dt) {
      if (qualityLocked) return;
      fpsSamples++;
      fpsAccum += dt;
      if (fpsSamples < 40) return;
      qualityLocked = true;
      var avgFrameMs = fpsAccum / fpsSamples;
      if (avgFrameMs > 40) {
        // sustained < ~25fps: cut the working set hard
        activeCount = Math.max(60, Math.floor(activeCount * 0.4));
        geometry.setDrawRange(0, activeCount);
        LINE_UPDATE_EVERY = LINE_UPDATE_EVERY * 3;
      } else if (avgFrameMs > 24) {
        // sustained < ~40fps: trim moderately
        activeCount = Math.max(90, Math.floor(activeCount * 0.7));
        geometry.setDrawRange(0, activeCount);
        LINE_UPDATE_EVERY = Math.round(LINE_UPDATE_EVERY * 1.6);
      }
    }

    function animate3D(now) {
      if (paused) return;
      var dt = now ? now - lastTime : 16;
      lastTime = now || performance.now();
      maybeDowngrade(dt);

      frame++;
      shipT += 0.0025;
      shipGroup.position.x = 6 + Math.sin(shipT) * 4;
      shipGroup.position.y = 3 + Math.cos(shipT * 0.7) * 2;
      shipGroup.rotation.z = Math.sin(shipT * 0.5) * 0.1;
      var pulse = 0.7 + Math.sin(frame * 0.08) * 0.3;
      engine.material.opacity = 0.6 + pulse * 0.3;
      engineGlow.scale.set(pulse, pulse, pulse);

      var pos = geometry.attributes.position.array;
      for (var i = 0; i < activeCount; i++) {
        pos[i * 3 + 1] += Math.sin(frame * 0.003 + i) * 0.004;
        pos[i * 3] += Math.cos(frame * 0.002 + i) * 0.003;
      }
      geometry.attributes.position.needsUpdate = true;
      if (frame % LINE_UPDATE_EVERY === 0) updateLines();

      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);
      points.rotation.y += 0.0006;
      lineMesh.rotation.y = points.rotation.y;

      renderer.render(scene, camera);
      requestAnimationFrame(animate3D);
    }
    requestAnimationFrame(animate3D);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 120);
    });
  })();
})();
