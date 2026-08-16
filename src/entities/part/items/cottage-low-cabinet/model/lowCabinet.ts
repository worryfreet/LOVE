export type CottageLowCabinetVariant = 'cabinet' | 'cushioned-bench'

export interface CottageLowCabinetDimensions {
  /** 柜体左右外缘之间的宽度，单位：米。 */
  readonly width: number
  /** 柜体后侧到门板正面的深度，单位：米。 */
  readonly depth: number
  /** 不含可拆软垫的柜体高度，单位：米。 */
  readonly height: number
}

export interface CottageLowCabinetAppearance {
  readonly woodColor: string
  readonly cushionColor: string
  readonly pipingColor: string
}

export interface ResolvedCottageLowCabinet
  extends CottageLowCabinetDimensions {
  readonly topThickness: number
  readonly panelThickness: number
  readonly frameWidth: number
  readonly footHeight: number
  readonly frontBottom: number
  readonly frontHeight: number
  readonly cushionHeight: number
}

export const DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS = {
  width: 2.2,
  depth: 0.46,
  height: 0.78,
} as const satisfies CottageLowCabinetDimensions

export const DEFAULT_COTTAGE_LOW_CABINET_APPEARANCE = {
  woodColor: '#9f6732',
  cushionColor: '#f0e5d3',
  pipingColor: '#c98179',
} as const satisfies CottageLowCabinetAppearance

export const COTTAGE_LOW_CABINET_VARIANTS = [
  'cabinet',
  'cushioned-bench',
] as const satisfies readonly CottageLowCabinetVariant[]

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

export function isCottageLowCabinetVariant(
  value: string,
): value is CottageLowCabinetVariant {
  return COTTAGE_LOW_CABINET_VARIANTS.includes(
    value as CottageLowCabinetVariant,
  )
}

/**
 * 解析长矮柜的统一尺寸源。局部原点在地面中心，门板正面朝向 +Z。
 */
export function resolveCottageLowCabinetDimensions(
  dimensions: CottageLowCabinetDimensions,
): ResolvedCottageLowCabinet {
  assertFiniteRange('矮柜宽度', dimensions.width, 1.1, 3.1)
  assertFiniteRange('矮柜深度', dimensions.depth, 0.34, 0.68)
  assertFiniteRange('矮柜高度', dimensions.height, 0.54, 1.02)

  const topThickness = Math.min(0.052, dimensions.height * 0.065)
  const panelThickness = Math.min(0.035, dimensions.depth * 0.07)
  const frameWidth = Math.min(0.065, dimensions.width * 0.03)
  const footHeight = Math.min(0.075, dimensions.height * 0.095)
  const frontBottom = footHeight + frameWidth * 0.66

  return {
    ...dimensions,
    topThickness,
    panelThickness,
    frameWidth,
    footHeight,
    frontBottom,
    frontHeight:
      dimensions.height - topThickness - frontBottom - frameWidth * 0.44,
    cushionHeight: Math.min(0.085, dimensions.height * 0.105),
  }
}

