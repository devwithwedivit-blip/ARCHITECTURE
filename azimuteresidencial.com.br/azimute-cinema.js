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

let visible = false;
let booting = false;
let initialized = false;
let failed = false;
let disposed = false;
let currentIndex = 0;
let refresh = () => {};
let destroy = () => {};
let jump = null;

const fallback = document.createElement('img');
fallback.className = 'architecture-still';
fallback.alt = '4 Korners Architectural Project';
fallback.decoding = 'async';
fallback.addEventListener('click', () => openCurrentPhoto());
host.append(fallback);

const fallbackBadge = document.createElement('div');
fallbackBadge.className = 'cinema-fallback-badge';
fallbackBadge.textContent = 'High-Resolution Gallery Mode';
fallbackBadge.hidden = true;
host.append(fallbackBadge);

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

  if (item && (!chapter.classList.contains('cinema-ready') || reduced.matches || failed) && fallback.getAttribute('src') !== item.texture) {
    fallback.src = item.texture || item.src;
    fallback.style.objectPosition = item.position || 'center';
  }
  if (announce) status.textContent = `Project ${currentIndex + 1} of ${tourIds.length}. ${item?.title || ''}`;
}

function openMedia(id, origin = openPhoto) {
  if (disposed || document.hidden || root.classList.contains('viewer-open')) return;
  ensureMedia();
  if (!mediaById.has(id)) return;
  window.dispatchEvent(new CustomEvent('azimute:open-media', { detail: { id, origin } }));
}

function choose(index, smoothScroll = true) {
  currentIndex = Math.max(0, Math.min(tourIds.length - 1, index));
  syncPhotoControl(true);
  if (jump && !reduced.matches && !failed) {
    jump(currentIndex, smoothScroll);
  }
}

const openCurrentPhoto = () => openMedia(tourIds[currentIndex]);
const prevPhoto = () => choose(currentIndex - 1);
const nextPhoto = () => choose(currentIndex + 1);
const selectPhoto = () => choose(Number(select.value));

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

function reconcile() {
  if (disposed) return;
  const changed = chapter.classList.contains('cinema-reduced') !== reduced.matches;
  chapter.classList.toggle('cinema-reduced', reduced.matches);
  populateSelect();
  if (visible && animated() && !booting && !initialized && !failed) start();
  if (changed) syncPhotoControl();
  refresh();
  if (changed) window.ScrollTrigger?.refresh();
}

const observer = new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  reconcile();
}, { rootMargin: '240px' });
observer.observe(chapter);

addEventListener('azimute:motion', reconcile);
document.addEventListener('visibilitychange', reconcile);
reduced.addEventListener('change', reconcile);

// Global keyboard arrow navigation when 3D carousel is in view
window.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
  const box = chapter.getBoundingClientRect();
  const inView = box.top < window.innerHeight * 0.9 && box.bottom > window.innerHeight * 0.1;
  if (!inView) return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (currentIndex < tourIds.length - 1) {
      e.preventDefault();
      choose(currentIndex + 1);
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (currentIndex > 0) {
      e.preventDefault();
      choose(currentIndex - 1);
    }
  }
});

