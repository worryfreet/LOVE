export type CottagePhotoFrameMount = 'wall' | 'table'

export interface CottagePhotoFrameSpecInput {
  readonly mount: CottagePhotoFrameMount
  /** 相框整体宽度，单位：米。 */
  readonly width: number
  /** 相框整体高度，单位：米。 */
  readonly height: number
  /** 卡纸边宽，单位：米。 */
  readonly matWidth: number
  /** 可选木框边宽，单位：米；缺省时按相框短边自动计算。 */
  readonly frameRailWidth?: number
}

export interface CottagePhotoFrameSpec extends CottagePhotoFrameSpecInput {
  readonly frameRailWidth: number
  readonly frameDepth: number
  readonly backingDepth: number
  readonly innerWidth: number
  readonly innerHeight: number
  readonly photoWidth: number
  readonly photoHeight: number
  readonly origin: 'back-center' | 'support-surface'
  readonly localBounds: {
    readonly min: readonly [number, number, number]
    readonly max: readonly [number, number, number]
  }
}

export interface CoverUvTransform {
  readonly repeat: readonly [number, number]
  readonly offset: readonly [number, number]
}

const FRAME_LIMITS = {
  minWidth: 0.12,
  maxWidth: 1.2,
  minHeight: 0.15,
  maxHeight: 1.5,
} as const

function requireFiniteInRange(
  label: string,
  value: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label}必须是 ${min} 到 ${max} 米之间的有限数值`)
  }
}

/**
 * 解析相框的单一尺寸权威。墙挂原点位于背板中心，桌放原点位于承载面。
 */
export function resolveCottagePhotoFrameSpec(
  input: CottagePhotoFrameSpecInput,
): CottagePhotoFrameSpec {
  requireFiniteInRange(
    '相框宽度',
    input.width,
    FRAME_LIMITS.minWidth,
    FRAME_LIMITS.maxWidth,
  )
  requireFiniteInRange(
    '相框高度',
    input.height,
    FRAME_LIMITS.minHeight,
    FRAME_LIMITS.maxHeight,
  )
  if (input.mount !== 'wall' && input.mount !== 'table') {
    throw new RangeError('相框安装方式必须是 wall 或 table')
  }

  const shortSide = Math.min(input.width, input.height)
  const automaticFrameRailWidth = Math.min(
    0.055,
    Math.max(0.018, shortSide * 0.105),
  )
  const frameRailWidth = input.frameRailWidth ?? automaticFrameRailWidth
  requireFiniteInRange(
    '木框边宽',
    frameRailWidth,
    0.012,
    Math.min(0.06, shortSide * 0.22),
  )
  const maxMatWidth = Math.max(0, shortSide * 0.28 - frameRailWidth)
  requireFiniteInRange('卡纸边宽', input.matWidth, 0, maxMatWidth)

  const frameDepth = Math.min(0.045, Math.max(0.024, shortSide * 0.075))
  const backingDepth = Math.min(0.012, frameDepth * 0.3)
  const innerWidth = input.width - frameRailWidth * 2
  const innerHeight = input.height - frameRailWidth * 2
  const photoWidth = innerWidth - input.matWidth * 2
  const photoHeight = innerHeight - input.matWidth * 2
  if (photoWidth <= 0.03 || photoHeight <= 0.03) {
    throw new RangeError('相框与卡纸组合后必须保留至少 3 厘米的照片开口')
  }

  const tableRearReach = Math.min(0.24, input.height * 0.34)
  const minY = input.mount === 'wall' ? -input.height / 2 : 0
  const maxY = input.mount === 'wall' ? input.height / 2 : input.height
  const minZ = input.mount === 'wall' ? -0.009 : -tableRearReach

  return {
    ...input,
    frameRailWidth,
    frameDepth,
    backingDepth,
    innerWidth,
    innerHeight,
    photoWidth,
    photoHeight,
    origin: input.mount === 'wall' ? 'back-center' : 'support-surface',
    localBounds: {
      min: [-input.width / 2, minY, minZ],
      max: [input.width / 2, maxY, frameDepth + 0.004],
    },
  }
}

/** 计算类似 CSS `object-fit: cover` 的居中 UV 裁切。 */
export function resolveCoverUvTransform(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverUvTransform {
  for (const [label, value] of [
    ['图片宽度', imageWidth],
    ['图片高度', imageHeight],
    ['目标宽度', targetWidth],
    ['目标高度', targetHeight],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${label}必须是有限正数`)
    }
  }

  const imageAspect = imageWidth / imageHeight
  const targetAspect = targetWidth / targetHeight
  if (imageAspect > targetAspect) {
    const repeatX = targetAspect / imageAspect
    return {
      repeat: [repeatX, 1],
      offset: [(1 - repeatX) / 2, 0],
    }
  }

  const repeatY = imageAspect / targetAspect
  return {
    repeat: [1, repeatY],
    offset: [0, (1 - repeatY) / 2],
  }
}
