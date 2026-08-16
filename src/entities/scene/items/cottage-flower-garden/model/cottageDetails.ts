import { COTTAGE_FLOWER_GARDEN_LAYOUT } from './gardenLayout'
import {
  COTTAGE_EXTERIOR_KIT,
  type CottageFacadeOpening,
} from './cottageExterior'

export type CottageDetailMaterial =
  'stone' | 'siding' | 'shingle' | 'trim' | 'deck'

export interface CottageDetailOccurrence {
  id: string
  kind:
    | 'foundation-stone'
    | 'siding-plank'
    | 'roof-shingle'
    | 'fascia'
    | 'rafter-tail'
    | 'ridge-cap'
    | 'porch-board'
    | 'step-board'
    | 'window-sill'
  material: CottageDetailMaterial
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  rotation: readonly [number, number, number]
  tone: number
}

export interface CottageDetailSystem {
  occurrences: readonly CottageDetailOccurrence[]
  counts: Readonly<Record<CottageDetailOccurrence['kind'], number>>
}

const ZERO_ROTATION = [0, 0, 0] as const

function stableUnit(id: string, salt = 0) {
  let value = 2_166_136_261 ^ salt
  for (let index = 0; index < id.length; index += 1) {
    value ^= id.charCodeAt(index)
    value = Math.imul(value, 16_777_619)
  }
  return (value >>> 0) / 4_294_967_295
}

function detail(
  id: string,
  kind: CottageDetailOccurrence['kind'],
  material: CottageDetailMaterial,
  position: CottageDetailOccurrence['position'],
  size: CottageDetailOccurrence['size'],
  rotation: CottageDetailOccurrence['rotation'] = ZERO_ROTATION,
) {
  return {
    id,
    kind,
    material,
    position,
    size,
    rotation,
    tone: stableUnit(id, 17),
  } satisfies CottageDetailOccurrence
}

function createStoneRun(
  id: string,
  length: number,
  rows: number,
  mapPosition: (along: number, y: number) => readonly [number, number, number],
  rotationY: number,
) {
  const stones: CottageDetailOccurrence[] = []
  for (let row = 0; row < rows; row += 1) {
    const count = Math.ceil(length / (row % 2 === 0 ? 0.48 : 0.43))
    const cell = length / count
    for (let column = 0; column < count; column += 1) {
      const stoneId = `${id}.row-${row + 1}.stone-${column + 1}`
      const width = cell * (0.74 + stableUnit(stoneId, 23) * 0.24)
      const height = 0.09 + stableUnit(stoneId, 29) * 0.05
      const along = -length / 2 + cell * (column + 0.5)
      const y = 0.055 + row * 0.115 + (stableUnit(stoneId, 31) - 0.5) * 0.012
      stones.push(
        detail(
          stoneId,
          'foundation-stone',
          'stone',
          mapPosition(along, y),
          [width, height, 0.13 + stableUnit(stoneId, 37) * 0.07],
          [
            (stableUnit(stoneId, 41) - 0.5) * 0.08,
            rotationY + (stableUnit(stoneId, 43) - 0.5) * 0.065,
            (stableUnit(stoneId, 47) - 0.5) * 0.07,
          ],
        ),
      )
    }
  }
  return stones
}

function openingIntersectsCourse(opening: CottageFacadeOpening, y: number) {
  return (
    y > opening.bottomY - 0.08 && y < opening.bottomY + opening.height + 0.08
  )
}

function createFrontSidingCourse(y: number, course: number, frontZ: number) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const activeOpenings = COTTAGE_EXTERIOR_KIT.openings.filter((opening) =>
    openingIntersectsCourse(opening, y),
  )
  const edges = [
    -cottage.width / 2,
    ...activeOpenings.flatMap((opening) => [
      opening.centerX - opening.width / 2 - 0.04,
      opening.centerX + opening.width / 2 + 0.04,
    ]),
    cottage.width / 2,
  ].sort((left, right) => left - right)
  const planks: CottageDetailOccurrence[] = []
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index]
    const end = edges[index + 1]
    const center = (start + end) / 2
    if (
      end - start < 0.04 ||
      activeOpenings.some(
        (opening) =>
          center > opening.centerX - opening.width / 2 &&
          center < opening.centerX + opening.width / 2,
      )
    ) {
      continue
    }
    planks.push(
      detail(
        `siding.front.course-${course + 1}.segment-${index + 1}`,
        'siding-plank',
        'siding',
        [center, y, frontZ + 0.018],
        [end - start - 0.01, 0.148, 0.045],
      ),
    )
  }
  return planks
}

