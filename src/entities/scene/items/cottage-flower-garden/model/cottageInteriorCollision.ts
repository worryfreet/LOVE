import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_INTERIOR_NAVIGATION,
} from './gardenLayout'
import { COTTAGE_INTERIOR_KIT } from './cottageInterior'
import type {
  CottageInteriorInstance,
  CottageInteriorParameters,
  CottageInteriorPartId,
  CottageInteriorPoint,
} from './cottageInteriorInstances'

function readMeters(value: CottageInteriorParameters[string], fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed > 10 ? parsed / 1_000 : parsed
}

/** 选择框、防穿墙与漫游碰撞共用的实例包络近似，尺寸统一为米。 */
export function getCottageInteriorInstanceBounds(
  instance: CottageInteriorInstance,
): readonly [number, number, number] {
  const parameters = instance.parameters
  switch (instance.partId) {
    case 'cottage-single-bed':
      return [
        readMeters(parameters.width, 1.5),
        Math.max(0.94, readMeters(parameters.bedHeight, 0.48) + 0.38),
        readMeters(parameters.length, 1.9),
      ]
    case 'cottage-loveseat-sofa':
      return [
        readMeters(parameters.width, 1.72),
        readMeters(parameters.height, 0.84),
        readMeters(parameters.depth, 0.78),
      ]
    case 'cottage-photo-frame':
      return [
        readMeters(parameters.width, 0.52),
        readMeters(parameters.height, 0.4),
        parameters.mount === 'table' ? 0.28 : 0.06,
      ]
    case 'cottage-cast-iron-stove':
      return [
        readMeters(parameters.width, 0.58),
        readMeters(parameters.height, 0.8) + 0.82,
        readMeters(parameters.depth, 0.48),
      ]
    case 'cottage-round-table': {
      const diameter = readMeters(parameters.diameter, 1.14)
      return [diameter, readMeters(parameters.height, 0.74) + 0.3, diameter]
    }
    case 'cottage-wood-chair':
      return [
        readMeters(parameters.width, 0.44),
        readMeters(parameters.height, 0.86),
        readMeters(parameters.depth, 0.5),
      ]
    case 'cottage-low-cabinet':
      return [
        readMeters(parameters.width, 2.15),
        readMeters(parameters.height, 0.76) +
          (parameters.variant === 'cushioned-bench' ? 0.08 : 0),
        readMeters(parameters.depth, 0.46),
      ]
    case 'cottage-bookcase':
      return [
        readMeters(parameters.width, 1.35),
        readMeters(parameters.height, 1.95),
        readMeters(parameters.depth, 0.38),
      ]
    case 'cottage-candle': {
      const diameter = readMeters(parameters.diameter, 0.065)
      const height = readMeters(parameters.height, 0.16)
      const wickHeight = Math.max(0.012, diameter * 0.18)
      const flameHeight = Math.max(diameter * 0.62, height * 0.13)
      const totalHeight =
        parameters.lit === false
          ? height + wickHeight
          : height + wickHeight + flameHeight * 0.92
      return [diameter, totalHeight, diameter]
    }
    case 'cottage-envelope': {
      const depth = readMeters(parameters.depth, 0.16)
      const paperThickness = readMeters(parameters.paperThickness, 0.00035)
      const progress = Math.min(
        1,
        Math.max(0, Number(parameters.openProgress ?? 0)),
      )
      return [
        readMeters(parameters.width, 0.22),
        Math.max(
          paperThickness * 8,
          Math.sin(Math.min(1, progress / 0.28) * Math.PI / 2) * depth * 0.62,
          progress > 0.9 ? depth * 0.46 : 0,
        ),
        depth * (1 + Math.max(0, (progress - 0.25) / 0.75) * 1.18),
      ]
    }
    case 'cottage-string-lights':
      return [6.9, 0.3, 5.6]
  }
}

const FLOOR_SUPPORTED_PARTS = new Set<CottageInteriorPartId>([
  'cottage-single-bed',
  'cottage-loveseat-sofa',
  'cottage-cast-iron-stove',
  'cottage-round-table',
  'cottage-wood-chair',
  'cottage-low-cabinet',
  'cottage-bookcase',
])

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export type CottageWallPhotoSurface = 'north' | 'east'

