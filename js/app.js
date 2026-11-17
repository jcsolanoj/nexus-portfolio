const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbz0FvkubAJNc4fR6tdk_dl_4jysVxBPC2gtCq5hXTeGYpeeA39UdxdERYPopVQJbZ60/exec";

document.addEventListener("DOMContentLoaded", () => {
  initCinemaStage();
  initLiteYouTubeFacades();
  initProjectFilters();
  initContactDialog();
  initSolar3DShowcase();
});

/* ==========================================================================
   1. 60FPS CINEMATIC SCROLL + CURSOR PARALLAX ENGINE (NEXUS STAGE)
   ========================================================================== */
function initCinemaStage() {
  const canvasWrap = document.getElementById("cinema-canvas-wrap");
  const veilDaylight = document.getElementById("cinema-veil-daylight");
  const veilTwilight = document.getElementById("cinema-veil-twilight");
  const cursorGlow = document.getElementById("cinema-cursor-glow");
  const svgWatermark = document.getElementById("cinema-svg-watermark");
  const hudHeader = document.getElementById("hud-header");
  const scrollBar = document.getElementById("scroll-progress-bar");
  const scrollPct = document.getElementById("scroll-pct");
  const bottomCenterCta = document.getElementById("hud-pill-cta-text");
  const btnPureView = document.getElementById("btn-pure-view");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let prefersReducedMotion = motionQuery.matches;
  motionQuery.addEventListener("change", (e) => {
    prefersReducedMotion = e.matches;
  });

  const CAMERA_KEYFRAMES = [
    { p: 0.00, x: 0.0, y: 0.0, scale: 1.05, twilight: 0.04, darkHud: false },
    { p: 0.22, x: -3.8, y: -2.2, scale: 1.15, twilight: 0.78, darkHud: true },
    { p: 0.50, x: 3.4, y: -4.2, scale: 1.21, twilight: 0.88, darkHud: true },
    { p: 0.78, x: -2.6, y: 2.8, scale: 1.13, twilight: 0.84, darkHud: true },
    { p: 1.00, x: -0.8, y: -0.6, scale: 1.06, twilight: 0.65, darkHud: true },
  ];

  let targetScroll = 0;
  let smoothScroll = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let smoothMouseX = 0;
  let smoothMouseY = 0;
  let rafId = null;
  let lastDarkHud = null;
  let lastCtaText = "";

  const lerp = (a, b, t) => a + (b - a) * t;

  function sampleKeyframes(progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    for (let i = 0; i < CAMERA_KEYFRAMES.length - 1; i++) {
      const k0 = CAMERA_KEYFRAMES[i];
      const k1 = CAMERA_KEYFRAMES[i + 1];
      if (clamped >= k0.p && clamped <= k1.p) {
        const localT = (clamped - k0.p) / (k1.p - k0.p || 1);
        const eased = localT * localT * (3 - 2 * localT);
        return {
          x: lerp(k0.x, k1.x, eased),
          y: lerp(k0.y, k1.y, eased),
          scale: lerp(k0.scale, k1.scale, eased),
          twilight: lerp(k0.twilight, k1.twilight, eased),
          darkHud: eased > 0.5 ? k1.darkHud : k0.darkHud,
        };
      }
    }
    return CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1];
  }

  function updateScrollTarget() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetScroll = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    if (hudHeader) {
      hudHeader.classList.toggle("scrolled-glass", window.scrollY > 36);
    }
  }

  window.addEventListener("scroll", updateScrollTarget, { passive: true });
  window.addEventListener("resize", updateScrollTarget, { passive: true });

  window.addEventListener(
    "mousemove",
    (e) => {
      if (prefersReducedMotion) return;
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 18;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 14;
      if (cursorGlow) {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
      }
    },
    { passive: true }
  );

  if (btnPureView) {
    btnPureView.addEventListener("click", () => {
      const isPure = document.body.classList.toggle("pure-photo-mode");
      btnPureView.setAttribute("aria-pressed", String(isPure));
    });
  }

  function renderLoop() {
    if (document.hidden) {
      rafId = null;
      return;
    }

    if (prefersReducedMotion) {
      smoothScroll = targetScroll;
      smoothMouseX = 0;
      smoothMouseY = 0;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.085);
      smoothMouseX = lerp(smoothMouseX, targetMouseX, 0.07);
      smoothMouseY = lerp(smoothMouseY, targetMouseY, 0.07);
    }

    const cam = sampleKeyframes(smoothScroll);

    if (canvasWrap) {
      if (prefersReducedMotion) {
        canvasWrap.style.transform = "translate3d(0, 0, 0) scale(1.03)";
      } else {
        const fx = `calc(${cam.x.toFixed(3)}% + ${(-smoothMouseX).toFixed(1)}px)`;
        const fy = `calc(${cam.y.toFixed(3)}% + ${(-smoothMouseY).toFixed(1)}px)`;
        canvasWrap.style.transform = `translate3d(${fx}, ${fy}, 0) scale(${cam.scale.toFixed(4)})`;
      }
    }

    if (svgWatermark && !prefersReducedMotion) {
      const wmY = smoothScroll * -75 + smoothMouseY * 1.2;
      const wmX = smoothMouseX * 1.2;
      const wmRot = smoothScroll * 12;
      svgWatermark.style.transform = `translate3d(${wmX.toFixed(1)}px, ${wmY.toFixed(1)}px, 0) rotate(${wmRot.toFixed(1)}deg)`;
    }

    if (veilTwilight && veilDaylight) {
      veilTwilight.style.opacity = cam.twilight.toFixed(3);
      veilDaylight.style.opacity = (1 - cam.twilight * 0.88).toFixed(3);
    }

    if (cam.darkHud !== lastDarkHud) {
      document.body.classList.toggle("theme-dark-hud", cam.darkHud);
      lastDarkHud = cam.darkHud;
    }

    const pctInt = Math.round(smoothScroll * 100);
    if (scrollBar) scrollBar.style.width = `${pctInt}%`;
    if (scrollPct) scrollPct.textContent = `${pctInt}%`;

    if (bottomCenterCta) {
      let nextText = "automatizar un proceso o consultar";
      if (pctInt >= 74) nextText = "consultar por cursos o proyectos";
      else if (pctInt >= 28) nextText = "hablemos de tu proyecto";
      if (nextText !== lastCtaText) {
        bottomCenterCta.textContent = nextText;
        lastCtaText = nextText;
      }
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(renderLoop);
    }
  });

  updateScrollTarget();
  rafId = requestAnimationFrame(renderLoop);
}

