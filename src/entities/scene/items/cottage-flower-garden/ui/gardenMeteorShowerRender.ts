import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  ShaderMaterial,
} from "three";
import {
  COTTAGE_GARDEN_METEORS,
  sampleCottageGardenMeteor,
  sampleCottageGardenMeteorAblation,
} from "../model/gardenSkyAnimation";

const METEOR_TRAIL_SEGMENTS = 32;
const METEOR_FRAGMENT_SLOTS = 4;

export const COTTAGE_GARDEN_METEOR_TRAIL_RENDER_OFFSETS = [
  [0, 0, 0],
  [-0.55, 0.38, 0],
  [0.55, -0.38, 0],
] as const;

const meteorTrailVertexShader = /* glsl */ `
  attribute vec3 color;
  attribute float aOpacity;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vColor = color;
    vOpacity = aOpacity;
  }
`;

const meteorTrailFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    float opacity = clamp(vOpacity, 0.0, 1.0);
    if (opacity < 0.008) discard;
    vec3 radiance = vColor * (0.72 + opacity * 3.2);
    gl_FragColor = vec4(radiance, opacity * 0.96);
  }
`;

const meteorPointVertexShader = /* glsl */ `
  attribute vec3 color;
  attribute float aSize;
  attribute float aOpacity;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float perspectiveSize = 440.0 / max(1.0, -viewPosition.z);
    gl_PointSize = max(2.0, aSize * uPixelRatio * perspectiveSize);
    gl_Position = projectionMatrix * viewPosition;
    vColor = color;
    vOpacity = aOpacity;
  }
`;

const meteorPointFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float core = 1.0 - smoothstep(0.035, 0.2, radius);
    float halo = 1.0 - smoothstep(0.16, 0.5, radius);
    float opacity = (core * 0.96 + halo * 0.34) * clamp(vOpacity, 0.0, 1.0);
    if (opacity < 0.008) discard;
    gl_FragColor = vec4(vColor * (0.9 + core * 4.2), opacity);
  }
`;

export interface CottageGardenMeteorRenderBundle {
  readonly trailGeometry: BufferGeometry;
  readonly headGeometry: BufferGeometry;
  readonly fragmentGeometry: BufferGeometry;
  readonly trailMaterial: ShaderMaterial;
  readonly pointMaterial: ShaderMaterial;
}

function stableUnit(meteorIndex: number, slotIndex: number, salt: number) {
  const value = Math.sin(
    (meteorIndex + 1) * 91.73 + (slotIndex + 1) * 47.17 + salt * 13.31,
  ) * 43_758.5453;
  return value - Math.floor(value);
}

function createTrailGeometry() {
  const vertexCount =
    COTTAGE_GARDEN_METEORS.length * METEOR_TRAIL_SEGMENTS * 2;
  const geometry = new BufferGeometry();
  const positions = new BufferAttribute(new Float32Array(vertexCount * 3), 3);
  const colors = new BufferAttribute(new Float32Array(vertexCount * 3), 3);
  const opacities = new BufferAttribute(new Float32Array(vertexCount), 1);
  positions.setUsage(DynamicDrawUsage);
  opacities.setUsage(DynamicDrawUsage);
  COTTAGE_GARDEN_METEORS.forEach((meteor, meteorIndex) => {
    const firstVertex = meteorIndex * METEOR_TRAIL_SEGMENTS * 2;
    for (
      let vertexOffset = 0;
      vertexOffset < METEOR_TRAIL_SEGMENTS * 2;
      vertexOffset += 1
    ) {
      colors.setXYZ(
        firstVertex + vertexOffset,
        meteor.color[0],
        meteor.color[1],
        meteor.color[2],
      );
    }
  });
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  geometry.setAttribute("aOpacity", opacities);
  geometry.name = "atmosphere.romance-sky.meteor-ablation-trails";
  return geometry;
}

