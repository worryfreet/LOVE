export type CottageGardenTimeOfDay =
  | "dawn"
  | "noon"
  | "dusk"
  | "evening";

export type CottageGardenRgb = readonly [number, number, number];
export type CottageGardenDirection = readonly [number, number, number];

export interface CottageGardenTimePreset {
  id: CottageGardenTimeOfDay;
  label: string;
  phase: number;
  sunDirection: CottageGardenDirection;
  sky: {
    horizon: CottageGardenRgb;
    middle: CottageGardenRgb;
    zenith: CottageGardenRgb;
    sunBlush: CottageGardenRgb;
    cloudShadow: CottageGardenRgb;
    cloudLight: CottageGardenRgb;
  };
  sun: {
    core: CottageGardenRgb;
    veil: CottageGardenRgb;
    innerHalo: CottageGardenRgb;
    outerHalo: CottageGardenRgb;
    opacity: number;
  };
  fog: {
    color: CottageGardenRgb;
    near: number;
    far: number;
  };
  lights: {
    directionalColor: CottageGardenRgb;
    directionalIntensity: number;
    hemisphereSky: CottageGardenRgb;
    hemisphereGround: CottageGardenRgb;
    hemisphereIntensity: number;
    ambientColor: CottageGardenRgb;
    ambientIntensity: number;
    reflectedColor: CottageGardenRgb;
    reflectedIntensity: number;
  };
  exposure: number;
}

export interface CottageGardenTimeCommand {
  target: CottageGardenTimeOfDay;
  durationSeconds: number;
  nonce: number;
}

export interface CottageGardenTimeSample {
  phase: number;
  from: CottageGardenTimeOfDay;
  to: CottageGardenTimeOfDay;
  blend: number;
  sunDirection: CottageGardenDirection;
  sky: CottageGardenTimePreset["sky"];
  sun: CottageGardenTimePreset["sun"];
  fog: CottageGardenTimePreset["fog"];
  lights: CottageGardenTimePreset["lights"];
  exposure: number;
}

export const COTTAGE_GARDEN_TIME_ORDER = [
  "dawn",
  "noon",
  "dusk",
  "evening",
] as const satisfies readonly CottageGardenTimeOfDay[];

export const COTTAGE_GARDEN_TIME_PRESETS: Readonly<
  Record<CottageGardenTimeOfDay, CottageGardenTimePreset>