function angularDistance(left: number, right: number) {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)))
}

/** 墙挂相框只吸附当前有陈设合同的北墙或东墙，并保持正面朝向室内。 */
export function resolveCottageWallPhotoSurface(
  rotationY: number,
): CottageWallPhotoSurface {
  return angularDistance(rotationY, -Math.PI / 2) < angularDistance(rotationY, 0)
    ? 'east'
    : 'north'
}

/** 返回给定横向包络下的保守内屋顶净高。 */
export function getCottageInteriorRoofClearanceY(
  localX: number,
  halfWidth = 0,
) {
  const { minX, maxX, eaveHeight, ridgeHeight } =
    COTTAGE_INTERIOR_KIT.measurements
  const roofRun = Math.max(Math.abs(minX), Math.abs(maxX))
  const edgeX = Math.min(roofRun, Math.abs(localX) + Math.max(0, halfWidth))
  const rise = Math.max(0, ridgeHeight - eaveHeight - 0.12)
  return eaveHeight - 0.1 + rise * (1 - edgeX / roofRun)
}

export function getCottageRoundTableTopY(instance: CottageInteriorInstance) {
  return (
    instance.position.y +
    readMeters(instance.parameters.height, 0.74) * instance.scale.y
  )
}

/** 桌子位移、旋转、缩放或改高时，保持承载摆件的桌面局部偏移。 */
export function moveCottageInteriorTabletopInstance(
  instance: CottageInteriorInstance,
  previousTable: CottageInteriorInstance,
  nextTable: CottageInteriorInstance,
) {
  const dx = instance.position.x - previousTable.position.x
  const dz = instance.position.z - previousTable.position.z
  const previousCosine = Math.cos(previousTable.rotation.y)
  const previousSine = Math.sin(previousTable.rotation.y)
  const previousDiameter = readMeters(previousTable.parameters.diameter, 1.14)
  const nextDiameter = readMeters(nextTable.parameters.diameter, 1.14)
  const localX =
    (previousCosine * dx - previousSine * dz) /
    (Math.max(Math.abs(previousTable.scale.x), 0.001) * previousDiameter)
  const localZ =
    (previousSine * dx + previousCosine * dz) /
    (Math.max(Math.abs(previousTable.scale.z), 0.001) * previousDiameter)
  const nextX = localX * nextTable.scale.x * nextDiameter
  const nextZ = localZ * nextTable.scale.z * nextDiameter
  const nextCosine = Math.cos(nextTable.rotation.y)
  const nextSine = Math.sin(nextTable.rotation.y)
  return sanitizeCottageInteriorInstanceTransform(
    {
      ...instance,
      position: {
        x: nextTable.position.x + nextCosine * nextX + nextSine * nextZ,
        y:
          instance.position.y +
          getCottageRoundTableTopY(nextTable) -
          getCottageRoundTableTopY(previousTable),
        z: nextTable.position.z - nextSine * nextX + nextCosine * nextZ,
      },
      rotation: {
        x: 0,
        y:
          instance.rotation.y +
          nextTable.rotation.y -
          previousTable.rotation.y,
        z: 0,
      },
    },
    instance,
  )
}

export function findCottageInteriorTableSupport(
  instance: CottageInteriorInstance,
  instances: readonly CottageInteriorInstance[],
) {
  if (
    instance.partId !== 'cottage-candle' &&
    instance.partId !== 'cottage-envelope' &&
    !(
      instance.partId === 'cottage-photo-frame' &&
      instance.parameters.mount === 'table'
    )
  ) {
    return undefined
  }
  return instances
    .filter((candidate) => candidate.partId === 'cottage-round-table')
    .map((table) => {
      const diameter = readMeters(table.parameters.diameter, 1.15)
      const dx = instance.position.x - table.position.x
      const dz = instance.position.z - table.position.z
      const cosine = Math.cos(table.rotation.y)
      const sine = Math.sin(table.rotation.y)
      const localX = cosine * dx - sine * dz
      const localZ = sine * dx + cosine * dz
      const radiusX = (diameter * Math.abs(table.scale.x)) / 2 + 0.08
      const radiusZ = (diameter * Math.abs(table.scale.z)) / 2 + 0.08
      return {
        table,
        normalizedDistance:
          (localX * localX) / (radiusX * radiusX) +
          (localZ * localZ) / (radiusZ * radiusZ),
        heightDelta: Math.abs(
          instance.position.y - getCottageRoundTableTopY(table),
        ),
      }
    })
    .filter(
      (candidate) =>
        candidate.normalizedDistance <= 1 &&
        candidate.heightDelta <= 0.12,
    )
    .sort(
      (left, right) => left.normalizedDistance - right.normalizedDistance,
    )[0]?.table
}

