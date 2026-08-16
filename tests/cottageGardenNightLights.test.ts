import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT,
  COTTAGE_GARDEN_NIGHT_LIGHT_PALETTE,
  COTTAGE_GARDEN_NIGHT_LIGHT_ROUTE_DEFINITIONS,
  createCottageGardenNightLightLayout,
  sampleCottageGardenNightLightFactor,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenNightLights";
import { createCottageGardenNightLightRenderBundle } from "../src/entities/scene/items/cottage-flower-garden/ui/gardenNightStringLightsRender";

describe("花海小院夜间彩灯", () => {
  it("按围栏与小屋权威尺寸生成完整且避开入口的路径", () => {
    const layout = COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT;
    assert.equal(layout.measurements.routeCount, 11);
    assert.equal(layout.measurements.fenceRouteCount, 6);
    assert.equal(layout.measurements.cottageRouteCount, 5);
    assert.equal(
      COTTAGE_GARDEN_NIGHT_LIGHT_ROUTE_DEFINITIONS.length,
      layout.measurements.routeCount,
    );
    assert.ok(
      layout.routes.some((route) => route.id.includes("gate-garland")),
    );
    assert.ok(
      layout.routes.some((route) => route.id.includes("front-gable")),
    );
    assert.ok(
      layout.routes.some((route) => route.id.includes("east-eave")),
    );
    for (const route of layout.routes) {
      assert.ok(route.arcLength > 1);
      assert.ok(route.controlPoints.length >= 2);
      assert.ok(route.sampledPoints.length > route.controlPoints.length);
    }
  });

  it("以稳定色板和实例预算覆盖边界及屋顶", () => {
    const first = createCottageGardenNightLightLayout();
    const second = createCottageGardenNightLightLayout();
    assert.equal(first.measurements.bulbCount, first.bulbs.length);
    assert.ok(first.measurements.bulbCount >= 240);
    assert.ok(first.measurements.bulbCount <= 360);
    assert.ok(first.measurements.totalArcLength > 145);
    assert.deepEqual(first.bulbs, second.bulbs);
    assert.deepEqual(
      new Set(first.bulbs.map((bulb) => bulb.color)),
      new Set(COTTAGE_GARDEN_NIGHT_LIGHT_PALETTE),
    );
    for (const bulb of first.bulbs) {
      assert.ok(bulb.position.every(Number.isFinite));
      assert.ok(bulb.tangent.every(Number.isFinite));
      assert.ok(Number.isFinite(bulb.shimmerPhase));
    }
    assert.equal(first.cableSegmentPositions.length % 6, 0);
    assert.ok(first.cableSegmentPositions.length > first.bulbs.length * 3);
  });

  it("只在黄昏后段至傍晚平滑点亮", () => {
    assert.equal(sampleCottageGardenNightLightFactor(0), 0);
    assert.equal(sampleCottageGardenNightLightFactor(0.25), 0);
    assert.equal(sampleCottageGardenNightLightFactor(0.5), 0);
    assert.ok(sampleCottageGardenNightLightFactor(0.62) > 0);
    assert.ok(sampleCottageGardenNightLightFactor(0.62) < 1);
    assert.equal(sampleCottageGardenNightLightFactor(0.75), 1);
    assert.equal(sampleCottageGardenNightLightFactor(0.9), 1);
    assert.ok(sampleCottageGardenNightLightFactor(0.97) < 1);
    assert.equal(sampleCottageGardenNightLightFactor(1), 0);
    assert.equal(sampleCottageGardenNightLightFactor(Number.NaN), 0);
  });

  it("将全部彩灯收敛为四个批次且完整释放 GPU 资源", () => {
    const bundle = createCottageGardenNightLightRenderBundle();
    assert.equal(bundle.diagnostics.drawBatchCount, 4);
    assert.equal(bundle.diagnostics.pointLightCount, 0);
    assert.equal(
      bundle.cableGeometry.getAttribute("position").count * 3,
      COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT.cableSegmentPositions.length,
    );
    assert.equal(
      bundle.instanceColor.count,
      COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT.bulbs.length,
    );
    assert.ok(bundle.bulbMaterial.vertexShader.includes("instanceColor"));
    assert.equal(bundle.bulbMaterial.uniforms.uOpacity.value, 0.18);
    assert.equal(bundle.bulbMaterial.depthWrite, false);
    assert.equal(bundle.haloMaterial.depthTest, true);
    assert.equal(bundle.haloMaterial.depthWrite, false);
    let geometryDisposed = 0;
    let materialDisposed = 0;
    for (const geometry of [
      bundle.cableGeometry,
      bundle.socketGeometry,
      bundle.bulbGeometry,
      bundle.haloGeometry,
    ]) {
      geometry.addEventListener("dispose", () => {
        geometryDisposed += 1;
      });
    }
    for (const material of [
      bundle.cableMaterial,
      bundle.socketMaterial,
      bundle.bulbMaterial,
      bundle.haloMaterial,
    ]) {
      material.addEventListener("dispose", () => {
        materialDisposed += 1;
      });
    }
    bundle.dispose();
    assert.equal(geometryDisposed, 4);
    assert.equal(materialDisposed, 4);
  });
});
