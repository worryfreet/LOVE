import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_INTERIOR_NAVIGATION,
} from './gardenLayout'

export type CottageInteriorMaterialKey =
  | 'floor'
  | 'wall'
  | 'ceiling'
  | 'beam'
  | 'trim'

export interface CottageInteriorBox {
  id: string
  material: CottageInteriorMaterialKey
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  rotation: readonly [number, number, number]
}

export interface CottageInteriorKit {
  boxes: readonly CottageInteriorBox[]
  measurements: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    floorTop: number
    eaveHeight: number
    ridgeHeight: number
    doorClearWidth: number
  }
  materialSlots: readonly CottageInteriorMaterialKey[]
}

export interface CottageTableHydrangeaOccurrence {
  id: string
  position: readonly [number, number, number]
  rotationY: number
  scale: number
}

/** 圆桌花瓶中的三株模型库绣球花，仅保存确定性的场景变换。 */
export const COTTAGE_TABLE_HYDRANGEA_OCCURRENCES = [
  {
    id: 'cottage.table.hydrangea.left',
    position: [-0.072, 0.205, 0.012],
    rotationY: -0.38,
    scale: 0.145,
  },
  {
    id: 'cottage.table.hydrangea.center',
    position: [0.018, 0.225, -0.038],
    rotationY: 0.62,
    scale: 0.15,
  },
  {
    id: 'cottage.table.hydrangea.right',
    position: [0.078, 0.198, 0.052],
    rotationY: 1.44,
    scale: 0.14,
  },
] as const satisfies readonly CottageTableHydrangeaOccurrence[]

const ZERO_ROTATION = [0, 0, 0] as const

function box(
  id: string,
  material: CottageInteriorMaterialKey,
  position: readonly [number, number, number],
  size: readonly [number, number, number],
  rotation: readonly [number, number, number] = ZERO_ROTATION,
): CottageInteriorBox {
  return { id, material, position, size, rotation }
}

/**
 * 内装仍以外壳局部原点为权威，所有尺寸均为米。
 * 完成面和内衬保留在结构墙以内，避免与既有外墙共面闪烁。
 */
export function createCottageInteriorKit(): CottageInteriorKit {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const minX = COTTAGE_INTERIOR_NAVIGATION.minX - cottage.centerX
  const maxX = COTTAGE_INTERIOR_NAVIGATION.maxX - cottage.centerX
  const minZ = COTTAGE_INTERIOR_NAVIGATION.minZ - cottage.centerZ
  const maxZ = COTTAGE_INTERIOR_NAVIGATION.maxZ - cottage.centerZ
  const floorTop = COTTAGE_INTERIOR_NAVIGATION.floorTop
  const eaveHeight = cottage.foundationHeight + cottage.wallHeight
  const ridgeHeight = eaveHeight + cottage.roofRise
  const innerWidth = maxX - minX
  const innerDepth = maxZ - minZ
  const boardCount = Math.ceil(innerWidth / 0.37)
  const boardGap = 0.012
  const boardWidth = (innerWidth - boardGap * (boardCount - 1)) / boardCount
  const roofRun = cottage.width / 2 - cottage.wallThickness - 0.018
  const roofRise = cottage.roofRise - 0.12
  const roofSlope = Math.hypot(roofRun, roofRise)
  const roofAngle = Math.atan2(roofRise, roofRun)
  const boxes: CottageInteriorBox[] = []

  for (let index = 0; index < boardCount; index += 1) {
    boxes.push(
      box(
        `interior.floor.board-${String(index + 1).padStart(2, '0')}`,
        'floor',
        [
          minX + boardWidth / 2 + index * (boardWidth + boardGap),
          floorTop - 0.0325,
          0,
        ],
        [boardWidth, 0.065, innerDepth],
      ),
    )
  }

  boxes.push(
    box(
      'interior.wall.north-lining',
      'wall',
      [0, floorTop + (eaveHeight - floorTop) / 2, minZ - 0.014],
      [innerWidth, eaveHeight - floorTop, 0.028],
    ),
    box(
      'interior.wall.west-lining',
      'wall',
      [minX - 0.014, floorTop + (eaveHeight - floorTop) / 2, 0],
      [0.028, eaveHeight - floorTop, innerDepth],
    ),
    box(
      'interior.wall.east-lining',
      'wall',
      [maxX + 0.014, floorTop + (eaveHeight - floorTop) / 2, 0],
      [0.028, eaveHeight - floorTop, innerDepth],
    ),
    box(
      'interior.ceiling.west-slope',
      'ceiling',
      [-roofRun / 2, eaveHeight + roofRise / 2 - 0.07, 0],
      [roofSlope, 0.045, innerDepth],
      [0, 0, roofAngle],
    ),
    box(
      'interior.ceiling.east-slope',
      'ceiling',
      [roofRun / 2, eaveHeight + roofRise / 2 - 0.07, 0],
      [roofSlope, 0.045, innerDepth],
      [0, 0, -roofAngle],
    ),
    box(
      'interior.beam.north-eave',
      'beam',
      [0, eaveHeight - 0.08, minZ + 0.08],
      [innerWidth, 0.15, 0.15],
    ),
    box(
      'interior.beam.south-eave',
      'beam',
      [0, eaveHeight - 0.08, maxZ - 0.08],
      [innerWidth, 0.15, 0.15],
    ),
    box(
      'interior.beam.ridge',
      'beam',
      [0, ridgeHeight - 0.13, 0],
      [0.17, 0.19, innerDepth],
    ),
    box(
      'interior.trim.north-base',
      'trim',
      [0, floorTop + 0.07, minZ + 0.025],
      [innerWidth, 0.14, 0.07],
    ),
    box(
      'interior.trim.west-base',
      'trim',
      [minX + 0.025, floorTop + 0.07, 0],
      [0.07, 0.14, innerDepth],
    ),
    box(
      'interior.trim.east-base',
      'trim',
      [maxX - 0.025, floorTop + 0.07, 0],
      [0.07, 0.14, innerDepth],
    ),
  )

  return {
    boxes,
    measurements: {
      minX,
      maxX,
      minZ,
      maxZ,
      floorTop,
      eaveHeight,
      ridgeHeight,
      doorClearWidth: cottage.doorClearWidth,
    },
    materialSlots: ['floor', 'wall', 'ceiling', 'beam', 'trim'],
  }
}

export const COTTAGE_INTERIOR_KIT = createCottageInteriorKit()

/**
 * 室外只在接近门廊时保留完整可编辑陈设；远处门洞由室内壳体和暖光维持深度。
 * 这样花海与庭院机位不会为不可辨识的小物件支付数百次 draw call。
 */
export const COTTAGE_INTERIOR_RUNTIME_VISIBILITY = {
  exteriorRadiusMeters: 14,
} as const

export function isCottageInteriorRuntimeVisible(
  camera: { x: number; z: number },
  editMode: boolean,
) {
  if (editMode) return true
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const offsetX = camera.x - cottage.centerX
  const offsetZ = camera.z - cottage.centerZ
  return (
    offsetX * offsetX + offsetZ * offsetZ <=
    COTTAGE_INTERIOR_RUNTIME_VISIBILITY.exteriorRadiusMeters ** 2
  )
}

export function isInsideCottageInteriorLocal(
  point: { x: number; z: number },
  clearance = 0,
) {
  const { minX, maxX, minZ, maxZ } = COTTAGE_INTERIOR_KIT.measurements
  return (
    point.x >= minX + clearance &&
    point.x <= maxX - clearance &&
    point.z >= minZ + clearance &&
    point.z <= maxZ - clearance
  )
}
