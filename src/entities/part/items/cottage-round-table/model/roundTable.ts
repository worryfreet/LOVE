export interface RoundTableDimensions {
  readonly diameter: number
  readonly height: number
  readonly topThickness: number
}

export const DEFAULT_ROUND_TABLE_DIMENSIONS = {
  diameter: 1.15,
  height: 0.74,
  topThickness: 0.055,
} as const satisfies RoundTableDimensions

export const ROUND_TABLE_MATERIAL_SLOTS = ['wood', 'edge'] as const

export const ROUND_TABLE_LOCAL_FRAME = {
  origin: '圆桌中心正下方的地面接触平面',
  forward: '+Z（圆桌旋转对称，仅用于编辑器统一朝向）',
  up: '+Y',
} as const

export const ROUND_TABLE_SOCKETS = {
  tabletopCenter: 'socket.tabletop-center',
} as const

function resolvePositive(
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

export function resolveRoundTableDimensions(
  dimensions: Partial<RoundTableDimensions> = {},
): RoundTableDimensions {
  const diameter = resolvePositive(
    dimensions.diameter,
    DEFAULT_ROUND_TABLE_DIMENSIONS.diameter,
    '圆桌直径',
  )
  const height = resolvePositive(
    dimensions.height,
    DEFAULT_ROUND_TABLE_DIMENSIONS.height,
    '圆桌高度',
  )
  const topThickness = resolvePositive(
    dimensions.topThickness,
    DEFAULT_ROUND_TABLE_DIMENSIONS.topThickness,
    '圆桌面厚度',
  )

  if (diameter < 0.65 || diameter > 1.8) {
    throw new RangeError('圆桌直径必须在 0.65m 到 1.8m 之间')
  }
  if (height < 0.55 || height > 1.1) {
    throw new RangeError('圆桌高度必须在 0.55m 到 1.1m 之间')
  }
  if (topThickness >= height * 0.25) {
    throw new RangeError('圆桌面厚度必须小于桌高的四分之一')
  }

  return { diameter, height, topThickness }
}
