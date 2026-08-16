export interface CastIronStoveDimensions {
  readonly width: number
  readonly depth: number
  readonly height: number
}

export const DEFAULT_CAST_IRON_STOVE_DIMENSIONS = {
  width: 0.62,
  depth: 0.5,
  height: 0.82,
} as const satisfies CastIronStoveDimensions

export const CAST_IRON_STOVE_MATERIAL_SLOTS = [
  'castIron',
  'glass',
  'hardware',
  'fire',
] as const

export const CAST_IRON_STOVE_SOCKETS = {
  flue: 'socket.flue',
  doorHandle: 'socket.door-handle',
} as const

export const CAST_IRON_STOVE_LOCAL_FRAME = {
  origin: '占地中心的地面接触平面',
  forward: '+Z',
  up: '+Y',
} as const

function readPositiveDimension(
  value: number | undefined,
  fallback: number,
  label: string,
) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${label}必须是有限正数`)
  }
  return resolved
}

export function resolveCastIronStoveDimensions(
  dimensions: Partial<CastIronStoveDimensions> = {},
): CastIronStoveDimensions {
  const width = readPositiveDimension(
    dimensions.width,
    DEFAULT_CAST_IRON_STOVE_DIMENSIONS.width,
    '铸铁炉宽度',
  )
  const depth = readPositiveDimension(
    dimensions.depth,
    DEFAULT_CAST_IRON_STOVE_DIMENSIONS.depth,
    '铸铁炉深度',
  )
  const height = readPositiveDimension(
    dimensions.height,
    DEFAULT_CAST_IRON_STOVE_DIMENSIONS.height,
    '铸铁炉高度',
  )

  if (width < 0.36 || width > 1.2) {
    throw new RangeError('铸铁炉宽度必须在 0.36m 到 1.2m 之间')
  }
  if (depth < 0.3 || depth > 0.9) {
    throw new RangeError('铸铁炉深度必须在 0.3m 到 0.9m 之间')
  }
  if (height < 0.5 || height > 1.4) {
    throw new RangeError('铸铁炉高度必须在 0.5m 到 1.4m 之间')
  }

  return { width, depth, height }
}
