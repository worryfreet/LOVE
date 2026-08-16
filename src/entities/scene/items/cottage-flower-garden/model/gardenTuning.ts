import type { WildflowerSpeciesId } from "../../../../model/worker";
import { Color } from "three";
import cottageGardenCustomConfiguration from "./configurations/cottage-flower-garden.custom.json";
import {
  COTTAGE_GARDEN_INITIAL_TIME,
  type CottageGardenTimeOfDay,
} from "./gardenTime";
import {
  COTTAGE_GARDEN_PLANTING_DEFAULTS,
  normalizeCottageGardenPlanting,
  type CottageGardenPlantingTuning,
} from "./gardenPlanting";

export type CottageGardenWeatherPresetId =
  | "clear"
  | "soft-clouds"
  | "overcast"
  | "mist"
  | "custom";

export interface CottageGardenFlowerTuning {
  density: number;
  heightMinMeters: number;
  heightMaxMeters: number;
  widthMultiplier: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface CottageGardenGrassLayerTuning {
  density: number;
  heightMinMeters: number;
  heightMaxMeters: number;
  widthMultiplier: number;
}

export interface CottageGardenTuning {
  palette: {
    groundColor: string;
    grassShadowColor: string;
    grassColor: string;
    grassTipColor: string;
  };
  structures: {
    cottageWoodColor: string;
    cottageWoodVariation: number;
    pathStoneColor: string;
    pathStoneWarmColor: string;
    pathStoneRoughness: number;
  };
  terrain: {
    roughness: number;
    bumpStrength: number;
    farMeadowTintColor: string;
    farMeadowTintStrength: number;
    farFlowerStrength: number;
    farFlowerDensity: number;
    farFlowerScale: number;
  };
  grass: {
    near: CottageGardenGrassLayerTuning;
    middle: CottageGardenGrassLayerTuning;
    windStrength: number;
    windSpeed: number;
    gustStrength: number;
    windDirectionDegrees: number;
  };
  flowers: Record<WildflowerSpeciesId, CottageGardenFlowerTuning>;
  garden: CottageGardenPlantingTuning;
  lighting: {
    sunIntensity: number;
    sunTint: string;
    sunSize: number;
    ambientIntensity: number;
    exposure: number;
  };
  weather: {
    preset: CottageGardenWeatherPresetId;
    cloudCoverage: number;
    cloudOpacity: number;
    skySaturation: number;
    fogNearScale: number;
    fogFarScale: number;
    fogTint: string;
    fogTintStrength: number;
  };
  distance: {
    nearGrassFadeStartMeters: number;
    nearGrassFadeEndMeters: number;
    middleGrassFadeStartMeters: number;
    middleGrassFadeEndMeters: number;
    flowerActiveRadiusMeters: number;
    farFlowerBlendStartMeters: number;
    farFlowerBlendEndMeters: number;
    aggregateFlowerStartMeters: number;
    aggregateFlowerEndMeters: number;
    lodNearToMiddleMeters: number;
    lodMiddleToFarMeters: number;
    lodHysteresisMeters: number;
  };
  time: {
    target: CottageGardenTimeOfDay;
    transitionDurationSeconds: number;
  };
}

export interface CottageGardenTuningConfiguration {
  version: number;
  sceneId: string;
  updatedAt: string | null;
  values: unknown;
}

export const COTTAGE_WOOD_TONE_LIGHTNESS = {
  wall: 0.055,
  roof: -0.075,
  wood: 0.09,
  darkWood: -0.08,
  door: 0.075,
  siding: 0.06,
  shingle: -0.07,
  trim: 0.105,
  deck: -0.03,
  gable: 0.05,
} as const;

export type CottageWoodTone = keyof typeof COTTAGE_WOOD_TONE_LIGHTNESS;

/** 只在同一暖木色附近轻微移明暗，避免背光墙板重新变成近黑色。 */
export function resolveCottageWoodTone(
  baseColor: string,
  tone: CottageWoodTone,
) {
  return `#${new Color(baseColor)
    .offsetHSL(0, tone === "roof" || tone === "shingle" ? -0.012 : 0, COTTAGE_WOOD_TONE_LIGHTNESS[tone])
    .getHexString()}`;
}

export const COTTAGE_GARDEN_SCENE_ID = "cottage-flower-garden";
export const COTTAGE_GARDEN_TUNING_VERSION = 2;
export const COTTAGE_GARDEN_LEGACY_TUNING_VERSION = 1;

export const COTTAGE_GARDEN_TUNING_DEFAULTS: CottageGardenTuning = {
  palette: {
    groundColor: "#527d39",
    grassShadowColor: "#294b24",
    grassColor: "#527d39",
    grassTipColor: "#7ba54b",
  },
  structures: {
    cottageWoodColor: "#c28a5b",
    cottageWoodVariation: 0.052,
    pathStoneColor: "#e7d8bd",
    pathStoneWarmColor: "#f0dcba",
    pathStoneRoughness: 0.96,
  },
  terrain: {
    roughness: 0.98,
    bumpStrength: 0.012,
    farMeadowTintColor: "#50c878",
    farMeadowTintStrength: 0.86,
    farFlowerStrength: 1.5,
    farFlowerDensity: 1.45,
    farFlowerScale: 1.18,
  },
  grass: {
    near: {
      density: 1,
      heightMinMeters: 0.073,
      heightMaxMeters: 0.323,
      widthMultiplier: 1,
    },
    middle: {
      density: 1,
      heightMinMeters: 0.056,
      heightMaxMeters: 0.146,
      widthMultiplier: 1,
    },
    windStrength: 1,
    windSpeed: 1,
    gustStrength: 1,
    windDirectionDegrees: 23,
  },
  flowers: {
    "wild-daisy": {
      density: 1.2,
      heightMinMeters: 0.15,
      heightMaxMeters: 0.36,
      widthMultiplier: 1.08,
      primaryColor: "#f5f1df",
      secondaryColor: "#f0c63c",
      accentColor: "#f5f1df",
    },
    "pink-cosmos": {
      density: 1.55,
      heightMinMeters: 0.2,
      heightMaxMeters: 0.46,
      widthMultiplier: 1.18,
      primaryColor: "#ef6fa4",
      secondaryColor: "#bc7fd0",
      accentColor: "#ee786e",
    },
    "blue-cornflower": {
      density: 1.4,
      heightMinMeters: 0.17,
      heightMaxMeters: 0.4,
      widthMultiplier: 1.12,
      primaryColor: "#65a1e2",
      secondaryColor: "#8f85d0",
      accentColor: "#65a1e2",
    },
  },
  garden: COTTAGE_GARDEN_PLANTING_DEFAULTS,
  lighting: {
    sunIntensity: 1,
    sunTint: "#ffffff",
    sunSize: 1,
    ambientIntensity: 1,
    exposure: 1,
  },
  weather: {
    preset: "soft-clouds",
    cloudCoverage: 0.55,
    cloudOpacity: 0.68,
    skySaturation: 1,
    fogNearScale: 1,
    fogFarScale: 1,
    fogTint: "#ffffff",
    fogTintStrength: 0,
  },
  distance: {
    nearGrassFadeStartMeters: 18,
    nearGrassFadeEndMeters: 32,
    middleGrassFadeStartMeters: 48,
    middleGrassFadeEndMeters: 76,
    flowerActiveRadiusMeters: 32,
    farFlowerBlendStartMeters: 42,
    farFlowerBlendEndMeters: 72,
    aggregateFlowerStartMeters: 54,
    aggregateFlowerEndMeters: 96,
    lodNearToMiddleMeters: 34,
    lodMiddleToFarMeters: 82,
    lodHysteresisMeters: 4,
  },
  time: {
    target: COTTAGE_GARDEN_INITIAL_TIME,
    transitionDurationSeconds: 10,
  },
};

export const COTTAGE_GARDEN_WEATHER_PRESETS = {
  clear: {
    label: "晴朗",
    cloudCoverage: 0.16,
    cloudOpacity: 0.3,
    skySaturation: 1.08,
    fogNearScale: 1.16,
    fogFarScale: 1.1,
    sunIntensity: 1.12,
    windStrength: 0.58,
  },
  "soft-clouds": {
    label: "薄云",
    cloudCoverage: 0.55,
    cloudOpacity: 0.68,
    skySaturation: 1,
    fogNearScale: 1,
    fogFarScale: 1,
    sunIntensity: 1,
    windStrength: 1,
  },
  overcast: {
    label: "多云",
    cloudCoverage: 0.86,
    cloudOpacity: 0.9,
    skySaturation: 0.78,
    fogNearScale: 0.82,
    fogFarScale: 0.86,
    sunIntensity: 0.72,
    windStrength: 0.82,
  },
  mist: {
    label: "晨雾",
    cloudCoverage: 0.66,
    cloudOpacity: 0.76,
    skySaturation: 0.72,
    fogNearScale: 0.48,
    fogFarScale: 0.58,
    sunIntensity: 0.68,
    windStrength: 0.36,
  },
} as const;

const TIME_IDS = new Set<CottageGardenTimeOfDay>([
  "dawn",
  "noon",
  "dusk",
  "evening",
]);
const WEATHER_IDS = new Set<CottageGardenWeatherPresetId>([
  "clear",
  "soft-clouds",
  "overcast",
  "mist",
  "custom",
]);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? Math.max(minimum, Math.min(maximum, numeric))
    : fallback;
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : fallback;
}