/** 删除承载桌时把摆件迁移到另一张桌；无可用桌时安全落到地板。 */
export function removeCottageInteriorInstance(
  instances: readonly CottageInteriorInstance[],
  instanceId: string,
) {
  const deleted = instances.find((instance) => instance.id === instanceId)
  const remaining = instances.filter((instance) => instance.id !== instanceId)
  const replacement = remaining.find(
    (instance) => instance.partId === 'cottage-round-table',
  )
  return remaining.map((instance) => {
    if (instance.supportId !== instanceId) return instance
    if (deleted?.partId === 'cottage-round-table' && replacement) {
      return sanitizeCottageInteriorInstanceTransform(
        {
          ...moveCottageInteriorTabletopInstance(
            instance,
            deleted,
            replacement,
          ),
          supportId: replacement.id,
        },
        instance,
      )
    }
    return sanitizeCottageInteriorInstanceTransform(
      {
        ...instance,
        supportId: undefined,
        position: {
          ...instance.position,
          y: COTTAGE_INTERIOR_NAVIGATION.floorTop,
        },
      },
      instance,
    )
  })
}

function clampInteriorPoint(point: CottageInteriorPoint) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const x = clamp(
    point.x,
    COTTAGE_INTERIOR_NAVIGATION.minX - cottage.centerX,
    COTTAGE_INTERIOR_NAVIGATION.maxX - cottage.centerX,
  )
  const z = clamp(
    point.z,
    COTTAGE_INTERIOR_NAVIGATION.minZ - cottage.centerZ,
    COTTAGE_INTERIOR_NAVIGATION.maxZ - cottage.centerZ,
  )
  return {
    x,
    y: clamp(
      point.y,
      COTTAGE_INTERIOR_NAVIGATION.floorTop,
      getCottageInteriorRoofClearanceY(x) - 0.06,
    ),
    z,
  }
}

function hasRenderablePath(path: readonly CottageInteriorPoint[] | undefined) {
  if (!path || path.length < 2) return false
  const first = path[0]
  return path.some(
    (point) =>
      Math.hypot(point.x - first.x, point.y - first.y, point.z - first.z) >
      0.0001,
  )
}

