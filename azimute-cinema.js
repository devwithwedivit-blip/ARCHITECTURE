/* 4 Korners Design Studio - 3D Helical Architectural Showcase & Carousel */
const chapter = document.querySelector('.architecture-chapter');
const host = chapter.querySelector('.architectural-depth');
const sticky = chapter.querySelector('.architecture-sticky');
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export const tourIds = [22, 16, 17, 15, 13, 8, 21, 24, 19, 3, 4, 23, 26, 31, 30, 29, 32];
const mediaById = new Map();

function ensureMedia() {
  if (mediaById.size < tourIds.length && window.AZIMUTE_MEDIA) {
    window.AZIMUTE_MEDIA.forEach((item) => mediaById.set(item.id, item));
  }
  return mediaById;
}

function getMedia(id) {
  ensureMedia();
  return mediaById.get(id);
}

// Global Carousel State
let visible = false;
let booting = false;
let initialized = false;
let is3DActive = false;
let failed = false;
let disposed = false;
let currentIndex = 0;
let isContextLost = false;
let restoreTimeout = null;

let isNavigating = false;
let navSafetyTimeout = null;

let trigger = null;
let activeRenderer = null;
let activeCanvas = null;
let activeScene = null;
let activeCamera = null;
let sculptureRef = null;
let S_module = null;

let refresh = () => {};
let destroy = () => {};
let jumpTo3D = null;
let requestDrawFn = () => {};

// Check WebGL availability with performance caveat check
export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
    const supported = !!(gl && (gl instanceof WebGLRenderingContext || (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext)));
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      // clean up test context
      if (ext) ext.loseContext();
    }
    return supported;
  } catch (e) {
    return false;
  }
}

// Badge for 2D Fallback Gallery Mode
const fallbackBadge = document.createElement('div');
fallbackBadge.className = 'cinema-fallback-badge';
fallbackBadge.textContent = 'High-Resolution Gallery Mode';
fallbackBadge.hidden = true;
host.append(fallbackBadge);

// Interactive UI Controls
const controls = document.createElement('div');
controls.className = 'architecture-controls';
controls.setAttribute('aria-label', 'Interactive 3D Architectural Portfolio');

const caption = document.createElement('div');
caption.className = 'architecture-photo-caption';

const count = document.createElement('span');
count.className = 'architecture-count';

const title = document.createElement('span');
title.className = 'architecture-photo-title';
caption.append(count, title);

const progress = document.createElement('progress');
progress.className = 'architecture-progress';
progress.max = tourIds.length;
progress.setAttribute('aria-label', 'Current 3D project showcase');

function button(className, text, label) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  if (label) element.setAttribute('aria-label', label);
  return element;
}

const previous = button('architecture-step architecture-previous', '←', 'Previous project');
const next = button('architecture-step architecture-next', '→', 'Next project');
const openPhoto = button('architecture-open-photo', 'View Full Project ↗', 'View high-resolution project in lightbox');
openPhoto.setAttribute('aria-haspopup', 'dialog');

const selectLabel = document.createElement('label');
selectLabel.className = 'architecture-select-label';
selectLabel.textContent = 'Select project';

const select = document.createElement('select');
select.className = 'architecture-select';
select.setAttribute('aria-label', 'Select one of the 17 architectural projects');

