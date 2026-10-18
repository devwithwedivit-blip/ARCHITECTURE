import * as THREE from './vendor/three.module.min.js';

export const PHOTOGRAPHS = Object.freeze([
  22, 16, 17, 15, 13, 8, 21, 24, 19, 3, 4, 23, 26, 31, 30, 29, 32,
]);

export const HELIX = Object.freeze({
  step: 1.12,
  pitch: 3.05,
  top: 24.4,
  radius: 5.25,
  width: 7.8,
  height: (7.8 * 941) / 1672,
});

export const clamp = THREE.MathUtils.clamp;

export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const damping = (speed, dt) => 1 - Math.exp(-speed * dt);

export function railPoint(angle, inset = 0) {
  const r = 2.2 + 0.23 * Math.sin(angle * 0.68) - inset;
  return new THREE.Vector3(
    Math.sin(angle) * r,
    HELIX.top - (angle / HELIX.step) * HELIX.pitch,
    Math.cos(angle) * r
  );
}

// Closed, bevelled ribbon geometry winding along the helical rail
export function makeRibbon(
  inset = 0,
  halfWidth = 0.48,
  halfDepth = 0.105
) {
  const steps = 360;
  const start = -0.65;
  const end = (PHOTOGRAPHS.length - 1) * HELIX.step + 0.75;
  const b = Math.min(0.035, halfDepth * 0.4);
  const profile = [
    [-halfWidth + b, -halfDepth],
    [halfWidth - b, -halfDepth],
    [halfWidth, -halfDepth + b],
    [halfWidth, halfDepth - b],
    [halfWidth - b, halfDepth],
    [-halfWidth + b, halfDepth],
    [-halfWidth, halfDepth - b],
    [-halfWidth, -halfDepth + b],
  ];

  const vertices = [];
  const uvs = [];
  const indices = [];
  const tangent = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const binormal = new THREE.Vector3();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = THREE.MathUtils.lerp(start, end, t);
    const c = railPoint(a, inset);
    tangent
      .copy(railPoint(a + 0.001, inset))
      .sub(railPoint(a - 0.001, inset))
      .normalize();
    radial.set(Math.sin(a), 0, Math.cos(a));
    binormal.crossVectors(tangent, radial).normalize();

    for (const [x, y] of profile) {
      const p = c
        .clone()
        .addScaledVector(radial, x)
        .addScaledVector(binormal, y);
      vertices.push(p.x, p.y, p.z);
      uvs.push(t, (x / halfWidth + 1) / 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  for (let side = 0; side < 8; side++) {
    const offset = indices.length;
    for (let i = 0; i < steps; i++) {
      const a = i * 8 + side;
      const b = i * 8 + ((side + 1) % 8);
      const c = a + 8;
      const d = b + 8;
      indices.push(a, c, b, b, c, d);
    }
    geometry.addGroup(offset, indices.length - offset, side === 0 || side === 4 ? 1 : 0);
  }

  const capOffset = indices.length;
  for (let j = 1; j < 7; j++) {
    indices.push(0, j, j + 1);
    const n = steps * 8;
    indices.push(n, n + j + 1, n + j);
  }
  geometry.addGroup(capOffset, indices.length - capOffset, 0);

  for (let i = 0; i < indices.length; i += 3) {
    const next = indices[i + 1];
    indices[i + 1] = indices[i + 2];
    indices[i + 2] = next;
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function roundedPath(width, height, radius) {
  const p = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = radius;
  p.moveTo(x + r, y);
  p.lineTo(x + width - r, y);
  p.quadraticCurveTo(x + width, y, x + width, y + r);
  p.lineTo(x + width, y + height - r);
  p.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  p.lineTo(x + r, y + height);
  p.quadraticCurveTo(x, y + height, x, y + height - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
  return p;
}

function makeGrain() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 7251;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = Math.round(
        186 + ((seed / 4294967296) - 0.5) * 24 + Math.sin(y * 0.86) * 8
      );
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 2);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createSculpture(photoTextures, own = (r) => r) {
  const group = new THREE.Group();
  const grain = own(makeGrain());

  const bronze = own(
    new THREE.MeshPhysicalMaterial({
      color: 0xb18b62,
      metalness: 0.86,
      roughness: 0.28,
      roughnessMap: grain,
      clearcoat: 0.7,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.35,
    })
  );

  const shadowMetal = own(
    new THREE.MeshStandardMaterial({
      color: 0x252827,
      metalness: 0.66,
      roughness: 0.32,
      roughnessMap: grain,
    })
  );

  const crystal = own(
    new THREE.MeshPhysicalMaterial({
      color: 0xf5f5ed,
      metalness: 0,
      roughness: 0.065,
      transmission: 0.94,
      thickness: 0.48,
      ior: 1.46,
      attenuationColor: new THREE.Color(0xc0d2d1),
      attenuationDistance: 7,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      envMapIntensity: 1.7,
    })
  );

  const cutEdge = own(
    new THREE.MeshPhysicalMaterial({
      color: 0xe6d5b8,
      metalness: 0.18,
      roughness: 0.1,
      transmission: 0.65,
      thickness: 0.18,
      ior: 1.5,
      clearcoat: 1,
      envMapIntensity: 2,
    })
  );

  // Outer primary crystal spiral ribbon
  const mainRibbonMesh = new THREE.Mesh(own(makeRibbon(0, 0.62, 0.19)), [
    cutEdge,
    crystal,
  ]);
  group.add(mainRibbonMesh);

  // Inner secondary bronze structural rail
  const innerRailMesh = new THREE.Mesh(own(makeRibbon(0.59, 0.055, 0.06)), [
    shadowMetal,
    bronze,
  ]);
  group.add(innerRailMesh);

  // Card frame & geometries
  const frameShape = roundedPath(HELIX.width + 0.16, HELIX.height + 0.16, 0.075);
  const hole = roundedPath(HELIX.width - 0.035, HELIX.height - 0.035, 0.024);
  frameShape.holes.push(hole);

  const frameGeometry = own(
    new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.22,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.023,
      bevelThickness: 0.025,
      curveSegments: 4,
    })
  );
  frameGeometry.translate(0, 0, -0.11);

  const photoGeometry = own(
    new THREE.PlaneGeometry(HELIX.width - 0.02, HELIX.height - 0.02)
  );
  const backGeometry = own(
    new THREE.BoxGeometry(HELIX.width - 0.012, HELIX.height - 0.012, 0.2)
  );
  const glass = own(
    new THREE.MeshPhysicalMaterial({
      color: 0xe0dacf,
      metalness: 0.12,
      roughness: 0.16,
      transparent: true,
      opacity: 0.025,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      depthWrite: false,
      envMapIntensity: 1.1,
    })
  );

  const armGeometry = own(new THREE.CylinderGeometry(0.044, 0.044, 1, 8));
  const cards = [];

  PHOTOGRAPHS.forEach((id, index) => {
    const texture = photoTextures.get(id) || null;
    const angle = index * HELIX.step;
    const card = new THREE.Group();
    card.userData = { mediaId: id, photoIndex: index };

    card.position.set(
      Math.sin(angle) * HELIX.radius,
      HELIX.top - index * HELIX.pitch,
      Math.cos(angle) * HELIX.radius
    );
    card.rotation.y = angle;

    card.add(new THREE.Mesh(frameGeometry, crystal));
    card.add(new THREE.Mesh(backGeometry, shadowMetal));

    const photoMaterial = own(
      new THREE.MeshBasicMaterial({
        map: texture,
        color: texture ? 0xffffff : 0x253531,
      })
    );
    card.userData.photoMaterial = photoMaterial;

    const photo = new THREE.Mesh(photoGeometry, photoMaterial);
    photo.position.z = 0.14;
    card.add(photo);

    const reversePhoto = new THREE.Mesh(photoGeometry, photoMaterial);
    reversePhoto.position.z = -0.14;
    reversePhoto.rotation.y = Math.PI;
    card.add(reversePhoto);

    const glaze = new THREE.Mesh(photoGeometry, glass);
    glaze.position.z = 0.145;
    card.add(glaze);

    group.add(card);
    cards.push(card);

    // Support arm linking photo card to the central spiral rail
    const anchor = railPoint(angle);
    const direction = card.position.clone().sub(anchor);
    const arm = new THREE.Mesh(armGeometry, bronze);
    arm.position.copy(anchor).addScaledVector(direction, 0.5);
    arm.scale.y = direction.length();
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(arm);
  });

  return {
    group,
    cards,
    setTexture(id, texture) {
      const card = cards.find((c) => c.userData.mediaId === id);
      if (!card) return;
      const material = card.userData.photoMaterial;
      const hadMap = Boolean(material.map);
      material.map = texture || null;
      material.color.set(texture ? 0xffffff : 0x253531);
      if (hadMap !== Boolean(texture)) {
        material.needsUpdate = true;
      }
    },
  };
}

export function tourIndex(progress) {
  const travel = clamp((progress - 0.075) / 0.87, 0, 1) * (PHOTOGRAPHS.length - 1);
  const floor = Math.floor(travel);
  const fraction = travel - floor;
  return floor + smooth(0.18, 0.82, fraction);
}

export const progressForPhoto = (index) =>
  0.075 + (0.87 * clamp(index, 0, PHOTOGRAPHS.length - 1)) / (PHOTOGRAPHS.length - 1);

export function cameraPose(progress, mobileOrOptions = false, fallbackAspect = 1.78) {
  let aspect, width, height;
  if (typeof mobileOrOptions === 'object' && mobileOrOptions !== null) {
    width = mobileOrOptions.width || 1280;
    height = mobileOrOptions.height || 800;
    aspect = mobileOrOptions.aspect || (width / Math.max(1, height));
  } else {
    aspect = fallbackAspect;
    width = mobileOrOptions ? 390 : 1280;
    height = mobileOrOptions ? 844 : 800;
  }
  const safeAspect = Math.max(0.35, aspect);
  // Continuous frameScale derived smoothly from container aspect ratio:
  // Narrow portrait (aspect ~0.45-0.75): ~0.74
  // Wide desktop (aspect >= 1.6): ~0.60
  // Clamped with sensible min (0.55) and max (0.76)
  const tAspect = clamp((safeAspect - 0.6) / 1.0, 0, 1);
  const frameScale = clamp(THREE.MathUtils.lerp(0.74, 0.60, tAspect), 0.55, 0.76);

  const enter = smooth(0, 0.08, progress);
  const exit = smooth(0.96, 1, progress);
  const index = tourIndex(progress);
  const y = HELIX.top - index * HELIX.pitch;
  const tan = Math.tan((40 * Math.PI) / 360);
  const distance = Math.max(
    HELIX.width / (2 * tan * safeAspect * frameScale),
    HELIX.height / (2 * tan * 0.54)
  );

  const lateralOffset = THREE.MathUtils.lerp(0.4, 1.2, tAspect);
  const lookYOffset = THREE.MathUtils.lerp(0.38, 0.20, tAspect);

  return {
    index,
    rotation: -index * HELIX.step,
    x: lateralOffset * (1 - enter),
    y,
    z: HELIX.radius + distance + 2.4 * (1 - enter) + 1.2 * exit,
    lookX: 0,
    lookY: y + lookYOffset,
    copyOpacity: 1 - smooth(0.005, 0.07, progress),
    expansion: enter,
    frameScale,
    tAspect,
  };
}

export function makeBackdrop(own = (r) => r) {
  const material = own(
    new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uTexture: { value: null },
        uHasTexture: { value: 0 },
        uAspect: { value: 1.78 },
        uImageAspect: { value: 1.777 },
        uPointer: { value: new THREE.Vector2() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform sampler2D uTexture;
        uniform float uHasTexture;
        uniform float uAspect;
        uniform float uImageAspect;
        uniform vec2 uPointer;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;
          float ratio = uAspect / uImageAspect;
          vec2 crop = ratio > 1.0 ? vec2(1.0, 1.0 / ratio) : vec2(ratio, 1.0);
          vec2 focus = vec2(mix(0.5, 0.65, 1.0 - smoothstep(0.7, 1.4, uAspect)), 0.5);
          float approach = 1.0 - 0.12 * uProgress - 0.012 * sin(uTime * 0.09);
          vec2 sampleUv = focus + (uv - 0.5) * crop * approach + uPointer * vec2(0.006, 0.004);

          vec3 base = mix(
            vec3(0.011, 0.016, 0.018),
            texture2D(uTexture, clamp(sampleUv, vec2(0.001), vec2(0.999))).rgb,
            uHasTexture
          );

          vec3 light = vec3(0.0);
          for (int i = 0; i < 3; i++) {
            float depth = float(i) + 1.0;
            vec2 q = (uv - vec2(0.65, 0.38)) * vec2(uAspect, 1.0);
            q += uPointer * 0.007 / depth;
            float ray = q.x + q.y * (0.23 + depth * 0.17) + sin(uTime * (0.045 + depth * 0.009) + depth) * 0.1;
            float veil = exp(-ray * ray * (26.0 + depth * 17.0));
            float height = exp(-pow((q.y - 0.06 * sin(uTime * 0.037 + depth)) * (1.4 + depth * 0.35), 2.0));
            light += mix(vec3(0.04, 0.025, 0.012), vec3(0.008, 0.026, 0.035), float(i) * 0.5) * veil * height / depth;
          }

          base *= mix(0.63, 0.94, smoothstep(0.1, 0.65, uv.x));
          base += light * 0.7;
          base *= 1.0 - 0.16 * smoothstep(0.4, 0.95, length((uv - 0.5) * vec2(0.8, 1.0)));
          base += (hash(floor(sampleUv * vec2(1672.0, 941.0))) - 0.5) * 0.0006;
          gl_FragColor = vec4(base, 1.0);
        }
      `,
    })
  );

  const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(2, 2)), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}
