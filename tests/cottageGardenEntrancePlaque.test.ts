import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  COTTAGE_GARDEN_ENTRANCE_PLAQUE,
  formatCottageGardenGiftPlaqueLines,
} from "../src/entities/scene/items/cottage-flower-garden/model/gardenEntrancePlaque";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "../src/entities/scene/items/cottage-flower-garden/model/gardenLayout";

const plaqueSource = await readFile(
  new URL(
    "../src/entities/scene/items/cottage-flower-garden/ui/CottageGardenEntrancePlaque.tsx",
    import.meta.url,
  ),
  "utf8",
);
const fenceSource = await readFile(
  new URL(
    "../src/entities/scene/items/cottage-flower-garden/ui/CottageFenceSystem.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("花园入口赠礼铭牌", () => {
  it("明确显示赠送者与接收者，并保持 From 到 To 的语义顺序", () => {
    assert.deepEqual(COTTAGE_GARDEN_ENTRANCE_PLAQUE.gift, {
      from: "谭少康",
      to: "丁晓杰",
    });
    assert.deepEqual(COTTAGE_GARDEN_ENTRANCE_PLAQUE.lines, [
      "From: 谭少康",
      "To: 丁晓杰",
    ]);
    assert.deepEqual(
      formatCottageGardenGiftPlaqueLines({
        from: "  谭少康 ",
        to: " 丁晓杰  ",
      }),
      ["From: 谭少康", "To: 丁晓杰"],
    );
    assert.throws(
      () => formatCottageGardenGiftPlaqueLines({ from: "", to: "丁晓杰" }),
      /姓名不能为空/,
    );
  });

  it("将铭牌居中悬挂在大门上方并保留安全净空", () => {
    const contract = COTTAGE_GARDEN_ENTRANCE_PLAQUE;
    assert.equal(contract.semanticId, "garden.entrance-gift-plaque");
    assert.deepEqual(contract.plaque.frontNormal, [0, 0, 1]);
    assert.equal(
      contract.plaque.position[2],
      COTTAGE_FLOWER_GARDEN_LAYOUT.garden.length / 2 + 0.11,
    );
    assert.deepEqual(contract.support.postX, [
      -COTTAGE_FLOWER_GARDEN_LAYOUT.fence.gateWidth / 2,
      COTTAGE_FLOWER_GARDEN_LAYOUT.fence.gateWidth / 2,
    ]);
    assert.ok(
      contract.plaque.size[0] < COTTAGE_FLOWER_GARDEN_LAYOUT.fence.gateWidth,
    );
    assert.ok(contract.plaque.bottomClearance >= 2);
    assert.ok(contract.support.hangerTopY > contract.support.hangerBottomY);
  });

  it("由围栏系统装配可读贴图、实体门架与可释放纹理", () => {
    assert.match(fenceSource, /CottageGardenEntrancePlaque/);
    assert.match(plaqueSource, /CanvasTexture/);
    assert.match(plaqueSource, /SRGBColorSpace/);
    assert.match(plaqueSource, /PingFang SC/);
    assert.match(plaqueSource, /entrance-gift-plaque\.extended-post/);
    assert.match(plaqueSource, /textTexture\.dispose\(\)/);
    assert.match(plaqueSource, /fromName/);
    assert.match(plaqueSource, /toName/);
  });
});
