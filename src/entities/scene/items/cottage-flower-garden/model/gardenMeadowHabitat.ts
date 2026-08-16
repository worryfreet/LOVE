import {
  COTTAGE_COLLISION_RECT,
  COTTAGE_FLOWER_FIELD_RECTS,
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  type GardenRect,
} from "./gardenLayout";
import { sampleCottageGardenFbm } from "./gardenTerrain";

export interface CottageGardenMeadowHabitatSample {
  /** 可生长覆盖率；0 为硬质占地，1 为完整野花草甸。 */
  readonly coverage: number;
  /** 跨三层复用的宏观疏密场。 */
  readonly density: number;
  /** 0..1 的连续物种带，供雏菊、波斯菊与矢车菊共享分区。 */
  readonly species: number;
  /** 草高、花高与风相位共同使用的缓变扰动。 */
  readonly heightVariation: number;
}

export interface CottageGardenMeadowExclusion {
  readonly id: string;
  readonly rect: GardenRect;
}

export interface CottageGardenMeadowDomainSample {
  /** 小院围栏内的核心景观域；该域不参与外部草甸的相机距离 LOD。 */
  readonly courtyard: number;
  readonly outerMeadow: number;
}

const { garden, mainPath, fence } = COTTAGE_FLOWER_GARDEN_LAYOUT;
const halfGardenWidth = garden.width / 2;
const halfGardenLength = garden.length / 2;
const fenceThicknessMeters = 0.46;
const frontFenceSegmentWidth = (garden.width - fence.gateWidth) / 2;

/**
 * 近景实例、中景簇与远景材质只认这一组真实占地。
 * 不再用整块庭院矩形硬裁切，因此边界可以通过同一距离场自然退让。
 */
export const COTTAGE_GARDEN_MEADOW_EXCLUSIONS = [
  {
    id: "route.main-path",
    rect: {
      centerX: mainPath.centerX,
      centerZ: mainPath.centerZ,
      width: mainPath.width,
      length: mainPath.length,
    },
  },
  {
    id: "building.cottage-porch-steps",
    rect: COTTAGE_COLLISION_RECT,
  },
  {
    id: "fence.west",
    rect: {
      centerX: -halfGardenWidth,
      centerZ: 0,
      width: fenceThicknessMeters,
      length: garden.length,
    },
  },
  {
    id: "fence.east",
    rect: {
      centerX: halfGardenWidth,
      centerZ: 0,
      width: fenceThicknessMeters,
      length: garden.length,
    },
  },
  {
    id: "fence.back",
    rect: {
      centerX: 0,
      centerZ: -halfGardenLength,
      width: garden.width,
      length: fenceThicknessMeters,
    },
  },
  {
    id: "fence.front-west",
    rect: {
      centerX: -(fence.gateWidth + frontFenceSegmentWidth) / 2,
      centerZ: halfGardenLength,
      width: frontFenceSegmentWidth,
      length: fenceThicknessMeters,
    },
  },
  {
    id: "fence.front-east",
    rect: {
      centerX: (fence.gateWidth + frontFenceSegmentWidth) / 2,
      centerZ: halfGardenLength,
      width: frontFenceSegmentWidth,
      length: fenceThicknessMeters,
    },
  },
  {
    id: "route.gate-approach",
    rect: {
      centerX: 0,
      centerZ: halfGardenLength + 2,
      width: 4.4,
      length: 4,
    },
  },
] as const satisfies readonly CottageGardenMeadowExclusion[];

export const COTTAGE_GARDEN_MEADOW_FIELD = {
  seed: 93_271,
  minimumMeters: -600,
  maximumMeters: 600,
  textureResolution: 512,
  boundaryFeatherMeters: [0.18, 1.45] as const,
} as const;

/** 小院硬质边界使用局部高分辨率覆盖层，避免 1,200m 全局图吞掉 2.2m 主路。 */
export const COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD = {
  minimumMeters: -48,
  maximumMeters: 48,
  textureResolution: 384,
} as const;

export const COTTAGE_GARDEN_PATH_NO_GROWTH_DEFAULT_CLEARANCE_METERS = 0.12;
export const COTTAGE_GARDEN_PATH_SURFACE_BLEND_DEFAULTS = {
  featherMeters: 0.38,
  edgeWarpMeters: 0.14,
  seed: 184_081,
} as const;

/**
 * 围栏内侧的稳定景观域。羽化带跨过围栏基础，避免两个植被系统在边界重叠，
 * 同时保证玩家移动不会改变庭院内花草的身份或细节等级。
 */
export const COTTAGE_GARDEN_COURTYARD_DOMAIN = {
  rect: {
    centerX: 0,
    centerZ: 0,
    width: garden.width - fenceThicknessMeters,
    length: garden.length - fenceThicknessMeters,
  },
  featherMeters: [-0.58, 0.34] as const,
} as const;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = clamp01((value - edge0) / (edge1 - edge0));
  return progress * progress * (3 - 2 * progress);
}

/** 标准矩形有符号距离：负值在内部，正值在外部。 */
export function signedDistanceToCottageGardenRect(
  x: number,
  z: number,
  rect: GardenRect,
) {
  const distanceX = Math.abs(x - rect.centerX) - rect.width / 2;
  const distanceZ = Math.abs(z - rect.centerZ) - rect.length / 2;
  const outside = Math.hypot(Math.max(distanceX, 0), Math.max(distanceZ, 0));
  return outside + Math.min(Math.max(distanceX, distanceZ), 0);
}