async function start() {
  booting = true;
  const resources = new Set();
  const cleanups = [];
  const pending = new Map();
  let dead = false;
  let renderer;
  let raf = 0;
  let stats;

  const own = (resource) => {
    if (dead) resource.dispose();
    else resources.add(resource);
    return resource;
  };
  const release = (resource) => {
    if (resource) {
      resource.dispose();
      resources.delete(resource);
    }
  };

  function dispose() {
    if (dead) return;
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    pending.forEach((cancel) => cancel());
    pending.clear();
    cleanups.splice(0).forEach((fn) => fn());
    resources.forEach((resource) => resource.dispose());
    resources.clear();
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }
    if (stats) stats.active = false;
    refresh = () => {};
    jump = null;
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

    if (dead || disposed || !visible || !animated()) {
      booting = false;
      dispose();
      return;
    }

    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x181c1c);
    renderer.transmissionResolutionScale = 0.55;

    const canvas = renderer.domElement;
    canvas.className = 'cinema-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 120);
    scene.fog = new T.Fog(0x181c1c, 36, 85);

    const room = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    try {
      scene.environment = own(pmrem.fromScene(room, 0.055)).texture;
    } finally {
      room.dispose();
      pmrem.dispose();
    }

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
    scene.add(sculpture.group);

    const loader = new T.TextureLoader();
    const textureRecords = new Map();
    const unavailable = new Set();
    let inflight = 0;
    let textureCenter = 0;

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

    const active = () => visible && canDisplay() && !dead;
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

    function loadTexture(url) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const token = {};
        const fail = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          pending.delete(token);
          reject(Error('Texture unavailable: ' + url));
        };
        const timeout = setTimeout(fail, 12000);
        pending.set(token, fail);
        loader.load(
          url,
          (texture) => {
            if (settled || dead) {
              texture.dispose();
              return;
            }
            settled = true;
            clearTimeout(timeout);
            pending.delete(token);
            texture.colorSpace = T.SRGBColorSpace;
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            resolve(own(texture));
          },
          undefined,
          fail
        );
      });
    }

    const recordFor = (id) => {
      if (!textureRecords.has(id)) textureRecords.set(id, {});
      return textureRecords.get(id);
    };

    function updateTextureStats() {
      const textures = [...textureRecords.values()].flatMap((record) => Object.values(record));
      stats.residentTextures = textures.length;
      stats.highResolutionTextures = [...textureRecords.values()].filter((r) => r.high || r.native).length;
      stats.residentPhotoBytes = textures.reduce((sum, tex) => sum + (tex.image?.width || 1000) * (tex.image?.height || 600) * 4 * 1.33, 0);
      stats.inflightTextures = inflight;
    }

    function refreshResidency() {
      textureRecords.forEach((record, id) => {
        const distance = Math.abs(tourIds.indexOf(id) - textureCenter);
        if (record.native && distance > 0) {
          release(record.native);
          delete record.native;
        }
        if (record.high && distance > 2) {
          release(record.high);
          delete record.high;
        }
        sculpture.setTexture(id, record.native || record.high || record.low || null);
      });
      updateTextureStats();
    }

    function requests() {
      const order = [0, 1, -1, 2, -2, 3, -3, 4, -4]
        .map((offset) => textureCenter + offset)
        .filter((idx) => idx >= 0 && idx < tourIds.length);
      const list = [];
      for (const idx of order) {
        const id = tourIds[idx];
        const item = getMedia(id);
        if (item) list.push({ id, kind: 'low', url: item.thumbnail || item.src });
      }
      if (innerWidth > 700) {
        for (const idx of order.filter((i) => Math.abs(i - textureCenter) <= 2)) {
          const id = tourIds[idx];
          const item = getMedia(id);
          if (!item) continue;
          const native = idx === textureCenter && item.width < 2000 && host.clientWidth * 0.74 * renderer.getPixelRatio() > 1350;
          const job = { id, kind: native ? 'native' : 'high', url: native ? item.src : item.texture || item.src };
          if (idx === textureCenter) list.splice(2, 0, job);
          else list.push(job);
        }
      }
      return list;
    }

    const loading = new Set();
    function pumpTextures() {
      if (dead || !visible || document.hidden || root.classList.contains('viewer-open')) return;
      while (inflight < 3) {
        const job = requests().find(
          (j) => !recordFor(j.id)[j.kind] && !loading.has(`${j.id}:${j.kind}`) && !unavailable.has(`${j.id}:${j.kind}`)
        );
        if (!job) break;
        const key = `${job.id}:${job.kind}`;
        inflight++;
        loading.add(key);
        updateTextureStats();
        loadTexture(job.url)
          .then((texture) => {
            if (dead) return;
            const distance = Math.abs(tourIds.indexOf(job.id) - textureCenter);
            if ((job.kind === 'native' && distance > 0) || (job.kind === 'high' && distance > 2)) {
              release(texture);
              return;
            }
            const record = recordFor(job.id);
            record[job.kind] = texture;
            sculpture.setTexture(job.id, record.native || record.high || record.low);
            chapter.classList.add('cinema-ready');
            requestDraw();
          })
          .catch(() => {
            unavailable.add(key);
          })
          .finally(() => {
            inflight--;
            loading.delete(key);
            if (!dead) {
              updateTextureStats();
              pumpTextures();
            }
          });
      }
    }

    // Preload universe backdrop
    loadTexture('assets/crystal/azimute-crystal-universe.webp')
      .then((texture) => {
        if (dead) return;
        backdrop.material.uniforms.uTexture.value = texture;
        backdrop.material.uniforms.uHasTexture.value = 1;
        backdrop.material.uniforms.uImageAspect.value = texture.image.width / texture.image.height;
        requestDraw();
      })
      .catch(() => {});

    // Preload first 3 photo textures immediately
    [0, 1, 2].forEach((offset) => {
      const id = tourIds[offset];
      const item = getMedia(id);
      if (item) {
        loadTexture(item.thumbnail || item.src)
          .then((tex) => {
            if (dead) return;
            const rec = recordFor(id);
            rec.low = tex;
            sculpture.setTexture(id, tex);
            chapter.classList.add('cinema-ready');
            requestDraw();
          })
          .catch(() => {});
      }
    });

    function resize() {
      if (dead) return;
      const box = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(box.width));
      const height = Math.max(1, Math.round(box.height));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;

      const area = width * height;
      const budget = Math.max(1600000, Math.min(4200000, area * 2.2));
      const dpr = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(budget / area)) * quality;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      stats.drawingBufferPixels = canvas.width * canvas.height;
      backdrop.material.uniforms.uAspect.value = camera.aspect;
    }

    function render(now) {
      raf = 0;
      if (!active()) {
        stats.active = false;
        return;
      }
      const isAnimated = animated();
      const raw = last ? now - last : 16.667;
      const dt = Math.min(raw, 64) / 1000;
      last = now;
      if (isAnimated) elapsed += dt;

      // Smooth damping toward target phase if programmatically set
      if (targetPhase !== null && !dragActive) {
        phase += (targetPhase - phase) * S.damping(7.5, dt);
        if (Math.abs(targetPhase - phase) < 0.0002) {
          phase = targetPhase;
          targetPhase = null;
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
      if (textureCenter !== index) {
        textureCenter = index;
        refreshResidency();
        pumpTextures();
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
      stats.frames++;
      stats.active = isAnimated;
      stats.currentPhotoId = tourIds[index];
      stats.currentPhotoIndex = index;
      stats.progress = drawPhase;

      if (stats.frames > 20 && isAnimated) {
        samples.push(raw);
        if (samples.length > 180) samples.shift();
        if (raw > 50) stats.longFrames++;
      }
      if (stats.frames % 90 === 0 && samples.length) {
        const sorted = [...samples].sort((a, b) => a - b);
        stats.p95FrameMs = sorted[Math.floor((sorted.length - 1) * 0.95)];
        stats.averageFrameMs = samples.reduce((sum, x) => sum + x, 0) / samples.length;
        if (stats.frames >= 270 && stats.averageFrameMs > 30 && quality > 0.8) {
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

      if (isAnimated) raf = requestAnimationFrame(render);
    }

    function requestDraw() {
      if (active() && !raf) {
        last = 0;
        raf = requestAnimationFrame(render);
      }
    }

    const ro = new ResizeObserver(() => {
      resize();
      requestDraw();
    });
    ro.observe(host);
    cleanups.push(() => ro.disconnect());
    resize();

    // ScrollTrigger integration
    let trigger = null;
    if (window.ScrollTrigger) {
      const chapterStart = () => chapter.getBoundingClientRect().top + (document.scrollingElement?.scrollTop || scrollY);
      trigger = ScrollTrigger.create({
        trigger: chapter,
        start: chapterStart,
        end: () => chapterStart() + Math.max(1, chapter.offsetHeight - innerHeight),
        onUpdate: (self) => {
          if (!dragActive) {
            phase = self.progress;
            requestDraw();
          }
        },
        onRefresh: (self) => {
          if (!dragActive) {
            phase = self.progress;
            requestDraw();
          }
        },
      });
      phase = drawPhase = trigger.progress;
      textureCenter = Math.round(S.tourIndex(phase));
      currentIndex = textureCenter;
      syncPhotoControl();
      cleanups.push(() => trigger.kill());
    }

    jump = (index, smoothScroll = true) => {
      const progressVal = S.progressForPhoto(index);
      targetPhase = progressVal;
      requestDraw();
      if (trigger && smoothScroll) {
        const targetScroll = trigger.start + (trigger.end - trigger.start) * progressVal;
        window.scrollTo({
          top: targetScroll,
          behavior: root.classList.contains('motion-paused') ? 'instant' : 'smooth',
        });
      }
    };

    // Card Raycasting
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
          const phaseDelta = -(e.clientX - dragStartX) / pixelsPerCard * stepPhase;
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

      // Parallax tilt on hover
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
        // Momentum flick
        const inertia = -dragVelocity * 0.0018;
        const snapIndex = Math.max(0, Math.min(tourIds.length - 1, Math.round(S.tourIndex(phase + inertia))));
        choose(snapIndex, true);
        isDragging = false;
        return;
      }

      // Direct Card Tap / Click
      const hit = pickCard(e.clientX, e.clientY);
      if (hit) {
        if (hit.index === currentIndex) {
          openMedia(hit.mediaId);
        } else {
          choose(hit.index, true);
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

    // Mouse wheel navigation directly inside 3D chapter
    // Natural wheel navigation: allow window and ScrollTrigger to drive rotation smoothly without fighting
    let wheelDebounce = 0;
    const onWheel = (e) => {
      // If user uses trackpad or mousewheel with shiftKey or horizontal wheel over carousel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
        const now = Date.now();
        if (now - wheelDebounce < 240) return;
        wheelDebounce = now;
        const dir = e.deltaX > 0 ? 1 : -1;
        const nextIdx = currentIndex + dir;
        if (nextIdx >= 0 && nextIdx < tourIds.length) {
          choose(nextIdx, true);
        }
      }
    };
    chapter.addEventListener('wheel', onWheel, { passive: true });
    cleanups.push(() => chapter.removeEventListener('wheel', onWheel));

    refresh = () => {
      if (active()) {
        unavailable.clear();
        pumpTextures();
        requestDraw();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        stats.active = false;
        canvas.dataset.renderActive = 'false';
      }
    };

    const contextLost = (event) => {
      event.preventDefault();
      failed = true;
      chapter.classList.remove('cinema-ready');
      chapter.classList.add('cinema-fallback'); fallbackBadge.hidden = false;
      syncPhotoControl();
      dispose();
      window.ScrollTrigger?.refresh();
    };
    canvas.addEventListener('webglcontextlost', contextLost, { once: true });
    cleanups.push(() => canvas.removeEventListener('webglcontextlost', contextLost));

    initialized = true;
    booting = false;
    syncPhotoControl();
    pumpTextures();
    refresh();
  } catch (error) {
    console.error('3D Carousel initialization error:', error);
    failed = true;
    booting = false;
    dispose();
    chapter.classList.remove('cinema-ready');
    chapter.classList.add('cinema-fallback'); fallbackBadge.hidden = false;
    syncPhotoControl();
    window.ScrollTrigger?.refresh();
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
  fallback.remove();
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
