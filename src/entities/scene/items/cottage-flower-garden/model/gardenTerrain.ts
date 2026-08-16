import type { FirstPersonConfig } from "@/shared/three";
import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  getCottageBuiltWalkSurfaceHeight,
  isCottageFlowerGardenWalkable,
  type GroundPoint,
} from "./gardenLayout";

export interface GardenTerrainMeshData {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

export const COTTAGE_FLOWER_GARDEN_NATURE = {
  terrain: {
    seed: 46_831,
    width: 1_200,
    length: 1_200,
    segments: 256,
    transitionMeters: 6,
    broadAmplitude: 7.6,
    detailAmplitude: 0.42,
    fullyFoggedBeforeEdge: true,
  },
  surface: {
    variationSeed: 71_903,
    macroFrequency: 0.032,
    detailFrequency: 0.24,
    roughnessMin: 0.94,
    roughnessMax: 1,
    normalStrength: 0.012,
  },
  turf: {
    representation: "continuous-clipped-turf",
    individualBladeGeometry: false,
    visualHeightMeters: 0.035,
    textureRepeat: 92,
    roughnessRepeat: 148,
    mowingStripeWidthMeters: 5.5,
  },
} as const;

/**
 * 远景不是第三套花田贴图，而是同一生境统计在亚像素尺度下形成的综合色薄雾。
 * 这些上限确保绿色与草皮纹理始终占主导，花色只提供克制的群落偏色。
 */
export const COTTAGE_GARDEN_FAR_MEADOW_PROFILE = {
  representation: "textured-green-canopy-subtle-chroma-veil",
  preserveTurfAlbedo: true,
  albedoRetention: 0.5,
  macroFrequency: 0.018,
  mesoFrequency: 0.046,
  speciesWeightFloor: 0.42,
  speciesTintMix: 0.34,
  maximumAggregateBlend: 0.4,
  maximumEffectiveFlowerColorInfluence: 0.136,
  chromaFadeStartMeters: 180,
  chromaFadeEndMeters: 360,
  chromaRetentionAtHorizon: 0.56,
  contrastCompressionStartMeters: 32,
  contrastCompressionEndMeters: 150,
  manualFogMix: false,
} as const;

const UINT32_RANGE = 4_294_967_296;
const halfGardenWidth = COTTAGE_FLOWER_GARDEN_LAYOUT.garden.width / 2;
const halfGardenLength = COTTAGE_FLOWER_GARDEN_LAYOUT.garden.length / 2;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function mixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function lattice(seed: number, x: number, z: number) {
  return (
    mixBits(
      seed ^ Math.imul(x | 0, 73_856_093) ^ Math.imul(z | 0, 19_349_663),
    ) / UINT32_RANGE
  );
}

export function sampleCottageGardenValueNoise(
  seed: number,
  x: number,
  z: number,
) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(0, 1, x - x0);
  const tz = smoothstep(0, 1, z - z0);
  const lower = mix(lattice(seed, x0, z0), lattice(seed, x0 + 1, z0), tx);
  const upper = mix(
    lattice(seed, x0, z0 + 1),
    lattice(seed, x0 + 1, z0 + 1),
    tx,
  );
  return mix(lower, upper, tz);
}

export function sampleCottageGardenFbm(
  seed: number,
  x: number,
  z: number,
  octaves = 4,
) {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let weight = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total +=
      sampleCottageGardenValueNoise(
        seed + octave * 1_013,
        x * frequency,
        z * frequency,
      ) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / weight;
}

export function distanceFromCottageGardenCourt(point: GroundPoint) {
  const outsideX = Math.max(Math.abs(point.x) - halfGardenWidth, 0);
  const outsideZ = Math.max(Math.abs(point.z) - halfGardenLength, 0);
  return Math.hypot(outsideX, outsideZ);
}

/** 地形网格与第一人称眼高共同使用这一高度权威。 */
export function sampleCottageFlowerGardenTerrainHeight(x: number, z: number) {
  const { terrain } = COTTAGE_FLOWER_GARDEN_NATURE;
  const distance = distanceFromCottageGardenCourt({ x, z });
  if (distance <= 0) return 0;

  const broad =
    sampleCottageGardenFbm(terrain.seed, x * 0.018, z * 0.018) - 0.5;
  const detail =
    sampleCottageGardenFbm(terrain.seed + 12_211, x * 0.074, z * 0.074) - 0.5;
  const rolling =
    Math.sin(x * 0.026 + 0.8) * Math.cos(z * 0.019 - 1.3) * 0.46 +
    Math.sin((x - z) * 0.013 - 0.4) * 0.28;
  const flatTransition = smoothstep(0, terrain.transitionMeters, distance);
  return (
    (broad * terrain.broadAmplitude +
      detail * terrain.detailAmplitude +
      rolling * 1.42) *
    flatTransition
  );
}

export function sampleCottageGardenSurfaceVariation(x: number, z: number) {
  const { surface } = COTTAGE_FLOWER_GARDEN_NATURE;
  const macro = sampleCottageGardenFbm(
    surface.variationSeed,
    x * surface.macroFrequency,
    z * surface.macroFrequency,
  );
  const detail = sampleCottageGardenFbm(
    surface.variationSeed + 4_099,
    x * surface.detailFrequency,
    z * surface.detailFrequency,
    3,
  );
  return clamp(macro * 0.72 + detail * 0.28, 0, 1);
}

export function createCottageGardenTerrainMeshData(
  segments: number = COTTAGE_FLOWER_GARDEN_NATURE.terrain.segments,
): GardenTerrainMeshData {
  if (!Number.isInteger(segments) || segments < 2) {
    throw new Error("地形分段数必须是至少为 2 的整数");
  }

  const { width, length } = COTTAGE_FLOWER_GARDEN_NATURE.terrain;
  const stride = segments + 1;
  const vertexCount = stride * stride;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices =
    vertexCount <= 65_536
      ? new Uint16Array(segments * segments * 6)
      : new Uint32Array(segments * segments * 6);
  let vertexOffset = 0;
  let uvOffset = 0;

  for (let row = 0; row <= segments; row += 1) {
    const zProgress = row / segments;
    const z = (zProgress - 0.5) * length;
    for (let column = 0; column <= segments; column += 1) {
      const xProgress = column / segments;
      const x = (xProgress - 0.5) * width;
      positions[vertexOffset] = x;
      positions[vertexOffset + 1] = sampleCottageFlowerGardenTerrainHeight(x, z);
      positions[vertexOffset + 2] = z;
      uvs[uvOffset] = xProgress;
      uvs[uvOffset + 1] = zProgress;
      vertexOffset += 3;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const lowerLeft = row * stride + column;
      const lowerRight = lowerLeft + 1;
      const upperLeft = lowerLeft + stride;
      const upperRight = upperLeft + 1;
      indices.set(
        [lowerLeft, upperLeft, lowerRight, lowerRight, upperLeft, upperRight],
        indexOffset,
      );
      indexOffset += 6;
    }
  }

  return {
    positions,
    uvs,
    indices,
    vertexCount,
    triangleCount: indices.length / 3,
  };
}

export const COTTAGE_FLOWER_GARDEN_FIRST_PERSON: FirstPersonConfig = {
  spawn: [...COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.spawn],
  eyeHeight: COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
  bounds: {
    minX: -60,
    maxX: 60,
    minZ: -60,
    maxZ: 60,
  },
  isPositionAllowed: isCottageFlowerGardenWalkable,
  groundHeightAt: ({ x, z }) =>
    getCottageBuiltWalkSurfaceHeight({ x, z }) ??
    sampleCottageFlowerGardenTerrainHeight(x, z),
};
