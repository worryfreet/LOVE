export interface CottageLoveseatSofaDimensions {
  /** 两侧扶手外缘之间的成品宽度，单位：米。 */
  readonly width: number
  /** 从靠背后缘到扶手前缘的成品深度，单位：米。 */
  readonly depth: number
  /** 地面到靠背最高处的成品高度，单位：米。 */
  readonly height: number
}

export interface CottageLoveseatSofaAppearance {
  readonly fabricColor: string
  readonly pillowColor: string
  readonly secondaryPillowColor: string
  readonly woodColor: string
}

export interface ResolvedCottageLoveseatSofa
  extends CottageLoveseatSofaDimensions {
  readonly armWidth: number
  readonly legHeight: number
  readonly baseHeight: number
  readonly seatHeight: number
  readonly seatTop: number
  readonly backThickness: number
  readonly innerWidth: number
}

export const DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS = {
  width: 1.75,
  depth: 0.82,
  height: 0.82,
} as const satisfies CottageLoveseatSofaDimensions

export const DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE = {
  fabricColor: '#eee1cc',
  pillowColor: '#c98179',
  secondaryPillowColor: '#a7ad8f',
  woodColor: '#a96f35',
} as const satisfies CottageLoveseatSofaAppearance

function assertFiniteRange(
  label: string,
  value: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label}必须是 ${minimum}–${maximum} 米之间的有限数值`)
  }
}

/**
 * 解析双人沙发的共享尺寸。局部原点位于地面中心，+Z 指向座位正面。
 */
export function resolveCottageLoveseatSofaDimensions(
  dimensions: CottageLoveseatSofaDimensions,
): ResolvedCottageLoveseatSofa {
  assertFiniteRange('沙发宽度', dimensions.width, 1.25, 2.35)
  assertFiniteRange('沙发深度', dimensions.depth, 0.65, 1.05)
  assertFiniteRange('沙发高度', dimensions.height, 0.68, 1.05)

  const armWidth = Math.min(0.22, Math.max(0.15, dimensions.width * 0.105))
  const legHeight = Math.min(0.1, dimensions.height * 0.115)
  const baseHeight = Math.min(0.25, dimensions.height * 0.29)
  const seatHeight = Math.min(0.17, dimensions.height * 0.19)
  const seatTop = legHeight + baseHeight + seatHeight

  return {
    ...dimensions,
    armWidth,
    legHeight,
    baseHeight,
    seatHeight,
    seatTop,
    backThickness: Math.min(0.15, dimensions.depth * 0.16),
    innerWidth: dimensions.width - armWidth * 2.16,
  }
}

