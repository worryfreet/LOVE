import { Euler, Vector3 } from 'three'
import type { Vector3Tuple } from 'three'
import { createSeededRandom, seededRange } from '@/shared/plant'
import type {
  FlowerSpeciesId,
  FlowerSpeciesRuntimeSpec,
  LotusPetalPlacement,
} from './types'

export interface DiscPoint {
  position: Vector3
  scale: number
  rotation: number
}

export interface PetalSpiralPoint {
  position: Vector3
  angle: number
  scale: number
  tilt: number
  twist: number
  roll: number
}

export interface PetalSpiralLayoutOptions {
  count: number
  seed: number
  maxRadius: number
  innerDepth: number
  outerDepth: number
  scaleInner: number
  scaleOuter: number
  tiltInner: number
  tiltOuter: number
  twistInner?: number
  twistOuter?: number
  radiusBias?: number
  depthBias?: number
  scaleBias?: number
  tiltBias?: number
  irregularity?: number
  rotationOffset?: number
  indexOffset?: number
}

export interface DandelionLigulePoint extends PetalSpiralPoint {
  progress: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export type OrientedFlowerSpeciesId = Exclude<FlowerSpeciesId, 'hydrangea'>

interface BloomFrameProfile {
  /** 花冠轴线相对世界 +Y 的前倾角；0° 完全朝上，90° 完全朝前。 */
  tiltFromUp: number
  /** 花冠朝默认英雄镜头所在的 +X / +Z 象限轻微转向。 */
  azimuth: number
}

/**
 * Flower Studio 以世界 +Y 作为花冠轴线；项目花瓣薄壳则以局部 +Z 为正面。
 * 这里集中完成两套坐标约定的转换，避免每个物种再次把花冠竖装在茎顶。
 */
export const BLOOM_FRAME_PROFILES: Readonly<
  Record<OrientedFlowerSpeciesId, BloomFrameProfile>
> = {
  sunflower: { tiltFromUp: 34, azimuth: 24 },
  // 两种玫瑰科花头都沿茎顶朝上，月季保留比玫瑰更明显的自然轻倾。
  rose: { tiltFromUp: 10, azimuth: 20 },
  'classic-rose': { tiltFromUp: 4, azimuth: 18 },
  lily: { tiltFromUp: 69, azimuth: 18 },
  orchid: { tiltFromUp: 68, azimuth: 8 },
  lotus: { tiltFromUp: 20, azimuth: 18 },
  dandelion: { tiltFromUp: 25, azimuth: 18 },
  'morning-glory': { tiltFromUp: 48, azimuth: 20 },
}

export function resolveBloomHeadRotation(
  species: OrientedFlowerSpeciesId,
  tiltOffset = 0,
  azimuthOffset = 0,
): Vector3Tuple {
  const profile = BLOOM_FRAME_PROFILES[species]
  return [
    (-90 + profile.tiltFromUp + tiltOffset) * Math.PI / 180,
    (profile.azimuth + azimuthOffset) * Math.PI / 180,
    0,
  ]
}

/**
 * Flower Studio 花冠以局部 +Y 为轴；旋转角本身就是相对世界 +Y 的前倾角。
 * 这里不能沿用局部 +Z 花冠的 `90° - tilt` 换算，否则会把朝上的玫瑰
 * 错误地旋成侧挂花头。
 */
export function resolveStudioBloomHeadRotation(
  species: Extract<OrientedFlowerSpeciesId, 'rose' | 'classic-rose'>,
  tiltOffset = 0,
  azimuthOffset = 0,
): Vector3Tuple {
  const profile = BLOOM_FRAME_PROFILES[species]
  return [
    (profile.tiltFromUp + tiltOffset) * Math.PI / 180,
    (profile.azimuth + azimuthOffset) * Math.PI / 180,
    0,
  ]
}

export function resolveBloomFacingNormal(
  species: OrientedFlowerSpeciesId,
  tiltOffset = 0,
  azimuthOffset = 0,
) {
  const usesStudioFrame = species === 'rose' || species === 'classic-rose'
  const rotation = usesStudioFrame
    ? resolveStudioBloomHeadRotation(species, tiltOffset, azimuthOffset)
    : resolveBloomHeadRotation(species, tiltOffset, azimuthOffset)
  return new Vector3(0, usesStudioFrame ? 1 : 0, usesStudioFrame ? 0 : 1).applyEuler(
    new Euler(rotation[0], rotation[1], rotation[2], 'XYZ'),
  ).normalize()
}

/**
 * 漏斗花冠的几何原点不在花喉。改变朝向后，重新反算组原点，确保花喉仍
 * 精确接回藤蔓末端，而不是因整组旋转悬浮在茎顶。
 */
export function resolveAttachedBloomOrigin(
  anchor: Vector3Tuple,
  localAttachment: Vector3Tuple,
  rotation: Vector3Tuple,
): Vector3Tuple {
  const attachment = new Vector3(...localAttachment).applyEuler(
    new Euler(rotation[0], rotation[1], rotation[2], 'XYZ'),
  )
  return new Vector3(...anchor).sub(attachment).toArray()
}

export const DANDELION_HEAD_DEPTHS = {
  involucre: -0.11,
  outer: 0,
  middle: 0.05,
  inner: 0.1,
  center: 0.118,
} as const

export interface OrchidBloomPlacement {
  socketPosition: Vector3Tuple
  position: Vector3Tuple
  rotation: Vector3Tuple
  scale: number
}

/**
 * 蝴蝶兰单花沿弓形总状花序形成前后错层，并分别向上、向外偏转。
 * 花朵不再共用近似平行的竖直平面，侧视仍能读到花冠体积。
 */
export function createOrchidBloomPlacements({
  count,
  width,
  height,
  droop,
  spacing,
  scale,
}: {
  count: number
  width: number
  height: number
  droop: number
  spacing: number
  scale: number
}): OrchidBloomPlacement[] {
  const baseRotation = resolveBloomHeadRotation('orchid')
  return Array.from({ length: count }, (_, index) => {
    const progress = count > 1 ? index / (count - 1) : 0.5
    // 参考株的开花段从弧线右端跨过最高点延伸到左端，末端花苞再继续下垂；
    // 开花段本身不应像短串灯挤在支撑杆一侧。
    const x = (progress * 1.82 - 0.82) * width +
      (index - (count - 1) * 0.5) * (spacing - 0.36) * 0.12
    const arch = Math.sin(progress * Math.PI) * height
    const terminalDroop = Math.pow(
      Math.max(0, progress - 0.55) / 0.45,
      1.45,
    ) * droop
    const y = 0.34 + arch - terminalDroop
    const tangent = Math.cos(progress * Math.PI) * height -
      (progress > 0.55 ? droop * 1.25 : 0)
    const axisDepth = Math.sin(progress * Math.PI * 2 + 0.38) * 0.055
    const alternatingDepth = Math.sin(index * 1.71) * 0.12 +
      (index % 2 === 0 ? 0.045 : -0.045)
    const facingOffset = (progress - 0.5) * 0.46 +
      (index % 2 === 0 ? 0.07 : -0.07) +
      Math.sin(index * 1.27) * 0.055

    return {
      socketPosition: [x, y, axisDepth],
      position: [x, y, axisDepth + alternatingDepth],
      rotation: [
        Math.min(
          -0.34,
          baseRotation[0] - Math.sin(progress * Math.PI) * 0.09 +
            Math.sin(index * 1.31) * 0.055,
        ),
        baseRotation[1] + facingOffset,
        -tangent * 0.18 + Math.sin(index * 1.83) * 0.055,
      ],
      scale: scale * (
        0.9 + Math.sin(progress * Math.PI) * 0.12 +
        Math.sin(index * 1.57) * 0.025
      ),
    }
  })
}

/**
 * 连续黄金角叶序。与等分同心环不同，每枚花瓣都拥有独立半径、深度、
 * 尺度和开放角，中心到外缘形成一条连续螺旋，避免月季出现机械层圈。
 */
export function createPetalSpiralPoints({
  count,
  seed,
  maxRadius,
  innerDepth,
  outerDepth,
  scaleInner,
  scaleOuter,
  tiltInner,
  tiltOuter,
  twistInner = 0.5,
  twistOuter = 0.04,
  radiusBias = 1.15,
  depthBias = 1.2,
  scaleBias = 0.82,
  tiltBias = 1.8,
  irregularity = 0.035,
  rotationOffset = 0,
  indexOffset = 0,
}: PetalSpiralLayoutOptions): PetalSpiralPoint[] {
  const random = createSeededRandom(seed)
  return Array.from({ length: count }, (_, index) => {
    const progress = count > 1 ? index / (count - 1) : 0
    const angle =
      (index + indexOffset) * GOLDEN_ANGLE +
      rotationOffset +
      seededRange(random, -irregularity, irregularity)
    const radius =
      maxRadius *
      Math.pow(progress, radiusBias) *
      seededRange(random, 1 - irregularity * 0.35, 1 + irregularity * 0.35)
    const depthProgress = Math.pow(progress, depthBias)
    const scaleProgress = Math.pow(progress, scaleBias)
    const tiltProgress = Math.pow(progress, tiltBias)

    return {
      position: new Vector3(
        Math.sin(angle) * radius,
        Math.cos(angle) * radius,
        innerDepth + (outerDepth - innerDepth) * depthProgress,
      ),
      angle,
      scale:
        scaleInner +
        (scaleOuter - scaleInner) * scaleProgress *
          seededRange(random, 1 - irregularity, 1 + irregularity),
      tilt:
        tiltInner +
        (tiltOuter - tiltInner) * tiltProgress +
        seededRange(random, -irregularity * 0.4, irregularity * 0.4),
      twist:
        twistInner +
        (twistOuter - twistInner) * progress +
        seededRange(random, -irregularity * 0.45, irregularity * 0.45),
      roll: seededRange(random, -irregularity * 1.7, irregularity * 1.7),
    }
  })
}

/**
 * 蒲公英的花心仍由舌状小花组成。连续黄金角叶序从短直立中心过渡到
 * 长而平展的外缘，避免三个同心环和独立圆心造成“雏菊化”。
 */
export function createDandelionLigulePoints({
  count,
  radius,
  innerDepth,
  outerDepth,
  innerScale,
  outerScale,
  innerTilt,
  middleTilt,
  outerTilt,
  seed,
}: {
  count: number
  radius: number
  innerDepth: number
  outerDepth: number
  innerScale: number
  outerScale: number
  innerTilt: number
  middleTilt?: number
  outerTilt: number
  seed: number
}): DandelionLigulePoint[] {
  const points = createPetalSpiralPoints({
    count,
    seed,
    maxRadius: radius,
    innerDepth,
    outerDepth,
    scaleInner: innerScale,
    scaleOuter: outerScale,
    tiltInner: innerTilt,
    tiltOuter: outerTilt,
    twistInner: 0.18,
    twistOuter: 0.01,
    radiusBias: 1.16,
    depthBias: 1.28,
    scaleBias: 0.68,
    tiltBias: 1.36,
    irregularity: 0.052,
  })
  const resolvedMiddleTilt = middleTilt ?? (innerTilt + outerTilt) * 0.5
  return points.map((point, index) => {
    const progress = count > 1 ? index / (count - 1) : 0
    const tiltProgress = progress < 0.48
      ? progress / 0.48
      : (progress - 0.48) / 0.52
    const stagedTilt = progress < 0.48
      ? innerTilt + (resolvedMiddleTilt - innerTilt) * Math.pow(tiltProgress, 1.2)
      : resolvedMiddleTilt + (outerTilt - resolvedMiddleTilt) * Math.pow(tiltProgress, 1.35)
    return {
      ...point,
      tilt: stagedTilt + (point.tilt - (
        innerTilt + (outerTilt - innerTilt) * Math.pow(progress, 1.36)
      )),
      progress,
    }
  })
}

/**
 * 荷花用一条连续黄金角叶序形成碗体，内 / 中 / 外只切换专属花瓣形态，
 * 根位半径、深度、尺度和张角始终连续，避免三圈之间出现贯穿水平缝。
 */
export function createLotusPetalPlacements(
  count = 28,
  seed = 1800,
  options: {
    innerCount?: number
    middleCount?: number
    innerTilt?: number
    middleTilt?: number
    outerTilt?: number
    innerScale?: number
    middleScale?: number
    outerScale?: number
  } = {},
): LotusPetalPlacement[] {
  const random = createSeededRandom(seed)
  const innerCount = Math.max(1, Math.min(count, options.innerCount ?? 8))
  const middleCount = Math.max(
    1,
    Math.min(count - innerCount, options.middleCount ?? 10),
  )
  return Array.from({ length: count }, (_, index) => {
    const progress = count > 1 ? index / (count - 1) : 0
    const band = index < innerCount
      ? 'inner'
      : index < innerCount + middleCount
        ? 'middle'
        : 'outer'
    const angle = index * GOLDEN_ANGLE + 0.18 +
      seededRange(random, -0.045, 0.045)
    const radius = (0.026 + 0.145 * Math.pow(progress, 1.08)) *
      seededRange(random, 0.97, 1.03)
    const depth = 0.25 + (-0.12 - 0.25) * Math.pow(progress, 1.12) +
      seededRange(random, -0.009, 0.009)
    const innerTilt = options.innerTilt ?? 50
    const middleTilt = options.middleTilt ?? 22
    const outerTilt = options.outerTilt ?? 4
    const tiltDegrees = progress < 0.62
      ? innerTilt + (middleTilt - innerTilt) * Math.pow(progress / 0.62, 1.12)
      : middleTilt + (outerTilt - middleTilt) * Math.pow((progress - 0.62) / 0.38, 1.22)
    const innerScale = options.innerScale ?? 0.74
    const middleScale = options.middleScale ?? 0.92
    const outerScale = options.outerScale ?? 1.05
    const scaleBase = progress < 0.62
      ? innerScale + (middleScale - innerScale) * Math.pow(progress / 0.62, 0.82)
      : middleScale + (outerScale - middleScale) * Math.pow((progress - 0.62) / 0.38, 0.9)
    const tilt = tiltDegrees * Math.PI / 180 +
      seededRange(random, -0.022, 0.022)
    const scale = scaleBase +
      seededRange(random, -0.014, 0.014)
    return {
      position: [
        Math.sin(angle) * radius,
        Math.cos(angle) * radius,
        depth,
      ],
      angle,
      tilt,
      scale,
      roll: seededRange(random, -0.028, 0.028),
      band,
      tint: band === 'inner'
        ? (index % 3 === 0 ? '#ED6F99' : '#F08EB0')
        : band === 'middle'
          ? (index % 4 === 0 ? '#EC8CAB' : '#F3A8BE')
          : (index % 5 === 0 ? '#ED9FB4' : '#F5C0CE'),
    }
  })
}

export function createGoldenDiscPoints(
  count: number,
  radius: number,
  dome: number,
  seed: number,
): DiscPoint[] {
  const random = createSeededRandom(seed)
  return Array.from({ length: count }, (_, index) => {
    const progress = (index + 0.5) / Math.max(1, count)
    const radial = Math.sqrt(progress) * radius
    const angle = index * GOLDEN_ANGLE
    const normalizedRadius = radial / Math.max(radius, 0.0001)
    return {
      position: new Vector3(
        Math.cos(angle) * radial,
        Math.sin(angle) * radial,
        dome * (1 - normalizedRadius * normalizedRadius),
      ),
      scale: seededRange(random, 0.82, 1.18),
      rotation: angle + seededRange(random, -0.2, 0.2),
    }
  })
}

export type HydrangeaBranchLevel = 0 | 1 | 2 | 3 | 4

export interface HydrangeaBranchSegment {
  id: string
  start: Vector3
  end: Vector3
  level: HydrangeaBranchLevel
  radius: number
}

export interface HydrangeaFloretPoint {
  id: string
  clusterIndex: number
  position: Vector3
  normal: Vector3
  scale: number
  rotation: number
  lobeScales: readonly [number, number, number, number]
  lobeTilts: readonly [number, number, number, number]
}

export interface HydrangeaCymeLayout {
  representation: 'hierarchical-dichasial-cyme'
  supportEnvelope: 'sampling-only'
  primaryBranchCount: number
  cymeCount: number
  floretsPerCyme: number
  branchSegments: HydrangeaBranchSegment[]
  florets: HydrangeaFloretPoint[]
}

export interface HydrangeaCymeLayoutOptions {
  cymeCount?: number
  floretsPerCyme?: number
  radius?: number
  seed?: number
}

/**
 * 以小花中心的最近邻距离限制整朵小花的最大尺度。花瓣长度、宽度或
 * 聚伞密度改变后仍保留少量净距，避免相邻四瓣小花在三维空间互相穿透。
 */
export function resolveHydrangeaFloretScaleCaps(
  florets: readonly HydrangeaFloretPoint[],
  petalLength: number,
  petalWidth: number,
  clearance = 0.94,
) {
  if (florets.length < 2) return florets.map(() => 1)
  // 四瓣小花是十字形而非实心圆盘，使用四枚近似三角瓣的等效占地半径。
  // 这样只压缩会发生面片穿透的局部小花，不会把整个绣球缩成稀疏枝架。
  const petalReach = Math.sqrt(
    2 * petalLength * petalWidth / Math.PI,
  ) + 0.004
  const halfClearance = Math.max(0.1, Math.min(1, clearance)) * 0.5

  return florets.map((floret, floretIndex) => {
    let nearestDistance = Number.POSITIVE_INFINITY
    florets.forEach((candidate, candidateIndex) => {
      if (candidateIndex === floretIndex) return
      nearestDistance = Math.min(
        nearestDistance,
        floret.position.distanceTo(candidate.position),
      )
    })
    return Math.min(1, nearestDistance * halfClearance / petalReach)
  })
}

function tangentFrame(normal: Vector3) {
  const reference = Math.abs(normal.y) > 0.82
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 1, 0)
  const tangent = new Vector3().crossVectors(reference, normal).normalize()
  const bitangent = new Vector3().crossVectors(normal, tangent).normalize()
  return { tangent, bitangent }
}

