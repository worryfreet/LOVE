import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCottageGardenWeatherPreset,
  COTTAGE_GARDEN_CUSTOM_CONFIGURATION,
  COTTAGE_GARDEN_LEGACY_TUNING_VERSION,
  COTTAGE_GARDEN_PROJECT_TUNING,
  COTTAGE_GARDEN_SCENE_ID,
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  COTTAGE_GARDEN_TUNING_VERSION,
  COTTAGE_WOOD_TONE_LIGHTNESS,
  normalizeCottageGardenTuning,
  readCottageGardenTuningConfiguration,
  resolveCottageWoodTone,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenTuning";
import { resolveCottageGardenLodTier } from "../src/entities/scene/items/cottage-flower-garden/model/gardenLod";
import {
  COTTAGE_GARDEN_FLOWER_LAYERS,
  createCottageGardenFlowerInstanceData,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenWildflowerMeadow";

describe("花海小院统一调试参数", () => {
  it("默认配置经过规范化后保持稳定", () => {
    assert.deepEqual(
      normalizeCottageGardenTuning(COTTAGE_GARDEN_TUNING_DEFAULTS),
      COTTAGE_GARDEN_TUNING_DEFAULTS,
    );
  });

  it("远景默认使用明净翠绿，并允许以白色生成朦胧综合色", () => {
    const { terrain } = COTTAGE_GARDEN_TUNING_DEFAULTS;
    assert.equal(terrain.farMeadowTintColor, "#50c878");
    assert.ok(terrain.farMeadowTintStrength >= 0.8);

    const hazyWhite = normalizeCottageGardenTuning({
      terrain: {
        farMeadowTintColor: "#FFFFFF",
        farMeadowTintStrength: 0.42,
      },
    });
    assert.equal(hazyWhite.terrain.farMeadowTintColor, "#ffffff");
    assert.equal(hazyWhite.terrain.farMeadowTintStrength, 0.42);
  });

  it("默认使用统一暖木与浅色踏步石，并限制木板综合色波动", () => {
    const { structures } = COTTAGE_GARDEN_TUNING_DEFAULTS;
    assert.equal(structures.cottageWoodColor, "#c28a5b");
    assert.equal(structures.pathStoneColor, "#e7d8bd");
    assert.equal(structures.pathStoneWarmColor, "#f0dcba");
    assert.ok(structures.cottageWoodVariation <= 0.06);
    assert.ok(structures.pathStoneRoughness >= 0.9);
  });

  it("小屋各部件围绕同一暖木主色形成受控层次", () => {
    const baseColor = COTTAGE_GARDEN_TUNING_DEFAULTS.structures.cottageWoodColor;
    const tones = Object.keys(COTTAGE_WOOD_TONE_LIGHTNESS) as Array<
      keyof typeof COTTAGE_WOOD_TONE_LIGHTNESS
    >;
    const resolved = tones.map((tone) => resolveCottageWoodTone(baseColor, tone));

    assert.ok(
      Object.values(COTTAGE_WOOD_TONE_LIGHTNESS).every(
        (lightness) => Math.abs(lightness) <= 0.11,
      ),
    );
    assert.ok(new Set(resolved).size >= 8);
  });

  it("逐字段限幅并自动修正反向高度与距离范围", () => {
    const normalized = normalizeCottageGardenTuning({
      palette: { groundColor: "BAD", grassColor: "#ABCDEF" },
      structures: {
        cottageWoodColor: "invalid",
        cottageWoodVariation: 1,
        pathStoneColor: "#DDBB99",
        pathStoneRoughness: 0.1,
      },
      terrain: {
        farMeadowTintColor: "dirty-gray",
        farMeadowTintStrength: 9,
      },
      grass: {
        near: {
          density: 9,
          heightMinMeters: 0.42,
          heightMaxMeters: 0.08,
          widthMultiplier: 0.01,
        },
      },
      flowers: {
        "wild-daisy": {
          density: -4,
          heightMinMeters: 0.5,
          heightMaxMeters: 0.1,
        },
      },
      distance: {
        nearGrassFadeStartMeters: 22,
        nearGrassFadeEndMeters: 4,
        middleGrassFadeStartMeters: 6,
        middleGrassFadeEndMeters: 18,
        lodNearToMiddleMeters: 80,
        lodMiddleToFarMeters: 40,
      },
    });

    assert.equal(
      normalized.palette.groundColor,
      COTTAGE_GARDEN_TUNING_DEFAULTS.palette.groundColor,
    );
    assert.equal(normalized.palette.grassColor, "#abcdef");
    assert.equal(
      normalized.structures.cottageWoodColor,
      COTTAGE_GARDEN_TUNING_DEFAULTS.structures.cottageWoodColor,
    );
    assert.equal(normalized.structures.cottageWoodVariation, 0.06);
    assert.equal(normalized.structures.pathStoneColor, "#ddbb99");
    assert.equal(normalized.structures.pathStoneRoughness, 0.7);
    assert.equal(
      normalized.terrain.farMeadowTintColor,
      COTTAGE_GARDEN_TUNING_DEFAULTS.terrain.farMeadowTintColor,
    );
    assert.equal(normalized.terrain.farMeadowTintStrength, 1);
    assert.equal(normalized.grass.near.density, 1.5);
    assert.deepEqual(
      [
        normalized.grass.near.heightMinMeters,
        normalized.grass.near.heightMaxMeters,
      ],
      [0.08, 0.42],
    );
    assert.equal(normalized.grass.near.widthMultiplier, 0.45);
    assert.equal(normalized.flowers["wild-daisy"].density, 0);
    assert.deepEqual(
      [
        normalized.flowers["wild-daisy"].heightMinMeters,
        normalized.flowers["wild-daisy"].heightMaxMeters,
      ],
      [0.1, 0.5],
    );
    assert.ok(
      normalized.distance.middleGrassFadeStartMeters >=
        normalized.distance.nearGrassFadeEndMeters + 2,
    );
    assert.ok(
      normalized.distance.lodMiddleToFarMeters >=
        normalized.distance.lodNearToMiddleMeters + 8,
    );
  });

  it("天气预设统一更新云、雾、太阳和风而不覆盖花草尺寸", () => {
    const custom = normalizeCottageGardenTuning({
      ...COTTAGE_GARDEN_TUNING_DEFAULTS,
      flowers: {
        ...COTTAGE_GARDEN_TUNING_DEFAULTS.flowers,
        "pink-cosmos": {
          ...COTTAGE_GARDEN_TUNING_DEFAULTS.flowers["pink-cosmos"],
          heightMaxMeters: 0.44,
        },
      },
    });
    const mist = applyCottageGardenWeatherPreset(custom, "mist");

    assert.equal(mist.weather.preset, "mist");
    assert.ok(mist.weather.fogFarScale < 0.7);
    assert.ok(mist.lighting.sunIntensity < 0.8);
    assert.ok(mist.grass.windStrength < 0.5);
    assert.equal(mist.flowers["pink-cosmos"].heightMaxMeters, 0.44);
  });

  it("读取当前场景的当前或旧版仓库 JSON，并为旧版补齐花园默认值", () => {
    const custom = readCottageGardenTuningConfiguration({
      version: COTTAGE_GARDEN_TUNING_VERSION,
      sceneId: COTTAGE_GARDEN_SCENE_ID,
      updatedAt: "2026-08-14T00:00:00.000Z",
      values: {
        ...COTTAGE_GARDEN_TUNING_DEFAULTS,
        lighting: {
          ...COTTAGE_GARDEN_TUNING_DEFAULTS.lighting,
          sunIntensity: 1.37,
        },
      },
    });
    assert.equal(custom?.lighting.sunIntensity, 1.37);
    const migrated = readCottageGardenTuningConfiguration({
      version: COTTAGE_GARDEN_LEGACY_TUNING_VERSION,
      sceneId: COTTAGE_GARDEN_SCENE_ID,
      values: {
        lighting: { sunIntensity: 1.19 },
      },
    });
    assert.equal(migrated?.lighting.sunIntensity, 1.19);
    assert.equal(migrated?.garden.left.blocks.length, 5);
    assert.equal(migrated?.garden.right.blocks.length, 5);
    assert.equal(
      readCottageGardenTuningConfiguration({
        version: COTTAGE_GARDEN_TUNING_VERSION,
        sceneId: COTTAGE_GARDEN_SCENE_ID,
        values: {},
      }),
      null,
    );
    assert.equal(
      readCottageGardenTuningConfiguration({
        version: COTTAGE_GARDEN_TUNING_VERSION + 1,
        sceneId: COTTAGE_GARDEN_SCENE_ID,
        values: COTTAGE_GARDEN_TUNING_DEFAULTS,
      }),
      null,
    );
    assert.equal(
      readCottageGardenTuningConfiguration({
        version: COTTAGE_GARDEN_TUNING_VERSION,
        sceneId: "other-scene",
        values: COTTAGE_GARDEN_TUNING_DEFAULTS,
      }),
      null,
    );
  });

  it("项目配置始终来自仓库 JSON，空 values 才回退代码默认值", () => {
    assert.equal(
      COTTAGE_GARDEN_CUSTOM_CONFIGURATION.sceneId,
      COTTAGE_GARDEN_SCENE_ID,
    );
    assert.deepEqual(
      COTTAGE_GARDEN_PROJECT_TUNING,
      readCottageGardenTuningConfiguration(
        COTTAGE_GARDEN_CUSTOM_CONFIGURATION,
      ) ?? COTTAGE_GARDEN_TUNING_DEFAULTS,
    );
    assert.equal(
      COTTAGE_GARDEN_PROJECT_TUNING.terrain.farMeadowTintColor,
      (COTTAGE_GARDEN_CUSTOM_CONFIGURATION.values as { terrain?: { farMeadowTintColor?: string } }).terrain?.farMeadowTintColor,
    );
    assert.equal(
      COTTAGE_GARDEN_PROJECT_TUNING.terrain.farMeadowTintStrength,
      (COTTAGE_GARDEN_CUSTOM_CONFIGURATION.values as { terrain?: { farMeadowTintStrength?: number } }).terrain
        ?.farMeadowTintStrength,
    );
  });

  it("花朵调参只更新 uniform，不改变确定性紧凑实例池", () => {
    const layer = COTTAGE_GARDEN_FLOWER_LAYERS[0];
    const before = createCottageGardenFlowerInstanceData(
      layer,
      "pink-cosmos",
      71,
    );
    const normalized = normalizeCottageGardenTuning({
      ...COTTAGE_GARDEN_TUNING_DEFAULTS,
      distance: {
        ...COTTAGE_GARDEN_TUNING_DEFAULTS.distance,
        flowerActiveRadiusMeters: 16,
      },
      flowers: {
        ...COTTAGE_GARDEN_TUNING_DEFAULTS.flowers,
        "pink-cosmos": {
          density: 1.4,
          heightMinMeters: 0.42,
          heightMaxMeters: 0.42,
          widthMultiplier: 1.5,
          primaryColor: "#ef6fa4",
          secondaryColor: "#bc7fd0",
          accentColor: "#ee786e",
        },
      },
    });
    const after = createCottageGardenFlowerInstanceData(
      layer,
      "pink-cosmos",
      71,
    );

    assert.deepEqual(after, before);
    assert.equal(normalized.flowers["pink-cosmos"].density, 1.4);
    assert.equal(normalized.flowers["pink-cosmos"].heightMinMeters, 0.42);
    assert.equal(normalized.flowers["pink-cosmos"].heightMaxMeters, 0.42);
    assert.equal(normalized.flowers["pink-cosmos"].widthMultiplier, 1.5);
    assert.equal(normalized.distance.flowerActiveRadiusMeters, 16);
  });

  it("LOD 使用编辑器给出的远中近阈值与滞回区", () => {
    const transitions = {
      nearToMiddle: 20,
      middleToFar: 40,
      hysteresis: 2,
    };

    assert.equal(resolveCottageGardenLodTier(21, "near", transitions), "near");
    assert.equal(
      resolveCottageGardenLodTier(23, "near", transitions),
      "middle",
    );
    assert.equal(resolveCottageGardenLodTier(39, "far", transitions), "far");
    assert.equal(
      resolveCottageGardenLodTier(37, "far", transitions),
      "middle",
    );
  });
});