/* ==========================================================================
   2. INTERACTIVE 3D SOLAR SIMULATOR (THREE.JS + ORBITCONTROLS, NO NUMBERS)
   ========================================================================== */
function initSolar3DShowcase() {
  const container = document.getElementById("solar-3d-canvas");
  if (!container || typeof THREE === "undefined" || typeof THREE.OrbitControls === "undefined") {
    return;
  }

  const slTime = document.getElementById("solar-time-slider");
  const slTilt = document.getElementById("solar-tilt-slider");
  const slAzimuth = document.getElementById("solar-azimuth-slider");
  const btnAutoSun = document.getElementById("btn-auto-sun");

  const state3D = {
    tilt: 18,
    azimuth: 0,
    sunTime: 10.5,
    sunEl: 50,
    sunAz: -30,
    autoPlay: true,
  };

  const panelLength = 2.4;
  const panelWidth = 1.3;
  let scene, camera, renderer, controls;
  let solarPanelGroup, solarPanelMesh, dynamicSupportGroup;
  let sunMesh, sunLight, wavyRay, wavyRayGeometry;
  let supportStruts = [];
  let isVisible = true;

  function calculateSunPosition(time) {
    const w = (time - 12) * (Math.PI / 12);
    const declination = 10 * (Math.PI / 180);
    const latitude = -3.99 * (Math.PI / 180);

    const sinEl =
      Math.sin(declination) * Math.sin(latitude) +
      Math.cos(declination) * Math.cos(latitude) * Math.cos(w);
    const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinEl)));
    let elevationDeg = elevationRad * (180 / Math.PI);

    let azRad = 0;
    const cosEl = Math.cos(elevationRad);
    if (cosEl > 0.001) {
      const sinAz = (Math.cos(declination) * Math.sin(w)) / cosEl;
      const cosAz =
        (Math.sin(declination) * Math.cos(latitude) -
          Math.cos(declination) * Math.sin(latitude) * Math.cos(w)) /
        cosEl;
      azRad = Math.atan2(sinAz, cosAz);
    } else {
      azRad = w < 0 ? -Math.PI / 2 : Math.PI / 2;
    }

    if (elevationDeg < 4) {
      elevationDeg = 4;
    }

    return {
      elevation: elevationDeg,
      azimuth: azRad * (180 / Math.PI),
    };
  }

  function createCompassFloor() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 18;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const len = a % 90 === 0 ? 18 : 10;
      ctx.strokeStyle = a % 30 === 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = a % 30 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * (r - len), cy + Math.sin(rad) * (r - len));
      ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
      ctx.stroke();
    }

    ctx.font = "bold 26px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lr = r - 30;
    ctx.fillStyle = "#f87171";
    ctx.fillText("N", cx - lr, cy);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("S", cx + lr, cy);
    ctx.fillText("E", cx, cy - lr);
    ctx.fillText("O", cx, cy + lr);

    const texture = new THREE.CanvasTexture(canvas);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        roughness: 0.65,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowBase = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshBasicMaterial({ color: 0x050912, transparent: true, opacity: 0.55, depthWrite: false })
    );
    shadowBase.rotation.x = -Math.PI / 2;
    shadowBase.position.y = -0.01;
    scene.add(shadowBase);
  }

  function createSolarCellsTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, 512, 1024);

    const cols = 6;
    const rows = 10;
    const pad = 8;
    const gap = 4;
    const cw = (512 - pad * 2 - gap * (cols - 1)) / cols;
    const ch = (1024 - pad * 2 - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * (cw + gap);
        const y = pad + r * (ch + gap);
        const grad = ctx.createLinearGradient(x, y, x + cw, y + ch);
        grad.addColorStop(0, "#0d1d3a");
        grad.addColorStop(0.5, "#152b54");
        grad.addColorStop(1, "#081427");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.38)";
        ctx.strokeRect(x, y, cw, ch);
      }
    }
    return new THREE.CanvasTexture(canvas);
  }

  function buildSolarPanel() {
    const panelGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 0.8, roughness: 0.25 });
    const ft = 0.04;
    const fd = 0.06;

    const addFrame = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      panelGroup.add(m);
    };
    addFrame(panelLength, fd, ft, -panelLength / 2, 0, -panelWidth / 2 + ft / 2);
    addFrame(panelLength, fd, ft, -panelLength / 2, 0, panelWidth / 2 - ft / 2);
    addFrame(ft, fd, panelWidth, -panelLength, 0, 0);
    addFrame(ft, fd, panelWidth, 0, 0, 0);

    const cellsMat = new THREE.MeshStandardMaterial({
      map: createSolarCellsTexture(),
      roughness: 0.14,
      metalness: 0.55,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(panelLength - ft, 0.008, panelWidth - ft * 2),
      cellsMat
    );
    body.position.set(-panelLength / 2, fd / 2 - 0.002, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    panelGroup.add(body);

    solarPanelMesh = panelGroup;
    solarPanelMesh.position.y = 0.08;
    solarPanelGroup.add(solarPanelMesh);
  }

  function buildSupportStructure() {
    dynamicSupportGroup = new THREE.Group();
    solarPanelGroup.add(dynamicSupportGroup);
    const matBase = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const matOuter = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const matInner = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });

    [-0.45, 0.45].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.06), matBase);
      rail.position.set(-1.0, 0.02, z);
      rail.castShadow = true;
      dynamicSupportGroup.add(rail);
    });

    supportStruts = [-0.35, 0.35].map((zOffset) => {
      const group = new THREE.Group();
      dynamicSupportGroup.add(group);
      const outerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 12);
      outerGeo.translate(0, 0.5, 0);
      const outer = new THREE.Mesh(outerGeo, matOuter);
      outer.castShadow = true;
      group.add(outer);

      const innerGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.0, 12);
      innerGeo.translate(0, 0.5, 0);
      const inner = new THREE.Mesh(innerGeo, matInner);
      inner.castShadow = true;
      group.add(inner);

      return { group, outer, inner, baseAnchor: new THREE.Vector3(-1.8, 0.02, zOffset), zOffset };
    });
  }

  function updateSupportStructure() {
    const betaRad = state3D.tilt * (Math.PI / 180);
    supportStruts.forEach((strut) => {
      const dAttach = -1.75;
      const xAttach = dAttach * Math.cos(-betaRad) + 0.05 * Math.sin(-betaRad);
      const yAttach = dAttach * Math.sin(-betaRad) - 0.05 * Math.cos(-betaRad) + 0.08;
      const panelAnchor = new THREE.Vector3(xAttach, yAttach, strut.zOffset);
      const dir = new THREE.Vector3().subVectors(panelAnchor, strut.baseAnchor);
      const dist = dir.length();
      strut.group.position.copy(strut.baseAnchor);
      strut.group.quaternion.copy(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      );
      const outerLen = Math.min(0.85, dist * 0.55);
      strut.outer.scale.set(1, outerLen, 1);
      strut.inner.position.set(0, outerLen, 0);
      strut.inner.scale.set(1, Math.max(0.05, dist - outerLen), 1);
    });
  }

  function updateSceneAndSun() {
    const pos = calculateSunPosition(state3D.sunTime);
    state3D.sunEl = pos.elevation;
    state3D.sunAz = pos.azimuth;

    const alphaRad = (state3D.azimuth + 180) * (Math.PI / 180);
    const betaRad = state3D.tilt * (Math.PI / 180);

    solarPanelGroup.rotation.y = alphaRad;
    solarPanelMesh.rotation.z = -betaRad;
    updateSupportStructure();

    const sunPos = new THREE.Vector3(
      5.5 * Math.cos((state3D.sunEl * Math.PI) / 180) * Math.cos((state3D.sunAz * Math.PI) / 180),
      5.5 * Math.sin((state3D.sunEl * Math.PI) / 180),
      5.5 * Math.cos((state3D.sunEl * Math.PI) / 180) * Math.sin((state3D.sunAz * Math.PI) / 180)
    );
    sunMesh.position.copy(sunPos);
    sunLight.position.copy(sunPos);

    const xCenterLocal = (-panelLength / 2) * Math.cos(-betaRad);
    const yCenterLocal = (-panelLength / 2) * Math.sin(-betaRad) + 0.08;
    const panelCenter = new THREE.Vector3(
      xCenterLocal * Math.cos(alphaRad),
      yCenterLocal,
      xCenterLocal * Math.sin(alphaRad)
    );

    const dirVec = new THREE.Vector3().subVectors(panelCenter, sunPos).normalize();
    let perp1 = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dirVec.dot(perp1)) > 0.9) perp1.set(1, 0, 0);
    const perp2 = new THREE.Vector3().crossVectors(dirVec, perp1).normalize();
    perp1.crossVectors(perp2, dirVec).normalize();

    const pts = [];
    const timeOffset = performance.now() * 0.005;
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const p = new THREE.Vector3().lerpVectors(sunPos, panelCenter, t);
      const amp = 0.06 * Math.sin(t * Math.PI);
      p.addScaledVector(perp1, Math.sin(t * Math.PI * 22 - timeOffset) * amp);
      pts.push(p);
    }
    wavyRayGeometry.setFromPoints(pts);
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060b16);
  scene.fog = new THREE.FogExp2(0x060b16, 0.03);

  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 80);
  camera.position.set(-1.9, 3.4, 5.4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.minDistance = 2.5;
  controls.maxDistance = 14;
  controls.target.set(0, 0.5, 0);

  scene.add(new THREE.HemisphereLight(0x7dd3fc, 0x060b16, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));

  sunLight = new THREE.DirectionalLight(0xfffbeb, 1.7);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -3.8;
  sunLight.shadow.camera.right = 3.8;
  sunLight.shadow.camera.top = 3.8;
  sunLight.shadow.camera.bottom = -3.8;
  scene.add(sunLight);

  createCompassFloor();
  solarPanelGroup = new THREE.Group();
  scene.add(solarPanelGroup);
  buildSolarPanel();
  buildSupportStructure();

  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfdd85d })
  );
  scene.add(sunMesh);

  wavyRayGeometry = new THREE.BufferGeometry();
  wavyRay = new THREE.Line(wavyRayGeometry, new THREE.LineBasicMaterial({ color: 0xfbbf24 }));
  scene.add(wavyRay);

  slTime?.addEventListener("input", (e) => {
    state3D.autoPlay = false;
    btnAutoSun?.classList.remove("is-playing");
    if (btnAutoSun) btnAutoSun.textContent = "Reanudar sol";
    state3D.sunTime = parseFloat(e.target.value);
    updateSceneAndSun();
  });

  slTilt?.addEventListener("input", (e) => {
    state3D.tilt = parseFloat(e.target.value);
    updateSceneAndSun();
  });

  slAzimuth?.addEventListener("input", (e) => {
    state3D.azimuth = parseFloat(e.target.value);
    updateSceneAndSun();
  });

  btnAutoSun?.addEventListener("click", () => {
    state3D.autoPlay = !state3D.autoPlay;
    btnAutoSun.classList.toggle("is-playing", state3D.autoPlay);
    btnAutoSun.textContent = state3D.autoPlay ? "Pausar sol" : "Reanudar sol";
  });

  const ro = new ResizeObserver(() => {
    if (!container.clientWidth || !container.clientHeight) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  ro.observe(container);

  const io = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
    },
    { threshold: 0.05 }
  );
  io.observe(container);

  let lastFrameTime = performance.now();
  function animate3D(now) {
    requestAnimationFrame(animate3D);
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    if (document.hidden || !isVisible) return;

    if (state3D.autoPlay) {
      state3D.sunTime += dt * 1.1;
      if (state3D.sunTime > 17.6) state3D.sunTime = 6.4;
      if (slTime) slTime.value = String(state3D.sunTime);
    }

    updateSceneAndSun();
    controls.update();
    renderer.render(scene, camera);
  }

  updateSceneAndSun();
  requestAnimationFrame(animate3D);
}