function createSiding() {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const frontZ = cottage.depth / 2
  const backZ = -frontZ
  const courseCount = 16
  const pitch = cottage.wallHeight / courseCount
  const occurrences: CottageDetailOccurrence[] = []
  for (let course = 0; course < courseCount; course += 1) {
    const y = cottage.foundationHeight + pitch * (course + 0.5)
    occurrences.push(...createFrontSidingCourse(y, course, frontZ))
    occurrences.push(
      detail(
        `siding.back.course-${course + 1}`,
        'siding-plank',
        'siding',
        [0, y, backZ - 0.018],
        [cottage.width - 0.12, pitch * 0.97, 0.045],
      ),
    )
    for (const side of [-1, 1] as const) {
      occurrences.push(
        detail(
          `siding.${side < 0 ? 'west' : 'east'}.course-${course + 1}`,
          'siding-plank',
          'siding',
          [side * (cottage.width / 2 + 0.018), y, 0],
          [cottage.depth - 0.12, pitch * 0.97, 0.045],
          [0, Math.PI / 2, 0],
        ),
      )
    }
  }
  for (const gable of COTTAGE_EXTERIOR_KIT.gables) {
    const gableCourses = 7
    for (let course = 0; course < gableCourses; course += 1) {
      const progress = (course + 0.5) / gableCourses
      const width = gable.halfWidth * 2 * (1 - progress)
      occurrences.push(
        detail(
          `siding.gable-${gable.facing}.course-${course + 1}`,
          'siding-plank',
          'siding',
          [
            0,
            gable.baseY + gable.rise * progress,
            gable.z + (gable.facing === 'front' ? 0.035 : -0.035),
          ],
          [width, (gable.rise / gableCourses) * 0.95, 0.045],
        ),
      )
    }
  }
  return occurrences
}

function createRoofDetails() {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const eaveY = cottage.foundationHeight + cottage.wallHeight
  const roofRun = cottage.width / 2 + cottage.roofOverhang
  const roofSlope = Math.hypot(roofRun, cottage.roofRise)
  const roofAngle = Math.atan2(cottage.roofRise, roofRun)
  const roofDepth = cottage.depth + cottage.roofOverhang * 2
  const rowCount = 16
  const segmentCount = 16
  const shingles: CottageDetailOccurrence[] = []
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < rowCount; row += 1) {
      const progress = (row + 0.5) / rowCount
      const x = side * roofRun * (1 - progress)
      const y = eaveY + cottage.roofRise * progress + 0.112
      const segmentLength = roofDepth / segmentCount
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const id = `roof.${side < 0 ? 'west' : 'east'}.row-${row + 1}.shingle-${segment + 1}`
        const stagger = row % 2 === 0 ? 0 : segmentLength * 0.18
        const z =
          -roofDepth / 2 +
          segmentLength * (segment + 0.5) +
          stagger +
          (stableUnit(id, 53) - 0.5) * 0.025
        if (z > roofDepth / 2 + 0.05) continue
        const chippedEnd = stableUnit(id, 79) < 0.09 ? 0.58 : 1
        shingles.push(
          detail(
            id,
            'roof-shingle',
            'shingle',
            [x, y, z],
            [
              (roofSlope / rowCount) * (0.9 + stableUnit(id, 59) * 0.13),
              0.055 + stableUnit(id, 61) * 0.05,
              segmentLength * (0.88 + stableUnit(id, 67) * 0.12) * chippedEnd,
            ],
            [
              (stableUnit(id, 71) - 0.5) * 0.055,
              0,
              side < 0 ? roofAngle : -roofAngle,
            ],
          ),
        )
      }
    }
  }
  const trim: CottageDetailOccurrence[] = [
    detail(
      'roof.ridge-cap',
      'ridge-cap',
      'trim',
      [0, eaveY + cottage.roofRise + 0.145, 0],
      [0.28, 0.22, roofDepth + 0.12],
    ),
  ]
  for (const side of [-1, 1] as const) {
    trim.push(
      detail(
        `roof.eave-fascia-${side < 0 ? 'west' : 'east'}`,
        'fascia',
        'trim',
        [side * roofRun, eaveY - 0.015, 0],
        [0.2, 0.25, roofDepth + 0.08],
      ),
    )
    for (let index = 0; index < 12; index += 1) {
      trim.push(
        detail(
          `roof.rafter-tail-${side < 0 ? 'west' : 'east'}-${index + 1}`,
          'rafter-tail',
          'trim',
          [
            side * (cottage.width / 2 + cottage.roofOverhang * 0.45),
            eaveY - 0.105,
            -roofDepth / 2 + (roofDepth / 11) * index,
          ],
          [0.74, 0.105, 0.12],
          [0, 0, side < 0 ? roofAngle : -roofAngle],
        ),
      )
    }
  }
  for (const z of [-roofDepth / 2, roofDepth / 2]) {
    for (const side of [-1, 1] as const) {
      trim.push(
        detail(
          `roof.gable-fascia-${z < 0 ? 'back' : 'front'}-${side < 0 ? 'west' : 'east'}`,
          'fascia',
          'trim',
          [(side * roofRun) / 2, eaveY + cottage.roofRise / 2 + 0.04, z],
          [roofSlope, 0.2, 0.2],
          [0, 0, side < 0 ? roofAngle : -roofAngle],
        ),
      )
    }
  }
  return [...shingles, ...trim]
}

