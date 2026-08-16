export type StringLightPoint = readonly [number, number, number]

export interface StringLightBulbPlacement {
  readonly position: StringLightPoint
  readonly tangent: StringLightPoint
  readonly distance: number
}

export interface ResolvedStringLightPath {
  readonly controlPoints: readonly StringLightPoint[]
  readonly sampledPoints: readonly StringLightPoint[]
  readonly arcLength: number
  readonly bulbs: readonly StringLightBulbPlacement[]
}

export const STRING_LIGHT_MAX_CONTROL_POINTS = 64
export const STRING_LIGHT_MAX_BULBS = 160
const POINT_EPSILON = 1e-5

/** warmth: 0 为琥珀暖光，1 为偏象牙白的暖光。 */
export function resolveStringLightWarmColor(warmth: number) {
  if (!Number.isFinite(warmth) || warmth < 0 || warmth > 1) {
    throw new RangeError('暖度必须是 0 到 1 之间的有限数值')
  }
  const start = [255, 145, 63] as const
  const end = [255, 238, 196] as const
  const channel = (index: 0 | 1 | 2) =>
    Math.round(start[index] + (end[index] - start[index]) * warmth)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

function isFinitePoint(point: StringLightPoint) {
  return point.length === 3 && point.every(Number.isFinite)
}

function pointDistance(a: StringLightPoint, b: StringLightPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** 过滤非法点和连续重复点，同时限制编辑器可提交的控制点预算。 */
export function normalizeStringLightControlPoints(
  points: readonly StringLightPoint[],
  maxControlPoints = STRING_LIGHT_MAX_CONTROL_POINTS,
): readonly StringLightPoint[] {
  const requestedLimit = Number.isFinite(maxControlPoints)
    ? Math.floor(maxControlPoints)
    : STRING_LIGHT_MAX_CONTROL_POINTS
  const safeLimit = Math.min(
    STRING_LIGHT_MAX_CONTROL_POINTS,
    Math.max(2, requestedLimit),
  )
  const normalized: StringLightPoint[] = []

  for (const source of points) {
    if (!isFinitePoint(source)) continue
    const point = [source[0], source[1], source[2]] as const
    const previous = normalized.at(-1)
    if (previous && pointDistance(previous, point) <= POINT_EPSILON) continue
    normalized.push(point)
    if (normalized.length >= safeLimit) break
  }

  if (normalized.length < 2) {
    throw new RangeError('柔性彩灯至少需要两个不同的有限三维控制点')
  }
  return normalized
}

function requireSag(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 4) {
    throw new RangeError('下垂量必须是 0 到 4 米之间的有限数值')
  }
}

/**
 * 每两个锚点间生成一段抛物线下垂；锚点保持精确，视觉上接近受重力的悬链。
 */
export function sampleStringLightPath(
  points: readonly StringLightPoint[],
  sag: number,
  segmentsPerSpan = 16,
): readonly StringLightPoint[] {
  const controls = normalizeStringLightControlPoints(points)
  requireSag(sag)
  const segments = Math.min(64, Math.max(2, Math.floor(segmentsPerSpan)))
  const sampled: StringLightPoint[] = []

  for (let spanIndex = 0; spanIndex < controls.length - 1; spanIndex += 1) {
    const start = controls[spanIndex]
    const end = controls[spanIndex + 1]
    const spanLength = pointDistance(start, end)
    const spanSag = Math.min(sag, spanLength * 0.45)

    for (let step = 0; step <= segments; step += 1) {
      if (spanIndex > 0 && step === 0) continue
      const t = step / segments
      const gravityOffset = spanSag * 4 * t * (1 - t)
      sampled.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t - gravityOffset,
        start[2] + (end[2] - start[2]) * t,
      ])
    }
  }

  return sampled
}

export function measureStringLightArcLength(
  points: readonly StringLightPoint[],
) {
  if (points.length < 2) return 0
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    const span = pointDistance(points[index - 1], points[index])
    if (!Number.isFinite(span)) {
      throw new RangeError('彩灯路径包含非法长度')
    }
    length += span
  }
  return length
}

export function resolveStringLightBulbCount(
  arcLength: number,
  bulbSpacing: number,
  maxBulbs = STRING_LIGHT_MAX_BULBS,
) {
  if (!Number.isFinite(arcLength) || arcLength <= 0) {
    throw new RangeError('彩灯弧长必须是有限正数')
  }
  if (!Number.isFinite(bulbSpacing) || bulbSpacing < 0.04 || bulbSpacing > 4) {
    throw new RangeError('灯泡间距必须是 0.04 到 4 米之间的有限数值')
  }
  const requestedMaximum = Number.isFinite(maxBulbs)
    ? Math.floor(maxBulbs)
    : STRING_LIGHT_MAX_BULBS
  const safeMaximum = Math.min(
    STRING_LIGHT_MAX_BULBS,
    Math.max(1, requestedMaximum),
  )
  return Math.min(safeMaximum, Math.max(1, Math.floor(arcLength / bulbSpacing)))
}

function interpolateAtDistance(
  path: readonly StringLightPoint[],
  targetDistance: number,
): Pick<StringLightBulbPlacement, 'position' | 'tangent'> {
  let travelled = 0
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]
    const end = path[index]
    const segmentLength = pointDistance(start, end)
    if (travelled + segmentLength >= targetDistance || index === path.length - 1) {
      const localDistance = Math.max(0, targetDistance - travelled)
      const t = segmentLength > POINT_EPSILON ? localDistance / segmentLength : 0
      const tangent = [
        (end[0] - start[0]) / segmentLength,
        (end[1] - start[1]) / segmentLength,
        (end[2] - start[2]) / segmentLength,
      ] as const
      return {
        position: [
          start[0] + (end[0] - start[0]) * t,
          start[1] + (end[1] - start[1]) * t,
          start[2] + (end[2] - start[2]) * t,
        ],
        tangent,
      }
    }
    travelled += segmentLength
  }

  const end = path.at(-1) as StringLightPoint
  return { position: end, tangent: [1, 0, 0] }
}

/** 按实际弧长均匀放置灯泡；每段灯只产生一个有界实例序列。 */
export function computeStringLightBulbPlacements(
  sampledPath: readonly StringLightPoint[],
  bulbSpacing: number,
  maxBulbs = STRING_LIGHT_MAX_BULBS,
): readonly StringLightBulbPlacement[] {
  const arcLength = measureStringLightArcLength(sampledPath)
  const count = resolveStringLightBulbCount(arcLength, bulbSpacing, maxBulbs)
  const effectiveSpacing = arcLength / count

  return Array.from({ length: count }, (_, index) => {
    const distance = effectiveSpacing * (index + 0.5)
    return {
      ...interpolateAtDistance(sampledPath, distance),
      distance,
    }
  })
}

export function resolveStringLightPath(
  points: readonly StringLightPoint[],
  bulbSpacing: number,
  sag: number,
  maxBulbs = STRING_LIGHT_MAX_BULBS,
  segmentsPerSpan = 16,
): ResolvedStringLightPath {
  const controlPoints = normalizeStringLightControlPoints(points)
  const sampledPoints = sampleStringLightPath(
    controlPoints,
    sag,
    segmentsPerSpan,
  )
  const arcLength = measureStringLightArcLength(sampledPoints)
  const bulbs = computeStringLightBulbPlacements(
    sampledPoints,
    bulbSpacing,
    maxBulbs,
  )
  return { controlPoints, sampledPoints, arcLength, bulbs }
}
