import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInsideCottageGardenPathNoGrowth,
  sampleCottageGardenBedDomain,
  sampleCottageGardenMeadowCoverage,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenMeadowHabitat";
import {
  addCottageGardenBedBlock,
  copyCottageGardenSide,
  COTTAGE_GARDEN_PLANT_SPECIES,
  COTTAGE_GARDEN_PLANTING_DEFAULTS,
  COTTAGE_GARDEN_ROSE_COLOR_OPTIONS,
  moveCottageGardenBedBlock,
  normalizeCottageGardenPlanting,
  removeCottageGardenBedBlock,
  resolveCottageGardenBedBlocks,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenPlanting";
import { createCottageGardenPlantPopulation } from "../src/entities/scene/items/cottage-flower-garden/model/gardenPlantingDistribution";
import { ROSE_COLOR_PRESETS } from "../src/entities/model/items/flower-collection/core/roseColorVariants";
import {
  resolveSunflowerParameters,
  SUNFLOWER_CUSTOM_CONFIGURATION,
} from "../src/entities/model/model/flowers/sunflowerParameters";

describe("花海小院可编辑花径", () => {
  it("花园登记模型库玫瑰、向日葵与牵牛花，并把左右近屋分区设为向日葵", () => {
    assert.equal(COTTAGE_GARDEN_PLANT_SPECIES.length, 3);
    assert.equal(
      new Set(COTTAGE_GARDEN_PLANT_SPECIES.map((species) => species.id)).size,
      3,
    );
    assert.equal(COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks.length, 5);
    assert.equal(COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks.length, 5);
    assert.equal(
      COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks.at(-1)?.primary.speciesId,
      "sunflower",
    );
    assert.equal(
      COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks.at(-1)?.primary.speciesId,
      "sunflower",
    );
    assert.ok(
      [...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks,
      ...COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks]
        .filter((block) => block.id !== "left-05" && block.id !== "right-05")
        .every(
        (block) =>
          block.primary.speciesId === "classic-rose" &&
          block.primary.roseColorSelectionId === "mixed" &&
          block.companion?.speciesId === "classic-rose" &&
          block.companion.roseColorSelectionId === "mixed",
      ),
    );
    for (const side of ["left", "right"] as const) {
      const sunflower = COTTAGE_GARDEN_PLANTING_DEFAULTS[side].blocks.at(-1);
      assert.equal(sunflower?.primary.count, 4);
      assert.equal(sunflower?.primary.heightMinMeters, 1.18);
      assert.equal(sunflower?.primary.heightMaxMeters, 1.48);
      assert.equal(sunflower?.primary.scale, 0.38);
      assert.equal(sunflower?.companion, null);
    }
    assert.deepEqual(
      COTTAGE_GARDEN_ROSE_COLOR_OPTIONS.map((option) => option.id),
      ["mixed", ...ROSE_COLOR_PRESETS.map((preset) => preset.id)],
    );
    assert.equal(COTTAGE_GARDEN_ROSE_COLOR_OPTIONS.length, 14);

    const resolved = resolveCottageGardenBedBlocks(
      COTTAGE_GARDEN_PLANTING_DEFAULTS,
    );
    for (const side of ["left", "right"] as const) {
      const blocks = resolved.filter((block) => block.side === side);
      assert.ok(
        blocks.every(
          (block, index) => index === 0 || block.rect.centerZ < blocks[index - 1].rect.centerZ,
        ),
      );
    }
  });

  it("每个模型库玫瑰颜色都能作为整区固定配色", () => {
    for (const preset of ROSE_COLOR_PRESETS) {
      const primary = {
        ...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0].primary,
        count: 4,
        roseColorSelectionId: preset.id,
      };
      const empty = {
        ...COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks[0].primary,
        count: 0,
      };
      const planting = normalizeCottageGardenPlanting({
        ...COTTAGE_GARDEN_PLANTING_DEFAULTS,
        left: {
          blocks: [{
            ...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0],
            primary,
            companion: null,
          }],
        },
        right: {
          blocks: [{
            ...COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks[0],
            primary: empty,
            companion: null,
          }],
        },
      });
      const population = createCottageGardenPlantPopulation(planting);
      assert.equal(population.totalCount, 4);
      assert.ok(
        population.occurrences.every(
          (occurrence) => occurrence.roseColorVariantId === preset.id,
        ),
        `${preset.label}必须保持固定颜色身份`,
      );
    }
  });

  it("同一配置生成完全稳定的实例身份、位置与数量", () => {
    const first = createCottageGardenPlantPopulation(
      COTTAGE_GARDEN_PLANTING_DEFAULTS,
    );
    const second = createCottageGardenPlantPopulation(
      COTTAGE_GARDEN_PLANTING_DEFAULTS,
    );
    const expectedBedCount = ["left", "right"].reduce(
      (total, side) =>
        total +
        COTTAGE_GARDEN_PLANTING_DEFAULTS[
          side as "left" | "right"
        ].blocks.reduce(
          (sideTotal, block) =>
            sideTotal + block.primary.count + (block.companion?.count ?? 0),
          0,
        ),
      0,
    );

    assert.deepEqual(first.occurrences, second.occurrences);
    assert.equal(first.bedCount, 10);
    assert.equal(first.totalCount, expectedBedCount);
    assert.equal(first.totalCount, 488);
    assert.equal(first.bySpecies.size, 2);
    assert.equal(first.bySpecies.get("sunflower")?.length, 8);
    assert.equal(new Set(first.occurrences.map((plant) => plant.id)).size, first.totalCount);
    assert.ok(
      (first.bySpecies.get("classic-rose") ?? []).every((plant) =>
        [
          "scarlet-red",
          "deep-red",
          "light-pink",
          "deep-pink",
          "peach-pink",
          "snow-white",
          "friendship-yellow",
          "royal-purple",
          "orange-flame",
          "orange-red",
          "cream-pink-gradient",
          "red-white-bicolor",
          "berry-tie-dye",
        ].includes(plant.roseColorVariantId),
      ),
    );
    assert.ok(
      new Set(
        (first.bySpecies.get("classic-rose") ?? []).map(
          (plant) => plant.roseColorVariantId,
        ),
      ).size >=
        7,
    );
    assert.ok(
      (first.bySpecies.get("sunflower") ?? []).every(
        (plant) => Math.abs(plant.yaw) <= 0.21,
      ),
      "左右向日葵花盘应朝向入口并保留轻微自然偏角",
    );
  });

  it("小路及其安全边距是硬性无生长区，花圃域在两侧保持有效", () => {
    assert.equal(isInsideCottageGardenPathNoGrowth(0, 4, 0.12), true);
    assert.equal(isInsideCottageGardenPathNoGrowth(1.21, 4, 0.12), true);
    assert.equal(isInsideCottageGardenPathNoGrowth(1.23, 4, 0.12), false);
    assert.equal(sampleCottageGardenMeadowCoverage(0, 4, 0.12), 0);
    assert.equal(sampleCottageGardenMeadowCoverage(1.21, 4, 0.12), 0);
    assert.ok(sampleCottageGardenBedDomain(-5.6, 4) > 0.95);
    assert.ok(sampleCottageGardenBedDomain(5.6, 4) > 0.95);
  });

  it("分区增删、排序和左右复制均保持上下限及稳定唯一 ID", () => {
    const added = addCottageGardenBedBlock(
      COTTAGE_GARDEN_PLANTING_DEFAULTS,
      "left",
      "left-02",
    );
    assert.equal(added.left.blocks.length, 6);
    assert.equal(new Set(added.left.blocks.map((block) => block.id)).size, 6);
    const addedId = added.left.blocks.find(
      (block) =>
        !COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks.some(
          (current) => current.id === block.id,
        ),
    )?.id;
    assert.ok(addedId);

    const moved = moveCottageGardenBedBlock(added, "left", addedId, 1);
    assert.notDeepEqual(
      moved.left.blocks.map((block) => block.id),
      added.left.blocks.map((block) => block.id),
    );
    const removed = removeCottageGardenBedBlock(moved, "left", addedId);
    assert.equal(removed.left.blocks.length, 5);

    const copied = copyCottageGardenSide(removed, "left", "right");
    assert.deepEqual(
      copied.right.blocks.map((block) => block.primary.speciesId),
      copied.left.blocks.map((block) => block.primary.speciesId),
    );
    assert.ok(copied.right.blocks.every((block) => block.id.startsWith("right-")));
  });

  it("非法输入通过统一规范化自然回到有效范围", () => {
    const normalized = normalizeCottageGardenPlanting({
      pathClearanceMeters: 9,
      pathSurfaceBlendFeatherMeters: 9,
      pathSurfaceEdgeWarpMeters: -1,
      bedGrassDensity: -3,
      left: { blocks: [] },
      right: {
        blocks: Array.from({ length: 12 }, (_, index) => ({
          ...COTTAGE_GARDEN_PLANTING_DEFAULTS.right.blocks[0],
          id: `right-${String(index + 1).padStart(2, "0")}`,
        })),
      },
      trellis: { enabled: false, count: 99 },
    });
    assert.equal(normalized.pathClearanceMeters, 0.4);
    assert.equal(normalized.pathSurfaceBlendFeatherMeters, 0.7);
    assert.equal(normalized.pathSurfaceEdgeWarpMeters, 0.04);
    assert.equal(normalized.bedGrassDensity, 0);
    assert.equal(normalized.left.blocks.length, 1);
    assert.equal(normalized.right.blocks.length, 8);
    assert.equal(normalized.trellis.enabled, false);
    assert.equal(normalized.trellis.count, 10);
    const invalidColor = normalizeCottageGardenPlanting({
      left: {
        blocks: [{
          ...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0],
          primary: {
            ...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0].primary,
            roseColorSelectionId: "unknown-color",
          },
        }],
      },
    });
    assert.equal(
      invalidColor.left.blocks[0].primary.roseColorSelectionId,
      "mixed",
    );
  });

  it("不再支持的旧庭院花种确定性迁移为合法玫瑰高度和配色", () => {
    const fallback = COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0].primary;
    const normalized = normalizeCottageGardenPlanting({
      left: {
        blocks: [{
          ...COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks[0],
          primary: {
            speciesId: "lily",
            count: 12,
            heightMinMeters: 1.5,
            heightMaxMeters: 2,
            scale: 1.7,
            primaryColor: "#123456",
            secondaryColor: "#234567",
            accentColor: "#345678",
          },
        }],
      },
    });
    assert.equal(normalized.left.blocks[0].primary.speciesId, "classic-rose");
    assert.equal(normalized.left.blocks[0].primary.heightMinMeters, fallback.heightMinMeters);
    assert.equal(normalized.left.blocks[0].primary.heightMaxMeters, fallback.heightMaxMeters);
    assert.equal(normalized.left.blocks[0].primary.primaryColor, fallback.primaryColor);
    assert.equal(normalized.left.blocks[0].primary.roseColorSelectionId, "mixed");
  });

  it("合法向日葵配置保持物种身份，并从模型库参数中只覆盖茎长", () => {
    const normalized = normalizeCottageGardenPlanting({
      left: {
        blocks: [COTTAGE_GARDEN_PLANTING_DEFAULTS.left.blocks.at(-1)],
      },
    });
    assert.equal(normalized.left.blocks[0].primary.speciesId, "sunflower");
    assert.equal(normalized.left.blocks[0].primary.scale, 0.38);

    const parameters = resolveSunflowerParameters({ stemLength: 3.25 });
    assert.equal(parameters.stemLength, 3.25);
    assert.equal(
      parameters.headScale,
      SUNFLOWER_CUSTOM_CONFIGURATION.values.headScale,
    );
    assert.equal(
      parameters.discFloretCount,
      SUNFLOWER_CUSTOM_CONFIGURATION.values.discFloretCount,
    );
    assert.equal(
      parameters.leafLength,
      SUNFLOWER_CUSTOM_CONFIGURATION.values.leafLength,
    );
  });
});
