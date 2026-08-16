import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COTTAGE_GARDEN_VINES_PER_ROUTE,
  createCottageGardenMorningGlorySystem,
  projectCottageGardenVinePoint,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenMorningGlory";

describe("花海小院牵牛花贴面骨架", () => {
  it("房屋与围栏每个路线槽都增密为三条贴面主藤", () => {
    const baseline = createCottageGardenMorningGlorySystem({ vinesPerRoute: 1 });
    const system = createCottageGardenMorningGlorySystem();
    const hostIds = new Set(system.paths.map((path) => path.hostId));
    const baselineMainPaths = baseline.paths.filter(
      (path) => path.parentPathId === null,
    );
    const mainPaths = system.paths.filter((path) => path.parentPathId === null);
    const countHostFamily = (
      paths: typeof mainPaths,
      hostFamily: "cottage" | "fence",
    ) => paths.filter((path) => path.hostId.includes(hostFamily)).length;

    assert.equal(COTTAGE_GARDEN_VINES_PER_ROUTE, 3);
    assert.equal(system.measurements.routeCount, 30);
    assert.equal(
      system.measurements.routeCount,
      baseline.measurements.routeCount * COTTAGE_GARDEN_VINES_PER_ROUTE,
    );
    assert.ok(
      system.measurements.branchCount >= baseline.measurements.branchCount * 2.9,
    );
    assert.ok(
      system.measurements.nodeCount >= baseline.measurements.nodeCount * 2.95,
    );
    assert.ok(
      system.measurements.leafCount >= baseline.measurements.leafCount * 2.95,
    );
    assert.ok(
      system.measurements.bloomCount >= baseline.measurements.bloomCount * 3,
    );
    assert.equal(
      countHostFamily(mainPaths, "cottage"),
      countHostFamily(baselineMainPaths, "cottage") * 3,
    );
    assert.equal(
      countHostFamily(mainPaths, "fence"),
      countHostFamily(baselineMainPaths, "fence") * 3,
    );
    assert.equal(system.measurements.maximumProjectionResidualMeters, 0);
    assert.ok(
      [...hostIds].some((hostId) => hostId.includes("cottage")),
    );
    assert.ok([...hostIds].some((hostId) => hostId.includes("fence")));
  });

  it("同一路线槽的三条主藤使用彼此不同的自然曲线", () => {
    const system = createCottageGardenMorningGlorySystem();
    const routesBySlot = new Map<string, typeof system.paths>();
    system.paths
      .filter((path) => path.parentPathId === null)
      .forEach((path) => {
        const slotId = path.id.replace(/\.strand-\d+$/, "");
        routesBySlot.set(slotId, [...(routesBySlot.get(slotId) ?? []), path]);
      });

    routesBySlot.forEach((paths, slotId) => {
      assert.equal(paths.length, COTTAGE_GARDEN_VINES_PER_ROUTE);
      for (let firstIndex = 0; firstIndex < paths.length; firstIndex += 1) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < paths.length;
          secondIndex += 1
        ) {
          const offsets = Array.from({ length: 11 }, (_, sampleIndex) => {
            const progress = sampleIndex / 10;
            const first = paths[firstIndex].nodes[
              Math.round(progress * (paths[firstIndex].nodes.length - 1))
            ].position;
            const second = paths[secondIndex].nodes[
              Math.round(progress * (paths[secondIndex].nodes.length - 1))
            ].position;
            return first.map(
              (coordinate, axis) => coordinate - second[axis],
            );
          });
          const shapeDifference = Math.max(
            ...[0, 1, 2].map((axis) => {
              const values = offsets.map((offset) => offset[axis]);
              return Math.max(...values) - Math.min(...values);
            }),
          );
          assert.ok(
            shapeDifference >= 0.2,
            `${slotId} 的第 ${firstIndex + 1}、${secondIndex + 1} 条藤蔓不应只是平移复制`,
          );
        }
      }
    });
  });

  it("节点逐步回投宿主面且不会穿过门窗禁区", () => {
    const system = createCottageGardenMorningGlorySystem();
    const hosts = new Map(system.hosts.map((host) => [host.id, host]));

    system.paths.forEach((path) => {
      const host = hosts.get(path.hostId);
      assert.ok(host, `缺少宿主面 ${path.hostId}`);
      path.nodes.forEach((node) => {
        assert.deepEqual(
          projectCottageGardenVinePoint(host!, node.position),
          node.position,
        );
      });
    });
  });

  it("语义身份唯一且同配置可确定性复放", () => {
    const first = createCottageGardenMorningGlorySystem({
      seed: 86_401,
      rootCount: 10,
      scale: 1.12,
    });
    const replay = createCottageGardenMorningGlorySystem({
      seed: 86_401,
      rootCount: 10,
      scale: 1.12,
    });
    const changedSeed = createCottageGardenMorningGlorySystem({
      seed: 86_402,
      rootCount: 10,
      scale: 1.12,
    });
    const ids = [
      ...first.paths.map((path) => path.id),
      ...first.paths.flatMap((path) => path.nodes.map((node) => node.id)),
      ...first.attachments.map((attachment) => attachment.id),
    ];

    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(replay, first);
    assert.notDeepEqual(changedSeed.attachments, first.attachments);
  });

  it("关闭或设为零条路线时自然产出空系统", () => {
    for (const options of [{ enabled: false }, { rootCount: 0 }]) {
      const system = createCottageGardenMorningGlorySystem(options);
      assert.equal(system.paths.length, 0);
      assert.equal(system.attachments.length, 0);
      assert.equal(system.measurements.routeCount, 0);
    }
  });
});