function orderedPair(
  minimum: number,
  maximum: number,
): readonly [number, number] {
  return minimum <= maximum ? [minimum, maximum] : [maximum, minimum];
}

function normalizeGrassLayer(
  input: unknown,
  fallback: CottageGardenGrassLayerTuning,
  maximumHeight: number,
): CottageGardenGrassLayerTuning {
  const source = record(input);
  const [heightMinMeters, heightMaxMeters] = orderedPair(
    finiteNumber(source.heightMinMeters, fallback.heightMinMeters, 0.015, maximumHeight),
    finiteNumber(source.heightMaxMeters, fallback.heightMaxMeters, 0.015, maximumHeight),
  );
  return {
    density: finiteNumber(source.density, fallback.density, 0.08, 1.5),
    heightMinMeters,
    heightMaxMeters,
    widthMultiplier: finiteNumber(
      source.widthMultiplier,
      fallback.widthMultiplier,
      0.45,
      1.8,
    ),
  };
}

function normalizeFlower(
  input: unknown,
  fallback: CottageGardenFlowerTuning,
): CottageGardenFlowerTuning {
  const source = record(input);
  const [heightMinMeters, heightMaxMeters] = orderedPair(
    finiteNumber(source.heightMinMeters, fallback.heightMinMeters, 0.05, 0.65),
    finiteNumber(source.heightMaxMeters, fallback.heightMaxMeters, 0.05, 0.65),
  );
  return {
    density: finiteNumber(source.density, fallback.density, 0, 2),
    heightMinMeters,
    heightMaxMeters,
    widthMultiplier: finiteNumber(
      source.widthMultiplier,
      fallback.widthMultiplier,
      0.5,
      1.8,
    ),
    primaryColor: color(source.primaryColor, fallback.primaryColor),
    secondaryColor: color(source.secondaryColor, fallback.secondaryColor),
    accentColor: color(source.accentColor, fallback.accentColor),
  };
}

