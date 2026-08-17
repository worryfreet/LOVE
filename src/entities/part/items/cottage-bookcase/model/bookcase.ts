export interface CottageBookcaseDimensions {
  /** 柜体左右外缘之间的宽度，单位：米。 */
  readonly width: number
  /** 背板到开放正面的深度，单位：米。 */
  readonly depth: number
  /** 地面到顶冠的总高度，单位：米。 */
  readonly height: number
  /** 开放储物隔间数量。 */
  readonly shelfCount: number
}

export interface CottageBookcaseAppearance {
  readonly woodColor: string
  readonly backColor: string
}

export interface ResolvedCottageBookcase extends CottageBookcaseDimensions {
  readonly panelThickness: number
  readonly shelfThickness: number
  readonly backThickness: number
  readonly plinthHeight: number
  readonly crownThickness: number
  readonly innerWidth: number
  readonly innerDepth: number
  readonly innerBottom: number
  readonly compartmentHeight: number
}

export interface CottageBookcaseBook {
  readonly id: string
  readonly shelfIndex: number
  readonly position: readonly [number, number, number]
  readonly width: number
  readonly height: number
  readonly depth: number
  readonly rotationZ: number
  readonly materialIndex: number
}

export const DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS = {
  width: 1.35,
  depth: 0.38,
  height: 1.95,
  shelfCount: 4,
} as const satisfies CottageBookcaseDimensions

export const DEFAULT_COTTAGE_BOOKCASE_APPEARANCE = {
  woodColor: '#87542F',
  backColor: '#65402A',
} as const satisfies CottageBookcaseAppearance

function assertFiniteRange(
  label: string,
  value: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label}必须是 ${minimum}–${maximum} 之间的有限数值`)
  }
}

/**
 * 书柜使用地面中心原点，开放正面朝向 +Z；所有构件均从这份尺寸源派生。
 */
export function resolveCottageBookcaseDimensions(
  dimensions: CottageBookcaseDimensions,
): ResolvedCottageBookcase {
  assertFiniteRange('书柜宽度', dimensions.width, 0.9, 1.8)
  assertFiniteRange('书柜深度', dimensions.depth, 0.28, 0.5)
  assertFiniteRange('书柜高度', dimensions.height, 1.5, 2.15)
  assertFiniteRange('书柜层数', dimensions.shelfCount, 3, 6)
  if (!Number.isInteger(dimensions.shelfCount)) {
    throw new RangeError('书柜层数必须是整数')
  }

  const panelThickness = Math.min(0.042, dimensions.width * 0.031)
  const shelfThickness = Math.min(0.035, dimensions.height * 0.018)
  const backThickness = Math.min(0.018, dimensions.depth * 0.045)
  const plinthHeight = Math.min(0.12, dimensions.height * 0.062)
  const crownThickness = Math.min(0.052, dimensions.height * 0.027)
  const innerBottom = plinthHeight + shelfThickness
  const innerHeight =
    dimensions.height - innerBottom - crownThickness -
    shelfThickness * (dimensions.shelfCount - 1)

  return {
    ...dimensions,
    panelThickness,
    shelfThickness,
    backThickness,
    plinthHeight,
    crownThickness,
    innerWidth: dimensions.width - panelThickness * 2,
    innerDepth: dimensions.depth - backThickness,
    innerBottom,
    compartmentHeight: innerHeight / dimensions.shelfCount,
  }
}

const BOOK_PATTERN = [
  { width: 0.055, height: 0.76, depth: 0.8, tilt: 0, material: 0 },
  { width: 0.064, height: 0.68, depth: 0.76, tilt: 0.04, material: 1 },
  { width: 0.048, height: 0.82, depth: 0.84, tilt: -0.03, material: 2 },
  { width: 0.072, height: 0.62, depth: 0.72, tilt: 0, material: 3 },
  { width: 0.052, height: 0.72, depth: 0.79, tilt: -0.11, material: 4 },
] as const

/** 固定书本节奏让预览、编辑器与分享页始终得到相同陈设。 */
export function createCottageBookcaseBookLayout(
  source: CottageBookcaseDimensions,
): readonly CottageBookcaseBook[] {
  const dimensions = resolveCottageBookcaseDimensions(source)
  const gap = Math.min(0.012, dimensions.innerWidth * 0.009)

  return Array.from({ length: dimensions.shelfCount }, (_, shelfIndex) => {
    const pattern = BOOK_PATTERN.map((book, index) => ({
      ...book,
      width: book.width * (0.92 + ((shelfIndex + index) % 3) * 0.08),
    }))
    const groupWidth =
      pattern.reduce((sum, book) => sum + book.width, 0) +
      gap * (pattern.length - 1)
    const alignRight = shelfIndex % 2 === 1
    let cursor = alignRight
      ? dimensions.innerWidth / 2 - groupWidth
      : -dimensions.innerWidth / 2
    const shelfY =
      dimensions.innerBottom +
      shelfIndex * (dimensions.compartmentHeight + dimensions.shelfThickness)

    return pattern.map((book, index) => {
      const height = dimensions.compartmentHeight * book.height
      const depth = dimensions.innerDepth * book.depth
      const centerX = cursor + book.width / 2
      cursor += book.width + gap
      return {
        id: `shelf-${shelfIndex + 1}-book-${index + 1}`,
        shelfIndex,
        position: [
          centerX,
          shelfY,
          dimensions.depth / 2 - 0.026 - depth / 2,
        ] as const,
        width: book.width,
        height,
        depth,
        rotationZ: alignRight ? -book.tilt : book.tilt,
        materialIndex: (book.material + shelfIndex * 2) % 7,
      }
    })
  }).flat()
}
