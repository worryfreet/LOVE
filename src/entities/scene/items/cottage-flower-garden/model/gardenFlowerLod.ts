import type { FlowerPopulationQuality } from "@/entities/model";

export interface GardenFlowerLodProbe {
  readonly distanceMeters: number;
  readonly sourceHeightMeters: number;
  readonly verticalFovDegrees: number;
  readonly viewportHeightPixels: number;
}

export const COTTAGE_GARDEN_FLOWER_LOD = {
  updateIntervalSeconds: 0.25,
  ultra: {
    enterPixels: 300,
    exitPixels: 240,
    enterDistanceMeters: 2.6,
    exitDistanceMeters: 3.3,
  },
  high: {
    enterPixels: 140,
    exitPixels: 105,
    enterDistanceMeters: 6,
    exitDistanceMeters: 7.5,
  },
  medium: {
    enterPixels: 55,
    exitPixels: 42,
    enterDistanceMeters: 15,
    exitDistanceMeters: 18,
  },
} as const;

export function projectGardenFlowerHeightPixels({
  distanceMeters,
  sourceHeightMeters,
  verticalFovDegrees,
  viewportHeightPixels,
}: GardenFlowerLodProbe) {
  const halfFovRadians = (verticalFovDegrees * Math.PI) / 360;
  return (
    (Math.max(0, sourceHeightMeters) * Math.max(1, viewportHeightPixels)) /
    (2 *
      Math.tan(Math.max(0.01, halfFovRadians)) *
      Math.max(0.05, distanceMeters))
  );
}

/**
 * 同一植物跨档只改变几何原型。进入、退出阈值分离，保证沿道路前后试探时
 * 不会在相邻两帧反复跳档；相机瞬移时允许直接跨两档。
 */
export function resolveGardenFlowerQuality(
  previous: FlowerPopulationQuality,
  probe: GardenFlowerLodProbe,
): FlowerPopulationQuality {
  const pixels = projectGardenFlowerHeightPixels(probe);
  const { distanceMeters } = probe;
  const ultraEnter =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.ultra.enterPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.ultra.enterDistanceMeters;
  const ultraStay =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.ultra.exitPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.ultra.exitDistanceMeters;
  const highEnter =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.high.enterPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.high.enterDistanceMeters;
  const highStay =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.high.exitPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.high.exitDistanceMeters;
  const mediumEnter =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.medium.enterPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.medium.enterDistanceMeters;
  const mediumStay =
    pixels >= COTTAGE_GARDEN_FLOWER_LOD.medium.exitPixels &&
    distanceMeters <= COTTAGE_GARDEN_FLOWER_LOD.medium.exitDistanceMeters;

  if (previous === "ultra") {
    if (ultraStay) return "ultra";
    if (highStay) return "high";
    return mediumStay ? "medium" : "low";
  }
  if (previous === "high") {
    if (ultraEnter) return "ultra";
    if (highStay) return "high";
    return mediumStay ? "medium" : "low";
  }
  if (previous === "medium") {
    if (ultraEnter) return "ultra";
    if (highEnter) return "high";
    return mediumStay ? "medium" : "low";
  }
  if (ultraEnter) return "ultra";
  if (highEnter) return "high";
  return mediumEnter ? "medium" : "low";
}