/** 编辑、复制与会话恢复共用的包络约束。 */
export function sanitizeCottageInteriorInstanceTransform(
  instance: CottageInteriorInstance,
  fallback?: CottageInteriorInstance,
): CottageInteriorInstance {
  if (instance.partId === 'cottage-string-lights') {
    const candidatePath = instance.path?.map(clampInteriorPoint)
    const fallbackPath = fallback?.path?.map(clampInteriorPoint)
    const path = hasRenderablePath(candidatePath)
      ? candidatePath
      : hasRenderablePath(fallbackPath)
        ? fallbackPath
        : [
            { x: -1, y: 2, z: 0 },
            { x: 1, y: 2, z: 0 },
          ]
    return {
      ...instance,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      path,
    }
  }

  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const localMinX = COTTAGE_INTERIOR_NAVIGATION.minX - cottage.centerX
  const localMaxX = COTTAGE_INTERIOR_NAVIGATION.maxX - cottage.centerX
  const localMinZ = COTTAGE_INTERIOR_NAVIGATION.minZ - cottage.centerZ
  const localMaxZ = COTTAGE_INTERIOR_NAVIGATION.maxZ - cottage.centerZ
  const inset = 0.025
  const rawScale = {
    x: clamp(instance.scale.x, 0.25, 3),
    y: clamp(instance.scale.y, 0.25, 3),
    z: clamp(instance.scale.z, 0.25, 3),
  }
  const bounds = getCottageInteriorInstanceBounds(instance)
  const wallPhoto =
    instance.partId === 'cottage-photo-frame' &&
    instance.parameters.mount !== 'table'
  const wallPhotoSurface = wallPhoto
    ? resolveCottageWallPhotoSurface(instance.rotation.y)
    : undefined
  const yaw =
    wallPhotoSurface === 'east'
      ? -Math.PI / 2
      : wallPhotoSurface === 'north'
        ? 0
        : instance.rotation.y
  const cosine = Math.abs(Math.cos(yaw))
  const sine = Math.abs(Math.sin(yaw))
  const rawHalfX =
    (bounds[0] * rawScale.x * cosine + bounds[2] * rawScale.z * sine) / 2
  const rawHalfZ =
    (bounds[0] * rawScale.x * sine + bounds[2] * rawScale.z * cosine) / 2
  const fit = Math.min(
    1,
    (localMaxX - localMinX - inset * 2) / Math.max(rawHalfX * 2, 0.001),
    (localMaxZ - localMinZ - inset * 2) / Math.max(rawHalfZ * 2, 0.001),
  )
  const halfX = rawHalfX * fit
  const halfZ = rawHalfZ * fit
  const rawPosition = clampInteriorPoint(instance.position)
  const x =
    wallPhotoSurface === 'east'
      ? localMaxX - 0.027
      : clamp(
          rawPosition.x,
          localMinX + halfX + inset,
          localMaxX - halfX - inset,
        )
  const z =
    wallPhotoSurface === 'north'
      ? localMinZ + 0.027
      : clamp(
          rawPosition.z,
          localMinZ + halfZ + inset,
          localMaxZ - halfZ - inset,
        )
  const roofY = getCottageInteriorRoofClearanceY(x, halfX)
  const maximumScaleY = Math.max(
    0.25,
    (roofY - COTTAGE_INTERIOR_NAVIGATION.floorTop - inset) /
      Math.max(bounds[1], 0.001),
  )
  const scale = {
    x: rawScale.x * fit,
    y: Math.min(rawScale.y, maximumScaleY),
    z: rawScale.z * fit,
  }
  const scaledHeight = bounds[1] * scale.y
  const positionY = FLOOR_SUPPORTED_PARTS.has(instance.partId)
    ? COTTAGE_INTERIOR_NAVIGATION.floorTop
    : wallPhoto
      ? clamp(
          rawPosition.y,
          COTTAGE_INTERIOR_NAVIGATION.floorTop + scaledHeight / 2,
          roofY - scaledHeight / 2 - inset,
        )
      : clamp(
          rawPosition.y,
          COTTAGE_INTERIOR_NAVIGATION.floorTop,
          roofY - scaledHeight - inset,
        )

  return {
    ...instance,
    position: { x, y: positionY, z },
    rotation: { x: 0, y: yaw, z: 0 },
    scale,
  }
}

const NON_BLOCKING_INTERIOR_PARTS = new Set<CottageInteriorPartId>([
  'cottage-photo-frame',
  'cottage-candle',
  'cottage-envelope',
  'cottage-string-lights',
])

/** 第一人称只碰撞落地大件，桌面摆件和墙饰不制造不可见阻挡。 */
export function isCottageInteriorFurniturePositionClear(
  point: CottageInteriorPoint,
  instances: readonly CottageInteriorInstance[],
  visitorRadius = 0.26,
) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const localPoint = {
    x: point.x - cottage.centerX,
    z: point.z - cottage.centerZ,
  }

  return instances.every((instance) => {
    if (
      NON_BLOCKING_INTERIOR_PARTS.has(instance.partId) ||
      instance.position.y > COTTAGE_INTERIOR_NAVIGATION.floorTop + 0.12
    ) {
      return true
    }
    const bounds = getCottageInteriorInstanceBounds(instance)
    const width = bounds[0] * instance.scale.x
    const depth = bounds[2] * instance.scale.z
    const cosine = Math.abs(Math.cos(instance.rotation.y))
    const sine = Math.abs(Math.sin(instance.rotation.y))
    const halfX = (width * cosine + depth * sine) / 2 + visitorRadius
    const halfZ = (width * sine + depth * cosine) / 2 + visitorRadius
    return (
      Math.abs(localPoint.x - instance.position.x) > halfX ||
      Math.abs(localPoint.z - instance.position.z) > halfZ
    )
  })
}
