import {
  Euler,
  Quaternion,
  Vector3,
} from 'three'
import type { Vector3Tuple } from 'three'

export interface WeightedStemLayoutOptions {
  base: Vector3Tuple
  /** 茎中心线的弧长。 */
  length: number
  /** 花头重量造成的末端切线弯曲角。 */
  headBendDegrees: number
  /** 弯曲朝向，0° 指向世界 +Z，90° 指向世界 +X。 */
  azimuthDegrees: number
  /** 主茎自身的小幅侧弯位移请求值。 */
  stemCurve?: number
  /** 受力弯曲开始占整茎弧长的比例。 */
  bendStart?: number
  /** 花冠自身的局部开放轴。 */
  bloomAxis?: Vector3Tuple
  /** 让同一根管状茎伸入花托的长度。 */
  socketDepth?: number
  sampleCount?: number
}

export interface WeightedStemLayout {
  /** 不包含花托内延长段，用于沿茎定位叶节。 */
  centerlinePoints: readonly Vector3Tuple[]
  /** 包含花托内延长段，直接交给唯一的 CurvedStem。 */
  stemPoints: readonly Vector3Tuple[]
  bloomPosition: Vector3Tuple
  bloomRotation: Vector3Tuple
  endTangent: Vector3Tuple
}

function smootherStep(value: number) {
  const progress = Math.max(0, Math.min(1, value))
  return progress * progress * progress * (
    progress * (progress * 6 - 15) + 10
  )
}

function tangentAt(
  progress: number,
  headBend: number,
  azimuth: number,
  bendStart: number,
  stemCurveStrength: number,
) {
  const bendProgress = smootherStep(
    (progress - bendStart) / Math.max(0.0001, 1 - bendStart),
  )
  const angle = headBend * bendProgress
  const horizontalLoad = new Vector3(
    Math.sin(azimuth),
    0,
    Math.cos(azimuth),
  )
  return new Vector3(0, Math.cos(angle), 0)
    .addScaledVector(horizontalLoad, Math.sin(angle))
    .addScaledVector(
      new Vector3(1, 0, 0),
      stemCurveStrength * Math.sin(Math.PI * progress),
    )
    .normalize()
}

/**
 * 把花头重量解释为沿茎上段逐步累积的切线角，再沿弧长积分中心线。
 * 五次平滑权重使受力段两端的曲率自然归零，避免短转接段形成硬折角。
 */
export function createWeightedStemLayout({
  base,
  length,
  headBendDegrees,
  azimuthDegrees,
  stemCurve = 0,
  bendStart = 0.48,
  bloomAxis = [0, 0, 1],
  socketDepth = 0.08,
  sampleCount = 40,
}: WeightedStemLayoutOptions): WeightedStemLayout {
  const safeLength = Math.max(0.001, length)
  const safeSampleCount = Math.max(12, Math.round(sampleCount))
  const safeBendStart = Math.max(0.2, Math.min(0.82, bendStart))
  const headBend = Math.max(-85, Math.min(85, headBendDegrees)) * Math.PI / 180
  const azimuth = azimuthDegrees * Math.PI / 180
  const stemCurveStrength = stemCurve * Math.PI / (2 * safeLength)
  const stepLength = safeLength / safeSampleCount
  const point = new Vector3(...base)
  const centerlinePoints: Vector3Tuple[] = [point.toArray() as Vector3Tuple]
  let previousTangent = tangentAt(
    0,
    headBend,
    azimuth,
    safeBendStart,
    stemCurveStrength,
  )

  for (let index = 1; index <= safeSampleCount; index += 1) {
    const progress = index / safeSampleCount
    const tangent = tangentAt(
      progress,
      headBend,
      azimuth,
      safeBendStart,
      stemCurveStrength,
    )
    point.add(previousTangent.clone().add(tangent).multiplyScalar(stepLength * 0.5))
    centerlinePoints.push(point.toArray() as Vector3Tuple)
    previousTangent = tangent
  }

  const bloomPosition = point.toArray() as Vector3Tuple
  const endTangent = previousTangent.normalize()
  const stemPoints = [
    ...centerlinePoints,
    point.clone().addScaledVector(endTangent, socketDepth).toArray() as Vector3Tuple,
  ]
  const localBloomAxis = new Vector3(...bloomAxis).normalize()
  const rotation = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(localBloomAxis, endTangent),
    'XYZ',
  )

  return {
    centerlinePoints,
    stemPoints,
    bloomPosition,
    bloomRotation: [rotation.x, rotation.y, rotation.z],
    endTangent: endTangent.toArray() as Vector3Tuple,
  }
}

/** 按弧长进度读取叶节等附着点，不再假设弯茎仍位于竖直轴上。 */
export function sampleWeightedStemPoint(
  layout: WeightedStemLayout,
  progress: number,
): Vector3Tuple {
  const clamped = Math.max(0, Math.min(1, progress))
  const scaledIndex = clamped * (layout.centerlinePoints.length - 1)
  const lowerIndex = Math.floor(scaledIndex)
  const upperIndex = Math.min(
    layout.centerlinePoints.length - 1,
    lowerIndex + 1,
  )
  return new Vector3(...layout.centerlinePoints[lowerIndex])
    .lerp(new Vector3(...layout.centerlinePoints[upperIndex]), scaledIndex - lowerIndex)
    .toArray() as Vector3Tuple
}
