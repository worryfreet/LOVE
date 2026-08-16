export interface CottageSingleBedDimensions {
  /** 成品最外侧宽度，单位：米。 */
  readonly width: number
  /** 从床头到床尾的成品长度，单位：米。 */
  readonly length: number
  /** 地面到床垫上表面的高度，单位：米。 */
  readonly bedHeight: number
}

export interface CottageSingleBedAppearance {
  readonly woodColor: string
  readonly beddingColor: string
  readonly throwColor: string
  readonly accentPillowColor: string
}

export interface ResolvedCottageSingleBed extends CottageSingleBedDimensions {
  readonly frameTop: number
  readonly mattressThickness: number
  readonly headboardHeight: number
  readonly postSize: number
  readonly railThickness: number
  readonly innerWidth: number
  readonly innerLength: number
}

export const DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS = {
  width: 0.9,
  length: 1.9,
  bedHeight: 0.58,
} as const satisfies CottageSingleBedDimensions

export const DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE = {
  woodColor: '#a96f35',
  beddingColor: '#f4ead8',
  throwColor: '#c98179',
  accentPillowColor: '#c98179',
} as const satisfies CottageSingleBedAppearance

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
 * 将面向配置器的三项主尺寸解析为所有几何共享的唯一尺寸源。
 * 局部原点位于占地中心的地面，+Y 向上，+Z 指向床尾。
 */
export function resolveCottageSingleBedDimensions(
  dimensions: CottageSingleBedDimensions,
): ResolvedCottageSingleBed {
  assertFiniteRange('床宽', dimensions.width, 0.72, 1.6)
  assertFiniteRange('床长', dimensions.length, 1.65, 2.25)
  assertFiniteRange('床高', dimensions.bedHeight, 0.42, 0.78)

  const postSize = Math.min(0.085, dimensions.width * 0.085)
  const railThickness = Math.min(0.19, dimensions.bedHeight * 0.34)
  const mattressThickness = Math.min(0.19, dimensions.bedHeight * 0.31)
  const frameTop = dimensions.bedHeight - mattressThickness

  return {
    ...dimensions,
    frameTop,
    mattressThickness,
    headboardHeight: Math.max(0.94, dimensions.bedHeight + 0.38),
    postSize,
    railThickness,
    innerWidth: dimensions.width - postSize * 1.65,
    innerLength: dimensions.length - postSize * 1.45,
  }
}
