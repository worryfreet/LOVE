import type { WildflowerSpeciesId } from "../../../../model/worker";

export type CottageGardenFlowerLayerId =
  | "courtyard"
  | "near"
  | "middle"
  | "far-silhouette";

export interface CottageGardenFlowerLayerSpec {
  readonly id: CottageGardenFlowerLayerId;
  readonly domain: "courtyard" | "outer-meadow";
  readonly cameraWrapped: boolean;
  readonly distanceFade: boolean;
  readonly fieldSizeMeters: number;
  readonly candidatesPerSquareMeterPerSpecies: number;
  readonly fadeInMeters: readonly [number, number];
  readonly fadeOutMeters: readonly [number, number];
  readonly geometryDetail: "individual" | "upright-cluster";
}

export interface CottageGardenFlowerInstanceData {
  /** 每株只存周期单元内的 x/z 根点。 */
  readonly roots: Float32Array;
  /** yaw / heightNoise / widthNoise / phase。 */
  readonly shapes: Float32Array;
  readonly count: number;
}

/**
 * courtyard 是固定世界空间的高质量核心景观；外部 near / middle / far-silhouette
 * 围绕相机周期环绕。所有层移动时只更新 uniform，不重建、不上传 4×4 矩阵。
 */
export const COTTAGE_GARDEN_FLOWER_LAYERS = [
  {
    id: "courtyard",
    domain: "courtyard",
    cameraWrapped: false,
    distanceFade: false,
    fieldSizeMeters: 40,
    // 此值会为三种花各生成一份完整候选几何；按总花量反推单物种预算，
    // 避免被生境着色器隐藏的候选仍占用顶点处理吞吐。
    candidatesPerSquareMeterPerSpecies: 1.1,
    fadeInMeters: [0, 0],
    fadeOutMeters: [1_000, 1_001],
    geometryDetail: "individual",
  },
  {
    id: "near",
    domain: "outer-meadow",
    cameraWrapped: true,
    distanceFade: true,
    fieldSizeMeters: 72,
    candidatesPerSquareMeterPerSpecies: 0.85,
    fadeInMeters: [0, 0],
    fadeOutMeters: [18, 32],
    geometryDetail: "individual",
  },
  {
    id: "middle",
    domain: "outer-meadow",
    cameraWrapped: true,
    distanceFade: true,
    fieldSizeMeters: 192,
    candidatesPerSquareMeterPerSpecies: 0.06,
    fadeInMeters: [18, 32],
    fadeOutMeters: [42, 72],
    geometryDetail: "upright-cluster",
  },
  {
    id: "far-silhouette",
    domain: "outer-meadow",
    cameraWrapped: true,
    distanceFade: true,
    fieldSizeMeters: 280,
    candidatesPerSquareMeterPerSpecies: 0.002,
    fadeInMeters: [50, 72],
    fadeOutMeters: [78, 92],
    geometryDetail: "upright-cluster",
  },
] as const satisfies readonly CottageGardenFlowerLayerSpec[];

/**
 * 两段都保留完整重叠区：退出层与进入层使用同一 smoothstep 曲线互补交接，
 * 再叠加稳定实例随机数，行走时不会出现环状密度峰、空带或整批跳变。
 */
export const COTTAGE_GARDEN_MEADOW_TRANSITION_ZONES = {
  nearToMiddle: {
    startMeters: 18,
    endMeters: 32,
    strategy: "overlap-complementary-stable-dither",
  },
  middleToFar: {
    startMeters: 42,
    endMeters: 72,
    strategy: "overlap-cluster-silhouette-mip-aggregate",
  },
} as const;

export const COTTAGE_GARDEN_FLOWER_LAYER_IDS = COTTAGE_GARDEN_FLOWER_LAYERS.map(
  (layer) => layer.id,
);

export const COTTAGE_GARDEN_WILDFLOWER_MEADOW = {
  seed: 83_917,
  rootOffsetMeters: 0.006,
  coverage: "shared-habitat-field",
  updateMode: "camera-uniform-only",
  instanceUploadBytesPerFrame: 0,
  geometryBatches: {
    grass: 3,
    flowers: 12,
  },
  lodObjectName: "meadow.outer-wildflower-lawn",
} as const;

/** 每种结构保留辨识度，同时收敛到不刺眼的柔和自然色族。 */
export const COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES = {
  "wild-daisy": ["#f5f1df", "#e7d6a3"],
  "pink-cosmos": ["#e68cae", "#bd8bc8", "#e8958a"],
  "blue-cornflower": ["#79a4d4", "#8d8bc2"],
} as const satisfies Record<WildflowerSpeciesId, readonly string[]>;

const UINT32_RANGE = 4_294_967_296;
const SPECIES_SEED_OFFSET: Record<WildflowerSpeciesId, number> = {
  "wild-daisy": 11_003,
  "pink-cosmos": 23_011,
  "blue-cornflower": 37_019,
};

function mixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function stableUnit(seed: number, index: number, channel: number) {
  return (
    mixBits(
      seed ^
        Math.imul(index + 1, 0x9e3779b1) ^
        Math.imul(channel + 1, 0x85ebca77),
    ) / UINT32_RANGE
  );
}

function halton(index: number, base: number) {
  let fraction = 1;
  let result = 0;
  let cursor = index;
  while (cursor > 0) {
    fraction /= base;
    result += fraction * (cursor % base);
    cursor = Math.floor(cursor / base);
  }
  return result;
}

export function resolveCottageGardenFlowerLayerInstanceCount(
  layer: CottageGardenFlowerLayerSpec,
) {
  return Math.round(
    layer.fieldSizeMeters *
      layer.fieldSizeMeters *
      layer.candidatesPerSquareMeterPerSpecies,
  );
}

/** 稳定低差异根点避免块状网格，同时维持固定显存占用。 */
export function createCottageGardenFlowerInstanceData(
  layer: CottageGardenFlowerLayerSpec,
  species: WildflowerSpeciesId,
  seed: number = COTTAGE_GARDEN_WILDFLOWER_MEADOW.seed,
): CottageGardenFlowerInstanceData {
  const count = resolveCottageGardenFlowerLayerInstanceCount(layer);
  const roots = new Float32Array(count * 2);
  const shapes = new Float32Array(count * 4);
  const layerSeed =
    seed +
    SPECIES_SEED_OFFSET[species] +
    (layer.id === "courtyard"
      ? 19_997
      : layer.id === "near"
        ? 41_021
        : layer.id === "middle"
          ? 67_039
          : 89_077);
  const halfSize = layer.fieldSizeMeters / 2;
  const normalizedJitter = 0.72 / Math.sqrt(count);

  for (let index = 0; index < count; index += 1) {
    const jitterX =
      (stableUnit(layerSeed, index, 0) - 0.5) * normalizedJitter;
    const jitterZ =
      (stableUnit(layerSeed, index, 1) - 0.5) * normalizedJitter;
    roots[index * 2] =
      (halton(index + 1, 2) + jitterX) * layer.fieldSizeMeters - halfSize;
    roots[index * 2 + 1] =
      (halton(index + 1, 3) + jitterZ) * layer.fieldSizeMeters - halfSize;
    shapes[index * 4] = stableUnit(layerSeed, index, 2) * Math.PI * 2;
    shapes[index * 4 + 1] = stableUnit(layerSeed, index, 3);
    shapes[index * 4 + 2] = stableUnit(layerSeed, index, 4);
    shapes[index * 4 + 3] = stableUnit(layerSeed, index, 5) * Math.PI * 2;
  }

  return { roots, shapes, count };
}
