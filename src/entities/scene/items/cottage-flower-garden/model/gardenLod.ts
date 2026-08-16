export type CottageGardenLodTier = "near" | "middle" | "far";

export interface CottageGardenLodTransitions {
  nearToMiddle: number;
  middleToFar: number;
  hysteresis: number;
}

export interface CottageGardenLodState {
  tier: CottageGardenLodTier;
  meadow: {
    outerLawn: boolean;
  };
  cottage: {
    fineDetails: boolean;
    climbingFoliage: boolean;
  };
  fence: {
    surfaceDetails: boolean;
  };
}

export const COTTAGE_GARDEN_LOD = {
  anchor: [0, 0, 0] as const,
  transitions: {
    nearToMiddle: 34,
    middleToFar: 82,
    hysteresis: 4,
  },
} as const;

/** 只用于性能回归，确保中、远景分级能在固定镜头下被重复测量。 */
export const COTTAGE_GARDEN_LOD_PROBE_VIEWS = {
  "lod-middle": {
    position: [0, 6, 54] as const,
    target: [0, 1.4, -5] as const,
  },
  "lod-far": {
    position: [0, 12, 108] as const,
    target: [0, 1.4, -4] as const,
  },
} as const;

export function resolveCottageGardenLodTier(
  distanceMeters: number,
  previousTier: CottageGardenLodTier = "near",
  transitions: CottageGardenLodTransitions = COTTAGE_GARDEN_LOD.transitions,
): CottageGardenLodTier {
  if (!Number.isFinite(distanceMeters)) return "far";
  const distance = Math.max(0, distanceMeters);
  const { nearToMiddle, middleToFar, hysteresis } = transitions;

  if (previousTier === "near" && distance < nearToMiddle + hysteresis) {
    return "near";
  }
  if (previousTier === "far" && distance > middleToFar - hysteresis) {
    return "far";
  }
  if (distance < nearToMiddle - hysteresis) return "near";
  if (distance > middleToFar + hysteresis) return "far";
  return "middle";
}

export function resolveCottageGardenLodState(
  tier: CottageGardenLodTier,
): CottageGardenLodState {
  if (tier === "near") {
    return {
      tier,
      meadow: { outerLawn: true },
      cottage: { fineDetails: true, climbingFoliage: true },
      fence: { surfaceDetails: true },
    };
  }
  if (tier === "middle") {
    return {
      tier,
      meadow: { outerLawn: true },
      cottage: { fineDetails: true, climbingFoliage: false },
      fence: { surfaceDetails: true },
    };
  }
  return {
    tier,
    // 花草活动圈始终跟随相机，本身已经有固定预算；不能因远离小院而在脚下消失。
    meadow: { outerLawn: true },
    cottage: { fineDetails: false, climbingFoliage: false },
    fence: { surfaceDetails: false },
  };
}
