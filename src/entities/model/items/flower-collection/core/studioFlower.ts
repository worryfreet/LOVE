import { DataUtils } from 'three'

export const STUDIO_PETAL_PROFILE_CONTROL_VS = [
  0.225,
  0.41,
  0.595,
  0.78,
  0.965,
] as const

export const STUDIO_PETAL_RAMP_RESOLUTION = 256

export type StudioFlowerPalette = readonly [
  string,
  string,
  string,
  string,
  string,
]

export interface StudioPetalShape {
  length: number
  stemWidth: number
  stemEnd: number
  widths: readonly [number, number, number, number, number]
  /** 玫瑰等圆头花瓣可保留非零末端半宽；未提供时保持 Studio 原版尖端。 */
  tipWidth?: number
  /** 在最终一排顶点上回收两侧长度，形成玫瑰花瓣的圆弧末端。 */
  tipArc?: number
  /** 轻微压低瓣尖中心，形成真玫瑰常见的浅缺刻，而不是尖锐三角端。 */
  tipNotch?: number
  curlClosed: number
  curlOpen: number
  curlBias: number
  propagation: number
  cup: number
  sideCurl: number
  waveAmplitude: number
  waveFrequency: number
  asymmetry: number
  noiseAmplitude: number
  noiseFrequency: number
  shellGap: number
  wrapWidth: number
  wrapCup: number
}

export interface StudioFlowerLayoutOptions {
  count: number
  goldenAngle: number
  radius: number
  radiusBias: number
  height: number
  heightBias: number
  scaleInner: number
  tiltInner: number
  outAngle: number
  tiltBias: number
  jitter: number
}

export interface StudioFlowerPetalPlacement {
  progress: number
  seed: number
  tilt: number
  position: readonly [number, number, number]
  rotation: readonly [number, number, number]
  scale: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function catmullRom(values: readonly number[], t: number) {
  const last = values.length - 1
  const scaled = Math.min(clamp(t, 0, 1) * last, last - 1e-6)
  const index = Math.floor(scaled)
  const local = scaled - index
  const p0 = values[Math.max(index - 1, 0)]
  const p1 = values[index]
  const p2 = values[index + 1]
  const p3 = values[Math.min(index + 2, last)]
  const local2 = local * local
  const local3 = local2 * local
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * local +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * local2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * local3
  )
}

/** Flower Studio 的五控制点轮廓与圆滑尖端，保持原数学不做项目化改写。 */
export function studioPetalWidthAt(shape: StudioPetalShape, v: number) {
  if (v < shape.stemEnd) return shape.stemWidth
  const lastControlV = STUDIO_PETAL_PROFILE_CONTROL_VS.at(-1)!
  if (v <= lastControlV) {
    const bodyT = (v - shape.stemEnd) /
      Math.max(lastControlV - shape.stemEnd, 1e-4)
    return Math.max(
      catmullRom([shape.stemWidth, ...shape.widths], bodyT),
      0,
    )
  }
  const tipT = clamp((v - lastControlV) / (1 - lastControlV), 0, 1)
  const tipWidth = shape.tipWidth ?? 0
  return tipWidth + (shape.widths[4] - tipWidth) *
    Math.sqrt(Math.max(1 - tipT * tipT, 0))
}

/**
 * 按 Flower Studio 原实现烘焙 RGBA16F 坡道：R 为半宽，G 为卷曲密度。
 */
export function createStudioPetalRampData(
  shape: StudioPetalShape,
  resolution = STUDIO_PETAL_RAMP_RESOLUTION,
) {
  const data = new Uint16Array(resolution * 4)
  for (let index = 0; index < resolution; index += 1) {
    const v = index / (resolution - 1)
    data[index * 4] = DataUtils.toHalfFloat(studioPetalWidthAt(shape, v))
    data[index * 4 + 1] = DataUtils.toHalfFloat(
      shape.curlBias * Math.pow(Math.max(v, 1e-4), shape.curlBias - 1),
    )
  }
  return data
}

/**
 * Flower Studio 的黄金角实例布局。位置、旋转顺序、三组确定性扰动和
 * `aU / aSeed / aTilt` 均与其 `buildFlower()` 保持一致。
 */
export function createStudioFlowerLayout({
  count,
  goldenAngle,
  radius,
  radiusBias,
  height,
  heightBias,
  scaleInner,
  tiltInner,
  outAngle,
  tiltBias,
  jitter,
}: StudioFlowerLayoutOptions): StudioFlowerPetalPlacement[] {
  const safeCount = Math.max(1, Math.min(240, Math.round(count)))
  return Array.from({ length: safeCount }, (_, index) => {
    const progress = safeCount > 1 ? index / (safeCount - 1) : 0
    const angle = goldenAngle * index * Math.PI / 180
    const h1 = Math.sin(index * 127.1) * 0.5 + 0.5
    const h2 = Math.sin(index * 311.7) * 0.5 + 0.5
    const h3 = Math.sin(index * 74.3) * 0.5 + 0.5
    const localJitter = jitter * (0.3 + 0.7 * progress)
    const localRadius = radius * Math.pow(progress, radiusBias) *
      (1 + (h1 - 0.5) * localJitter)
    const localHeight = height * Math.pow(progress, heightBias) *
      (1 + (h2 - 0.5) * localJitter)
    return {
      progress,
      seed: ((index * 0.618) % 1) * 20,
      tilt: outAngle * Math.PI / 180 * Math.pow(progress, tiltBias),
      position: [
        Math.sin(angle) * localRadius,
        height - localHeight,
        Math.cos(angle) * localRadius,
      ],
      rotation: [
        -tiltInner,
        angle + Math.PI,
        (h3 - 0.5) * localJitter * 1.5,
      ],
      scale: scaleInner + (1 - scaleInner) * progress,
    }
  })
}

export function studioBloomAt(progress: number, bloomMax: number) {
  const normalized = clamp(progress, 0, 1)
  const eased = normalized * normalized * normalized * (
    normalized * (normalized * 6 - 15) + 10
  )
  return 0.04 + (bloomMax - 0.04) * eased
}