function createPointGeometry(kind: "head" | "fragment") {
  const pointCount =
    kind === "head"
      ? COTTAGE_GARDEN_METEORS.length
      : COTTAGE_GARDEN_METEORS.length * METEOR_FRAGMENT_SLOTS;
  const geometry = new BufferGeometry();
  const positions = new BufferAttribute(new Float32Array(pointCount * 3), 3);
  const colors = new BufferAttribute(new Float32Array(pointCount * 3), 3);
  const sizes = new BufferAttribute(new Float32Array(pointCount), 1);
  const opacities = new BufferAttribute(new Float32Array(pointCount), 1);
  positions.setUsage(DynamicDrawUsage);
  opacities.setUsage(DynamicDrawUsage);

  if (kind === "head") {
    COTTAGE_GARDEN_METEORS.forEach((meteor, index) => {
      positions.setXYZ(
        index,
        meteor.start[0],
        meteor.start[1],
        meteor.start[2],
      );
      colors.setXYZ(index, meteor.color[0], meteor.color[1], meteor.color[2]);
      sizes.setX(index, meteor.headSize * (1.42 + meteor.brightness * 0.52));
    });
  } else {
    COTTAGE_GARDEN_METEORS.forEach((meteor, meteorIndex) => {
      for (let slot = 0; slot < METEOR_FRAGMENT_SLOTS; slot += 1) {
        const index = meteorIndex * METEOR_FRAGMENT_SLOTS + slot;
        positions.setXYZ(
          index,
          meteor.start[0],
          meteor.start[1],
          meteor.start[2],
        );
        colors.setXYZ(index, meteor.color[0], meteor.color[1], meteor.color[2]);
        sizes.setX(index, 2 + stableUnit(meteorIndex, slot, 4) * 1.15);
      }
    });
  }

  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  geometry.setAttribute("aSize", sizes);
  geometry.setAttribute("aOpacity", opacities);
  geometry.name = `atmosphere.romance-sky.meteor-${kind}s`;
  return geometry;
}