export function signedDistanceToCottageGardenMeadowExclusions(
  x: number,
  z: number,
) {
  let distance = Number.POSITIVE_INFINITY;
  for (const exclusion of COTTAGE_GARDEN_MEADOW_EXCLUSIONS) {
    distance = Math.min(
      distance,
      signedDistanceToCottageGardenRect(x, z, exclusion.rect),
    );
  }
  return distance;
}

export function isInsideCottageGardenPathNoGrowth(
  x: number,
  z: number,
  clearanceMeters = COTTAGE_GARDEN_PATH_NO_GROWTH_DEFAULT_CLEARANCE_METERS,
) {
  const { mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  return (
    Math.abs(x - mainPath.centerX) <= mainPath.width / 2 + clearanceMeters &&
    Math.abs(z - mainPath.centerZ) <= mainPath.length / 2 + clearanceMeters
  );
}

/**
 * 道路接缝绿的视觉权重。解析矩形只提供主尺度，两级世界坐标噪声让草地与
 * 路缝互相咬合；该软权重不参与花草根部接受，避免把视觉羽化误当成可生长区。
 */
export function sampleCottageGardenPathSurfaceBlend(
  x: number,
  z: number,
  featherMeters: number =
    COTTAGE_GARDEN_PATH_SURFACE_BLEND_DEFAULTS.featherMeters,
  edgeWarpMeters: number =
    COTTAGE_GARDEN_PATH_SURFACE_BLEND_DEFAULTS.edgeWarpMeters,
) {
  const { mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const macro =
    sampleCottageGardenFbm(
      COTTAGE_GARDEN_PATH_SURFACE_BLEND_DEFAULTS.seed,
      x * 0.31,
      z * 0.31,
      3,
    ) -
    0.5;
  const detail =
    sampleCottageGardenFbm(
      COTTAGE_GARDEN_PATH_SURFACE_BLEND_DEFAULTS.seed + 7_919,
      x * 0.83,
      z * 0.83,
      2,
    ) -
    0.5;
  const signedDistance =
    signedDistanceToCottageGardenRect(x, z, {
      centerX: mainPath.centerX,
      centerZ: mainPath.centerZ,
      width: mainPath.width,
      length: mainPath.length,
    }) +
    (macro * 1.45 + detail * 0.55) * edgeWarpMeters;
  return 1 - smoothstep(-featherMeters, featherMeters, signedDistance);
}

export function sampleCottageGardenBedDomain(
  x: number,
  z: number,
  featherMeters = 0.42,
) {
  let signedDistance = Number.POSITIVE_INFINITY;
  for (const rect of COTTAGE_FLOWER_FIELD_RECTS) {
    signedDistance = Math.min(
      signedDistance,
      signedDistanceToCottageGardenRect(x, z, rect),
    );
  }
  return 1 - smoothstep(-featherMeters, featherMeters, signedDistance);
}

export function sampleCottageGardenMeadowCoverage(
  x: number,
  z: number,
  pathClearanceMeters = COTTAGE_GARDEN_PATH_NO_GROWTH_DEFAULT_CLEARANCE_METERS,
) {
  if (isInsideCottageGardenPathNoGrowth(x, z, pathClearanceMeters)) return 0;
  const { boundaryFeatherMeters } = COTTAGE_GARDEN_MEADOW_FIELD;
  return smoothstep(
    boundaryFeatherMeters[0],
    boundaryFeatherMeters[1],
    signedDistanceToCottageGardenMeadowExclusions(x, z),
  );
}

export function sampleCottageGardenMeadowDomain(
  x: number,
  z: number,
): CottageGardenMeadowDomainSample {
  const signedDistance = signedDistanceToCottageGardenRect(
    x,
    z,
    COTTAGE_GARDEN_COURTYARD_DOMAIN.rect,
  );
  const courtyard =
    1 -
    smoothstep(
      COTTAGE_GARDEN_COURTYARD_DOMAIN.featherMeters[0],
      COTTAGE_GARDEN_COURTYARD_DOMAIN.featherMeters[1],
      signedDistance,
    );
  return {
    courtyard,
    outerMeadow: 1 - courtyard,
  };
}

/**
 * 所有花草表现层共享的权威 habitat field（生境场）。
 * 低频噪声负责成片疏密与物种迁移，高频细节只做轻微破整，避免贴纸斑块。
 */
export function sampleCottageGardenMeadowHabitat(
  x: number,
  z: number,
): CottageGardenMeadowHabitatSample {
  const { seed } = COTTAGE_GARDEN_MEADOW_FIELD;
  const coverage = sampleCottageGardenMeadowCoverage(x, z);
  const densityMacro = sampleCottageGardenFbm(
    seed,
    x * 0.021,
    z * 0.021,
    4,
  );
  const densityDetail = sampleCottageGardenFbm(
    seed + 7_919,
    x * 0.083,
    z * 0.083,
    3,
  );
  const density = clamp01(0.3 + densityMacro * 0.52 + densityDetail * 0.18);
  const speciesMacro = sampleCottageGardenFbm(
    seed + 17_923,
    x * 0.014,
    z * 0.014,
    4,
  );
  const speciesDetail = sampleCottageGardenFbm(
    seed + 23_933,
    x * 0.057,
    z * 0.057,
    3,
  );
  const heightMacro = sampleCottageGardenFbm(
    seed + 31_939,
    x * 0.034,
    z * 0.034,
    4,
  );

  return {
    coverage,
    density,
    species: clamp01(speciesMacro * 0.76 + speciesDetail * 0.24),
    heightVariation: clamp01(heightMacro),
  };
}