/* ==========================================================================
   3. LITE YOUTUBE FACADE, TOOL FILTERS & CONTACT MODAL
   ========================================================================== */
function initLiteYouTubeFacades() {
  document.querySelectorAll(".yt-facade[data-video-id]").forEach((facade) => {
    const btn = facade.querySelector(".yt-play-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const videoId = facade.dataset.videoId;
      const title = facade.dataset.videoTitle || "Demo en video";
      if (!videoId) return;

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
      iframe.title = title;
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      );
      iframe.allowFullscreen = true;

      facade.replaceChildren(iframe);
    });
  });
}

function initProjectFilters() {
  const buttons = document.querySelectorAll(".filter-btn[data-filter]");
  const cards = document.querySelectorAll(".tool-card[data-category]");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.filter;
      buttons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      cards.forEach((card) => {
        const categories = (card.dataset.category || "").split(/\s+/);
        card.classList.toggle("is-hidden", !(target === "all" || categories.includes(target)));
      });
    });
  });
}

function initContactDialog() {
  const dialog = document.getElementById("contactModal");
  const form = document.getElementById("contactForm");
  const subjectSelect = document.getElementById("contactSubject");
  const messageInput = document.getElementById("contactMessage");
  const statusEl = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmitBtn");
  const closeBtn = document.getElementById("closeContactModal");
  const cancelBtn = document.getElementById("cancelContactModal");

  if (!dialog || !form) return;

  let modalOpenedAt = 0;

  function openContactModal(presetSubject = "") {
    if (presetSubject && subjectSelect) {
      const hasOption = Array.from(subjectSelect.options).some((opt) => opt.value === presetSubject);
      if (hasOption) subjectSelect.value = presetSubject;
    }
    statusEl.textContent = "";
    statusEl.className = "form-status";
    modalOpenedAt = performance.now();
    dialog.showModal();
  }

  document.querySelectorAll("[data-open-contact]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openContactModal(trigger.dataset.openContact || "");
    });
  });

  closeBtn?.addEventListener("click", () => dialog.close());
  cancelBtn?.addEventListener("click", () => dialog.close());

  // Fallback obligatorio para navegadores sin closedby="any"
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) dialog.close();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fromName = document.getElementById("contactName").value.trim();
    const replyTo = document.getElementById("contactEmail").value.trim();
    const subject = subjectSelect.value.trim();
    const message = messageInput.value.trim();
    const honeypot = document.getElementById("contactWebsite").value.trim();
    const elapsedMs = performance.now() - modalOpenedAt;

    if (honeypot) {
      form.reset();
      dialog.close();
      return;
    }

    if (modalOpenedAt && elapsedMs < 2500) {
      statusEl.textContent = "Por favor tómate un momento para revisar tu mensaje antes de enviarlo.";
      statusEl.className = "form-status is-error";
      return;
    }

    if (fromName.length < 2 || message.length < 10) {
      statusEl.textContent = "Cuéntanos brevemente qué necesitas (mínimo 10 caracteres).";
      statusEl.className = "form-status is-error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.textContent = "Enviando...";
    statusEl.textContent = "";
    statusEl.className = "form-status";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const payload = new URLSearchParams({
        source: "nexus-portfolio-hub",
        from_name: fromName,
        reply_to: replyTo,
        subject: subject,
        message: message,
        form_age_ms: String(Math.round(elapsedMs)),
        honeypot: honeypot,
      });

      await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        body: payload,
        signal: controller.signal,
      });

      form.reset();
      statusEl.textContent = "Mensaje enviado. Te responderemos pronto a tu correo.";
      statusEl.className = "form-status is-success";
      setTimeout(() => {
        if (dialog.open) dialog.close();
      }, 2200);
    } catch {
      statusEl.textContent = "No se pudo confirmar el envío. Intenta de nuevo en unos segundos.";
      statusEl.className = "form-status is-error";
    } finally {
      clearTimeout(timeoutId);
      submitBtn.disabled = false;
      submitBtn.removeAttribute("aria-busy");
      submitBtn.textContent = "Enviar mensaje";
    }
  });
}
