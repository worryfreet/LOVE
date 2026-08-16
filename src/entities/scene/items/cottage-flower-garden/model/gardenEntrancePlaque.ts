import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "./gardenLayout";

export interface CottageGardenGiftNames {
  from: string;
  to: string;
}

export function formatCottageGardenGiftPlaqueLines(
  gift: CottageGardenGiftNames,
) {
  const from = gift.from.trim();
  const to = gift.to.trim();
  if (!from || !to) {
    throw new Error("花园入口铭牌的赠送者和接收者姓名不能为空");
  }
  return [`From: ${from}`, `To: ${to}`] as const;
}

const gatePostTop =
  COTTAGE_FLOWER_GARDEN_LAYOUT.fence.height + 0.12;
const gateHalfWidth = COTTAGE_FLOWER_GARDEN_LAYOUT.fence.gateWidth / 2;
const southFenceZ = COTTAGE_FLOWER_GARDEN_LAYOUT.garden.length / 2;
const plaqueSize = [1.72, 0.4, 0.075] as const;
const plaqueCenterY = 2.24;
const gift = {
  from: "谭少康",
  to: "丁晓杰",
} as const;

/** 入口铭牌与承重门架共享同一米制装配契约，正面固定朝向花园外侧。 */
export const COTTAGE_GARDEN_ENTRANCE_PLAQUE = {
  semanticId: "garden.entrance-gift-plaque",
  units: "meter",
  role: "gift-origin-and-recipient",
  gift,
  lines: formatCottageGardenGiftPlaqueLines(gift),
  plaque: {
    position: [0, plaqueCenterY, southFenceZ + 0.11] as const,
    size: plaqueSize,
    faceSize: [1.54, 0.31] as const,
    frontNormal: [0, 0, 1] as const,
    bottomClearance: plaqueCenterY - plaqueSize[1] / 2,
  },
  support: {
    postX: [-gateHalfWidth, gateHalfWidth] as const,
    postBottomY: gatePostTop,
    postTopY: 2.66,
    postSizeXZ: 0.165,
    z: southFenceZ,
    beamPosition: [0, 2.6, southFenceZ + 0.02] as const,
    beamSize: [3.64, 0.12, 0.15] as const,
    hangerX: [-0.58, 0.58] as const,
    hangerTopY: 2.54,
    hangerBottomY: plaqueCenterY + plaqueSize[1] / 2,
  },
  visibleFeatures: [
    "extended-gate-posts",
    "wooden-crossbeam",
    "twin-iron-hangers",
    "framed-nameplate",
    "from-line",
    "to-line",
  ] as const,
} as const;
