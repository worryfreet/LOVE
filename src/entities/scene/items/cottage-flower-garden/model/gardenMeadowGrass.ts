export interface CottageGardenGrassLayerSpec {
  readonly id: "courtyard" | "near" | "middle";
  readonly domain: "courtyard" | "outer-meadow";
  readonly cameraWrapped: boolean;
  readonly distanceFade: boolean;
  readonly tuningLayer: "near" | "middle";
  readonly fieldSizeMeters: number;
  readonly clumpsPerSquareMeter: number;
  readonly fadeInMeters: readonly [number, number];
  readonly fadeOutMeters: readonly [number, number];
  readonly heightScale: readonly [number, number];
  readonly widthScale: readonly [number, number];
}

export interface CottageGardenGrassInstanceData {
  readonly roots: Float32Array;
  readonly shapes: Float32Array;
  readonly count: number;
}

/**
 * 外部花海只使用这一组低饱和绿色，避免底面、草根与草尖各自抢色。
 * 颜色从暗到亮排列；花色不受这组约束。
 */
export const COTTAGE_GARDEN_MEADOW_GREEN_PALETTE = {
  shadow: "#294b24",
  meadow: "#527d39",
  blade: "#7ba54b",
} as const;

/**
 * courtyard 固定在世界空间，避免小院随玩家距离降级；外部两层以相机为中心环绕。
 * near 扩大高频覆盖，middle 在宽重叠区接住绿色冠层并连续过渡到远景材质。
 */
export const COTTAGE_GARDEN_GRASS_LAYERS = [
  {
    id: "courtyard",
    domain: "courtyard",
    cameraWrapped: false,
    distanceFade: false,
    tuningLayer: "near",
    fieldSizeMeters: 40,
    clumpsPerSquareMeter: 30,
    fadeInMeters: [0, 0],
    fadeOutMeters: [1_000, 1_001],
    heightScale: [1.35, 5.8],
    widthScale: [7.2, 10.2],
  },
  {
    id: "near",
    domain: "outer-meadow",
    cameraWrapped: true,
    distanceFade: true,
    tuningLayer: "near",
    fieldSizeMeters: 72,
    clumpsPerSquareMeter: 28,
    fadeInMeters: [0, 0],
    fadeOutMeters: [18, 32],
    heightScale: [1.45, 6.4],
    widthScale: [8, 11],
  },
  {
    id: "middle",
    domain: "outer-meadow",
    cameraWrapped: true,
    distanceFade: true,
    tuningLayer: "middle",
    fieldSizeMeters: 160,
    clumpsPerSquareMeter: 4,
    fadeInMeters: [18, 32],
    fadeOutMeters: [48, 76],
    // 中景只保留能形成轮廓的低矮簇，亚像素叶片交给远景聚合色承担。
    heightScale: [1.05, 2.35],
    widthScale: [4.2, 5.8],
  },
] as const satisfies readonly CottageGardenGrassLayerSpec[];

export const COTTAGE_GARDEN_GRASS_TERRAIN_MAP = {
  minimumMeters: -600,
  maximumMeters: 600,
  resolution: 512,
} as const;

const UINT32_RANGE = 4_294_967_296;

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

export function resolveCottageGardenGrassLayerInstanceCount(
  layer: CottageGardenGrassLayerSpec,
) {
  return Math.round(
    layer.fieldSizeMeters *
      layer.fieldSizeMeters *
      layer.clumpsPerSquareMeter,
  );
}

/** 每个实例存 root(x,z) 与 shape(yaw,height,width,phase)，避免 4×4 矩阵浪费。 */
export function createCottageGardenGrassInstanceData(
  layer: CottageGardenGrassLayerSpec,
  seed =
    layer.id === "courtyard"
      ? 71_117
      : layer.id === "near"
        ? 118_327
        : 242_819,
): CottageGardenGrassInstanceData {
  const count = resolveCottageGardenGrassLayerInstanceCount(layer);
  const roots = new Float32Array(count * 2);
  const shapes = new Float32Array(count * 4);
  const halfSize = layer.fieldSizeMeters / 2;

  for (let index = 0; index < count; index += 1) {
    const jitterX = (stableUnit(seed, index, 0) - 0.5) / Math.sqrt(count);
    const jitterZ = (stableUnit(seed, index, 1) - 0.5) / Math.sqrt(count);
    roots[index * 2] =
      (halton(index + 1, 2) + jitterX) * layer.fieldSizeMeters - halfSize;
    roots[index * 2 + 1] =
      (halton(index + 1, 3) + jitterZ) * layer.fieldSizeMeters - halfSize;

    shapes[index * 4] = stableUnit(seed, index, 2) * Math.PI * 2;
    // 让多数草叶停留在花冠下方，同时保留足够的中高草形成高低交错。
    // 幂次分布不会改变确定性，也避免均匀随机把整片草地抬成同样高的草墙。
    const heightProgress = Math.pow(stableUnit(seed, index, 3), 1.55);
    shapes[index * 4 + 1] =
      layer.heightScale[0] +
      heightProgress * (layer.heightScale[1] - layer.heightScale[0]);
    shapes[index * 4 + 2] =
      layer.widthScale[0] +
      stableUnit(seed, index, 4) *
        (layer.widthScale[1] - layer.widthScale[0]);
    shapes[index * 4 + 3] = stableUnit(seed, index, 5) * Math.PI * 2;
  }

  return { roots, shapes, count };
}
