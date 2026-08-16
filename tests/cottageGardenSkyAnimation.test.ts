import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COTTAGE_GARDEN_METEORS,
  COTTAGE_GARDEN_SKY_ANIMATION,
  createCottageGardenBackgroundStars,
  createCottageGardenMessageStars,
  resolveCottageGardenEveningVisibility,
  resolveCottageGardenMessageStarPosition,
  resolveCottageGardenSkyAnimationTime,
  sampleCottageGardenMeteor,
  sampleCottageGardenMeteorAblation,
  sampleCottageGardenSkyAnimation,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenSkyAnimation";
import {
  createCottageGardenMeteorRenderBundle,
  disposeCottageGardenMeteorRender,
  updateCottageGardenMeteorRender,
} from "../src/entities/scene/items/cottage-flower-garden/ui/gardenMeteorShowerRender";

describe("花海小院十秒告白天空", () => {
  it("冻结十秒时间线与 I LOVE YOU! 终幕", () => {
    assert.equal(COTTAGE_GARDEN_SKY_ANIMATION.message, "I LOVE YOU!");
    assert.equal(COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds, 10);

    const opening = sampleCottageGardenSkyAnimation(0);
    const assembling = sampleCottageGardenSkyAnimation(
      COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds,
    );
    const heldFinale = sampleCottageGardenSkyAnimation(10);

    assert.equal(opening.normalizedProgress, 0);
    assert.equal(opening.backgroundOpacity, 0.84);
    assert.equal(assembling.assemblyProgress, 0);
    assert.equal(heldFinale.normalizedProgress, 1);
    assert.equal(heldFinale.assemblyProgress, 1);
    assert.equal(heldFinale.messageOpacity, 1);
    assert.equal(heldFinale.complete, true);
  });

  it("播放、暂停与拖动都从同一命令时间锚点解析", () => {
    const paused = {
      playing: false,
      timeSeconds: 4.25,
      issuedAtMilliseconds: 1_000,
      nonce: 1,
    } as const;
    const playing = { ...paused, playing: true } as const;

    assert.equal(resolveCottageGardenSkyAnimationTime(paused, 9_000), 4.25);
    assert.equal(resolveCottageGardenSkyAnimationTime(playing, 2_750), 6);
    assert.equal(resolveCottageGardenSkyAnimationTime(playing, 20_000), 10);
    assert.equal(
      resolveCottageGardenSkyAnimationTime(
        { ...paused, timeSeconds: Number.NaN },
        2_000,
      ),
      0,
    );
  });

  it("星字粒子确定性汇聚并在终幕精确停留于字形", () => {
    const first = createCottageGardenMessageStars();
    const replay = createCottageGardenMessageStars();
    const changedSeed = createCottageGardenMessageStars(202_608_15);
    const ids = first.map((star) => star.id);

    assert.equal(first.length, 560);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(replay, first);
    assert.notDeepEqual(changedSeed, first);
    first.forEach((star) => {
      assert.ok(
        star.target[1] >=
          COTTAGE_GARDEN_SKY_ANIMATION.messageBaseHeightMeters - 0.37,
      );
      assert.deepEqual(
        resolveCottageGardenMessageStarPosition(star, 10),
        star.target,
      );
    });
  });

  it("全天穹繁星与十二颗单向长尾细流星按固定种子、固定节拍生成", () => {
    const stars = createCottageGardenBackgroundStars();
    assert.equal(stars.length, 4_200);
    assert.deepEqual(stars, createCottageGardenBackgroundStars());
    assert.equal(new Set(stars.map((star) => star.id)).size, stars.length);
    const azimuthSectors = new Set<number>();
    const elevationBands = new Set<number>();
    stars.forEach((star) => {
      const [x, y, z] = star.position;
      const radius = Math.hypot(x, y, z);
      const normalizedAzimuth =
        ((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) /
        (Math.PI * 2);
      azimuthSectors.add(Math.floor(normalizedAzimuth * 8));
      elevationBands.add(Math.min(2, Math.floor((y / radius) * 3)));
      assert.ok(y > 0);
      assert.ok(radius >= 520 && radius <= 680);
    });
    assert.equal(azimuthSectors.size, 8);
    assert.equal(elevationBands.size, 3);
    assert.equal(COTTAGE_GARDEN_METEORS.length, 12);

    COTTAGE_GARDEN_METEORS.forEach((meteor) => {
      const deltaX = meteor.end[0] - meteor.start[0];
      const deltaY = meteor.end[1] - meteor.start[1];
      const deltaZ = meteor.end[2] - meteor.start[2];
      const journeyLength = Math.hypot(deltaX, deltaY, deltaZ);
      const downwardSlope = -deltaY / deltaX;
      const before = sampleCottageGardenMeteor(
        meteor,
        meteor.startsAtSeconds - 0.01,
      );
      const middle = sampleCottageGardenMeteor(
        meteor,
        meteor.startsAtSeconds + meteor.durationSeconds / 2,
      );
      const afterglow = sampleCottageGardenMeteor(
        meteor,
        meteor.startsAtSeconds +
          meteor.durationSeconds +
          meteor.afterglowSeconds / 2,
      );
      const expired = sampleCottageGardenMeteor(
        meteor,
        meteor.startsAtSeconds +
          meteor.durationSeconds +
          meteor.afterglowSeconds +
          0.01,
      );

      assert.equal(before.active, false);
      assert.equal(before.opacity, 0);
      assert.equal(middle.active, true);
      assert.ok(middle.opacity > 0.9);
      assert.equal(middle.trailScale, 1);
      assert.notDeepEqual(middle.head, meteor.start);
      assert.equal(afterglow.active, true);
      assert.ok(afterglow.opacity > 0);
      assert.notDeepEqual(afterglow.head, meteor.end);
      assert.equal(expired.active, false);
      assert.equal(expired.opacity, 0);
      assert.ok(deltaX > 0);
      assert.ok(deltaY < 0);
      assert.ok(downwardSlope >= 0.38 && downwardSlope <= 0.55);
      assert.ok(journeyLength >= 155);
      assert.ok(meteor.trailLength >= 90);
      assert.ok(meteor.headSize <= 2.75);
      assert.ok(meteor.brightness >= 0.2 && meteor.brightness <= 1);
      assert.ok(meteor.fragmentCount >= 0 && meteor.fragmentCount <= 4);
      assert.ok(
        meteor.startsAtSeconds +
          meteor.durationSeconds +
          meteor.afterglowSeconds <=
          COTTAGE_GARDEN_SKY_ANIMATION.meteorSequenceEndSeconds,
      );
    });
    assert.ok(
      COTTAGE_GARDEN_METEORS.some((meteor) => meteor.fragmentCount === 0),
    );
    assert.ok(
      COTTAGE_GARDEN_METEORS.some((meteor) => meteor.fragmentCount >= 3),
    );
  });

  it("消融尾迹从极小亮核向尾端透明衰减，并保留确定性亮度结节", () => {
    COTTAGE_GARDEN_METEORS.forEach((meteor) => {
      const timeSeconds = meteor.startsAtSeconds + meteor.durationSeconds * 0.55;
      const head = sampleCottageGardenMeteorAblation(meteor, timeSeconds, 0);
      const middle = sampleCottageGardenMeteorAblation(
        meteor,
        timeSeconds,
        0.5,
      );
      const tail = sampleCottageGardenMeteorAblation(meteor, timeSeconds, 1);

      assert.deepEqual(
        sampleCottageGardenMeteorAblation(meteor, timeSeconds, 0.5),
        middle,
      );
      assert.ok(head.trailOpacity > middle.trailOpacity);
      assert.ok(middle.trailOpacity > tail.trailOpacity);
      assert.equal(tail.trailOpacity, 0);
      assert.ok(head.headOpacity > 0 && head.headOpacity <= 1.2);
      assert.ok(head.fragmentOpacity >= 0 && head.fragmentOpacity <= 1);
    });
  });

  it("渲染束只提交当前活动流星，并用独立透明度与稀疏碎屑表达消融", () => {
    const bundle = createCottageGardenMeteorRenderBundle();
    const frame = updateCottageGardenMeteorRender(bundle, 1.82, 1, 0.85);
    const opacities = bundle.trailGeometry.getAttribute("aOpacity");

    assert.equal(frame.activeMeteorCount, 2);
    assert.equal(frame.activeFragmentCount, 4);
    assert.equal(frame.trailVertexCount, 2 * 32 * 2);
    assert.equal(bundle.trailGeometry.drawRange.count, frame.trailVertexCount);
    assert.ok(opacities.getX(0) > opacities.getX(63));
    assert.equal(opacities.getX(63), 0);
    assert.equal(bundle.trailMaterial.depthTest, true);
    assert.equal(bundle.trailMaterial.depthWrite, false);

    disposeCottageGardenMeteorRender(bundle);
  });

  it("流星在主体行程中保持近恒速，首尾只做短促亮度包络", () => {
    COTTAGE_GARDEN_METEORS.forEach((meteor) => {
      const samples = [0.25, 0.5, 0.75].map((progress) =>
        sampleCottageGardenMeteor(
          meteor,
          meteor.startsAtSeconds + meteor.durationSeconds * progress,
        ),
      );
      const segmentLength = (startIndex: number, endIndex: number) =>
        Math.hypot(
          ...samples[endIndex].head.map(
            (coordinate, axis) => coordinate - samples[startIndex].head[axis],
          ),
        );
      const firstSegment = segmentLength(0, 1);
      const secondSegment = segmentLength(1, 2);
      assert.ok(secondSegment / firstSegment < 1.08);
      assert.ok(secondSegment / firstSegment > 0.92);
      assert.ok(samples[1].opacity > 0.9);
    });
  });

  it("星字沿多股弧形星流汇聚，而不是直线平移到文字", () => {
    const stars = createCottageGardenMessageStars();
    const middleTime =
      (COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds +
        COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyEndSeconds) /
      2;
    const sample = sampleCottageGardenSkyAnimation(middleTime);
    const middlePositions = stars.map((star) =>
      resolveCottageGardenMessageStarPosition(star, middleTime),
    );

    assert.ok(
      Math.max(...middlePositions.map((position) => position[0])) -
        Math.min(...middlePositions.map((position) => position[0])) >
        250,
    );

    stars.slice(0, 80).forEach((star) => {
      const linear = star.origin.map(
        (coordinate, axis) =>
          coordinate +
          (star.target[axis] - coordinate) * sample.assemblyProgress,
      );
      const curved = resolveCottageGardenMessageStarPosition(star, middleTime);
      assert.ok(
        Math.hypot(
          curved[0] - linear[0],
          curved[1] - linear[1],
          curved[2] - linear[2],
        ) > 5,
      );
    });
  });

  it("只在傍晚相位显现，并支持循环相位输入", () => {
    assert.equal(resolveCottageGardenEveningVisibility(0.75), 1);
    assert.equal(resolveCottageGardenEveningVisibility(1.75), 1);
    assert.equal(resolveCottageGardenEveningVisibility(-0.25), 1);
    assert.equal(resolveCottageGardenEveningVisibility(0), 0);
    assert.equal(resolveCottageGardenEveningVisibility(0.5), 0);
  });
});
