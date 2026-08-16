import type { HydrangeaPetalSettings } from './hydrangeaPetalParameters'

export type HydrangeaFloretArrangementSettings = Pick<
  HydrangeaPetalSettings,
  'openAngle' | 'rotationOffset' | 'variation' | 'floret'
>

export interface HydrangeaFloretPetalTransformInput {
  lobeIndex: number
  petalCount: number
  phase?: number
  naturalTiltOffset?: number
  naturalScaleOffset?: number
}

export interface HydrangeaFloretPetalTransform {
  angle: number
  tilt: number
  rootOffset: readonly [number, number]
  normalOffset: number
  scale: number
}

/**
 * 单朵小花与整株实例共同使用的局部组合规则，保证编辑器预览不是另一套近似模型。
 */
export function resolveHydrangeaFloretPetalTransform(
  settings: HydrangeaFloretArrangementSettings,
  input: HydrangeaFloretPetalTransformInput,
): HydrangeaFloretPetalTransform {
  const count = Math.max(1, Math.round(input.petalCount))
  const parity = input.lobeIndex % 2 === 0 ? -1 : 1
  const angle =
    (input.phase ?? 0) +
    settings.rotationOffset +
    input.lobeIndex / count * Math.PI * 2
  const tilt =
    settings.openAngle +
    (input.naturalTiltOffset ?? 0) * settings.variation +
    parity * settings.floret.tiltVariation * 0.5
  const alternatingScale = Math.max(
    0.2,
    1 + parity * settings.floret.alternatingScale,
  )
  const scale =
    settings.floret.scale *
    (1 + (input.naturalScaleOffset ?? 0) * settings.variation) *
    alternatingScale

  return {
    angle,
    tilt,
    rootOffset: [
      -Math.sin(angle) * settings.floret.rootOffset,
      Math.cos(angle) * settings.floret.rootOffset,
    ],
    normalOffset: -0.002 + parity * settings.floret.depthStagger * 0.5,
    scale,
  }
}
