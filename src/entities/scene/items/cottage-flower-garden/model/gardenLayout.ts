import {
  COTTAGE_ARCHITECTURE_LAYOUT,
  COTTAGE_ARCHITECTURE_MEASUREMENTS,
  COTTAGE_ARCHITECTURE_SPACE_GRAPH,
} from './cottageArchitecture'
import { isCottageDoorPassable } from './cottagePortalMachine'

export interface GroundPoint {
  x: number;
  z: number;
}

export interface GardenRect {
  centerX: number;
  centerZ: number;
  width: number;
  length: number;
}

const cottagePathNorthZ = COTTAGE_ARCHITECTURE_MEASUREMENTS.stepFrontZ
const cottagePathSouthZ = 18.25

export const COTTAGE_FLOWER_GARDEN_LAYOUT = {
  units: "meter",
  garden: {
    width: 22,
    length: 38,
  },
  cottage: COTTAGE_ARCHITECTURE_LAYOUT,
  flowerField: {
    visualHeight: 1.5,
    innerEdgeX: 1.3,
    outerEdgeX: 9.7,
    centerZ: 4,
    length: 28,
  },
  mainPath: {
    centerX: 0,
    centerZ: (cottagePathNorthZ + cottagePathSouthZ) / 2,
    width: 2.2,
    length: cottagePathSouthZ - cottagePathNorthZ,
  },
  fence: {
    height: 1.42,
    gateWidth: 3.2,
    railHeights: [0.45, 1] as const,
    postSpacing: 2,
    boardSpacing: 0.48,
  },
  visitor: {
    eyeHeight: 1.42,
    radius: 0.28,
    spawn: [0, 1.42, 17.4] as [number, number, number],
  },
} as const;

const halfGardenWidth = COTTAGE_FLOWER_GARDEN_LAYOUT.garden.width / 2;
const halfGardenLength = COTTAGE_FLOWER_GARDEN_LAYOUT.garden.length / 2;
const fenceClearance = COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.radius + 0.06;

export const COTTAGE_FLOWER_FIELD_RECTS: readonly GardenRect[] = [
  {
    centerX:
      -(
        COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.innerEdgeX +
        COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.outerEdgeX
      ) / 2,
    centerZ: COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.centerZ,
    width:
      COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.outerEdgeX -
      COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.innerEdgeX,
    length: COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.length,
  },
  {
    centerX:
      (COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.innerEdgeX +
        COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.outerEdgeX) /
      2,
    centerZ: COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.centerZ,
    width:
      COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.outerEdgeX -
      COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.innerEdgeX,
    length: COTTAGE_FLOWER_GARDEN_LAYOUT.flowerField.length,
  },
];

export const COTTAGE_BLOCK_RECT: GardenRect = {
  centerX: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
  centerZ: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ,
  width: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.width,
  length: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth,
};

const cottageBackZ =
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ -
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2;
const cottageStepFrontZ =
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2 +
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.porchDepth +
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.stepDepth *
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.stepCount;

const cottageFrontZ =
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
  COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2;
const cottagePorchFrontZ =
  cottageFrontZ + COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.porchDepth;

export const COTTAGE_INTERIOR_NAVIGATION = {
  minX:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.width / 2 +
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.wallThickness +
    0.018,
  maxX:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX +
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.width / 2 -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.wallThickness -
    0.018,
  minZ:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2 +
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.wallThickness +
    0.018,
  maxZ:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2 -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.wallThickness -
    0.018,
  floorTop:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.floorTop,
  doorHalfWidth:
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.doorClearWidth / 2,
} as const;

/** 小屋、门廊与台阶共同拥有的第一人称占用包络。 */
export const COTTAGE_COLLISION_RECT: GardenRect = {
  centerX: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
  centerZ: (cottageBackZ + cottageStepFrontZ) / 2,
  width: COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.width,
  length: cottageStepFrontZ - cottageBackZ,
};

export type CottageReviewViewId =
  "gate" | "path-25" | "path-50" | "path-75" | "cottage-door";

export interface CottageReviewView {
  id: CottageReviewViewId;
  label: string;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
}

const doorStopZ =
  cottagePorchFrontZ + COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.stepDepth * 0.5;