export function normalizeCottageGardenTuning(
  input: unknown,
): CottageGardenTuning {
  const source = record(input);
  const defaults = COTTAGE_GARDEN_TUNING_DEFAULTS;
  const palette = record(source.palette);
  const structures = record(source.structures);
  const terrain = record(source.terrain);
  const grass = record(source.grass);
  const flowers = record(source.flowers);
  const garden = source.garden;
  const lighting = record(source.lighting);
  const weather = record(source.weather);
  const distance = record(source.distance);
  const time = record(source.time);

  const [nearGrassFadeStartMeters, nearGrassFadeEndMeters] = orderedPair(
    finiteNumber(distance.nearGrassFadeStartMeters, defaults.distance.nearGrassFadeStartMeters, 0, 28),
    finiteNumber(distance.nearGrassFadeEndMeters, defaults.distance.nearGrassFadeEndMeters, 2, 36),
  );
  const [middleGrassFadeStartMeters, middleGrassFadeEndMeters] = orderedPair(
    finiteNumber(distance.middleGrassFadeStartMeters, defaults.distance.middleGrassFadeStartMeters, 12, 100),
    finiteNumber(distance.middleGrassFadeEndMeters, defaults.distance.middleGrassFadeEndMeters, 18, 120),
  );
  const [farFlowerBlendStartMeters, farFlowerBlendEndMeters] = orderedPair(
    finiteNumber(distance.farFlowerBlendStartMeters, defaults.distance.farFlowerBlendStartMeters, 4, 60),
    finiteNumber(distance.farFlowerBlendEndMeters, defaults.distance.farFlowerBlendEndMeters, 8, 90),
  );
  const [aggregateFlowerStartMeters, aggregateFlowerEndMeters] = orderedPair(
    finiteNumber(distance.aggregateFlowerStartMeters, defaults.distance.aggregateFlowerStartMeters, 6, 90),
    finiteNumber(distance.aggregateFlowerEndMeters, defaults.distance.aggregateFlowerEndMeters, 10, 130),
  );
  const [lodNearToMiddleMeters, lodMiddleToFarMeters] = orderedPair(
    finiteNumber(distance.lodNearToMiddleMeters, defaults.distance.lodNearToMiddleMeters, 12, 90),
    finiteNumber(distance.lodMiddleToFarMeters, defaults.distance.lodMiddleToFarMeters, 28, 180),
  );

  const rawTimeTarget = time.target;
  const rawWeatherPreset = weather.preset;
  return {
    palette: {
      groundColor: color(palette.groundColor, defaults.palette.groundColor),
      grassShadowColor: color(
        palette.grassShadowColor,
        defaults.palette.grassShadowColor,
      ),
      grassColor: color(palette.grassColor, defaults.palette.grassColor),
      grassTipColor: color(
        palette.grassTipColor,
        defaults.palette.grassTipColor,
      ),
    },
    structures: {
      cottageWoodColor: color(
        structures.cottageWoodColor,
        defaults.structures.cottageWoodColor,
      ),
      cottageWoodVariation: finiteNumber(
        structures.cottageWoodVariation,
        defaults.structures.cottageWoodVariation,
        0,
        0.06,
      ),
      pathStoneColor: color(
        structures.pathStoneColor,
        defaults.structures.pathStoneColor,
      ),
      pathStoneWarmColor: color(
        structures.pathStoneWarmColor,
        defaults.structures.pathStoneWarmColor,
      ),
      pathStoneRoughness: finiteNumber(
        structures.pathStoneRoughness,
        defaults.structures.pathStoneRoughness,
        0.7,
        1,
      ),
    },
    terrain: {
      roughness: finiteNumber(terrain.roughness, defaults.terrain.roughness, 0.55, 1),
      bumpStrength: finiteNumber(
        terrain.bumpStrength,
        defaults.terrain.bumpStrength,
        0,
        0.05,
      ),
      farMeadowTintColor: color(
        terrain.farMeadowTintColor,
        defaults.terrain.farMeadowTintColor,
      ),
      farMeadowTintStrength: finiteNumber(
        terrain.farMeadowTintStrength,
        defaults.terrain.farMeadowTintStrength,
        0,
        1,
      ),
      farFlowerStrength: finiteNumber(
        terrain.farFlowerStrength,
        defaults.terrain.farFlowerStrength,
        0,
        1.6,
      ),
      farFlowerDensity: finiteNumber(
        terrain.farFlowerDensity,
        defaults.terrain.farFlowerDensity,
        0,
        1.6,
      ),
      farFlowerScale: finiteNumber(
        terrain.farFlowerScale,
        defaults.terrain.farFlowerScale,
        0.55,
        1.8,
      ),
    },
    grass: {
      near: normalizeGrassLayer(grass.near, defaults.grass.near, 0.58),
      middle: normalizeGrassLayer(grass.middle, defaults.grass.middle, 0.36),
      windStrength: finiteNumber(
        grass.windStrength,
        defaults.grass.windStrength,
        0,
        2.5,
      ),
      windSpeed: finiteNumber(grass.windSpeed, defaults.grass.windSpeed, 0.1, 3),
      gustStrength: finiteNumber(
        grass.gustStrength,
        defaults.grass.gustStrength,
        0,
        2.5,
      ),
      windDirectionDegrees: finiteNumber(
        grass.windDirectionDegrees,
        defaults.grass.windDirectionDegrees,
        0,
        360,
      ),
    },
    flowers: {
      "wild-daisy": normalizeFlower(
        flowers["wild-daisy"],
        defaults.flowers["wild-daisy"],
      ),
      "pink-cosmos": normalizeFlower(
        flowers["pink-cosmos"],
        defaults.flowers["pink-cosmos"],
      ),
      "blue-cornflower": normalizeFlower(
        flowers["blue-cornflower"],
        defaults.flowers["blue-cornflower"],
      ),
    },
    garden: normalizeCottageGardenPlanting(garden, defaults.garden),
    lighting: {
      sunIntensity: finiteNumber(
        lighting.sunIntensity,
        defaults.lighting.sunIntensity,
        0,
        2.2,
      ),
      sunTint: color(lighting.sunTint, defaults.lighting.sunTint),
      sunSize: finiteNumber(lighting.sunSize, defaults.lighting.sunSize, 0.45, 1.8),
      ambientIntensity: finiteNumber(
        lighting.ambientIntensity,
        defaults.lighting.ambientIntensity,
        0,
        2,
      ),
      exposure: finiteNumber(lighting.exposure, defaults.lighting.exposure, 0.55, 1.65),
    },
    weather: {
      preset:
        typeof rawWeatherPreset === "string" &&
        WEATHER_IDS.has(rawWeatherPreset as CottageGardenWeatherPresetId)
          ? (rawWeatherPreset as CottageGardenWeatherPresetId)
          : defaults.weather.preset,
      cloudCoverage: finiteNumber(
        weather.cloudCoverage,
        defaults.weather.cloudCoverage,
        0,
        1,
      ),
      cloudOpacity: finiteNumber(
        weather.cloudOpacity,
        defaults.weather.cloudOpacity,
        0,
        1,
      ),
      skySaturation: finiteNumber(
        weather.skySaturation,
        defaults.weather.skySaturation,
        0.35,
        1.5,
      ),
      fogNearScale: finiteNumber(
        weather.fogNearScale,
        defaults.weather.fogNearScale,
        0.3,
        1.5,
      ),
      fogFarScale: finiteNumber(
        weather.fogFarScale,
        defaults.weather.fogFarScale,
        0.35,
        1.5,
      ),
      fogTint: color(weather.fogTint, defaults.weather.fogTint),
      fogTintStrength: finiteNumber(
        weather.fogTintStrength,
        defaults.weather.fogTintStrength,
        0,
        1,
      ),
    },
    distance: {
      nearGrassFadeStartMeters,
      nearGrassFadeEndMeters: Math.max(
        nearGrassFadeStartMeters + 0.5,
        nearGrassFadeEndMeters,
      ),
      middleGrassFadeStartMeters: Math.max(
        nearGrassFadeEndMeters + 2,
        middleGrassFadeStartMeters,
      ),
      middleGrassFadeEndMeters: Math.max(
        middleGrassFadeStartMeters + 2,
        middleGrassFadeEndMeters,
      ),
      flowerActiveRadiusMeters: finiteNumber(
        distance.flowerActiveRadiusMeters,
        defaults.distance.flowerActiveRadiusMeters,
        14,
        32,
      ),
      farFlowerBlendStartMeters,
      farFlowerBlendEndMeters: Math.max(
        farFlowerBlendStartMeters + 1,
        farFlowerBlendEndMeters,
      ),
      aggregateFlowerStartMeters,
      aggregateFlowerEndMeters: Math.max(
        aggregateFlowerStartMeters + 1,
        aggregateFlowerEndMeters,
      ),
      lodNearToMiddleMeters,
      lodMiddleToFarMeters: Math.max(
        lodNearToMiddleMeters + 8,
        lodMiddleToFarMeters,
      ),
      lodHysteresisMeters: finiteNumber(
        distance.lodHysteresisMeters,
        defaults.distance.lodHysteresisMeters,
        1,
        10,
      ),
    },
    time: {
      target:
        typeof rawTimeTarget === "string" &&
        TIME_IDS.has(rawTimeTarget as CottageGardenTimeOfDay)
          ? (rawTimeTarget as CottageGardenTimeOfDay)
          : defaults.time.target,
      transitionDurationSeconds: finiteNumber(
        time.transitionDurationSeconds,
        defaults.time.transitionDurationSeconds,
        2,
        30,
      ),
    },
  };
}