function populateSelect() {
  ensureMedia();
  select.innerHTML = '';
  tourIds.forEach((id, index) => {
    const item = getMedia(id);
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, '0')} · ${item?.title || 'Architectural Project'}`;
    select.append(option);
  });
}
populateSelect();
selectLabel.append(select);

const skip = button('architecture-skip', 'Explore Design Philosophy ↓', 'Continue to philosophy section');
const status = document.createElement('span');
status.className = 'architecture-status';
status.setAttribute('role', 'status');

const actions = document.createElement('div');
actions.className = 'architecture-actions';
actions.append(previous, selectLabel, next, openPhoto);

controls.append(caption, progress, actions, skip, status);
sticky.append(controls);
chapter.classList.add('cinema-tour');

// Synchronize all UI indicators with current project
function syncPhotoControl(announce = false) {
  ensureMedia();
  const id = tourIds[currentIndex];
  const item = getMedia(id);
  const number = String(currentIndex + 1).padStart(2, '0');

  count.textContent = `${number} / ${tourIds.length}`;
  title.textContent = item?.title || 'Architectural Showcase';
  select.value = String(currentIndex);
  progress.value = currentIndex + 1;
  progress.setAttribute('aria-valuetext', `Project ${currentIndex + 1} of ${tourIds.length}: ${item?.title || ''}`);

  previous.disabled = currentIndex === 0;
  next.disabled = currentIndex === tourIds.length - 1;
  openPhoto.disabled = !item;
  openPhoto.dataset.mediaId = String(id);
  openPhoto.setAttribute('aria-label', `View full project ${currentIndex + 1} of ${tourIds.length}: ${item?.title || ''}`);

  if (announce) status.textContent = `Project ${currentIndex + 1} of ${tourIds.length}. ${item?.title || ''}`;
}

// Lightbox modal opener
function openMedia(id, origin = openPhoto) {
  if (disposed || document.hidden || root.classList.contains('viewer-open')) return;
  ensureMedia();
  if (!mediaById.has(id)) return;
  window.dispatchEvent(new CustomEvent('azimute:open-media', { detail: { id, origin } }));
}

// ============================================================================
// 2D CSS 3D Helical Fallback Carousel (Problem 3)
// ============================================================================
let fallbackStage = null;
let fallbackTrack = null;
let fallbackCards = [];

function buildFallbackCarousel() {
  if (fallbackStage) return;
  fallbackStage = document.createElement('div');
  fallbackStage.className = 'cinema-fallback-stage';
  fallbackStage.setAttribute('aria-label', '3D Helical Architectural Gallery (High Compatibility Mode)');

  fallbackTrack = document.createElement('div');
  fallbackTrack.className = 'cinema-fallback-track';
  fallbackStage.append(fallbackTrack);

  tourIds.forEach((id, idx) => {
    const item = getMedia(id);
    const card = document.createElement('div');
    card.className = 'cinema-fallback-card';
    card.dataset.index = String(idx);
    card.dataset.id = String(id);

    const frame = document.createElement('div');
    frame.className = 'cinema-card-frame';

    const img = document.createElement('img');
    img.className = 'cinema-card-img';
    img.alt = item?.alt || item?.title || 'Architectural Project';
    img.loading = idx < 3 ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = item?.thumbnail || item?.src || '';

    const glaze = document.createElement('div');
    glaze.className = 'cinema-card-glaze';

    frame.append(img, glaze);
    card.append(frame);

    card.addEventListener('click', () => {
      if (idx === currentIndex) {
        openMedia(id);
      } else {
        goToSlide(idx, true);
      }
    });

    fallbackTrack.append(card);
    fallbackCards.push(card);
  });

  // Swipe / Drag handling on fallback carousel
  let fDragActive = false;
  let fStartX = 0;
  let fStartY = 0;
  let fDragging = false;

  fallbackStage.addEventListener('pointerdown', (e) => {
    fDragActive = true;
    fDragging = false;
    fStartX = e.clientX;
    fStartY = e.clientY;
  });

  fallbackStage.addEventListener('pointermove', (e) => {
    if (!fDragActive) return;
    const dist = Math.hypot(e.clientX - fStartX, e.clientY - fStartY);
    if (dist > 8) fDragging = true;
  });

  const finishFallbackDrag = (e) => {
    if (!fDragActive) return;
    fDragActive = false;
    if (fDragging) {
      const deltaX = e.clientX - fStartX;
      if (Math.abs(deltaX) > 35) {
        if (deltaX < 0) goToSlide(currentIndex + 1, true);
        else goToSlide(currentIndex - 1, true);
      }
    }
  };

  fallbackStage.addEventListener('pointerup', finishFallbackDrag);
  fallbackStage.addEventListener('pointercancel', () => { fDragActive = false; });
  fallbackStage.addEventListener('pointerleave', () => { fDragActive = false; });

  host.append(fallbackStage);
  updateFallbackCarousel(currentIndex, false);
}

function updateFallbackCarousel(targetIndex, smooth = true) {
  if (!fallbackStage || !fallbackCards.length) return;
  const isMobile = window.innerWidth < 768;
  const radius = isMobile ? 380 : 620;
  const stepAngle = isMobile ? 22 : 18;
  const yStep = isMobile ? 18 : 24;

  fallbackCards.forEach((card, idx) => {
    const offset = idx - targetIndex;
    const absOffset = Math.abs(offset);

    card.classList.toggle('is-active', offset === 0);
    if (absOffset > 5) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';

    const angleRad = (offset * stepAngle * Math.PI) / 180;
    const rotY = -offset * stepAngle;
    const tx = Math.sin(angleRad) * radius;
    const tz = Math.cos(angleRad) * radius - radius;
    const ty = -offset * yStep;
    const scale = Math.max(0.72, 1 - absOffset * 0.055);

    card.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, ${tz.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    card.style.zIndex = String(30 - absOffset);
    card.style.opacity = String(Math.max(0, 1 - absOffset * 0.22));
    card.style.filter = offset === 0 ? 'none' : `brightness(${Math.max(0.45, 0.85 - absOffset * 0.14)})`;
    card.classList.toggle('is-active', offset === 0);
  });
}

function switchTo2DFallback() {
  is3DActive = false;
  failed = true;
  chapter.classList.remove('cinema-ready');
  chapter.classList.add('cinema-fallback');
  fallbackBadge.hidden = false;

  if (activeCanvas) {
    activeCanvas.remove();
    activeCanvas = null;
  }
  if (activeRenderer) {
    try { activeRenderer.dispose(); } catch (e) {}
    activeRenderer = null;
  }

  buildFallbackCarousel();
  updateFallbackCarousel(currentIndex, false);
  syncPhotoControl(true);
  setupCarouselScrollTrigger();
  window.ScrollTrigger?.refresh();
}

// ============================================================================
// Single Master goToSlide(index, smooth) Function (Problem 2)
// ============================================================================
export function goToSlide(index, smooth = true) {
  const targetIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(index)));
  currentIndex = targetIndex;
  syncPhotoControl(true);

  clearTimeout(navSafetyTimeout);
  isNavigating = true;
  navSafetyTimeout = setTimeout(() => {
    isNavigating = false;
  }, 1000);

  // Sync scroll position if ScrollTrigger is active
  if (trigger) {
    const targetProgress = is3DActive && S_module
      ? S_module.progressForPhoto(targetIndex)
      : (targetIndex / (tourIds.length - 1));

    const targetScroll = trigger.start + (trigger.end - trigger.start) * targetProgress;
    if (smooth && !root.classList.contains('motion-paused') && !reduced.matches) {
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: targetScroll,
        behavior: 'instant',
      });
    }
  }

  // Update 3D helix target
  if (is3DActive && jumpTo3D) {
    jumpTo3D(targetIndex);
  }

  // Update 2D fallback carousel
  if (!is3DActive) {
    updateFallbackCarousel(targetIndex, smooth);
  }
}
window.goToSlide = goToSlide;

const openCurrentPhoto = () => openMedia(tourIds[currentIndex]);
const prevPhoto = () => goToSlide(currentIndex - 1);
const nextPhoto = () => goToSlide(currentIndex + 1);
const selectPhoto = () => goToSlide(Number(select.value));

const skipTour = () => {
  const destination = chapter.nextElementSibling;
  if (!destination) return;
  destination.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  const heading = destination.querySelector('h2,h3') || destination;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
};

openPhoto.addEventListener('click', openCurrentPhoto);
previous.addEventListener('click', prevPhoto);
next.addEventListener('click', nextPhoto);
select.addEventListener('change', selectPhoto);
skip.addEventListener('click', skipTour);
syncPhotoControl();

const canDisplay = () => !document.hidden && !root.classList.contains('viewer-open');
const animated = () => canDisplay() && !root.classList.contains('motion-paused');

// Keyboard arrow navigation when carousel chapter is in view
window.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;
  const box = chapter.getBoundingClientRect();
  const inView = box.top < window.innerHeight * 0.95 && box.bottom > window.innerHeight * 0.05;
  if (!inView) return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (currentIndex < tourIds.length - 1) {
      e.preventDefault();
      goToSlide(currentIndex + 1);
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (currentIndex > 0) {
      e.preventDefault();
      goToSlide(currentIndex - 1);
    }
  }
});

// ============================================================================
// ScrollTrigger Pinning Setup (Problem 2)
// ============================================================================
function setupCarouselScrollTrigger() {
  if (trigger) {
    trigger.kill();
    trigger = null;
  }
  if (!window.ScrollTrigger) return;

  const snapPoints = tourIds.map((_, i) =>
    is3DActive && S_module ? S_module.progressForPhoto(i) : (i / (tourIds.length - 1))
  );

  trigger = window.ScrollTrigger.create({
    trigger: chapter,
    pin: true,
    start: 'top top',
    end: () => '+=' + Math.max(window.innerHeight * 4, window.innerHeight * 5.5),
    scrub: 0.8,
    invalidateOnRefresh: true,
    snap: {
      snapTo: (val) => {
        const first = snapPoints[0] || 0.05;
        const last = snapPoints[snapPoints.length - 1] || 0.95;
        // Snap to extremes to allow clean entry and exit scrolling
        if (val < first * 0.4) return 0;
        if (val > last + (1 - last) * 0.6) return 1;

        let closest = snapPoints[0];
        let minDiff = Math.abs(val - closest);
        for (let i = 1; i < snapPoints.length; i++) {
          const diff = Math.abs(val - snapPoints[i]);
          if (diff < minDiff) {
            minDiff = diff;
            closest = snapPoints[i];
          }
        }
        return closest;
      },
      duration: { min: 0.15, max: 0.45 },
      delay: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        isNavigating = false;
      },
      onInterrupt: () => {
        isNavigating = false;
      },
    },
    onUpdate: (self) => {
      if (is3DActive && S_module) {
        window.dispatchEvent(new CustomEvent('azimute:carousel-progress', { detail: self.progress }));
      } else {
        const newIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(self.progress * (tourIds.length - 1))));
        if (currentIndex !== newIndex) {
          currentIndex = newIndex;
          syncPhotoControl();
          updateFallbackCarousel(currentIndex, false);
        }
      }
    },
    onRefresh: (self) => {
      if (is3DActive && S_module) {
        window.dispatchEvent(new CustomEvent('azimute:carousel-progress', { detail: self.progress }));
      } else {
        const newIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(self.progress * (tourIds.length - 1))));
        currentIndex = newIndex;
        syncPhotoControl();
        updateFallbackCarousel(currentIndex, false);
      }
    },
  });
}

// Lenis integration guard (Problem 1.7)
if (window.lenis && window.ScrollTrigger) {
  try {
    window.lenis.on('scroll', window.ScrollTrigger.update);
  } catch (e) {}
}

// Reconcile visibility and lifecycle
function reconcile() {
  if (disposed) return;
  const changed = chapter.classList.contains('cinema-reduced') !== reduced.matches;
  chapter.classList.toggle('cinema-reduced', reduced.matches);
  populateSelect();

  if (visible && animated() && !booting && !initialized && !failed) {
    start();
  }
  if (changed) syncPhotoControl();
  refresh();
  if (changed) window.ScrollTrigger?.refresh();
}

const observer = new IntersectionObserver(
  (entries) => {
    visible = entries[0].isIntersecting;
    reconcile();
  },
  { rootMargin: '240px' }
);
observer.observe(chapter);

addEventListener('azimute:motion', reconcile);
document.addEventListener('visibilitychange', reconcile);
reduced.addEventListener('change', reconcile);

// Global ScrollTrigger measurement refreshes (Problem 1.5)
window.addEventListener('load', () => window.ScrollTrigger?.refresh());
if (document.fonts?.ready) {
  document.fonts.ready.then(() => window.ScrollTrigger?.refresh());
}
let resizeRefreshTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeRefreshTimer);
  resizeRefreshTimer = setTimeout(() => {
    window.ScrollTrigger?.refresh();
  }, 200);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    window.ScrollTrigger?.refresh();
  }, 250);
});

// ============================================================================
// Three.js 3D Helical Engine (Problem 1 & 2)
// ============================================================================
async function start() {
  // Prevent duplicate initialization
  if (booting || initialized || disposed) return;
  booting = true;

  // Problem 3: Check WebGL availability with performance check
  if (!hasWebGL()) {
    console.warn('WebGL unavailable or hardware acceleration disabled. Activating 2D fallback carousel.');
    booting = false;
    switchTo2DFallback();
    return;
  }

  const resources = new Set();
  const cleanups = [];
  const pending = new Map();
  const textureCache = new Map();
  let dead = false;
  let renderer = null;
  let raf = 0;
  let stats = null;

  const own = (resource) => {
    if (dead) resource.dispose?.();
    else resources.add(resource);
    return resource;
  };
  const release = (resource) => {
    if (resource) {
      resource.dispose?.();
      resources.delete(resource);
    }
  };

  function dispose() {
    if (dead) return;
    dead = true;
    is3DActive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    pending.forEach((cancel) => cancel());
    pending.clear();
    cleanups.splice(0).forEach((fn) => fn());
    textureCache.forEach((tex) => tex.dispose?.());
    textureCache.clear();
    resources.forEach((resource) => resource.dispose?.());
    resources.clear();
    if (renderer) {
      try { renderer.dispose(); } catch (e) {}
      renderer.domElement.remove();
      renderer = null;
    }
    activeRenderer = null;
    activeCanvas = null;
    if (stats) stats.active = false;
    refresh = () => {};
    jumpTo3D = null;
    requestDrawFn = () => {};
  }
  destroy = dispose;

  try {
    ensureMedia();
    populateSelect();

    const [T, { RoomEnvironment }, S] = await Promise.all([
      import('./vendor/three.module.min.js'),
      import('./vendor/RoomEnvironment.js'),
      import('./azimute-sculpture.js'),
    ]);
    S_module = S;
    window.AZIMUTE_SCULPTURE = S;

    if (dead || disposed || !visible || !animated()) {
      booting = false;
      dispose();
      return;
    }

    // Problem 3: failIfMajorPerformanceCaveat ensures slow software rasterizers fall back
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true,
      });
    } catch (e) {
      console.warn('Three.js WebGLRenderer creation failed. Switching to 2D fallback:', e);
      booting = false;
      dispose();
      switchTo2DFallback();
      return;
    }

    activeRenderer = renderer;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x181c1c);
    renderer.transmissionResolutionScale = 0.55;

    const canvas = renderer.domElement;
    activeCanvas = canvas;
    canvas.className = 'cinema-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);

    const scene = new T.Scene();
    activeScene = scene;
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 120);
    activeCamera = camera;
    scene.fog = new T.Fog(0x181c1c, 36, 85);

    // PMREM Environment creation
    function rebuildEnvironment() {
      const room = new RoomEnvironment();
      const pmrem = new T.PMREMGenerator(renderer);
      try {
        scene.environment = own(pmrem.fromScene(room, 0.055)).texture;
      } finally {
        room.dispose();
        pmrem.dispose();
      }
    }
    rebuildEnvironment();

    const backdrop = S.makeBackdrop(own);
    scene.add(backdrop);

    scene.add(new T.HemisphereLight(0xe5e8df, 0x3d2d21, 2.4));
    const key = new T.DirectionalLight(0xffd7a9, 4.2);
    key.position.set(-6, 9, 10);
    scene.add(key);

    const rim = new T.DirectionalLight(0xd4e2e9, 3.5);
    rim.position.set(7, 2, -5);
    scene.add(rim);

    const light = new T.PointLight(0xffc48a, 115, 23, 2);
    scene.add(light);

    const sculpture = S.createSculpture(new Map(), own);
    sculptureRef = sculpture;
    scene.add(sculpture.group);

    stats = {
      frames: 0,
      active: false,
      photographs: S.PHOTOGRAPHS.length,
      quality: 1,
      averageFrameMs: 0,
      p95FrameMs: 0,
      longFrames: 0,
      drawingBufferPixels: 0,
      residentTextures: 0,
      residentPhotoBytes: 0,
      inflightTextures: 0,
      highResolutionTextures: 0,
      currentPhotoId: tourIds[0],
      currentPhotoIndex: 0,
      progress: 0,
    };
    window.AZIMUTE_CINEMA_STATS = stats;

    const active = () => visible && canDisplay() && !dead && !isContextLost;
    let last = 0;
    let elapsed = 0;
    let phase = 0;
    let drawPhase = 0;
    let targetPhase = null;
    let dragActive = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragLastX = 0;
    let dragStartPhase = 0;
    let dragVelocity = 0;
    let drawn = false;
    let quality = 1;
    let samples = [];
    let lastWidth = 0;
    let lastHeight = 0;
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    // Problem 1.2: Cap texture size to 1536px, avoid re-creating textures on every scroll
    function loadCappedTexture(url) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const token = {};
        const fail = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          pending.delete(token);
          reject(new Error('Texture unavailable: ' + url));
        };
        const timeout = setTimeout(fail, 12000);
        pending.set(token, fail);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          if (settled || dead) return;
          settled = true;
          clearTimeout(timeout);
          pending.delete(token);

          const maxDim = 1536;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          let source = img;

          // Cap dimensions to 1536px max
          if (w > maxDim || h > maxDim) {
            const scale = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, w, h);
              source = canvas;
            }
          }

          const texture = new T.Texture(source);
          texture.colorSpace = T.SRGBColorSpace;
          const isPowerOfTwo = (w & (w - 1)) === 0 && (h & (h - 1)) === 0;
          texture.generateMipmaps = isPowerOfTwo;
          texture.minFilter = isPowerOfTwo ? T.LinearMipmapLinearFilter : T.LinearFilter;
          texture.magFilter = T.LinearFilter;
          texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          texture.needsUpdate = true;
          resolve(own(texture));
        };
        img.onerror = fail;
        img.src = url;
      });
    }

    // Load universe backdrop
    loadCappedTexture('assets/crystal/azimute-crystal-universe.webp')
      .then((texture) => {
        if (dead) return;
        backdrop.material.uniforms.uTexture.value = texture;
        backdrop.material.uniforms.uHasTexture.value = 1;
        backdrop.material.uniforms.uImageAspect.value = (texture.image?.width || 16) / (texture.image?.height || 9);
        requestDraw();
      })
      .catch(() => {});

    // Preload & Cache all 17 textures smoothly without thrashing
    const loadingIds = new Set();
    function loadProjectTexture(id) {
      if (textureCache.has(id) || loadingIds.has(id) || dead) return;
      const item = getMedia(id);
      if (!item) return;

      loadingIds.add(id);
      loadCappedTexture(item.texture || item.src)
        .then((tex) => {
          if (dead) {
            tex.dispose();
            return;
          }
          textureCache.set(id, tex);
          sculpture.setTexture(id, tex);
          chapter.classList.add('cinema-ready');
          requestDraw();
        })
        .catch(() => {})
        .finally(() => {
          loadingIds.delete(id);
        });
    }

    // Prioritize loading: load initial 4 immediately, then queue the rest
    [0, 1, 2, 3].forEach((idx) => loadProjectTexture(tourIds[idx]));
    setTimeout(() => {
      tourIds.forEach((id) => loadProjectTexture(id));
    }, 400);

    // Responsive resize with devicePixelRatio capped on weak/mobile devices (Problem ALSO)
    function resize() {
      if (dead || isContextLost) return;
      const box = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(box.width));
      const height = Math.max(1, Math.round(box.height));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;

      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
      const maxDpr = isMobile ? 1.5 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      stats.drawingBufferPixels = canvas.width * canvas.height;
      backdrop.material.uniforms.uAspect.value = camera.aspect;
    }

    // Problem 1.4: Wrap render in try/catch so a single error never kills the RAF loop permanently
    function render(now) {
      raf = 0;
      if (!active()) {
        if (stats) stats.active = false;
        return;
      }
      const isAnimated = animated();
      try {
        const raw = last ? now - last : 16.667;
        const dt = Math.min(raw, 64) / 1000;
        last = now;
        if (isAnimated) elapsed += dt;

        // Smooth damping toward targetPhase if programmatically navigating
        if (targetPhase !== null && !dragActive) {
          phase += (targetPhase - phase) * S.damping(7.5, dt);
          if (Math.abs(targetPhase - phase) < 0.0002) {
            phase = targetPhase;
            targetPhase = null;
            isNavigating = false;
          }
        }

        drawPhase = isAnimated ? drawPhase + (phase - drawPhase) * S.damping(9, dt) : phase;
        pointer.x += (target.x - pointer.x) * S.damping(2.7, dt);
        pointer.y += (target.y - pointer.y) * S.damping(2.7, dt);

        const box = host.getBoundingClientRect();
        const containerAspect = camera.aspect || (box.width / Math.max(1, box.height));
        const pose = S.cameraPose(drawPhase, { width: box.width, height: box.height, aspect: containerAspect });
        const index = Math.max(0, Math.min(tourIds.length - 1, Math.round(pose.index)));

        if (currentIndex !== index) {
          currentIndex = index;
          syncPhotoControl();
        }

        chapter.style.setProperty('--sculpture-expansion', pose.expansion.toFixed(4));
        chapter.style.setProperty('--sculpture-copy', pose.copyOpacity.toFixed(3));
        chapter.style.setProperty('--sculpture-copy-y', `${(-S.smooth(0, 0.065, drawPhase) * 24).toFixed(2)}px`);

        resize();

        const actualPose = pose;
        const tAspect = pose.tAspect ?? Math.max(0, Math.min(1, (containerAspect - 0.6) / 1.0));
        const camElevation = 0.35 + (0.65 - 0.35) * tAspect;
        const camOffsetX = 0.2 + (0.6 - 0.2) * tAspect;
        camera.position.set(
          camOffsetX + pointer.x * 0.5,
          actualPose.y + camElevation + pointer.y * 0.35,
          actualPose.z
        );
        camera.lookAt(
          pointer.x * 0.2,
          actualPose.lookY,
          S.HELIX.radius * 0.35
        );

        light.position.set(actualPose.x + 4.1 * Math.sin(elapsed * 0.16 + 0.8), actualPose.y + 2.5, 8.5 + Math.cos(elapsed * 0.12));
        backdrop.material.uniforms.uTime.value = elapsed;
        backdrop.material.uniforms.uProgress.value = drawPhase;
        backdrop.material.uniforms.uPointer.value.set(pointer.x, pointer.y);

        renderer.render(scene, camera);

        if (stats) {
          stats.frames++;
          stats.active = isAnimated;
          stats.currentPhotoId = tourIds[index];
          stats.currentPhotoIndex = index;
          stats.progress = drawPhase;
          stats.residentTextures = textureCache.size;
        }

        if (stats && stats.frames > 20 && isAnimated) {
          samples.push(raw);
          if (samples.length > 180) samples.shift();
          if (raw > 50) stats.longFrames++;
        }
        if (stats && stats.frames % 90 === 0 && samples.length) {
          const sorted = [...samples].sort((a, b) => a - b);
          stats.p95FrameMs = sorted[Math.floor((sorted.length - 1) * 0.95)];
          stats.averageFrameMs = samples.reduce((sum, x) => sum + x, 0) / samples.length;
          if (stats.frames >= 270 && stats.averageFrameMs > 32 && quality > 0.8) {
            quality = 0.8;
            stats.quality = quality;
            lastWidth = 0;
            resize();
          }
        }

        if (!drawn) {
          drawn = true;
          chapter.classList.add('cinema-ready');
        }
      } catch (renderError) {
        console.error('3D Carousel render loop caught error:', renderError);
      }

      if (isAnimated && !dead && !isContextLost) {
        raf = requestAnimationFrame(render);
      }
    }

    function requestDraw() {
      if (active() && !raf) {
        last = 0;
        raf = requestAnimationFrame(render);
      }
    }
    requestDrawFn = requestDraw;

    const ro = new ResizeObserver(() => {
      resize();
      requestDraw();
    });
    ro.observe(host);
    cleanups.push(() => ro.disconnect());
    resize();

    // Problem 1.1: WebGL Context Loss & Restoration
    const onContextLost = (event) => {
      event.preventDefault(); // MANDATORY: allow context restoration
      console.warn('WebGL context lost on cinema canvas. Pausing render loop and awaiting recovery...');
      isContextLost = true;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      clearTimeout(restoreTimeout);
      restoreTimeout = setTimeout(() => {
        if (isContextLost) {
          console.warn('WebGL context restoration timed out. Switching to 2D fallback.');
          dispose();
          switchTo2DFallback();
        }
      }, 3500);
    };

    const onContextRestored = () => {
      console.log('WebGL context restored! Rebuilding environment, materials, and textures...');
      clearTimeout(restoreTimeout);
      isContextLost = false;
      try {
        rebuildEnvironment();
        textureCache.forEach((tex, id) => {
          tex.needsUpdate = true;
          sculpture.setTexture(id, tex);
        });
        chapter.classList.add('cinema-ready');
        requestDraw();
      } catch (restoreErr) {
        console.error('Failed to restore WebGL context materials:', restoreErr);
        dispose();
        switchTo2DFallback();
      }
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    cleanups.push(() => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    });

    // Raycaster for card taps / clicks in 3D scene
    const raycaster = new T.Raycaster();
    const pickPoint = new T.Vector2();

    const pickCard = (clientX, clientY) => {
      if (!active() || dead) return null;
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height || clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom) return null;
      pickPoint.set(((clientX - box.left) / box.width) * 2 - 1, 1 - ((clientY - box.top) / box.height) * 2);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(pickPoint, camera);
      const hits = raycaster.intersectObjects(sculpture.cards, true);
      for (const hit of hits) {
        let card = hit.object;
        while (card && card.userData?.mediaId === undefined) card = card.parent;
        if (card && card.userData?.mediaId !== undefined) {
          return { mediaId: card.userData.mediaId, index: card.userData.photoIndex };
        }
      }
      return null;
    };

    // Interactive Drag / Swipe on Canvas
    const onPointerDown = (e) => {
      if (e.isPrimary === false || (e.button !== 0 && e.pointerType === 'mouse')) return;
      dragActive = true;
      isDragging = false;
      dragStartX = dragLastX = e.clientX;
      dragStartY = e.clientY;
      dragStartPhase = phase;
      dragVelocity = 0;
      targetPhase = null;
      try { canvas.setPointerCapture?.(e.pointerId); } catch (err) {}
    };

    const onPointerMove = (e) => {
      if (dragActive) {
        const totalDist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
        if (totalDist > 6) {
          isDragging = true;
          canvas.classList.add('is-dragging');
        }
        if (isDragging) {
          const deltaX = e.clientX - dragLastX;
          dragVelocity = deltaX;
          dragLastX = e.clientX;

          const pixelsPerCard = Math.max(140, host.clientWidth * 0.22);
          const stepPhase = 0.87 / (tourIds.length - 1);
          const phaseDelta = -((e.clientX - dragStartX) / pixelsPerCard) * stepPhase;
          phase = Math.max(0, Math.min(1, dragStartPhase + phaseDelta));
          targetPhase = phase;
          requestDraw();

          const newIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(S.tourIndex(phase))));
          if (currentIndex !== newIndex) {
            currentIndex = newIndex;
            syncPhotoControl();
          }
          return;
        }
      }

      // Parallax tilt on mouse hover
      if (e.pointerType === 'touch' || !animated()) return;
      const box = host.getBoundingClientRect();
      target.x = Math.max(-0.5, Math.min(0.5, (e.clientX - box.left) / box.width - 0.5));
      target.y = Math.max(-0.5, Math.min(0.5, 0.5 - (e.clientY - box.top) / box.height));
    };

    const onPointerUp = (e) => {
      if (!dragActive) return;
      dragActive = false;
      canvas.classList.remove('is-dragging');
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (err) {}

      if (isDragging) {
        const inertia = -dragVelocity * 0.0018;
        const snapIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(S.tourIndex(phase + inertia))));
        goToSlide(snapIndex, true);
        isDragging = false;
        return;
      }

      // Direct Card Tap / Click
      const hit = pickCard(e.clientX, e.clientY);
      if (hit) {
        if (hit.index === currentIndex) {
          openMedia(hit.mediaId);
        } else {
          goToSlide(hit.index, true);
        }
      }
    };

    const onPointerCancel = (e) => {
      dragActive = false;
      isDragging = false;
      canvas.classList.remove('is-dragging');
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (err) {}
      target.x = 0;
      target.y = 0;
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerup', onPointerUp, { passive: true });
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerleave', onPointerCancel);

    cleanups.push(() => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerCancel);
    });

    // Horizontal wheel navigation over carousel
    let wheelDebounce = 0;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
        const now = Date.now();
        if (now - wheelDebounce < 240) return;
        wheelDebounce = now;
        const dir = e.deltaX > 0 ? 1 : -1;
        const nextIdx = currentIndex + dir;
        if (nextIdx >= 0 && nextIdx < tourIds.length) {
          goToSlide(nextIdx, true);
        }
      }
    };
    chapter.addEventListener('wheel', onWheel, { passive: true });
    cleanups.push(() => chapter.removeEventListener('wheel', onWheel));

    // Progress updates from ScrollTrigger
    const onCarouselProgress = (e) => {
      if (dragActive) return;
      phase = e.detail;
      const newIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(S.tourIndex(phase))));
      if (currentIndex !== newIndex) {
        currentIndex = newIndex;
        syncPhotoControl();
      }
      requestDraw();
    };
    window.addEventListener('azimute:carousel-progress', onCarouselProgress);
    cleanups.push(() => window.removeEventListener('azimute:carousel-progress', onCarouselProgress));

    jumpTo3D = (index) => {
      const progressVal = S.progressForPhoto(index);
      targetPhase = progressVal;
      requestDraw();
    };

    refresh = () => {
      if (active()) {
        requestDraw();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        if (stats) stats.active = false;
      }
    };

    is3DActive = true;
    initialized = true;
    booting = false;
    syncPhotoControl();
    requestDraw();
    setupCarouselScrollTrigger();
  } catch (err) {
    console.error('3D Carousel initialization error. Activating 2D fallback:', err);
    booting = false;
    dispose();
    switchTo2DFallback();
  }
}

function pageHide(event) {
  if (event.persisted) {
    visible = false;
    refresh();
    return;
  }
  disposed = true;
  observer.disconnect();
  destroy();
  controls.remove();
  if (fallbackStage) fallbackStage.remove();
  removeEventListener('azimute:motion', reconcile);
  document.removeEventListener('visibilitychange', reconcile);
  reduced.removeEventListener('change', reconcile);
  removeEventListener('pagehide', pageHide);
  removeEventListener('pageshow', pageShow);
}

function pageShow(event) {
  if (event.persisted && !disposed) {
    const box = chapter.getBoundingClientRect();
    visible = box.top < innerHeight && box.bottom > 0;
    reconcile();
  }
}

addEventListener('pagehide', pageHide);
addEventListener('pageshow', pageShow);
reconcile();