function primaryBranchIndex(normal: Vector3, count: number) {
  if (normal.y > 0.78) return 0
  const angle = Math.atan2(normal.z, normal.x)
  const wrapped = (angle + Math.PI * 2) % (Math.PI * 2)
  return 1 + Math.floor(wrapped / (Math.PI * 2) * (count - 1))
}

/**
 * 大叶绣球的花头不是实体球，而是多级聚伞分枝末端的装饰花共同形成近球形花冠。
 * 每个二级花序由一朵顶生花和三对侧生花组成，分枝节点在相邻花之间共享。
 */
export function createHydrangeaCymeLayout({
  cymeCount = 18,
  floretsPerCyme = 7,
  radius = 0.78,
  seed = 1770,
}: HydrangeaCymeLayoutOptions = {}): HydrangeaCymeLayout {
  if (floretsPerCyme !== 7) {
    throw new Error('绣球聚伞单元固定为一朵顶生花与三对侧生花')
  }

  const random = createSeededRandom(seed)
  const primaryCount = 7
  // 花球外形由花朵端点决定。三轴共用同一支撑半径，分枝只负责连接
  // 内部共享节点与球面端点，避免枝长差异把花冠再次拉成椭球。
  const supportRadius = radius
  const envelopeCenter = new Vector3(0, radius * 0.08, 0)
  const root = new Vector3(
    0,
    envelopeCenter.y - supportRadius * 1.08,
    -radius * 0.02,
  )
  const crown = new Vector3(
    0,
    envelopeCenter.y - supportRadius * 0.73,
    -radius * 0.015,
  )
  const branchSegments: HydrangeaBranchSegment[] = [{
    id: 'trunk',
    start: root,
    end: crown,
    level: 0,
    radius: radius * 0.042,
  }]

  const surfacePoint = (direction: Vector3, radialScale = 1) =>
    envelopeCenter.clone().addScaledVector(
      direction,
      supportRadius * radialScale,
    )
  const surfaceNormal = (position: Vector3) =>
    position.clone().sub(envelopeCenter).normalize()

  // 聚伞单元沿球形包络均匀铺开，只在下方保留很小的分枝收口。
  // 这比单层抛物圆拱更接近大叶绣球的 mophead 体积，同时仍不生成实体内核。
  const cymeAnchors = Array.from({ length: cymeCount }, (_, index) => {
    const progress = (index + 0.46) / cymeCount
    const normalizedY = 0.99 - progress * 1.88
    const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY))
    const angle = index * GOLDEN_ANGLE + 0.24 + seededRange(random, -0.065, 0.065)
    const direction = new Vector3(
      Math.cos(angle) * ringRadius,
      normalizedY,
      Math.sin(angle) * ringRadius,
    ).normalize()
    const radialScale =
      1 +
      Math.sin(angle * 3.1 + index * 0.17) * 0.024 +
      seededRange(random, -0.018, 0.018)
    const position = surfacePoint(direction, radialScale)
    return {
      direction,
      position,
      normal: surfaceNormal(position),
    }
  })

  type FloretSurfaceSample = {
    direction: Vector3
    position: Vector3
    normal: Vector3
  }
  const floretSurfaceSamples: FloretSurfaceSample[] = Array.from(
    { length: cymeCount * floretsPerCyme },
    (_, index) => {
      const progress = (index + 0.5) / (cymeCount * floretsPerCyme)
      const normalizedY = 0.995 - progress * 1.9
      const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY))
      const angle = index * GOLDEN_ANGLE + 0.46 +
        seededRange(random, -0.025, 0.025)
      const direction = index === 0
        ? new Vector3(0, 1, 0)
        : new Vector3(
            Math.cos(angle) * ringRadius,
            normalizedY,
            Math.sin(angle) * ringRadius,
          ).normalize()
      const position = surfacePoint(
        direction,
        1 +
          Math.sin(index * 1.73) * 0.018 +
          seededRange(random, -0.022, 0.022),
      )
      return {
        direction,
        position,
        normal: surfaceNormal(position),
      }
    },
  )

  // 先生成全局均匀的花朵端点，再按最近聚伞锚点平衡分组。这样既保留
  // 一顶花加三对侧花的真实分枝语义，也不会在相邻局部簇之间留下大孔洞。
  const candidates = floretSurfaceSamples.flatMap((sample, sampleIndex) =>
    cymeAnchors.map((anchor, clusterIndex) => ({
      sampleIndex,
      clusterIndex,
      distance: 1 - sample.direction.dot(anchor.direction),
    })),
  ).sort((left, right) =>
    left.distance - right.distance ||
    left.sampleIndex - right.sampleIndex ||
    left.clusterIndex - right.clusterIndex,
  )
  const assignedCluster = Array(floretSurfaceSamples.length).fill(-1)
  const clusterCounts = Array(cymeCount).fill(0)
  candidates.forEach(({ sampleIndex, clusterIndex }) => {
    if (
      assignedCluster[sampleIndex] !== -1 ||
      clusterCounts[clusterIndex] >= floretsPerCyme
    ) return
    assignedCluster[sampleIndex] = clusterIndex
    clusterCounts[clusterIndex] += 1
  })
  if (assignedCluster.some((clusterIndex) => clusterIndex < 0)) {
    throw new Error('绣球花端点未能完整分配到聚伞分枝')
  }
  const cymeFloretSamples = Array.from(
    { length: cymeCount },
    () => [] as FloretSurfaceSample[],
  )
  floretSurfaceSamples.forEach((sample, sampleIndex) => {
    cymeFloretSamples[assignedCluster[sampleIndex]].push(sample)
  })
  cymeFloretSamples.forEach((samples, clusterIndex) => {
    samples.sort((left, right) =>
      right.direction.dot(cymeAnchors[clusterIndex].direction) -
      left.direction.dot(cymeAnchors[clusterIndex].direction),
    )
  })

  const primaryStarts = Array.from({ length: primaryCount }, (_, index) => {
    if (index === 0) return crown.clone()
    const tier = Math.floor((index - 1) / 2)
    return new Vector3(
      0,
      root.y + supportRadius * (0.16 + tier * 0.08),
      -radius * 0.015,
    )
  })
  const primaryNodes = Array.from({ length: primaryCount }, (_, index) => {
    if (index === 0) {
      return new Vector3(
        0.012,
        envelopeCenter.y + supportRadius * 0.27,
        -radius * 0.012,
      )
    }
    const angle = (index - 1) / (primaryCount - 1) * Math.PI * 2 + 0.16
    return new Vector3(
      Math.cos(angle) * supportRadius * 0.24,
      envelopeCenter.y - supportRadius * 0.32 +
        Math.sin(angle * 2.1) * radius * 0.035,
      Math.sin(angle) * supportRadius * 0.22,
    )
  })

  primaryNodes.forEach((node, index) => {
    branchSegments.push({
      id: `primary-${index}`,
      start: primaryStarts[index],
      end: node,
      level: 1,
      radius: radius * (index === 0 ? 0.026 : 0.023),
    })
  })

  const florets: HydrangeaFloretPoint[] = []

  cymeAnchors.forEach(({
    direction: anchorDirection,
    normal,
  }, clusterIndex) => {
    const { tangent, bitangent } = tangentFrame(normal)
    const groupNode = envelopeCenter.clone().addScaledVector(
      anchorDirection,
      supportRadius * 0.56,
    )
    const primaryIndex = primaryBranchIndex(normal, primaryCount)

    branchSegments.push({
      id: `secondary-${clusterIndex}`,
      start: primaryNodes[primaryIndex],
      end: groupNode,
      level: 2,
      radius: radius * seededRange(random, 0.01, 0.013),
    })

    const clusterSamples = cymeFloretSamples[clusterIndex]
    const terminalSample = clusterSamples[0]
    const terminalScale = seededRange(random, 0.96, 1.08)
    const terminalPosition = terminalSample.position.clone()
    const terminalNormal = terminalSample.normal.clone()
      .addScaledVector(tangent, seededRange(random, -0.06, 0.06))
      .addScaledVector(bitangent, seededRange(random, -0.06, 0.06))
    terminalNormal.normalize()

    branchSegments.push({
      id: `terminal-pedicel-${clusterIndex}`,
      start: groupNode,
      end: terminalPosition.clone().addScaledVector(terminalNormal, -radius * 0.024),
      level: 4,
      radius: radius * 0.0062,
    })

    const makeFloret = (
      localIndex: number,
      position: Vector3,
      floretNormal: Vector3,
      scale: number,
    ) => {
      const lobeScales = Array.from({ length: 4 }, () =>
        seededRange(random, 0.94, 1.08),
      ) as [number, number, number, number]
      const lobeTilts = Array.from({ length: 4 }, () =>
        seededRange(random, 0.045, 0.14),
      ) as [number, number, number, number]
      const crownProgress = Math.max(0, (floretNormal.y - 0.72) / 0.28)
      const crownCoverage = 1 + Math.min(1, crownProgress) ** 2 * 0.14
      florets.push({
        id: `floret-${clusterIndex}-${localIndex}`,
        clusterIndex,
        position,
        normal: floretNormal,
        scale: scale * crownCoverage,
        rotation: seededRange(random, -Math.PI, Math.PI),
        lobeScales,
        lobeTilts,
      })
    }

    makeFloret(0, terminalPosition, terminalNormal, terminalScale)

    const ringSamples = clusterSamples.slice(1).sort((left, right) => {
      const leftAngle = Math.atan2(
        left.direction.dot(bitangent),
        left.direction.dot(tangent),
      )
      const rightAngle = Math.atan2(
        right.direction.dot(bitangent),
        right.direction.dot(tangent),
      )
      return leftAngle - rightAngle
    })

    for (let pairIndex = 0; pairIndex < 3; pairIndex += 1) {
      const pairSamples = ringSamples.slice(pairIndex * 2, pairIndex * 2 + 2)
      const pairDirection = pairSamples[0].direction.clone()
        .add(pairSamples[1].direction)
        .multiplyScalar(0.5)
        .sub(anchorDirection)
      pairDirection.addScaledVector(normal, -pairDirection.dot(normal))
      if (pairDirection.lengthSq() < 0.000001) pairDirection.copy(tangent)
      pairDirection.normalize()
      const forkNode = groupNode.clone()
        .addScaledVector(normal, radius * seededRange(random, 0.07, 0.1))
        .addScaledVector(pairDirection, radius * 0.055)
      branchSegments.push({
        id: `tertiary-${clusterIndex}-${pairIndex}`,
      start: groupNode,
      end: forkNode,
      level: 3,
      radius: radius * 0.0072,
      })

      pairSamples.forEach((sample, sideIndex) => {
        const position = sample.position.clone()
        const floretDirection = sample.direction.clone().sub(anchorDirection)
        if (floretDirection.lengthSq() < 0.000001) floretDirection.copy(pairDirection)
        floretDirection.normalize()
        const floretNormal = sample.normal.clone()
          .addScaledVector(floretDirection, seededRange(random, -0.03, 0.03))
        floretNormal.normalize()
        const localIndex = 1 + pairIndex * 2 + sideIndex
        branchSegments.push({
          id: `lateral-pedicel-${clusterIndex}-${localIndex}`,
          start: forkNode,
          end: position.clone().addScaledVector(floretNormal, -radius * 0.024),
          level: 4,
          radius: radius * 0.0046,
        })
        makeFloret(
          localIndex,
          position,
          floretNormal,
          seededRange(random, 0.9, 1.06),
        )
      })
    }
  })

  return {
    representation: 'hierarchical-dichasial-cyme',
    supportEnvelope: 'sampling-only',
    primaryBranchCount: primaryCount,
    cymeCount,
    floretsPerCyme,
    branchSegments,
    florets,
  }
}

