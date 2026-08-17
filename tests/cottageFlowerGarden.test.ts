import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COTTAGE_BLOCK_RECT,
  COTTAGE_COLLISION_RECT,
  COTTAGE_FLOWER_FIELD_RECTS,
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_FLOWER_GARDEN_SPACE_GRAPH,
  COTTAGE_HELD_OUT_REVIEW_VIEW,
  COTTAGE_MEADOW_REFERENCE_VIEW,
  COTTAGE_REVIEW_VIEWS,
  COTTAGE_SIDE_EXTERIOR_REVIEW_VIEW,
  isCottageFlowerGardenWalkable,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenLayout";
import {
  COTTAGE_ARCHITECTURE,
  COTTAGE_ARCHITECTURE_MEASUREMENTS,
} from "../src/entities/scene/items/cottage-flower-garden/model/cottageArchitecture";
import {
  COTTAGE_EXTERIOR_KIT,
  type CottageExteriorBox,
  type CottageFacadeOpening,
} from "../src/entities/scene/items/cottage-flower-garden/model/cottageExterior";
import {
  COTTAGE_DETAIL_SYSTEM,
  createCottageDetailSystem,
} from "../src/entities/scene/items/cottage-flower-garden/model/cottageDetails";
import {
  COTTAGE_FENCE_SYSTEM,
  createFencePostCapOccurrence,
  createFenceSystem,
} from "../src/entities/scene/items/cottage-flower-garden/model/fenceSystem";
import {
  COTTAGE_GARDEN_FAR_MEADOW_PROFILE,
  COTTAGE_FLOWER_GARDEN_NATURE,
  createCottageGardenTerrainMeshData,
  sampleCottageFlowerGardenTerrainHeight,
  sampleCottageGardenSurfaceVariation,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenTerrain";
import {
  COTTAGE_GARDEN_RENDERING,
  sampleCottageGardenFogFactor,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenRendering";
import {
  COTTAGE_GARDEN_ATMOSPHERE_RENDERING,
  createCottageGardenSunHaloPixels,
  createCottageGardenSunSurfacePixels,
  createCottageGardenSunVeilPixels,
  resolveCottageGardenSkyDirection,
  resolveCottageGardenSunAngularDiameterDegrees,
  resolveCottageGardenSunPosition,
  resolveCottageGardenSunSoftnessRatio,
  sampleCottageGardenCloudDomain,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenAtmosphere";
import {
  COTTAGE_GARDEN_FLAGSTONE_STYLE,
  COTTAGE_GARDEN_FIELDSTONE_PATH,
  createCottageGardenFieldstonePath,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenPath";
import {
  COTTAGE_GARDEN_FLOWER_LAYERS,
  COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES,
  COTTAGE_GARDEN_MEADOW_TRANSITION_ZONES,
  COTTAGE_GARDEN_WILDFLOWER_MEADOW,
  createCottageGardenFlowerInstanceData,
  resolveCottageGardenFlowerLayerInstanceCount,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenWildflowerMeadow";
import {
  COTTAGE_GARDEN_COURTYARD_DOMAIN,
  COTTAGE_GARDEN_MEADOW_EXCLUSIONS,
  COTTAGE_GARDEN_MEADOW_FIELD,
  COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD,
  sampleCottageGardenMeadowDomain,
  sampleCottageGardenMeadowHabitat,
  sampleCottageGardenPathSurfaceBlend,
  signedDistanceToCottageGardenMeadowExclusions,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenMeadowHabitat";
import {
  COTTAGE_GARDEN_GRASS_LAYERS,
  COTTAGE_GARDEN_MEADOW_GREEN_PALETTE,
  createCottageGardenGrassInstanceData,
  resolveCottageGardenGrassLayerInstanceCount,
  type CottageGardenGrassLayerSpec,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenMeadowGrass";
import {
  COTTAGE_GARDEN_TIME_ORDER,
  COTTAGE_GARDEN_TIME_PRESETS,
  sampleCottageGardenTime,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenTime";

describe("花海小院阶段一空间骨架", () => {
  it("冻结用户指定的统一米制尺度", () => {
    const { garden, cottage, flowerField, mainPath, visitor } =
      COTTAGE_FLOWER_GARDEN_LAYOUT;

    assert.equal(COTTAGE_FLOWER_GARDEN_LAYOUT.units, "meter");
    assert.deepEqual([garden.width, garden.length], [22, 38]);
    assert.deepEqual([cottage.width, cottage.depth], [8, 6.5]);
    assert.equal(COTTAGE_ARCHITECTURE_MEASUREMENTS.interiorArea > 45, true);
    assert.equal(flowerField.visualHeight, 1.5);
    assert.equal(mainPath.width, 2.2);
    assert.equal(mainPath.length, 18.25 - COTTAGE_ARCHITECTURE_MEASUREMENTS.stepFrontZ);
    assert.equal(visitor.eyeHeight, 1.42);
    assert.equal(visitor.spawn[1], visitor.eyeHeight);
    assert.ok(visitor.spawn[0] < -garden.width / 2);
    assert.ok(visitor.spawn[2] > garden.length / 2);
    assert.ok(visitor.initialTarget[0] > visitor.spawn[0]);
    assert.ok(visitor.initialTarget[2] < visitor.spawn[2]);
    assert.equal(
      isCottageFlowerGardenWalkable({
        x: visitor.spawn[0],
        z: visitor.spawn[2],
      }),
      true,
    );
  });

  it("以主路为轴对称布置两侧花田，并让主路抵达小屋正面", () => {
    const [west, east] = COTTAGE_FLOWER_FIELD_RECTS;
    const { mainPath, cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;

    assert.equal(west.centerX, -east.centerX);
    assert.equal(west.width, east.width);
    assert.ok(west.length >= mainPath.length);
    assert.ok(east.length >= mainPath.length);
    assert.equal(mainPath.centerX, cottage.centerX);
    const stepFrontWorldZ =
      cottage.centerZ + COTTAGE_EXTERIOR_KIT.measurements.stepFrontZ;
    assert.equal(mainPath.centerZ - mainPath.length / 2, stepFrontWorldZ);
    assert.deepEqual(COTTAGE_BLOCK_RECT, {
      centerX: 0,
      centerZ: -14.01,
      width: 8,
      length: 6.5,
    });
    assert.ok(COTTAGE_COLLISION_RECT.length > COTTAGE_BLOCK_RECT.length);
  });

  it("允许穿行庭院花区，同时保持入口路线并阻挡实体体块", () => {
    for (let z = -9.6; z <= 17.4; z += 0.6) {
      assert.equal(
        isCottageFlowerGardenWalkable({ x: 0, z }),
        true,
        `主路中心 z=${z.toFixed(1)} 应可行走`,
      );
    }

    assert.equal(isCottageFlowerGardenWalkable({ x: 0, z: -14.01 }), true);
    assert.equal(isCottageFlowerGardenWalkable({ x: 3.62, z: -14.01 }), false);
    const doorPlaneZ =
      COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
      COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2;
    assert.equal(
      isCottageFlowerGardenWalkable({ x: 0, z: doorPlaneZ - 0.08 }),
      false,
    );
    assert.equal(
      isCottageFlowerGardenWalkable({ x: 0, z: doorPlaneZ - 0.08 }, true),
      true,
    );
    assert.equal(
      isCottageFlowerGardenWalkable({
        x: COTTAGE_FLOWER_FIELD_RECTS[0].centerX,
        z: COTTAGE_FLOWER_FIELD_RECTS[0].centerZ,
      }),
      true,
    );
    assert.equal(
      isCottageFlowerGardenWalkable({
        x: COTTAGE_FLOWER_FIELD_RECTS[1].centerX,
        z: COTTAGE_FLOWER_FIELD_RECTS[1].centerZ,
      }),
      true,
    );
    assert.equal(isCottageFlowerGardenWalkable({ x: 0, z: 19 }), true);
    assert.equal(isCottageFlowerGardenWalkable({ x: 4, z: 19 }), false);
    assert.equal(isCottageFlowerGardenWalkable({ x: 11, z: 0 }), false);
    assert.equal(isCottageFlowerGardenWalkable({ x: 0, z: 22 }), true);
  });

  it("尺寸驱动围栏覆盖小院边界并在南侧中央保留 3.2 米入口", () => {
    assert.equal(COTTAGE_FENCE_SYSTEM.sections.length, 5);
    assert.equal(COTTAGE_FENCE_SYSTEM.measurements.perimeter, 120);
    assert.equal(COTTAGE_FENCE_SYSTEM.measurements.fencedLength, 116.8);
    assert.equal(COTTAGE_FENCE_SYSTEM.measurements.gateOpeningWidth, 3.2);
  });

  it("空间图从花园入口连续连接到可进入的小屋室内", () => {
    assert.deepEqual(
      COTTAGE_FLOWER_GARDEN_SPACE_GRAPH.map((node) => node.id),
      [
        "space.outer-meadow",
        "space.garden-entry",
        "route.main-path",
        "space.garden-court",
        "zone.cottage-porch",
        "portal.cottage-door",
        "zone.cottage-threshold",
        "space.cottage-living",
        "zone.cottage-hearth",
        "zone.cottage-memory-wall",
        "zone.cottage-sleeping-nook",
      ],
    );
  });
});

function panelOverlapsOpening(
  panel: CottageExteriorBox,
  opening: CottageFacadeOpening,
) {
  const panelMinX = panel.position[0] - panel.size[0] / 2;
  const panelMaxX = panel.position[0] + panel.size[0] / 2;
  const panelMinY = panel.position[1] - panel.size[1] / 2;
  const panelMaxY = panel.position[1] + panel.size[1] / 2;
  const openingMinX = opening.centerX - opening.width / 2;
  const openingMaxX = opening.centerX + opening.width / 2;
  const openingMinY = opening.bottomY;
  const openingMaxY = opening.bottomY + opening.height;
  return (
    Math.min(panelMaxX, openingMaxX) - Math.max(panelMinX, openingMinX) >
      1e-8 &&
    Math.min(panelMaxY, openingMaxY) - Math.max(panelMinY, openingMinY) > 1e-8
  );
}

describe("花海小院阶段三小屋 Exterior Shell", () => {
  it("冻结八类外壳模块和花海优先的低矮比例", () => {
    assert.deepEqual(COTTAGE_EXTERIOR_KIT.moduleIds, [
      "Foundation",
      "Wall",
      "Roof",
      "Door",
      "Window",
      "Porch",
      "Steps",
      "StructuralBeams",
    ]);
    const { measurements } = COTTAGE_EXTERIOR_KIT;
    assert.deepEqual([measurements.width, measurements.depth], [8, 6.5]);
    assert.equal(measurements.ridgeHeight, COTTAGE_ARCHITECTURE.datums.ridge);
    assert.ok(
      measurements.width / COTTAGE_FLOWER_GARDEN_LAYOUT.garden.width < 0.4,
    );
    assert.ok(
      measurements.ridgeHeight /
        COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.visualHeight <
        3,
    );
  });

  it("以切分墙板形成真实门窗开口，不在实体墙前粘贴门窗", () => {
    assert.deepEqual(
      COTTAGE_EXTERIOR_KIT.openings.map((opening) => opening.module),
      ["Door", "Window", "Window"],
    );
    assert.ok(COTTAGE_EXTERIOR_KIT.frontWallPanels.length > 8);
    COTTAGE_EXTERIOR_KIT.frontWallPanels.forEach((panel) => {
      COTTAGE_EXTERIOR_KIT.openings.forEach((opening) => {
        assert.equal(
          panelOverlapsOpening(panel, opening),
          false,
          `${panel.id} 不应覆盖 ${opening.id}`,
        );
      });
    });
  });

  it("让主路、三级台阶与门廊连续衔接", () => {
    const { cottage, mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
    const pathNorthZ = mainPath.centerZ - mainPath.length / 2;
    const stepFrontWorldZ =
      cottage.centerZ + COTTAGE_EXTERIOR_KIT.measurements.stepFrontZ;
    assert.equal(pathNorthZ, stepFrontWorldZ);
    assert.equal(
      COTTAGE_EXTERIOR_KIT.boxes.filter((part) => part.module === "Steps")
        .length,
      cottage.stepCount,
    );
    assert.ok(
      COTTAGE_EXTERIOR_KIT.measurements.porchFrontZ >
        COTTAGE_EXTERIOR_KIT.measurements.frontWallZ,
    );
  });

  it("建立五个完成面眼高一致、中心线连续且可停靠的固定视角", () => {
    assert.deepEqual(Object.keys(COTTAGE_REVIEW_VIEWS), [
      "gate",
      "path-25",
      "path-50",
      "path-75",
      "cottage-door",
    ]);
    const views = Object.values(COTTAGE_REVIEW_VIEWS);
    views.forEach((view) => {
      assert.equal(view.position[0], 0);
      assert.equal(
        view.position[1],
        view.id === "cottage-door"
          ? COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight +
              COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.porchTop
          : COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
      );
      assert.equal(
        isCottageFlowerGardenWalkable({
          x: view.position[0],
          z: view.position[2],
        }),
        true,
        `${view.label} 必须可停靠`,
      );
      assert.ok(view.fov >= 24 && view.fov <= 58);
    });
    assert.ok(
      COTTAGE_REVIEW_VIEWS.gate.fov < COTTAGE_REVIEW_VIEWS["path-50"].fov,
    );
    for (let index = 1; index < views.length; index += 1) {
      assert.ok(views[index].position[2] < views[index - 1].position[2]);
    }
    assert.ok(COTTAGE_HELD_OUT_REVIEW_VIEW.position[0] < -11);
    assert.ok(COTTAGE_HELD_OUT_REVIEW_VIEW.position[1] > 3.5);
    assert.ok(
      COTTAGE_SIDE_EXTERIOR_REVIEW_VIEW.position[0] <
        COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX -
          COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.width / 2,
    );
    assert.equal(
      COTTAGE_SIDE_EXTERIOR_REVIEW_VIEW.position[2],
      COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ,
    );
  });

  it("以确定性 occurrence 补齐石基、木板墙、木瓦、檐口与门廊构造", () => {
    const replay = createCottageDetailSystem();
    assert.deepEqual(COTTAGE_DETAIL_SYSTEM, replay);
    assert.ok(replay.counts["foundation-stone"] > 150);
    assert.ok(replay.counts["siding-plank"] > 70);
    assert.ok(replay.counts["roof-shingle"] > 450);
    assert.equal(replay.counts["rafter-tail"], 24);
    assert.equal(replay.counts["ridge-cap"], 1);
    assert.equal(replay.counts["porch-board"], 30);
    assert.equal(replay.counts["step-board"], 45);
    assert.equal(replay.counts["window-sill"], 2);
    assert.equal(
      new Set(replay.occurrences.map((occurrence) => occurrence.id)).size,
      replay.occurrences.length,
    );
    replay.occurrences.forEach((occurrence) => {
      assert.ok(occurrence.size.every((value) => value > 0));
      assert.ok(occurrence.tone >= 0 && occurrence.tone <= 1);
    });
  });
});

describe("花海小院阶段四程序化 FenceSystem", () => {
  it("生成普通柱、角柱、门柱、尖板、围栏段和双扇大门语义", () => {
    assert.equal(
      COTTAGE_FENCE_SYSTEM.posts.filter((post) => post.kind === "corner")
        .length,
      4,
    );
    assert.equal(
      COTTAGE_FENCE_SYSTEM.posts.filter((post) => post.kind === "gate").length,
      2,
    );
    assert.ok(
      COTTAGE_FENCE_SYSTEM.posts.some((post) => post.kind === "regular"),
    );
    assert.ok(COTTAGE_FENCE_SYSTEM.boards.length > 150);
    assert.equal(COTTAGE_FENCE_SYSTEM.rails.length, 118);
    assert.equal(COTTAGE_FENCE_SYSTEM.gates.length, 2);
    assert.equal(
      new Set(
        COTTAGE_FENCE_SYSTEM.posts.map(
          (post) => `${post.position[0]}:${post.position[2]}`,
        ),
      ).size,
      COTTAGE_FENCE_SYSTEM.posts.length,
    );
  });

  it("双扇门向庭院内侧张开并为主路中心保留通行净空", () => {
    const [west, east] = COTTAGE_FENCE_SYSTEM.gates;
    const westEndX = west.pivot[0] + west.direction[0] * west.width;
    const eastEndX = east.pivot[0] + east.direction[0] * east.width;
    assert.ok(west.direction[1] < 0 && east.direction[1] < 0);
    assert.ok(eastEndX - westEndX > 1.6);
    assert.equal(isCottageFlowerGardenWalkable({ x: 0, z: 19 }), true);
  });

  it("为双扇门生成斜撑、铰链、锁片和可追溯五金", () => {
    assert.equal(
      COTTAGE_FENCE_SYSTEM.gateParts.filter((part) => part.kind === "brace")
        .length,
      2,
    );
    assert.equal(
      COTTAGE_FENCE_SYSTEM.hardware.filter(
        (part) => part.kind === "hinge-strap",
      ).length,
      4,
    );
    assert.equal(
      COTTAGE_FENCE_SYSTEM.hardware.filter((part) => part.kind === "hinge-pin")
        .length,
      4,
    );
    assert.equal(
      COTTAGE_FENCE_SYSTEM.hardware.filter((part) => part.kind === "latch")
        .length,
      2,
    );
    assert.equal(
      new Set(COTTAGE_FENCE_SYSTEM.hardware.map((part) => part.id)).size,
      COTTAGE_FENCE_SYSTEM.hardware.length,
    );
  });

  it("所有木桩帽与桩身严格共中心并贴合桩顶", () => {
    assert.equal(
      COTTAGE_FENCE_SYSTEM.postCaps.length,
      COTTAGE_FENCE_SYSTEM.posts.length,
    );
    const posts = new Map(
      COTTAGE_FENCE_SYSTEM.posts.map((post) => [post.id, post]),
    );
    COTTAGE_FENCE_SYSTEM.postCaps.forEach((cap) => {
      const post = posts.get(cap.postId);
      assert.ok(post);
      assert.equal(cap.position[0], post.position[0]);
      assert.equal(cap.position[2], post.position[2]);
      const postTop = post.position[1] + post.size[1] / 2;
      const capBottom = cap.position[1] - cap.size[1] / 2;
      assert.ok(Math.abs(capBottom - postTop) <= 0.01);
      assert.deepEqual(createFencePostCapOccurrence(post), cap);
    });
  });

  it("庭院改为 26 × 45 米时自动重算边界与构件数量", () => {
    const resized = createFenceSystem({
      ...COTTAGE_FENCE_SYSTEM.options,
      gardenWidth: 26,
      gardenLength: 45,
    });
    assert.equal(resized.measurements.perimeter, 142);
    assert.equal(resized.measurements.fencedLength, 138.8);
    assert.ok(resized.posts.length > COTTAGE_FENCE_SYSTEM.posts.length);
    assert.ok(resized.boards.length > COTTAGE_FENCE_SYSTEM.boards.length);
    assert.ok(resized.posts.some((post) => Math.abs(post.position[0]) === 13));
    assert.ok(
      resized.posts.some((post) => Math.abs(post.position[2]) === 22.5),
    );
  });
});

describe("花海小院第二层草地与地形系统", () => {
  it("以同一确定性高度场保持小院水平并让外围形成连续低幅起伏", () => {
    const flatProbes = [
      [0, 0],
      [-11, -19],
      [11, 19],
      [0, 17.4],
    ] as const;
    flatProbes.forEach(([x, z]) => {
      assert.equal(sampleCottageFlowerGardenTerrainHeight(x, z), 0);
    });

    const heights: number[] = [];
    for (let z = -100; z <= 100; z += 10) {
      for (let x = -100; x <= 100; x += 10) {
        const height = sampleCottageFlowerGardenTerrainHeight(x, z);
        assert.equal(Number.isFinite(height), true);
        heights.push(height);
      }
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) > 1);
    assert.ok(heights.every((height) => Math.abs(height) < 3.5));
    assert.equal(
      sampleCottageFlowerGardenTerrainHeight(42, -33),
      sampleCottageFlowerGardenTerrainHeight(42, -33),
    );
  });

  it("生成拓扑、索引和米制包络稳定的连续 Ground Mesh", () => {
    const data = createCottageGardenTerrainMeshData(12);
    assert.equal(data.vertexCount, 169);
    assert.equal(data.triangleCount, 288);
    assert.equal(data.positions.length, data.vertexCount * 3);
    assert.equal(data.uvs.length, data.vertexCount * 2);
    assert.ok(Array.from(data.positions).every(Number.isFinite));
    assert.ok(
      Array.from(data.indices).every((index) => index < data.vertexCount),
    );

    const centerVertex = 6 * 13 + 6;
    assert.equal(data.positions[centerVertex * 3 + 1], 0);
  });

  it("表面变化场保持有限、确定且具有可见但受控的颜色与材质跨度", () => {
    const values: number[] = [];
    for (let z = -60; z <= 60; z += 8) {
      for (let x = -60; x <= 60; x += 8) {
        values.push(sampleCottageGardenSurfaceVariation(x, z));
      }
    }
    assert.ok(values.every((value) => value >= 0 && value <= 1));
    assert.ok(Math.max(...values) - Math.min(...values) > 0.25);
    assert.equal(
      sampleCottageGardenSurfaceVariation(8.5, -12.25),
      sampleCottageGardenSurfaceVariation(8.5, -12.25),
    );
    assert.deepEqual(
      [
        COTTAGE_FLOWER_GARDEN_NATURE.surface.roughnessMin,
        COTTAGE_FLOWER_GARDEN_NATURE.surface.roughnessMax,
      ],
      [0.94, 1],
    );
    assert.equal(COTTAGE_FLOWER_GARDEN_NATURE.surface.normalStrength, 0.012);
  });

  it("使用连续短密草皮而不是逐根长草几何", () => {
    assert.equal(
      COTTAGE_FLOWER_GARDEN_NATURE.turf.representation,
      "continuous-clipped-turf",
    );
    assert.equal(
      COTTAGE_FLOWER_GARDEN_NATURE.turf.individualBladeGeometry,
      false,
    );
    assert.ok(COTTAGE_FLOWER_GARDEN_NATURE.turf.visualHeightMeters <= 0.04);
    assert.ok(COTTAGE_FLOWER_GARDEN_NATURE.turf.textureRepeat >= 80);
  });

  it("把地形边缘推到动态雾完全收敛之外", () => {
    const { terrain } = COTTAGE_FLOWER_GARDEN_NATURE;
    const maximumFogFar = Math.max(
      ...COTTAGE_GARDEN_TIME_ORDER.map(
        (time) => COTTAGE_GARDEN_TIME_PRESETS[time].fog.far,
      ),
    );
    assert.ok(terrain.width / 2 > maximumFogFar + 70);
    assert.ok(terrain.length / 2 > maximumFogFar + 70);
    assert.equal(terrain.fullyFoggedBeforeEdge, true);
  });
});

describe("花海小院阶段五光、雾与后处理", () => {
  it("冻结 WebGL2 GPU presentation 与无离屏重采样的直接渲染图", () => {
    assert.deepEqual(COTTAGE_GARDEN_RENDERING.backend, {
      renderer: "WebGLRenderer",
      requiredContext: "WebGL2",
      threeRevision: "r180",
      classification: "GPU presentation",
    });
    assert.deepEqual(COTTAGE_GARDEN_RENDERING.presentation.renderGraph, [
      "DirectWebGLRenderer",
    ]);
    assert.equal(
      COTTAGE_GARDEN_RENDERING.output.toneMapping,
      "ACESFilmicToneMapping",
    );
    assert.equal(COTTAGE_GARDEN_RENDERING.output.colorSpace, "SRGBColorSpace");
  });

  it("主光、天空光、环境光与暖色反射补光各自拥有受控贡献", () => {
    const { hemisphere, directional, ambient } =
      COTTAGE_GARDEN_RENDERING.lights;
    assert.ok(hemisphere.intensity > 0);
    assert.ok(directional.intensity > hemisphere.intensity);
    assert.ok(ambient.intensity > 0);
    assert.ok(ambient.intensity < hemisphere.intensity);
    assert.ok(
      COTTAGE_GARDEN_RENDERING.lights.reflectedFill.intensity <
        directional.intensity,
    );
  });

  it("线性雾不再把中远景草地洗成白灰色带", () => {
    assert.equal(sampleCottageGardenFogFactor(0), 0);
    assert.equal(sampleCottageGardenFogFactor(120), 0);
    assert.equal(sampleCottageGardenFogFactor(180), 0);
    assert.equal(sampleCottageGardenFogFactor(320), 0.5);
    assert.equal(sampleCottageGardenFogFactor(460), 1);
  });

  it("表现层不再维护低分辨率 Composer、DOF 或 Bloom 配置", () => {
    assert.equal("post" in COTTAGE_GARDEN_RENDERING, false);
    assert.ok(COTTAGE_GARDEN_RENDERING.output.exposure >= 1);
    assert.equal(COTTAGE_GARDEN_RENDERING.presentation.renderGraph.length, 1);
  });
});

describe("花海小院第一项天空与 3D 太阳升级", () => {
  it("太阳球位于天空穹顶内并与平行光共享同一方向", () => {
    const { sky, sun } = COTTAGE_GARDEN_ATMOSPHERE_RENDERING;
    const duskDirection = sampleCottageGardenTime(
      COTTAGE_GARDEN_TIME_PRESETS.dusk.phase,
    ).sunDirection;
    const position = resolveCottageGardenSunPosition(
      duskDirection,
    );
    assert.ok(Math.abs(Math.hypot(...position) - sun.distance) < 0.001);
    assert.ok(sun.distance + sun.radius < sky.radius);
    assert.ok(resolveCottageGardenSunAngularDiameterDegrees() > 2.5);
    assert.ok(resolveCottageGardenSunAngularDiameterDegrees() < 3);
    assert.ok(resolveCottageGardenSunSoftnessRatio() > 2.5);
    position.forEach((component, index) => {
      const expected =
        duskDirection[index] * sun.distance;
      assert.ok(Math.abs(component - expected) < 0.12);
    });
  });

  it("云层直接采样球面三维方向，跨越经度边界仍连续", () => {
    const epsilon = 0.000_01;
    const elevation = 0.24;
    const left = sampleCottageGardenCloudDomain(
      resolveCottageGardenSkyDirection(Math.PI - epsilon, elevation),
    );
    const right = sampleCottageGardenCloudDomain(
      resolveCottageGardenSkyDirection(-Math.PI + epsilon, elevation),
    );
    assert.ok(Math.hypot(...left.map((value, index) => value - right[index])) < 0.001);
  });

  it("太阳表面贴图可平铺且双层光晕保持中心亮、边缘透明", () => {
    const width = 32;
    const height = 16;
    const surface = createCottageGardenSunSurfacePixels(width, height);
    const replay = createCottageGardenSunSurfacePixels(width, height);
    assert.deepEqual(surface, replay);
    assert.equal(surface.length, width * height * 4);
    for (let y = 0; y < height; y += 1) {
      const first = (y * width) * 4;
      const last = (y * width + width - 1) * 4;
      assert.ok(Math.abs(surface[first] - surface[last]) < 8);
      assert.ok(Math.abs(surface[first + 1] - surface[last + 1]) < 16);
    }

    const haloSize = 32;
    const halo = createCottageGardenSunHaloPixels(haloSize);
    const center = ((haloSize / 2) * haloSize + haloSize / 2) * 4 + 3;
    const corner = 3;
    assert.ok(halo[center] > 240);
    assert.equal(halo[corner], 0);
    const veil = createCottageGardenSunVeilPixels(haloSize);
    assert.ok(veil[center] > 245);
    assert.equal(veil[corner], 0);
    assert.ok(
      COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.outerHalo.diameter >
        COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.innerHalo.diameter,
    );
  });
});

describe("花海小院阶段六非花场景精修", () => {
  it("用一至两块浅石板紧密错缝铺路，并只保留窄绿色草缝", () => {
    const replay = createCottageGardenFieldstonePath();
    const { mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
    assert.deepEqual(COTTAGE_GARDEN_FIELDSTONE_PATH, replay);
    assert.equal(
      COTTAGE_GARDEN_FLAGSTONE_STYLE.representation,
      "close-jointed-flagstone-courses",
    );
    assert.equal(
      COTTAGE_GARDEN_FLAGSTONE_STYLE.jointSurface,
      "terrain-path-surface-blend",
    );
    assert.ok(replay.stones.length > COTTAGE_GARDEN_FLAGSTONE_STYLE.rowCount);
    assert.ok(
      replay.stones.length <= COTTAGE_GARDEN_FLAGSTONE_STYLE.rowCount * 2,
    );
    assert.equal(replay.measurements.minColumnCount, 1);
    assert.equal(replay.measurements.maxColumnCount, 2);
    assert.deepEqual(
      [...new Set(replay.stones.map((stone) => stone.variant))].sort(),
      [0, 1, 2, 3, 4, 5, 6, 7],
    );
    assert.equal(
      new Set(replay.stones.map((stone) => stone.id)).size,
      replay.stones.length,
    );
    assert.ok(
      replay.measurements.minCourseCoverage >=
        mainPath.width * COTTAGE_GARDEN_FLAGSTONE_STYLE.courseCoverageRatio[0],
    );
    assert.ok(
      replay.measurements.maxCourseCoverage <=
        mainPath.width * COTTAGE_GARDEN_FLAGSTONE_STYLE.courseCoverageRatio[1],
    );
    assert.ok(replay.measurements.minLongitudinalGap >= 0.04);
    assert.ok(replay.measurements.maxLongitudinalGap <= 0.16);

    const rowCounts = new Map<number, number>();
    replay.stones.forEach((stone) => {
      const row = Number(stone.id.match(/flagstone-(\d+)-/)?.[1]);
      rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
    });
    assert.equal(rowCounts.size, COTTAGE_GARDEN_FLAGSTONE_STYLE.rowCount);
    assert.ok([...rowCounts.values()].every((count) => count >= 1 && count <= 2));

    replay.stones.forEach((stone) => {
      assert.ok(
        Math.abs(stone.position[0] - mainPath.centerX) + stone.radiusX <=
          mainPath.width / 2 + 1e-9,
      );
      assert.ok(
        Math.abs(stone.position[2] - mainPath.centerZ) + stone.radiusZ <=
          mainPath.length / 2 + 1e-9,
      );
      assert.ok(
        stone.height >= COTTAGE_GARDEN_FLAGSTONE_STYLE.heightMeters[0] &&
          stone.height <= COTTAGE_GARDEN_FLAGSTONE_STYLE.heightMeters[1],
      );
      const visibleRise = stone.position[1] + stone.height;
      assert.ok(
        visibleRise >= COTTAGE_GARDEN_FLAGSTONE_STYLE.visibleRiseMeters[0] &&
          visibleRise <= COTTAGE_GARDEN_FLAGSTONE_STYLE.visibleRiseMeters[1],
      );
      assert.ok(
        Math.abs(stone.rotationY) <=
          COTTAGE_GARDEN_FLAGSTONE_STYLE.maximumYawRadians,
      );
    });
  });

  it("道路颜色软权重在硬无生长边界两侧连续交叉且可确定重放", () => {
    const samples = Array.from({ length: 41 }, (_, index) => {
      const x = 0.72 + index * 0.02;
      return sampleCottageGardenPathSurfaceBlend(x, 4);
    });
    assert.deepEqual(
      samples,
      Array.from({ length: 41 }, (_, index) =>
        sampleCottageGardenPathSurfaceBlend(0.72 + index * 0.02, 4),
      ),
    );
    assert.ok(samples[0] > 0.96);
    assert.ok(samples.at(-1)! < 0.08);
    assert.ok(
      samples.slice(1).every((value, index) =>
        Math.abs(value - samples[index]) < 0.16,
      ),
    );
    assert.ok(samples.some((value) => value > 0.2 && value < 0.8));
  });

  it("正式花海不复活旧的草叶代理配置", () => {
    assert.equal(
      "grassDetail" in COTTAGE_FLOWER_GARDEN_NATURE,
      false,
    );
    assert.equal(
      "groundCover" in COTTAGE_FLOWER_GARDEN_NATURE,
      false,
    );
  });
});

describe("花海小院共享生境与野花层", () => {
  it("用一份确定性生境场统一覆盖率、疏密、物种与高度", () => {
    const first = sampleCottageGardenMeadowHabitat(-42.5, 37.25);
    const replay = sampleCottageGardenMeadowHabitat(-42.5, 37.25);
    assert.deepEqual(first, replay);
    Object.values(first).forEach((value) => {
      assert.ok(value >= 0 && value <= 1);
    });
    assert.equal(COTTAGE_GARDEN_WILDFLOWER_MEADOW.coverage, "shared-habitat-field");
    assert.equal(COTTAGE_GARDEN_MEADOW_FIELD.minimumMeters, -600);
    assert.equal(COTTAGE_GARDEN_MEADOW_FIELD.maximumMeters, 600);
    assert.ok(
      (COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.maximumMeters -
        COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.minimumMeters) /
        COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.textureResolution <
        0.3,
    );
  });

  it("让语义花田连续生长，同时真实排除主路、小屋、围栏和门外通道", () => {
    const exclusionIds = new Set(
      COTTAGE_GARDEN_MEADOW_EXCLUSIONS.map((exclusion) => exclusion.id),
    );
    assert.ok(exclusionIds.has("route.main-path"));
    assert.ok(exclusionIds.has("building.cottage-porch-steps"));
    assert.ok(exclusionIds.has("fence.west"));
    assert.ok(exclusionIds.has("route.gate-approach"));
    assert.equal(sampleCottageGardenMeadowHabitat(0, 4).coverage, 0);
    assert.equal(sampleCottageGardenMeadowHabitat(-5.6, 4).coverage, 1);
    assert.equal(sampleCottageGardenMeadowHabitat(0, -14).coverage, 0);
    assert.equal(sampleCottageGardenMeadowHabitat(0, 21).coverage, 0);
    assert.equal(sampleCottageGardenMeadowHabitat(-80, 90).coverage, 1);
  });

  it("把庭院核心景观与外部距离 LOD 分成互补语义域", () => {
    assert.deepEqual(
      [
        COTTAGE_GARDEN_COURTYARD_DOMAIN.rect.width,
        COTTAGE_GARDEN_COURTYARD_DOMAIN.rect.length,
      ],
      [21.54, 37.54],
    );
    const courtyard = sampleCottageGardenMeadowDomain(-5.6, 4);
    const outer = sampleCottageGardenMeadowDomain(-40, 40);
    const boundary = sampleCottageGardenMeadowDomain(-11, 0);
    assert.deepEqual(courtyard, { courtyard: 1, outerMeadow: 0 });
    assert.deepEqual(outer, { courtyard: 0, outerMeadow: 1 });
    assert.ok(boundary.courtyard > 0 && boundary.courtyard < 1);
    for (const sample of [courtyard, outer, boundary]) {
      assert.ok(Math.abs(sample.courtyard + sample.outerMeadow - 1) < 1e-9);
    }
  });

  it("用米制有符号距离柔化边界，不再留下矩形硬切线", () => {
    const inside = signedDistanceToCottageGardenMeadowExclusions(-11, 0);
    const feathered = sampleCottageGardenMeadowHabitat(-11.9, 0).coverage;
    const outside = sampleCottageGardenMeadowHabitat(-13, 0).coverage;
    assert.ok(inside < 0);
    assert.ok(feathered > 0 && feathered < 1);
    assert.equal(outside, 1);
  });

  it("近景与中景使用确定性紧凑属性，不创建逐实例矩阵", () => {
    for (const layer of COTTAGE_GARDEN_FLOWER_LAYERS) {
      const first = createCottageGardenFlowerInstanceData(
        layer,
        "pink-cosmos",
        91,
      );
      const replay = createCottageGardenFlowerInstanceData(
        layer,
        "pink-cosmos",
        91,
      );
      assert.deepEqual(first, replay);
      assert.equal(first.roots.length, first.count * 2);
      assert.equal(first.shapes.length, first.count * 4);
      assert.equal(first.count, resolveCottageGardenFlowerLayerInstanceCount(layer));
      if (layer.distanceFade) {
        assert.ok(layer.fieldSizeMeters / 2 > layer.fadeOutMeters[1]);
      }
    }
    assert.equal(COTTAGE_GARDEN_WILDFLOWER_MEADOW.updateMode, "camera-uniform-only");
    assert.equal(COTTAGE_GARDEN_WILDFLOWER_MEADOW.instanceUploadBytesPerFrame, 0);
  });

  it("完整近花、中景竖直花簇和远景聚合拥有宽重叠预算", () => {
    const [courtyard, near, middle, farSilhouette] =
      COTTAGE_GARDEN_FLOWER_LAYERS;
    assert.equal(courtyard.id, "courtyard");
    assert.equal(courtyard.domain, "courtyard");
    assert.equal(courtyard.cameraWrapped, false);
    assert.equal(courtyard.distanceFade, false);
    assert.equal(near.geometryDetail, "individual");
    assert.equal(middle.geometryDetail, "upright-cluster");
    assert.equal(farSilhouette.geometryDetail, "upright-cluster");
    assert.ok(near.fadeOutMeters[1] > middle.fadeInMeters[0]);
    assert.equal(middle.fadeOutMeters[1], 72);
    assert.ok(middle.candidatesPerSquareMeterPerSpecies >= 0.06);
    assert.ok(farSilhouette.fadeInMeters[0] < middle.fadeOutMeters[1]);
    assert.deepEqual(COTTAGE_GARDEN_MEADOW_TRANSITION_ZONES.nearToMiddle, {
      startMeters: 18,
      endMeters: 32,
      strategy: "overlap-complementary-stable-dither",
    });
    assert.deepEqual(COTTAGE_GARDEN_MEADOW_TRANSITION_ZONES.middleToFar, {
      startMeters: 42,
      endMeters: 72,
      strategy: "overlap-cluster-silhouette-mip-aggregate",
    });
    assert.equal(resolveCottageGardenFlowerLayerInstanceCount(courtyard), 1_760);
    assert.equal(resolveCottageGardenFlowerLayerInstanceCount(near), 4_406);
    assert.equal(resolveCottageGardenFlowerLayerInstanceCount(middle), 2_212);
    assert.equal(resolveCottageGardenFlowerLayerInstanceCount(farSilhouette), 157);
    assert.deepEqual(farSilhouette.fadeOutMeters, [78, 92]);
    assert.equal(
      COTTAGE_GARDEN_WILDFLOWER_MEADOW.geometryBatches.grass +
        COTTAGE_GARDEN_WILDFLOWER_MEADOW.geometryBatches.flowers,
      15,
    );
  });

  it("远景以绿色纹理冠层承载低色差花色，而不是纯色物种贴片", () => {
    assert.equal(
      COTTAGE_GARDEN_FAR_MEADOW_PROFILE.representation,
      "textured-green-canopy-subtle-chroma-veil",
    );
    assert.equal(COTTAGE_GARDEN_FAR_MEADOW_PROFILE.preserveTurfAlbedo, true);
    assert.ok(COTTAGE_GARDEN_FAR_MEADOW_PROFILE.albedoRetention >= 0.4);
    assert.ok(COTTAGE_GARDEN_FAR_MEADOW_PROFILE.speciesWeightFloor >= 0.4);
    assert.ok(
      COTTAGE_GARDEN_FAR_MEADOW_PROFILE.maximumAggregateBlend *
        COTTAGE_GARDEN_FAR_MEADOW_PROFILE.speciesTintMix <=
        COTTAGE_GARDEN_FAR_MEADOW_PROFILE.maximumEffectiveFlowerColorInfluence,
    );
    assert.ok(
      COTTAGE_GARDEN_FAR_MEADOW_PROFILE.maximumEffectiveFlowerColorInfluence <
        0.14,
    );
    assert.equal(COTTAGE_GARDEN_FAR_MEADOW_PROFILE.manualFogMix, false);
    assert.ok(
      COTTAGE_GARDEN_FAR_MEADOW_PROFILE.chromaFadeEndMeters >
        COTTAGE_GARDEN_FAR_MEADOW_PROFILE.chromaFadeStartMeters,
    );
    assert.ok(COTTAGE_GARDEN_TIME_PRESETS.noon.fog.near > 110);
    assert.ok(COTTAGE_GARDEN_TIME_PRESETS.noon.fog.near < 200);
  });

  it("把三种花型扩展成七种克制花色", () => {
    const palette = Object.values(COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES).flat();
    assert.equal(new Set(palette).size, 7);
    Object.values(COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES).forEach((colors) => {
      assert.ok(colors.length >= 2);
    });
  });
});

describe("花海小院 GPU 短草层", () => {
  it("只保留三种统一绿色，并让叶面形成日照后的翠绿层次", () => {
    const colors = Object.values(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE);
    assert.equal(colors.length, 3);
    assert.equal(new Set(colors).size, 3);
    assert.equal(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.shadow, "#294b24");
    assert.equal(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.meadow, "#527d39");
    assert.equal(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.blade, "#7ba54b");
  });

  it("近景保持样板级表观密度，中景在亚像素前主动聚合", () => {
    const [courtyard, near, middle] = COTTAGE_GARDEN_GRASS_LAYERS;
    assert.equal(courtyard.domain, "courtyard");
    assert.equal(courtyard.cameraWrapped, false);
    assert.equal(courtyard.distanceFade, false);
    assert.ok(near);
    assert.ok(middle);
    assert.equal(courtyard.clumpsPerSquareMeter, 30);
    assert.equal(near.clumpsPerSquareMeter, 28);
    assert.equal(near.fieldSizeMeters, 72);
    assert.ok(near.widthScale[0] >= 8);
    assert.ok(near.heightScale[0] < 1.5);
    assert.ok(near.heightScale[1] >= 6.4);
    assert.equal(middle.fieldSizeMeters, 160);
    assert.deepEqual(near.fadeOutMeters, [18, 32]);
    assert.deepEqual(middle.fadeInMeters, near.fadeOutMeters);
    assert.equal(middle.fadeOutMeters[1], 76);
    assert.equal(resolveCottageGardenGrassLayerInstanceCount(courtyard), 48_000);
    assert.equal(resolveCottageGardenGrassLayerInstanceCount(near), 145_152);
    assert.equal(resolveCottageGardenGrassLayerInstanceCount(middle), 102_400);
  });

  it("用紧凑根点与形态属性确定性生成，不创建逐实例矩阵", () => {
    const layer: CottageGardenGrassLayerSpec = {
      id: "near",
      domain: "outer-meadow",
      cameraWrapped: true,
      distanceFade: true,
      tuningLayer: "near",
      fieldSizeMeters: 2,
      clumpsPerSquareMeter: 12,
      fadeInMeters: [0, 0],
      fadeOutMeters: [1, 2],
      heightScale: [1, 1.2],
      widthScale: [2, 3],
    };
    const first = createCottageGardenGrassInstanceData(layer, 91);
    const replay = createCottageGardenGrassInstanceData(layer, 91);

    assert.deepEqual(first, replay);
    assert.equal(first.roots.length, first.count * 2);
    assert.equal(first.shapes.length, first.count * 4);
  });

  it("参考机位在庭院外并朝远离小屋的花海方向观察", () => {
    const viewDirectionX =
      COTTAGE_MEADOW_REFERENCE_VIEW.target[0] -
      COTTAGE_MEADOW_REFERENCE_VIEW.position[0];
    assert.ok(Math.abs(COTTAGE_MEADOW_REFERENCE_VIEW.position[0]) > 11.65);
    assert.ok(viewDirectionX < -60);
    assert.equal(COTTAGE_MEADOW_REFERENCE_VIEW.fov, 52);
  });
});
