export interface WoodChairDimensions {
  readonly width: number
  readonly depth: number
  readonly height: number
  readonly seatHeight: number
}

export const DEFAULT_WOOD_CHAIR_DIMENSIONS = {
  width: 0.46,
  depth: 0.5,
  height: 0.88,
  seatHeight: 0.46,
} as const satisfies WoodChairDimensions

export const WOOD_CHAIR_MATERIAL_SLOTS = [
  'wood',
  'cushion',
  'piping',
] as const

export const WOOD_CHAIR_LOCAL_FRAME = {
  origin: '椅子占地中心的地面接触平面',
  forward: '+Z（坐下后面朝方向）',
  up: '+Y',
} as const

export const WOOD_CHAIR_SOCKETS = {
  seatCenter: 'socket.seat-center',
} as const

function positive(value: number | undefined, fallback: number, label: string) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${label}必须是有限正数`)
  }
  return resolved
}

export function resolveWoodChairDimensions(
  dimensions: Partial<WoodChairDimensions> = {},
): WoodChairDimensions {
  const width = positive(
    dimensions.width,
    DEFAULT_WOOD_CHAIR_DIMENSIONS.width,
    '木椅宽度',
  )
  const depth = positive(
    dimensions.depth,
    DEFAULT_WOOD_CHAIR_DIMENSIONS.depth,
    '木椅深度',
  )
  const height = positive(
    dimensions.height,
    DEFAULT_WOOD_CHAIR_DIMENSIONS.height,
    '木椅高度',
  )
  const seatHeight = positive(
    dimensions.seatHeight,
    DEFAULT_WOOD_CHAIR_DIMENSIONS.seatHeight,
    '木椅座高',
  )

  if (width < 0.32 || width > 0.8) {
    throw new RangeError('木椅宽度必须在 0.32m 到 0.8m 之间')
  }
  if (depth < 0.35 || depth > 0.8) {
    throw new RangeError('木椅深度必须在 0.35m 到 0.8m 之间')
  }
  if (height < 0.65 || height > 1.3) {
    throw new RangeError('木椅高度必须在 0.65m 到 1.3m 之间')
  }
  if (seatHeight >= height * 0.72) {
    throw new RangeError('木椅座高必须低于总高的 72%')
  }

  return { width, depth, height, seatHeight }
}