const gateZ = halfGardenLength + 4;
const reviewZ = (progress: number) => gateZ + (doorStopZ - gateZ) * progress;
const reviewTarget = (height: number) =>
  [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
    height,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
      COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.depth / 2,
  ] as const;

/** 五个固定视角共享同一条入口—房门中心线与访客眼高权威。 */
export const COTTAGE_REVIEW_VIEWS: Record<
  CottageReviewViewId,
  CottageReviewView
> = {
  gate: {
    id: "gate",
    label: "Gate",
    position: [0, COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight, gateZ],
    target: reviewTarget(-0.42),
    fov: 38,
  },
  "path-25": {
    id: "path-25",
    label: "Path 25%",
    position: [
      0,
      COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
      reviewZ(0.25),
    ],
    target: reviewTarget(1),
    fov: 36,
  },
  "path-50": {
    id: "path-50",
    label: "Path 50%",
    position: [0, COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight, reviewZ(0.5)],
    target: reviewTarget(1.16),
    fov: 44,
  },
  "path-75": {
    id: "path-75",
    label: "Path 75%",
    position: [
      0,
      COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
      reviewZ(0.75),
    ],
    target: reviewTarget(1.32),
    fov: 52,
  },
  "cottage-door": {
    id: "cottage-door",
    label: "Cottage Door",
    position: [
      0,
      COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.porchTop +
        COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
      doorStopZ,
    ],
    target: reviewTarget(1.42),
    fov: 58,
  },
};

/** 从门内回望房间的固定验收视角，确保画面中不出现对面的错误门洞。 */
export const COTTAGE_INTERIOR_ENTRY_REVIEW_VIEW = {
  id: "interior-entry",
  label: "Interior Entry",
  position: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
    1.58,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ + 2.72,
  ] as const,
  target: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
    1.02,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ - 1.78,
  ] as const,
  fov: 68,
} as const;

/** 圆桌情书的近距离验收视角，同时满足实际交互的距离与朝向门禁。 */
export const COTTAGE_LOVE_LETTER_REVIEW_VIEW = {
  id: "love-letter-table",
  label: "Love Letter Table",
  position: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
    1.58,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ + 1.6,
  ] as const,
  target: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX - 0.28,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.floorTop + 0.77,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ + 0.22,
  ] as const,
  fov: 52,
} as const;

/** 不参与五个校准视角，用于发布前检查侧后轮廓、围栏闭合与屋面细节。 */
export const COTTAGE_HELD_OUT_REVIEW_VIEW: CottageReviewView = {
  id: "gate",
  label: "Held-out West Exterior",
  position: [-17, 3.8, 27],
  target: [0, 1.3, -7.8],
  fov: 47,
};

/** 复现房屋西侧围栏外视角，专门验证侧后方仍属于室外花草层。 */
export const COTTAGE_SIDE_EXTERIOR_REVIEW_VIEW = {
  id: "cottage-west-side",
  label: "Cottage West Side Exterior",
  position: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX - 13.4,
    COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.eyeHeight,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ,
  ] as const,
  target: [
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX,
    1.3,
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ,
  ] as const,
  fov: 48,
} as const;

/** 与用户花海目标图同构图：画面只观察围栏外草坪，不让小屋替花草遮挡缺陷。 */
export const COTTAGE_MEADOW_REFERENCE_VIEW = {
  id: "meadow-reference",
  label: "Meadow Reference",
  position: [-28, 1.16, 0] as const,
  target: [-105, -1.8, 0] as const,
  fov: 52,
} as const;

export const COTTAGE_FLOWER_GARDEN_SPACE_GRAPH = [
  {
    id: 'space.outer-meadow',
    kind: 'exterior',
    connectsTo: ['space.garden-entry'],
  },
  {
    id: 'space.garden-entry',
    kind: 'portal',
    connectsTo: ['space.outer-meadow', 'route.main-path'],
  },
  {
    id: 'route.main-path',
    kind: 'circulation',
    connectsTo: ['space.garden-entry', 'space.garden-court'],
  },
  ...COTTAGE_ARCHITECTURE_SPACE_GRAPH,
] as const