> = {
  dawn: {
    id: "dawn",
    label: "清晨",
    phase: 0,
    sunDirection: [-0.82, 0.24, -0.52],
    sky: {
      horizon: [0.98, 0.68, 0.56],
      middle: [0.63, 0.73, 0.86],
      zenith: [0.25, 0.43, 0.68],
      sunBlush: [1, 0.7, 0.52],
      cloudShadow: [0.48, 0.55, 0.68],
      cloudLight: [1, 0.84, 0.7],
    },
    sun: {
      core: [1, 0.91, 0.68],
      veil: [1, 0.82, 0.62],
      innerHalo: [1, 0.67, 0.42],
      outerHalo: [0.96, 0.48, 0.4],
      opacity: 0.88,
    },
    fog: { color: [0.88, 0.62, 0.55], near: 190, far: 470 },
    lights: {
      directionalColor: [1, 0.72, 0.5],
      directionalIntensity: 2.15,
      hemisphereSky: [0.58, 0.72, 0.9],
      hemisphereGround: [0.26, 0.34, 0.2],
      hemisphereIntensity: 1.12,
      ambientColor: [0.76, 0.79, 0.72],
      ambientIntensity: 0.5,
      reflectedColor: [1, 0.58, 0.42],
      reflectedIntensity: 0.46,
    },
    exposure: 1.02,
  },
  noon: {
    id: "noon",
    label: "中午",
    phase: 0.25,
    sunDirection: [-0.08, 0.96, -0.25],
    sky: {
      horizon: [0.68, 0.87, 0.99],
      middle: [0.4, 0.7, 0.98],
      zenith: [0.13, 0.46, 0.86],
      sunBlush: [1, 0.94, 0.72],
      cloudShadow: [0.56, 0.68, 0.78],
      cloudLight: [1, 0.98, 0.91],
    },
    sun: {
      core: [1, 0.98, 0.84],
      veil: [1, 0.95, 0.74],
      innerHalo: [1, 0.88, 0.55],
      outerHalo: [0.86, 0.76, 0.56],
      opacity: 0.8,
    },
    fog: { color: [0.66, 0.82, 0.88], near: 180, far: 500 },
    lights: {
      directionalColor: [1, 0.98, 0.88],
      directionalIntensity: 2.45,
      hemisphereSky: [0.58, 0.76, 1],
      hemisphereGround: [0.32, 0.42, 0.25],
      hemisphereIntensity: 1.58,
      ambientColor: [0.82, 0.86, 0.79],
      ambientIntensity: 0.88,
      reflectedColor: [0.72, 0.88, 0.72],
      reflectedIntensity: 0.48,
    },
    exposure: 1.03,
  },
  dusk: {
    id: "dusk",
    label: "黄昏",
    phase: 0.5,
    sunDirection: [0.52, 0.18, -0.84],
    sky: {
      horizon: [0.94, 0.51, 0.41],
      middle: [0.74, 0.52, 0.63],
      zenith: [0.4, 0.48, 0.64],
      sunBlush: [1, 0.56, 0.49],
      cloudShadow: [0.51, 0.42, 0.53],
      cloudLight: [1, 0.84, 0.73],
    },
    sun: {
      core: [1, 0.94, 0.8],
      veil: [1, 0.89, 0.76],
      innerHalo: [1, 0.69, 0.5],
      outerHalo: [0.97, 0.56, 0.49],
      opacity: 1,
    },
    fog: { color: [0.86, 0.49, 0.43], near: 180, far: 460 },
    lights: {
      directionalColor: [1, 0.61, 0.39],
      directionalIntensity: 2.35,
      hemisphereSky: [0.62, 0.58, 0.76],
      hemisphereGround: [0.3, 0.31, 0.2],
      hemisphereIntensity: 1.18,
      ambientColor: [0.78, 0.7, 0.66],
      ambientIntensity: 0.5,
      reflectedColor: [1, 0.46, 0.32],
      reflectedIntensity: 0.5,
    },
    exposure: 1.08,
  },
  evening: {
    id: "evening",
    label: "傍晚",
    phase: 0.75,
    sunDirection: [0.8, -0.08, -0.59],
    sky: {
      horizon: [0.15, 0.075, 0.18],
      middle: [0.028, 0.045, 0.12],
      zenith: [0.006, 0.012, 0.04],
      sunBlush: [0.42, 0.13, 0.2],
      cloudShadow: [0.025, 0.032, 0.085],
      cloudLight: [0.14, 0.12, 0.22],
    },
    sun: {
      core: [0.66, 0.29, 0.24],
      veil: [0.48, 0.2, 0.25],
      innerHalo: [0.36, 0.14, 0.24],
      outerHalo: [0.18, 0.08, 0.2],
      opacity: 0.06,
    },
    fog: { color: [0.04, 0.045, 0.095], near: 165, far: 420 },
    lights: {
      directionalColor: [0.36, 0.18, 0.24],
      directionalIntensity: 0.18,
      hemisphereSky: [0.075, 0.1, 0.22],
      hemisphereGround: [0.035, 0.045, 0.04],
      hemisphereIntensity: 0.32,
      ambientColor: [0.1, 0.12, 0.2],
      ambientIntensity: 0.18,
      reflectedColor: [0.22, 0.1, 0.18],
      reflectedIntensity: 0.08,
    },
    exposure: 0.78,
  },
};

export const COTTAGE_GARDEN_INITIAL_TIME: CottageGardenTimeOfDay = "noon";

