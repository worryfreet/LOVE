import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASSIC_ROSE_POPULATION_PETAL_SEGMENTS,
  createClassicRoseBlueprint,
  createClassicRosePopulationGeometry,
  createClassicRosePopulationPrototype,
  createMorningGloryAttachmentGeometry,
} from "../src/entities/model";
import {
  projectGardenFlowerHeightPixels,
  resolveGardenFlowerQuality,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenFlowerLod";
import { CLASSIC_ROSE_CUSTOM_CONFIGURATION } from "../src/entities/model/model/flowers/classicRoseParameters";

describe("花园模型库花朵人口原型与 LOD", () => {
  it("玫瑰四档共享模型身份和器官数，同时按画质递减几何预算", () => {
    const blueprint = createClassicRoseBlueprint();
    const currentConfiguration = CLASSIC_ROSE_CUSTOM_CONFIGURATION.values;
    const petalCount = Number(currentConfiguration.petalCount);
    const calyxCount = Number(currentConfiguration.calyxCount);
    const thornCount = Number(currentConfiguration.thornCount);
    const ultra = createClassicRosePopulationPrototype("ultra");
    const high = createClassicRosePopulationPrototype("high");
    const medium = createClassicRosePopulationPrototype("medium");
    const low = createClassicRosePopulationPrototype("low");
    try {
      assert.equal(blueprint.petalCount, petalCount);
      assert.equal(
        blueprint.parameters.goldenAngle,
        currentConfiguration.goldenAngle,
      );
      assert.equal(
        blueprint.parameters.innerTilt,
        currentConfiguration.innerTilt,
      );
      assert.equal(
        blueprint.parameters.outerAngle,
        currentConfiguration.outerAngle,
      );
      assert.equal(blueprint.bloomScale, currentConfiguration.bloomScale);
      assert.equal(
        Object.values(blueprint.crownBands).reduce(
          (total, band) => total + band.placements.length,
          0,
        ),
        petalCount,
      );
      assert.ok(
        Object.values(blueprint.crownBands).every(
          ({ placements }) => placements.length > 0,
        ),
      );
      assert.ok(
        blueprint.crownBands.inner.shape.length <
          blueprint.crownBands.transition.shape.length,
      );
      assert.ok(
        blueprint.crownBands.transition.shape.length <
          blueprint.crownBands.cup.shape.length,
      );
      assert.ok(
        blueprint.crownBands.cup.shape.length <
          blueprint.crownBands.guard.shape.length,
      );
      assert.ok((blueprint.crownBands.guard.shape.tipWidth ?? 0) > 0);
      assert.ok(blueprint.crownBands.guard.shape.noiseAmplitude <= 0.008);
      assert.deepEqual(
        blueprint.leafSprigs.map((sprig) => sprig.leafTwist),
        [0.035, -0.035],
      );
      assert.deepEqual(
        [ultra, high, medium, low].map((prototype) => prototype.organCounts),
        Array.from({ length: 4 }, () => ({
          petals: petalCount,
          leaves: 6,
          stems: 1,
          rachises: 2,
          sepals: calyxCount,
          thorns: thornCount,
          receptacles: 1,
        })),
      );
      assert.equal(ultra.blueprintFingerprint, blueprint.fingerprint);
      assert.equal(high.blueprintFingerprint, blueprint.fingerprint);
      assert.equal(medium.blueprintFingerprint, blueprint.fingerprint);
      assert.equal(low.blueprintFingerprint, blueprint.fingerprint);
      assert.equal(
        ultra.petalGeometry.userData.representationSignature,
        "classic-rose-studio-petal-static-bloom-v3-wind-phase",
      );
      assert.equal(ultra.petalGeometry.userData.placementTiltPreserved, true);
      assert.equal(ultra.leafGeometry.userData.sepalCount, calyxCount);
      assert.equal(ultra.structureGeometry.userData.rachisCount, 2);
      assert.equal(ultra.structureGeometry.userData.thornCount, thornCount);
      assert.ok(
        ultra.petalGeometry.getAttribute("position").count >
          high.petalGeometry.getAttribute("position").count,
      );
      assert.ok(
        high.petalGeometry.getAttribute("position").count >
          medium.petalGeometry.getAttribute("position").count,
      );
      assert.ok(
        medium.petalGeometry.getAttribute("position").count >
          low.petalGeometry.getAttribute("position").count,
      );
      assert.ok(ultra.petalGeometry.getAttribute("flowerPetalTone"));
      const petalFlex = ultra.petalGeometry.getAttribute("flowerWindFlex");
      const petalPhase = ultra.petalGeometry.getAttribute("flowerWindPhase");
      assert.equal(petalFlex.count, petalPhase.count);
      const phases = new Set<number>();
      let maximumFlex = 0;
      for (let index = 0; index < petalPhase.count; index += 1) {
        phases.add(Math.round(petalPhase.getX(index) * 1_000) / 1_000);
        maximumFlex = Math.max(maximumFlex, petalFlex.getX(index));
      }
      assert.ok(phases.size >= Math.min(petalCount, 10));
      assert.equal(maximumFlex, 1);
      assert.deepEqual(CLASSIC_ROSE_POPULATION_PETAL_SEGMENTS.low, {
        length: 8,
        width: 4,
      });
      const lowColors = low.petalGeometry.getAttribute("color");
      let minimumTone = Number.POSITIVE_INFINITY;
      let maximumTone = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < lowColors.count; index += 1) {
        minimumTone = Math.min(minimumTone, lowColors.getX(index));
        maximumTone = Math.max(maximumTone, lowColors.getX(index));
      }
      assert.ok(minimumTone <= 0.45);
      assert.ok(maximumTone >= 0.99);
      assert.ok(ultra.sourceHeightMeters > 0.8);
    } finally {
      ultra.dispose();
      high.dispose();
      medium.dispose();
      low.dispose();
    }
  });

  it("兼容展平接口仍保留同一 Blueprint 与完整器官", () => {
    const geometry = createClassicRosePopulationGeometry("medium");
    try {
      assert.equal(geometry.userData.source, "model-library-blueprint");
      assert.equal(
        geometry.userData.organCounts.petals,
        Number(CLASSIC_ROSE_CUSTOM_CONFIGURATION.values.petalCount),
      );
      assert.equal(geometry.userData.organCounts.leaves, 6);
      assert.equal(
        geometry.userData.organCounts.sepals,
        Number(CLASSIC_ROSE_CUSTOM_CONFIGURATION.values.calyxCount),
      );
      assert.equal(
        geometry.userData.organCounts.thorns,
        Number(CLASSIC_ROSE_CUSTOM_CONFIGURATION.values.thornCount),
      );
      assert.ok(geometry.getAttribute("flowerPetalTone"));
      assert.ok(geometry.getAttribute("color"));
      assert.ok(geometry.getAttribute("uv"));
      assert.ok(geometry.getAttribute("flowerWindFlex"));
      assert.ok(geometry.getAttribute("flowerWindPhase"));
    } finally {
      geometry.dispose();
    }
  });

  it("牵牛花心形叶与连续漏斗花冠均从模型库按三档生成", () => {
    const ultraLeaf = createMorningGloryAttachmentGeometry("leaf", "ultra");
    const mediumLeaf = createMorningGloryAttachmentGeometry("leaf", "medium");
    const ultraBloom = createMorningGloryAttachmentGeometry("bloom", "ultra");
    const mediumBloom = createMorningGloryAttachmentGeometry("bloom", "medium");
    try {
      assert.equal(ultraLeaf.userData.modelId, "morning-glory");
      assert.equal(ultraBloom.userData.attachmentKind, "bloom");
      assert.ok(
        ultraLeaf.getAttribute("position").count >
          mediumLeaf.getAttribute("position").count,
      );
      assert.ok(
        ultraBloom.getAttribute("position").count >
          mediumBloom.getAttribute("position").count,
      );
    } finally {
      ultraLeaf.dispose();
      mediumLeaf.dispose();
      ultraBloom.dispose();
      mediumBloom.dispose();
    }
  });

  it("投影尺寸与距离保护使用双阈值滞回，不在边界来回抖动", () => {
    const inspectionProbe = {
      distanceMeters: 1.1,
      sourceHeightMeters: 0.86,
      verticalFovDegrees: 50,
      viewportHeightPixels: 1080,
    };
    assert.ok(projectGardenFlowerHeightPixels(inspectionProbe) > 320);
    assert.equal(
      resolveGardenFlowerQuality("medium", inspectionProbe),
      "ultra",
    );

    const highProbe = { ...inspectionProbe, distanceMeters: 4 };
    assert.equal(resolveGardenFlowerQuality("ultra", highProbe), "high");
    assert.equal(resolveGardenFlowerQuality("low", highProbe), "high");

    const mediumProbe = {
      distanceMeters: 12,
      sourceHeightMeters: 0.7,
      verticalFovDegrees: 38,
      viewportHeightPixels: 936,
    };
    assert.equal(resolveGardenFlowerQuality("high", mediumProbe), "medium");
    assert.equal(resolveGardenFlowerQuality("low", mediumProbe), "medium");

    const mediumHysteresisProbe = { ...mediumProbe, distanceMeters: 17 };
    assert.equal(
      resolveGardenFlowerQuality("medium", mediumHysteresisProbe),
      "medium",
    );
    assert.equal(resolveGardenFlowerQuality("low", mediumHysteresisProbe), "low");

    const mediumExitProbe = { ...mediumProbe, distanceMeters: 20 };
    assert.equal(resolveGardenFlowerQuality("medium", mediumExitProbe), "low");

    const farProbe = { ...mediumProbe, distanceMeters: 28 };
    assert.equal(resolveGardenFlowerQuality("high", farProbe), "low");
    assert.equal(resolveGardenFlowerQuality("low", farProbe), "low");

    const gateForegroundProbe = {
      distanceMeters: 5,
      sourceHeightMeters: 0.7,
      verticalFovDegrees: 38,
      viewportHeightPixels: 936,
    };
    assert.ok(projectGardenFlowerHeightPixels(gateForegroundProbe) > 180);
    assert.equal(
      resolveGardenFlowerQuality("low", gateForegroundProbe),
      "high",
    );
  });
});
