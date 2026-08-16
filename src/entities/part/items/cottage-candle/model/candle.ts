import { LatheGeometry, Vector2 } from 'three'

export interface CandleDimensions {
  readonly diameter: number
  readonly height: number
}

export type CandleQuality = 'desktop' | 'mobile'

export const DEFAULT_CANDLE_DIMENSIONS = {
  diameter: 0.065,
  height: 0.16,
} as const satisfies CandleDimensions

export const CANDLE_MATERIAL_SLOTS = [
  'wax',
  'wick',
  'flameCore',
  'flameGlow',
] as const

export const CANDLE_LOCAL_FRAME = {
  origin: '蜡烛中心正下方的承载面',
  forward: '+Z（轴对称，仅用于编辑器统一朝向）',
  up: '+Y',
} as const

function positive(value: number | undefined, fallback: number, label: string) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${label}必须是有限正数`)
  }
  return resolved
}

export function resolveCandleDimensions(
  dimensions: Partial<CandleDimensions> = {},
): CandleDimensions {
  const diameter = positive(
    dimensions.diameter,
    DEFAULT_CANDLE_DIMENSIONS.diameter,
    '蜡烛直径',
  )
  const height = positive(
    dimensions.height,
    DEFAULT_CANDLE_DIMENSIONS.height,
    '蜡烛高度',
  )
  if (diameter < 0.025 || diameter > 0.14) {
    throw new RangeError('蜡烛直径必须在 0.025m 到 0.14m 之间')
  }
  if (height < 0.06 || height > 0.45) {
    throw new RangeError('蜡烛高度必须在 0.06m 到 0.45m 之间')
  }
  return { diameter, height }
}

export function createCandleBodyGeometry(
  dimensions: Partial<CandleDimensions> = {},
  quality: CandleQuality = 'desktop',
) {
  const { diameter, height } = resolveCandleDimensions(dimensions)
  const radius = diameter / 2
  const lipDepth = Math.min(height * 0.035, radius * 0.22)
  const profile = [
    new Vector2(radius * 0.96, 0),
    new Vector2(radius, Math.min(0.006, height * 0.04)),
    new Vector2(radius, height - lipDepth),
    new Vector2(radius * 0.92, height),
    new Vector2(radius * 0.5, height - lipDepth * 0.2),
    new Vector2(radius * 0.36, height - lipDepth),
  ]
  const geometry = new LatheGeometry(
    profile,
    quality === 'desktop' ? 40 : 24,
  )
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