export const COTTAGE_GARDEN_INITIAL_TIME_COMMAND: CottageGardenTimeCommand = {
  target: COTTAGE_GARDEN_INITIAL_TIME,
  durationSeconds: 10,
  nonce: 0,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizePhase(phase: number) {
  const normalized = phase % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function smoothstep(value: number) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function mixRgb(
  start: CottageGardenRgb,
  end: CottageGardenRgb,
  progress: number,
): CottageGardenRgb {
  return [
    mix(start[0], end[0], progress),
    mix(start[1], end[1], progress),
    mix(start[2], end[2], progress),
  ];
}

function mixDirection(
  start: CottageGardenDirection,
  end: CottageGardenDirection,
  progress: number,
): CottageGardenDirection {
  const x = mix(start[0], end[0], progress);
  const y = mix(start[1], end[1], progress);
  const z = mix(start[2], end[2], progress);
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

export function resolveCottageGardenForwardTargetPhase(
  currentPhase: number,
  target: CottageGardenTimeOfDay,
) {
  const targetPhase = COTTAGE_GARDEN_TIME_PRESETS[target].phase;
  const currentTurn = Math.floor(currentPhase);
  let result = currentTurn + targetPhase;
  if (result <= currentPhase + 1e-8) result += 1;
  return result;
}

export function sampleCottageGardenTime(
  absolutePhase: number,
): CottageGardenTimeSample {
  const phase = normalizePhase(absolutePhase);
  const segmentCount = COTTAGE_GARDEN_TIME_ORDER.length;
  const scaled = phase * segmentCount;
  const fromIndex = Math.floor(scaled) % segmentCount;
  const toIndex = (fromIndex + 1) % segmentCount;
  const from = COTTAGE_GARDEN_TIME_PRESETS[COTTAGE_GARDEN_TIME_ORDER[fromIndex]];
  const to = COTTAGE_GARDEN_TIME_PRESETS[COTTAGE_GARDEN_TIME_ORDER[toIndex]];
  const blend = smoothstep(scaled - Math.floor(scaled));
  const mixSky = (key: keyof CottageGardenTimePreset["sky"]) =>
    mixRgb(from.sky[key], to.sky[key], blend);
  const mixSun = (key: keyof Omit<CottageGardenTimePreset["sun"], "opacity">) =>
    mixRgb(from.sun[key], to.sun[key], blend);
  const mixLight = (
    key:
      | "directionalColor"
      | "hemisphereSky"
      | "hemisphereGround"
      | "ambientColor"
      | "reflectedColor",
  ) => mixRgb(from.lights[key], to.lights[key], blend);

  return {
    phase,
    from: from.id,
    to: to.id,
    blend,
    sunDirection: mixDirection(from.sunDirection, to.sunDirection, blend),
    sky: {
      horizon: mixSky("horizon"),
      middle: mixSky("middle"),
      zenith: mixSky("zenith"),
      sunBlush: mixSky("sunBlush"),
      cloudShadow: mixSky("cloudShadow"),
      cloudLight: mixSky("cloudLight"),
    },
    sun: {
      core: mixSun("core"),
      veil: mixSun("veil"),
      innerHalo: mixSun("innerHalo"),
      outerHalo: mixSun("outerHalo"),
      opacity: mix(from.sun.opacity, to.sun.opacity, blend),
    },
    fog: {
      color: mixRgb(from.fog.color, to.fog.color, blend),
      near: mix(from.fog.near, to.fog.near, blend),
      far: mix(from.fog.far, to.fog.far, blend),
    },
    lights: {
      directionalColor: mixLight("directionalColor"),
      directionalIntensity: mix(
        from.lights.directionalIntensity,
        to.lights.directionalIntensity,
        blend,
      ),
      hemisphereSky: mixLight("hemisphereSky"),
      hemisphereGround: mixLight("hemisphereGround"),
      hemisphereIntensity: mix(
        from.lights.hemisphereIntensity,
        to.lights.hemisphereIntensity,
        blend,
      ),
      ambientColor: mixLight("ambientColor"),
      ambientIntensity: mix(
        from.lights.ambientIntensity,
        to.lights.ambientIntensity,
        blend,
      ),
      reflectedColor: mixLight("reflectedColor"),
      reflectedIntensity: mix(
        from.lights.reflectedIntensity,
        to.lights.reflectedIntensity,
        blend,
      ),
    },
    exposure: mix(from.exposure, to.exposure, blend),
  };
}

export function sampleCottageGardenTransitionPhase(
  startPhase: number,
  targetPhase: number,
  elapsedSeconds: number,
  durationSeconds: number,
) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return targetPhase;
  }
  const progress = smoothstep(elapsedSeconds / durationSeconds);
  return mix(startPhase, targetPhase, progress);
}