export const FLOWER_SPECIES_RUNTIME: Readonly<
  Record<string, FlowerSpeciesRuntimeSpec>
> = {
  sunflower: {
    id: 'sunflower',
    displayName: '向日葵',
    seed: 1701,
    bloomDuration: 2.4,
    windAmplitude: 0.018,
    identityFeatures: ['复合花盘', '金黄舌状花', '心形锯齿叶'],
    organCounts: { rayPetals: 86, discFlorets: 720, leaves: 6 },
  },
  rose: {
    id: 'rose',
    displayName: '月季',
    seed: 1702,
    bloomDuration: 3,
    windAmplitude: 0.012,
    identityFeatures: ['螺旋重瓣', '外瓣翻卷', '复叶与皮刺'],
    organCounts: { petals: 36, leaves: 6, thorns: 9 },
  },
  'classic-rose': {
    id: 'classic-rose',
    displayName: '玫瑰',
    seed: 1709,
    bloomDuration: 3.2,
    windAmplitude: 0.011,
    identityFeatures: ['紧密杯状重瓣', '遮蔽式螺旋花心', '复叶、萼片与皮刺'],
    organCounts: { petals: 52, leaves: 6, thorns: 10, sepals: 6 },
  },
  lily: {
    id: 'lily',
    displayName: '百合',
    seed: 1703,
    bloomDuration: 2.7,
    windAmplitude: 0.016,
    identityFeatures: ['六枚花被片', '六雄蕊一雌蕊', '花瓣斑点'],
    organCounts: { tepals: 6, stamens: 6, pistils: 1, leaves: 6 },
  },
  orchid: {
    id: 'orchid',
    displayName: '蝴蝶兰',
    seed: 1704,
    bloomDuration: 3.2,
    windAmplitude: 0.012,
    identityFeatures: ['弓形总状花序', '两侧对称蝶形花', '独立唇瓣'],
    organCounts: { blooms: 7, buds: 4, basalLeaves: 5 },
  },
  lotus: {
    id: 'lotus',
    displayName: '荷花',
    seed: 1705,
    bloomDuration: 3.1,
    windAmplitude: 0.012,
    identityFeatures: ['舟形叠层花瓣', '黄色莲蓬', '盾状荷叶'],
    organCounts: { petals: 28, stamens: 48, leaves: 2 },
  },
  dandelion: {
    id: 'dandelion',
    displayName: '蒲公英',
    seed: 1706,
    bloomDuration: 2.2,
    windAmplitude: 0.02,
    identityFeatures: ['密集舌状小花', '中空花葶', '贴地锯齿莲座叶'],
    organCounts: { florets: 216, rosetteLeaves: 13, stems: 1 },
  },
  'morning-glory': {
    id: 'morning-glory',
    displayName: '牵牛花',
    seed: 1707,
    bloomDuration: 2.8,
    windAmplitude: 0.02,
    identityFeatures: ['连续喇叭花冠', '白粉渐变花喉', '缠绕藤与心形叶'],
    organCounts: { trumpets: 1, buds: 2, leaves: 3 },
  },
  hydrangea: {
    id: 'hydrangea',
    displayName: '绣球花',
    seed: 1708,
    bloomDuration: 3.3,
    windAmplitude: 0.014,
    identityFeatures: ['近球形聚伞复合花序', '四枚独立装饰萼片', '对生锯齿阔叶'],
    organCounts: {
      cymes: 26,
      florets: 182,
      decorativeSepals: 728,
      leaves: 2,
    },
  },
}

export function getFlowerRuntimeSpec(id: FlowerSpeciesId) {
  return FLOWER_SPECIES_RUNTIME[id]
}

export function resolveBloomTransform(progress: number) {
  const normalized = Math.max(0, Math.min(1, progress))
  const eased = normalized * normalized * normalized * (
    normalized * (normalized * 6 - 15) + 10
  )
  return {
    scale: [
      0.74 + eased * 0.26,
      0.74 + eased * 0.26,
      0.86 + eased * 0.14,
    ] as const,
    rotationZ: (1 - eased) * 0.09,
  }
}