function isInsideExpandedRect(
  point: GroundPoint,
  rect: GardenRect,
  radius: number,
) {
  return (
    Math.abs(point.x - rect.centerX) <= rect.width / 2 + radius &&
    Math.abs(point.z - rect.centerZ) <= rect.length / 2 + radius
  );
}

/**
 * 花草是可穿行的软景观；平面占用只阻挡建筑、围栏与关闭门户等实体边界。
 */
export function isCottageFlowerGardenWalkable(
  point: GroundPoint,
  doorPassable = isCottageDoorPassable(),
) {
  const radius = COTTAGE_FLOWER_GARDEN_LAYOUT.visitor.radius;
  if (isInsideExpandedRect(point, COTTAGE_COLLISION_RECT, radius)) {
    const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
    const insideRoom =
      point.x >= COTTAGE_INTERIOR_NAVIGATION.minX + radius &&
      point.x <= COTTAGE_INTERIOR_NAVIGATION.maxX - radius &&
      point.z >= COTTAGE_INTERIOR_NAVIGATION.minZ + radius &&
      point.z <= COTTAGE_INTERIOR_NAVIGATION.maxZ - radius;
    const doorway =
      doorPassable &&
      Math.abs(point.x - cottage.centerX) <=
        COTTAGE_INTERIOR_NAVIGATION.doorHalfWidth - radius &&
      point.z >= COTTAGE_INTERIOR_NAVIGATION.maxZ - radius &&
      point.z <= cottagePorchFrontZ + radius;
    const onPorch =
      Math.abs(point.x - cottage.centerX) <= cottage.porchWidth / 2 - radius &&
      point.z >= cottageFrontZ + radius &&
      point.z <= cottagePorchFrontZ;
    const onSteps =
      Math.abs(point.x - cottage.centerX) <= 2.35 / 2 - radius &&
      point.z >= cottagePorchFrontZ &&
      point.z <= cottageStepFrontZ + radius;

    if (!insideRoom && !doorway && !onPorch && !onSteps) return false;
  }

  const besideVerticalFence =
    Math.abs(Math.abs(point.x) - halfGardenWidth) <= fenceClearance &&
    Math.abs(point.z) <= halfGardenLength + fenceClearance;
  if (besideVerticalFence) return false;

  const besideHorizontalFence =
    Math.abs(Math.abs(point.z) - halfGardenLength) <= fenceClearance &&
    Math.abs(point.x) <= halfGardenWidth + fenceClearance;
  if (!besideHorizontalFence) return true;

  const atSouthGate =
    point.z > 0 &&
    Math.abs(point.x) <
      COTTAGE_FLOWER_GARDEN_LAYOUT.fence.gateWidth / 2 - radius;
  return atSouthGate;
}

/** 返回小屋完成面、门廊或台阶高度；不在建筑通行面时返回 null。 */
export function getCottageBuiltWalkSurfaceHeight(point: GroundPoint) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const insideRoom =
    point.x >= COTTAGE_INTERIOR_NAVIGATION.minX &&
    point.x <= COTTAGE_INTERIOR_NAVIGATION.maxX &&
    point.z >= COTTAGE_INTERIOR_NAVIGATION.minZ &&
    point.z <= COTTAGE_INTERIOR_NAVIGATION.maxZ;
  if (insideRoom) return COTTAGE_INTERIOR_NAVIGATION.floorTop;

  const inEntranceWidth =
    Math.abs(point.x - cottage.centerX) <= cottage.porchWidth / 2;
  if (!inEntranceWidth) return null;
  if (point.z >= cottageFrontZ && point.z <= cottagePorchFrontZ) {
    return cottage.porchTop;
  }
  if (point.z < cottagePorchFrontZ || point.z > cottageStepFrontZ) {
    return null;
  }

  const distanceFromPorch = point.z - cottagePorchFrontZ;
  const stepIndex = Math.min(
    cottage.stepCount - 1,
    Math.floor(distanceFromPorch / cottage.stepDepth),
  );
  return (cottage.stepCount - stepIndex) * cottage.stepRise;
}

export const COTTAGE_FLOWER_GARDEN_OVERVIEW = {
  position: [29, 24, 36] as [number, number, number],
  mobilePosition: [32, 27, 40] as [number, number, number],
  target: [0, 0.8, 0] as [number, number, number],
  fov: 39,
} as const;