function createPorchDetails() {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const frontZ = cottage.depth / 2
  const porchFrontZ = frontZ + cottage.porchDepth
  const occurrences: CottageDetailOccurrence[] = []
  const deckBoardCount = 30
  for (let index = 0; index < deckBoardCount; index += 1) {
    const width = cottage.porchWidth / deckBoardCount
    occurrences.push(
      detail(
        `porch.board-${index + 1}`,
        'porch-board',
        'deck',
        [
          -cottage.porchWidth / 2 + width * (index + 0.5),
          cottage.porchTop + 0.012,
          frontZ + cottage.porchDepth / 2,
        ],
        [width * 0.88, 0.038, cottage.porchDepth - 0.035],
      ),
    )
  }
  for (let step = 0; step < cottage.stepCount; step += 1) {
    const level = cottage.stepCount - step
    const y = level * cottage.stepRise + 0.012
    const z = porchFrontZ + cottage.stepDepth * (step + 0.5)
    const stepWidth = 2.72
    const boardCount = 15
    for (let index = 0; index < boardCount; index += 1) {
      const width = stepWidth / boardCount
      occurrences.push(
        detail(
          `steps.${step + 1}.board-${index + 1}`,
          'step-board',
          'deck',
          [-stepWidth / 2 + width * (index + 0.5), y, z],
          [width * 0.88, 0.035, cottage.stepDepth - 0.025],
        ),
      )
    }
  }
  for (const opening of COTTAGE_EXTERIOR_KIT.openings.filter(
    (item) => item.module === 'Window',
  )) {
    occurrences.push(
      detail(
        `${opening.id}.deep-sill`,
        'window-sill',
        'trim',
        [
          opening.centerX + (stableUnit(opening.id, 83) - 0.5) * 0.035,
          opening.bottomY - 0.075 + (stableUnit(opening.id, 89) - 0.5) * 0.028,
          frontZ + 0.11,
        ],
        [opening.width + 0.18 + stableUnit(opening.id, 97) * 0.16, 0.09 + stableUnit(opening.id, 101) * 0.055, 0.22 + stableUnit(opening.id, 103) * 0.06],
        [0, 0, (stableUnit(opening.id, 107) - 0.5) * 0.045],
      ),
    )
  }
  return occurrences
}

export function createCottageDetailSystem(): CottageDetailSystem {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const frontZ = cottage.depth / 2 + 0.075
  const backZ = -cottage.depth / 2 - 0.075
  const westX = -cottage.width / 2 - 0.075
  const eastX = cottage.width / 2 + 0.075
  const occurrences = [
    ...createStoneRun(
      'foundation.front',
      cottage.width,
      4,
      (along, y) => [along, y, frontZ],
      0,
    ),
    ...createStoneRun(
      'foundation.back',
      cottage.width,
      4,
      (along, y) => [along, y, backZ],
      0,
    ),
    ...createStoneRun(
      'foundation.west',
      cottage.depth,
      4,
      (along, y) => [westX, y, along],
      Math.PI / 2,
    ),
    ...createStoneRun(
      'foundation.east',
      cottage.depth,
      4,
      (along, y) => [eastX, y, along],
      Math.PI / 2,
    ),
    ...createSiding(),
    ...createRoofDetails(),
    ...createPorchDetails(),
  ]
  const kinds: CottageDetailOccurrence['kind'][] = [
    'foundation-stone',
    'siding-plank',
    'roof-shingle',
    'fascia',
    'rafter-tail',
    'ridge-cap',
    'porch-board',
    'step-board',
    'window-sill',
  ]
  return {
    occurrences,
    counts: Object.fromEntries(
      kinds.map((kind) => [
        kind,
        occurrences.filter((occurrence) => occurrence.kind === kind).length,
      ]),
    ) as Record<CottageDetailOccurrence['kind'], number>,
  }
}

export const COTTAGE_DETAIL_SYSTEM = createCottageDetailSystem()