export function createCottageGardenMeteorRenderBundle(): CottageGardenMeteorRenderBundle {
  return {
    trailGeometry: createTrailGeometry(),
    headGeometry: createPointGeometry("head"),
    fragmentGeometry: createPointGeometry("fragment"),
    trailMaterial: new ShaderMaterial({
      name: "atmosphere.romance-sky.meteor-ablation-material",
      vertexShader: meteorTrailVertexShader,
      fragmentShader: meteorTrailFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
    pointMaterial: new ShaderMaterial({
      name: "atmosphere.romance-sky.meteor-kernel-material",
      vertexShader: meteorPointVertexShader,
      fragmentShader: meteorPointFragmentShader,
      uniforms: {
        uPixelRatio: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
  };
}

export function updateCottageGardenMeteorRender(
  bundle: CottageGardenMeteorRenderBundle,
  timeSeconds: number,
  visibility: number,
  pixelRatio: number,
) {
  const trailPositions = bundle.trailGeometry.getAttribute(
    "position",
  ) as BufferAttribute;
  const trailOpacities = bundle.trailGeometry.getAttribute(
    "aOpacity",
  ) as BufferAttribute;
  const headPositions = bundle.headGeometry.getAttribute(
    "position",
  ) as BufferAttribute;
  const headOpacities = bundle.headGeometry.getAttribute(
    "aOpacity",
  ) as BufferAttribute;
  const fragmentPositions = bundle.fragmentGeometry.getAttribute(
    "position",
  ) as BufferAttribute;
  const fragmentOpacities = bundle.fragmentGeometry.getAttribute(
    "aOpacity",
  ) as BufferAttribute;
  let trailVertexIndex = 0;
  let activeMeteorCount = 0;
  let activeFragmentCount = 0;

  COTTAGE_GARDEN_METEORS.forEach((meteor, meteorIndex) => {
    const sample = sampleCottageGardenMeteor(meteor, timeSeconds);
    const effectiveOpacity = sample.opacity * visibility;
    const dx = meteor.end[0] - meteor.start[0];
    const dy = meteor.end[1] - meteor.start[1];
    const dz = meteor.end[2] - meteor.start[2];
    const pathLength = Math.hypot(dx, dy, dz) || 1;
    const direction = [
      dx / pathLength,
      dy / pathLength,
      dz / pathLength,
    ] as const;
    const planarLength = Math.hypot(direction[0], direction[1]) || 1;
    const perpendicular = [
      -direction[1] / planarLength,
      direction[0] / planarLength,
      0,
    ] as const;
    const visibleTrailLength = Math.min(
      meteor.trailLength * sample.trailScale,
      pathLength * sample.progress,
    );
    const ablationAtHead = sampleCottageGardenMeteorAblation(
      meteor,
      timeSeconds,
      0,
    );

    const pointAt = (ratio: number) =>
      [
        sample.head[0] - direction[0] * visibleTrailLength * ratio,
        sample.head[1] - direction[1] * visibleTrailLength * ratio,
        sample.head[2] - direction[2] * visibleTrailLength * ratio,
      ] as const;

    let previousPoint = pointAt(0);
    let previousOpacity = effectiveOpacity * ablationAtHead.trailOpacity;
    if (effectiveOpacity > 0.001) {
      activeMeteorCount += 1;
      for (let segment = 0; segment < METEOR_TRAIL_SEGMENTS; segment += 1) {
        const endRatio = (segment + 1) / METEOR_TRAIL_SEGMENTS;
        const endPoint = pointAt(endRatio);
        const endOpacity =
          effectiveOpacity *
          sampleCottageGardenMeteorAblation(
            meteor,
            timeSeconds,
            endRatio,
          ).trailOpacity;
        trailPositions.setXYZ(trailVertexIndex, ...previousPoint);
        trailOpacities.setX(trailVertexIndex, previousOpacity);
        trailVertexIndex += 1;
        trailPositions.setXYZ(trailVertexIndex, ...endPoint);
        trailOpacities.setX(trailVertexIndex, endOpacity);
        trailVertexIndex += 1;
        previousPoint = endPoint;
        previousOpacity = endOpacity;
      }
    }

    headPositions.setXYZ(meteorIndex, ...sample.head);
    headOpacities.setX(
      meteorIndex,
      effectiveOpacity * ablationAtHead.headOpacity,
    );

    for (let slot = 0; slot < METEOR_FRAGMENT_SLOTS; slot += 1) {
      const fragmentIndex = meteorIndex * METEOR_FRAGMENT_SLOTS + slot;
      const distanceBehind =
        3.4 + slot * 3.2 + stableUnit(meteorIndex, slot, 1) * 4.8;
      const lateralOffset =
        (stableUnit(meteorIndex, slot, 2) * 2 - 1) * meteor.fragmentSpread;
      const depthOffset =
        (stableUnit(meteorIndex, slot, 3) * 2 - 1) * 0.85;
      fragmentPositions.setXYZ(
        fragmentIndex,
        sample.head[0] -
          direction[0] * distanceBehind +
          perpendicular[0] * lateralOffset,
        sample.head[1] -
          direction[1] * distanceBehind +
          perpendicular[1] * lateralOffset,
        sample.head[2] - direction[2] * distanceBehind + depthOffset,
      );
      const enabled = slot < meteor.fragmentCount;
      const slotFade = 1 - slot / METEOR_FRAGMENT_SLOTS;
      const fragmentFlicker =
        0.62 +
        stableUnit(meteorIndex, slot, Math.floor(timeSeconds * 24)) * 0.38;
      fragmentOpacities.setX(
        fragmentIndex,
        enabled
          ? effectiveOpacity *
              ablationAtHead.fragmentOpacity *
              slotFade *
              fragmentFlicker
          : 0,
      );
      if (enabled && effectiveOpacity * ablationAtHead.fragmentOpacity > 0.01) {
        activeFragmentCount += 1;
      }
    }
  });

  bundle.trailGeometry.setDrawRange(0, trailVertexIndex);
  trailPositions.needsUpdate = true;
  trailOpacities.needsUpdate = true;
  headPositions.needsUpdate = true;
  headOpacities.needsUpdate = true;
  fragmentPositions.needsUpdate = true;
  fragmentOpacities.needsUpdate = true;
  bundle.pointMaterial.uniforms.uPixelRatio.value = pixelRatio;
  return {
    activeMeteorCount,
    activeFragmentCount,
    trailVertexCount: trailVertexIndex,
  } as const;
}

export function disposeCottageGardenMeteorRender(
  bundle: CottageGardenMeteorRenderBundle,
) {
  bundle.trailGeometry.dispose();
  bundle.headGeometry.dispose();
  bundle.fragmentGeometry.dispose();
  bundle.trailMaterial.dispose();
  bundle.pointMaterial.dispose();
}

export const COTTAGE_GARDEN_METEOR_RENDER_DIAGNOSTICS = {
  trailSegmentsPerMeteor: METEOR_TRAIL_SEGMENTS,
  fragmentSlotsPerMeteor: METEOR_FRAGMENT_SLOTS,
  trailProfile: "deterministic-alpha-ablation",
  rendererRoute: "WebGLRenderer/ShaderMaterial",
} as const;