export function applyCottageGardenWeatherPreset(
  tuning: CottageGardenTuning,
  presetId: Exclude<CottageGardenWeatherPresetId, "custom">,
): CottageGardenTuning {
  const preset = COTTAGE_GARDEN_WEATHER_PRESETS[presetId];
  return normalizeCottageGardenTuning({
    ...tuning,
    grass: {
      ...tuning.grass,
      windStrength: preset.windStrength,
    },
    lighting: {
      ...tuning.lighting,
      sunIntensity: preset.sunIntensity,
    },
    weather: {
      ...tuning.weather,
      preset: presetId,
      cloudCoverage: preset.cloudCoverage,
      cloudOpacity: preset.cloudOpacity,
      skySaturation: preset.skySaturation,
      fogNearScale: preset.fogNearScale,
      fogFarScale: preset.fogFarScale,
    },
  });
}

/** 仓库 JSON 只在版本、场景 ID 和 values 都有效时覆盖代码默认值。 */
export function readCottageGardenTuningConfiguration(
  configuration: unknown,
) {
  const payload = record(configuration);
  if (
    (payload.version !== COTTAGE_GARDEN_TUNING_VERSION &&
      payload.version !== COTTAGE_GARDEN_LEGACY_TUNING_VERSION) ||
    payload.sceneId !== COTTAGE_GARDEN_SCENE_ID
  ) {
    return null;
  }
  const values = record(payload.values);
  return Object.keys(values).length > 0
    ? normalizeCottageGardenTuning(values)
    : null;
}

export const COTTAGE_GARDEN_CUSTOM_CONFIGURATION =
  cottageGardenCustomConfiguration as CottageGardenTuningConfiguration;

const projectTuning = readCottageGardenTuningConfiguration(
  COTTAGE_GARDEN_CUSTOM_CONFIGURATION,
);

export const COTTAGE_GARDEN_HAS_CUSTOM_TUNING = projectTuning !== null;
export const COTTAGE_GARDEN_PROJECT_TUNING =
  projectTuning ?? normalizeCottageGardenTuning(COTTAGE_GARDEN_TUNING_DEFAULTS);
