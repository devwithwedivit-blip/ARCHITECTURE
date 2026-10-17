"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  PHOTOGRAPHS,
  cameraPose,
  createSculpture,
  damping,
  makeBackdrop,
  progressForPhoto,
  smooth,
  tourIndex,
} from "./helical-sculpture-engine";
import { AZIMUTE_MEDIA, MediaItem } from "./media-data";

interface HelicalCarouselProps {
  onOpenViewer: (item: MediaItem) => void;
}

export function HelicalCarousel({ onOpenViewer }: HelicalCarouselProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [expansion, setExpansion] = useState(0);
  const [copyOpacity, setCopyOpacity] = useState(1);
  const [copyY, setCopyY] = useState(0);

  const mediaById = useMemo(() => {
    return new Map<number, MediaItem>(AZIMUTE_MEDIA.map((m) => [m.id, m]));
  }, []);

  const currentMedia = useMemo(() => {
    const id = PHOTOGRAPHS[currentIndex];
    return mediaById.get(id);
  }, [currentIndex, mediaById]);

  // Jump smoothly to a specific photo along the helix
  const jumpToPhoto = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(PHOTOGRAPHS.length - 1, index));
    setCurrentIndex(clamped);

    if (sectionRef.current) {
      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const sectionStart = rect.top + scrollTop;
      const totalScrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const targetProgress = progressForPhoto(clamped);
      const targetScroll = sectionStart + totalScrollable * targetProgress;

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, []);

  const handlePrev = useCallback(() => {
    jumpToPhoto(currentIndex - 1);
  }, [currentIndex, jumpToPhoto]);

  const handleNext = useCallback(() => {
    jumpToPhoto(currentIndex + 1);
  }, [currentIndex, jumpToPhoto]);

  const handleSelect = useCallback(
    (index: number) => {
      jumpToPhoto(index);
    },
    [jumpToPhoto]
  );

  const handleSkip = useCallback(() => {
    const nextSection = document.getElementById("essencia");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const host = hostRef.current;
    const section = sectionRef.current;
    if (!host || !section) return;

    let dead = false;
    let raf = 0;
    const resources = new Set<{ dispose: () => void }>();
    const own = <T extends { dispose: () => void }>(r: T): T => {
      if (dead) r.dispose();
      else resources.add(r);
      return r;
    };

    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x181c1c);

      const canvas = renderer.domElement;
      canvas.className = "cinema-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.append(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 110);
      scene.fog = new THREE.Fog(0x181c1c, 36, 80);

      // Environment
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      try {
        scene.environment = own(pmrem.fromScene(room, 0.055)).texture;
      } finally {
        room.dispose();
        pmrem.dispose();
      }

      // Backdrop & Lights
      const backdrop = makeBackdrop(own);
      scene.add(backdrop);

      scene.add(new THREE.HemisphereLight(0xe5e8df, 0x3d2d21, 2.4));
      const key = new THREE.DirectionalLight(0xffd7a9, 4.2);
      key.position.set(-6, 9, 10);
      scene.add(key);

      const rim = new THREE.DirectionalLight(0xd4e2e9, 3.5);
      rim.position.set(7, 2, -5);
      scene.add(rim);

      const light = new THREE.PointLight(0xffc48a, 115, 23, 2);
      scene.add(light);

      // 3D Sculpture Group with 17 cards
      const loadedTextures = new Map<number, THREE.Texture>();
      const sculpture = createSculpture(loadedTextures, own);
      scene.add(sculpture.group);

      // Texture loader
      const textureLoader = new THREE.TextureLoader();
      const loadPhotoTexture = (id: number) => {
        if (loadedTextures.has(id)) return;
        const item = mediaById.get(id);
        if (!item?.texture) return;

        textureLoader.load(
          item.texture,
          (tex) => {
            if (dead) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            own(tex);
            loadedTextures.set(id, tex);
            sculpture.setTexture(id, tex);
            setReady(true);
          },
          undefined,
          () => {}
        );
      };

      // Load initial images
      PHOTOGRAPHS.slice(0, 3).forEach((id) => loadPhotoTexture(id));

      // Universe background texture
      textureLoader.load(
        "/assets/crystal/azimute-crystal-universe.webp",
        (tex) => {
          if (dead) {
            tex.dispose();
            return;
          }
          own(tex);
          (backdrop.material as THREE.ShaderMaterial).uniforms.uTexture.value = tex;
          (backdrop.material as THREE.ShaderMaterial).uniforms.uHasTexture.value = 1;
        },
        undefined,
        () => {
          textureLoader.load(
            "assets/crystal/azimute-crystal-universe.webp",
            (tex) => {
              if (dead) {
                tex.dispose();
                return;
              }
              own(tex);
              (backdrop.material as THREE.ShaderMaterial).uniforms.uTexture.value = tex;
              (backdrop.material as THREE.ShaderMaterial).uniforms.uHasTexture.value = 1;
            },
            undefined,
            () => {}
          );
        }
      );

      // Pointer tracking
      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const handlePointerMove = (e: PointerEvent) => {
        const box = host.getBoundingClientRect();
        target.x = Math.max(-0.5, Math.min(0.5, (e.clientX - box.left) / box.width - 0.5));
        target.y = Math.max(-0.5, Math.min(0.5, 0.5 - (e.clientY - box.top) / box.height));
      };
      const handlePointerLeave = () => {
        target.x = 0;
        target.y = 0;
      };
      section.addEventListener("pointermove", handlePointerMove, { passive: true });
      section.addEventListener("pointerleave", handlePointerLeave, { passive: true });

      // Click card raycaster
      const raycaster = new THREE.Raycaster();
      const mouseVec = new THREE.Vector2();
      let clickStart = { x: 0, y: 0, time: 0 };

      const handlePointerDown = (e: PointerEvent) => {
        clickStart = { x: e.clientX, y: e.clientY, time: Date.now() };
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(e.clientX - clickStart.x, e.clientY - clickStart.y);
        const elapsed = Date.now() - clickStart.time;
        if (dist > 8 || elapsed > 600) return;

        const box = canvas.getBoundingClientRect();
        if (
          e.clientX < box.left ||
          e.clientX > box.right ||
          e.clientY < box.top ||
          e.clientY > box.bottom
        )
          return;

        mouseVec.set(
          ((e.clientX - box.left) / box.width) * 2 - 1,
          -((e.clientY - box.top) / box.height) * 2 + 1
        );
        raycaster.setFromCamera(mouseVec, camera);

        const hits = raycaster.intersectObjects(sculpture.cards, true);
        for (const hit of hits) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr && curr.userData?.mediaId === undefined) {
            curr = curr.parent;
          }
          if (curr?.userData?.mediaId) {
            const item = mediaById.get(curr.userData.mediaId);
            if (item) {
              onOpenViewer(item);
              break;
            }
          }
        }
      };

      canvas.addEventListener("pointerdown", handlePointerDown, { passive: true });
      canvas.addEventListener("pointerup", handlePointerUp, { passive: true });

      // Resize
      const resize = () => {
        if (dead || !renderer) return;
        const box = host.getBoundingClientRect();
        const width = Math.max(1, Math.round(box.width));
        const height = Math.max(1, Math.round(box.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const mat = backdrop.material as THREE.ShaderMaterial;
        mat.uniforms.uAspect.value = camera.aspect;
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // Render loop & scroll handling
      let lastTime = 0;
      let totalElapsed = 0;
      let targetProgress = 0;
      let currentProgress = 0;
      let lastTrackedIndex = -1;

      const handleScroll = () => {
        const rect = section.getBoundingClientRect();
        const total = Math.max(1, section.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / total));
        targetProgress = progress;
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      const animate = (now: number) => {
        if (dead || !renderer) return;
        const raw = lastTime ? now - lastTime : 16.667;
        const dt = Math.min(raw, 64) / 1000;
        lastTime = now;
        totalElapsed += dt;

        // Smooth camera damping towards target progress
        currentProgress += (targetProgress - currentProgress) * damping(8, dt);
        pointer.x += (target.x - pointer.x) * damping(2.7, dt);
        pointer.y += (target.y - pointer.y) * damping(2.7, dt);

        const isMobile = window.innerWidth <= 700;
        const pose = cameraPose(currentProgress, isMobile, camera.aspect);
        const activeIdx = Math.max(
          0,
          Math.min(PHOTOGRAPHS.length - 1, Math.round(tourIndex(currentProgress)))
        );

        if (activeIdx !== lastTrackedIndex) {
          lastTrackedIndex = activeIdx;
          setCurrentIndex(activeIdx);

          // Preload adjacent photographs
          [-1, 0, 1, 2].forEach((offset) => {
            const id = PHOTOGRAPHS[activeIdx + offset];
            if (id) loadPhotoTexture(id);
          });
        }

        // Section styles
        setExpansion(pose.expansion);
        setCopyOpacity(pose.copyOpacity);
        setCopyY(-smooth(0, 0.065, currentProgress) * 24);

        // Update Three.js objects
        sculpture.group.rotation.y = pose.rotation + Math.sin(totalElapsed * 0.11) * 0.009;
        sculpture.group.position.x = pose.x;

        camera.position.set(pointer.x * 0.24, pose.y + pointer.y * 0.16, pose.z);
        camera.lookAt(pose.lookX, pose.lookY, 0);

        light.position.set(
          pose.x + 4.1 * Math.sin(totalElapsed * 0.16 + 0.8),
          pose.y + 2.5,
          8.5 + Math.cos(totalElapsed * 0.12)
        );

        const mat = backdrop.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = totalElapsed;
        mat.uniforms.uProgress.value = currentProgress;
        mat.uniforms.uPointer.value.set(pointer.x, pointer.y);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };

      raf = requestAnimationFrame(animate);

      return () => {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("scroll", handleScroll);
        section.removeEventListener("pointermove", handlePointerMove);
        section.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointerup", handlePointerUp);
        ro.disconnect();
        resources.forEach((r) => r.dispose());
        resources.clear();
        if (renderer) {
          renderer.dispose();
          renderer.domElement.remove();
        }
      };
    } catch {
      setFailed(true);
      return () => {};
    }
  }, [reducedMotion, mediaById, onOpenViewer]);

  return (
    <section
      ref={sectionRef}
      className={`architecture-chapter cinema-tour ${ready ? "cinema-ready" : ""} ${
        reducedMotion ? "cinema-reduced" : ""
      } ${failed ? "cinema-fallback" : ""}`}
      id="perspectiva"
      aria-labelledby="architecture-title"
      style={
        {
          height: reducedMotion ? "100svh" : "700vh",
          "--sculpture-expansion": String(expansion),
          "--sculpture-copy": String(copyOpacity),
          "--sculpture-copy-y": `${copyY}px`,
        } as React.CSSProperties
      }
    >
      <div className="architecture-sticky">
        <div ref={hostRef} className="architectural-depth" aria-hidden="true">
          {/* Static fallback image */}
          <img
            className="architecture-still"
            src={
              currentMedia?.texture ||
              "/assets/acervo/estar-integrado-horizontal-1280.webp"
            }
            alt=""
            decoding="async"
            style={{ objectPosition: currentMedia?.position || "center" }}
          />
        </div>

        {/* Section title & introductory caption */}
        <div
          className="architecture-copy section-wrap"
          style={{
            opacity: copyOpacity,
            transform: `translateY(${copyY}px)`,
            pointerEvents: copyOpacity < 0.1 ? "none" : "auto",
          }}
        >
          <p className="eyebrow">ARQUITETURA · LUZ · VIDA</p>
          <h2 id="architecture-title">
            Uma nova
            <br />
            <em>perspectiva.</em>
          </h2>
          <p className="architecture-caption">
            O olhar encontra
            <br />
            outra forma de viver.
          </p>
        </div>

        {/* Top bar indicators */}
        <div className="architecture-bottom section-wrap">
          <span>AZIMUTE / EXPERIÊNCIA</span>
          <span className="architecture-scroll">
            DESÇA PARA EXPLORAR <i aria-hidden="true">↓</i>
          </span>
          <span>Composição artística</span>
        </div>

        {/* 3D Helical Tour Controls */}
        <div
          className="architecture-controls"
          aria-label="Explorar as 17 imagens do Azimute"
        >
          <div className="architecture-photo-caption">
            <span className="architecture-count">
              {String(currentIndex + 1).padStart(2, "0")} / {PHOTOGRAPHS.length}
            </span>
            <span className="architecture-photo-title">
              {currentMedia?.title || "Perspectiva artística"}
            </span>
          </div>

          <progress
            className="architecture-progress"
            max={PHOTOGRAPHS.length}
            value={currentIndex + 1}
            aria-label="Imagem atual da experiência"
            aria-valuetext={`Imagem ${currentIndex + 1} de ${PHOTOGRAPHS.length}: ${
              currentMedia?.title || ""
            }`}
          />

          <div className="architecture-actions">
            <button
              type="button"
              className="architecture-step architecture-previous"
              aria-label="Imagem anterior"
              disabled={currentIndex === 0}
              onClick={handlePrev}
            >
              ←
            </button>

            <label className="architecture-select-label">
              Escolher imagem
              <select
                className="architecture-select"
                aria-label="Escolher uma das 17 imagens"
                value={currentIndex}
                onChange={(e) => handleSelect(Number(e.target.value))}
              >
                {PHOTOGRAPHS.map((id, idx) => {
                  const item = mediaById.get(id);
                  return (
                    <option key={id} value={idx}>
                      {String(idx + 1).padStart(2, "0")} · {item?.title || "Imagem"}
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="button"
              className="architecture-step architecture-next"
              aria-label="Próxima imagem"
              disabled={currentIndex === PHOTOGRAPHS.length - 1}
              onClick={handleNext}
            >
              →
            </button>

            <button
              type="button"
              className="architecture-open-photo"
              aria-haspopup="dialog"
              aria-label={`Ampliar imagem ${currentIndex + 1} de ${
                PHOTOGRAPHS.length
              }: ${currentMedia?.title || ""}`}
              onClick={() => {
                if (currentMedia) onOpenViewer(currentMedia);
              }}
            >
              Ampliar imagem
            </button>
          </div>

          <button
            type="button"
            className="architecture-skip"
            aria-label="Pular a experiência e continuar no site"
            onClick={handleSkip}
          >
            Continuar no site ↓
          </button>

          <span className="architecture-status" role="status">
            Imagem {currentIndex + 1} de {PHOTOGRAPHS.length}.{" "}
            {currentMedia?.title || ""}
          </span>
        </div>
      </div>
    </section>
  );
}
