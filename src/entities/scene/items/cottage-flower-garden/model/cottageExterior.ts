import { COTTAGE_FLOWER_GARDEN_LAYOUT } from './gardenLayout'

export type CottageExteriorModule =
  | 'Foundation'
  | 'Wall'
  | 'Roof'
  | 'Door'
  | 'Window'
  | 'Porch'
  | 'Steps'
  | 'StructuralBeams'

export type CottageMaterialKey =
  'foundation' | 'wall' | 'roof' | 'wood' | 'darkWood' | 'door' | 'glass'

export interface CottageExteriorBox {
  id: string
  module: CottageExteriorModule
  material: CottageMaterialKey
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  rotation: readonly [number, number, number]
}

export interface CottageFacadeOpening {
  id: string
  module: 'Door' | 'Window'
  centerX: number
  bottomY: number
  width: number
  height: number
}

export interface CottageGable {
  id: string
  module: 'Wall'
  z: number
  facing: 'front' | 'back'
  baseY: number
  halfWidth: number
  rise: number
}

export interface CottageExteriorKit {
  boxes: readonly CottageExteriorBox[]
  frontWallPanels: readonly CottageExteriorBox[]
  openings: readonly CottageFacadeOpening[]
  gables: readonly CottageGable[]
  moduleIds: readonly CottageExteriorModule[]
  measurements: {
    width: number
    depth: number
    eaveHeight: number
    ridgeHeight: number
    frontWallZ: number
    porchFrontZ: number
    stepFrontZ: number
  }
}

const BOX_ROTATION = [0, 0, 0] as const

function box(
  id: string,
  module: CottageExteriorModule,
  material: CottageMaterialKey,
  position: readonly [number, number, number],
  size: readonly [number, number, number],
  rotation: readonly [number, number, number] = BOX_ROTATION,
): CottageExteriorBox {
  return { id, module, material, position, size, rotation }
}

function uniqueSorted(values: readonly number[]) {
  return [...new Set(values)].sort((left, right) => left - right)
}

function openingContains(opening: CottageFacadeOpening, x: number, y: number) {
  return (
    x > opening.centerX - opening.width / 2 &&
    x < opening.centerX + opening.width / 2 &&
    y > opening.bottomY &&
    y < opening.bottomY + opening.height
  )
}

function createFrontWallPanels(
  openings: readonly CottageFacadeOpening[],
  frontZ: number,
) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const wallBottom = cottage.foundationHeight
  const eaveHeight = wallBottom + cottage.wallHeight
  const xEdges = uniqueSorted([
    -cottage.width / 2,
    cottage.width / 2,
    ...openings.flatMap((opening) => [
      opening.centerX - opening.width / 2,
      opening.centerX + opening.width / 2,
    ]),
  ])
  const yEdges = uniqueSorted([
    wallBottom,
    eaveHeight,
    ...openings.flatMap((opening) => [
      opening.bottomY,
      opening.bottomY + opening.height,
    ]),
  ])
  const panels: CottageExteriorBox[] = []

  for (let xIndex = 0; xIndex < xEdges.length - 1; xIndex += 1) {
    for (let yIndex = 0; yIndex < yEdges.length - 1; yIndex += 1) {
      const xMin = xEdges[xIndex]
      const xMax = xEdges[xIndex + 1]
      const yMin = yEdges[yIndex]
      const yMax = yEdges[yIndex + 1]
      const centerX = (xMin + xMax) / 2
      const centerY = (yMin + yMax) / 2
      if (
        openings.some((opening) => openingContains(opening, centerX, centerY))
      ) {
        continue
      }
      panels.push(
        box(
          `wall.front.panel-${xIndex}-${yIndex}`,
          'Wall',
          'wall',
          [centerX, centerY, frontZ - cottage.wallThickness / 2],
          [xMax - xMin, yMax - yMin, cottage.wallThickness],
        ),
      )
    }
  }
  return panels
}

function createWindowBoxes(opening: CottageFacadeOpening, frontZ: number) {
  const frame = 0.075
  const frameDepth = 0.085
  const centerY = opening.bottomY + opening.height / 2
  const faceZ = frontZ + frameDepth / 2 - 0.018
  const parts: CottageExteriorBox[] = [
    box(
      `${opening.id}.glass`,
      'Window',
      'glass',
      [opening.centerX, centerY, frontZ - 0.025],
      [opening.width - frame * 1.1, opening.height - frame * 1.1, 0.035],
    ),
  ]

  for (const side of [-1, 1] as const) {
    parts.push(
      box(
        `${opening.id}.frame-side-${side < 0 ? 'left' : 'right'}`,
        'Window',
        'wood',
        [
          opening.centerX + side * (opening.width / 2 + frame / 2),
          centerY,
          faceZ,
        ],
        [frame, opening.height + frame * 2, frameDepth],
      ),
      box(
        `${opening.id}.frame-${side < 0 ? 'bottom' : 'top'}`,
        'Window',
        'wood',
        [
          opening.centerX,
          centerY + side * (opening.height / 2 + frame / 2),
          faceZ,
        ],
        [opening.width + frame * 2, frame, frameDepth],
      ),
    )
  }

  parts.push(
    box(
      `${opening.id}.mullion-vertical`,
      'Window',
      'wood',
      [opening.centerX, centerY, faceZ + 0.006],
      [frame * 0.72, opening.height, frameDepth],
    ),
    box(
      `${opening.id}.mullion-horizontal`,
      'Window',
      'wood',
      [opening.centerX, centerY, faceZ + 0.006],
      [opening.width, frame * 0.72, frameDepth],
    ),
  )
  return parts
}

/**
 * 小屋只生成外部壳体。所有位置都以小屋中心为局部原点，门窗开口由墙板切分形成。
 */
export function createCottageExteriorKit(): CottageExteriorKit {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const foundationTop = cottage.foundationHeight
  const eaveHeight = foundationTop + cottage.wallHeight
  const ridgeHeight = eaveHeight + cottage.roofRise
  const frontZ = cottage.depth / 2
  const backZ = -cottage.depth / 2
  const porchFrontZ = frontZ + cottage.porchDepth
  const stepFrontZ = porchFrontZ + cottage.stepDepth * cottage.stepCount
  const openings: CottageFacadeOpening[] = [
    {
      id: 'door.front-center',
      module: 'Door',
      centerX: 0,
      bottomY: cottage.floorTop,
      width: cottage.doorClearWidth,
      height: cottage.doorClearHeight,
    },
    {
      id: 'window.front-west',
      module: 'Window',
      centerX: -2.28,
      bottomY: 1.04,
      width: 1.24,
      height: 1.18,
    },
    {
      id: 'window.front-east',
      module: 'Window',
      centerX: 2.28,
      bottomY: 1.04,
      width: 1.24,
      height: 1.18,
    },
  ]
  const frontWallPanels = createFrontWallPanels(openings, frontZ)
  const roofRun = cottage.width / 2 + cottage.roofOverhang
  const roofSlope = Math.hypot(roofRun, cottage.roofRise)
  const roofAngle = Math.atan2(cottage.roofRise, roofRun)
  const boxes: CottageExteriorBox[] = [
    box(
      'foundation.slab',
      'Foundation',
      'foundation',
      [0, foundationTop / 2, 0],
      [cottage.width + 0.12, foundationTop, cottage.depth + 0.12],
    ),
    ...frontWallPanels,
    box(
      'wall.back',
      'Wall',
      'wall',
      [
        0,
        foundationTop + cottage.wallHeight / 2,
        backZ + cottage.wallThickness / 2,
      ],
      [cottage.width, cottage.wallHeight, cottage.wallThickness],
    ),
    box(
      'wall.west',
      'Wall',
      'wall',
      [
        -cottage.width / 2 + cottage.wallThickness / 2,
        foundationTop + cottage.wallHeight / 2,
        0,
      ],
      [cottage.wallThickness, cottage.wallHeight, cottage.depth],
    ),
    box(
      'wall.east',
      'Wall',
      'wall',
      [
        cottage.width / 2 - cottage.wallThickness / 2,
        foundationTop + cottage.wallHeight / 2,
        0,
      ],
      [cottage.wallThickness, cottage.wallHeight, cottage.depth],
    ),
    box(
      'roof.west-slope',
      'Roof',
      'roof',
      [-roofRun / 2, eaveHeight + cottage.roofRise / 2, 0],
      [roofSlope, 0.16, cottage.depth + cottage.roofOverhang * 2],
      [0, 0, roofAngle],
    ),
    box(
      'roof.east-slope',
      'Roof',
      'roof',
      [roofRun / 2, eaveHeight + cottage.roofRise / 2, 0],
      [roofSlope, 0.16, cottage.depth + cottage.roofOverhang * 2],
      [0, 0, -roofAngle],
    ),
    box(
      'door.front.slab',
      'Door',
      'door',
      [0, cottage.floorTop + (cottage.doorClearHeight - 0.04) / 2, frontZ + 0.014],
      [cottage.doorClearWidth - 0.04, cottage.doorClearHeight - 0.04, 0.075],
    ),
    box(
      'door.front-frame-left',
      'Door',
      'darkWood',
      [-(cottage.doorClearWidth / 2 + 0.075), cottage.floorTop + cottage.doorClearHeight / 2, frontZ + 0.07],
      [0.12, cottage.doorClearHeight + 0.16, 0.12],
    ),
    box(
      'door.front-frame-right',
      'Door',
      'darkWood',
      [cottage.doorClearWidth / 2 + 0.075, cottage.floorTop + cottage.doorClearHeight / 2, frontZ + 0.07],
      [0.12, cottage.doorClearHeight + 0.16, 0.12],
    ),
    box(
      'door.front-frame-top',
      'Door',
      'darkWood',
      [0, cottage.floorTop + cottage.doorClearHeight + 0.075, frontZ + 0.07],
      [cottage.doorClearWidth + 0.27, 0.12, 0.12],
    ),
    box(
      'door.front-panel-upper',
      'Door',
      'darkWood',
      [0, cottage.floorTop + cottage.doorClearHeight * 0.69, frontZ + 0.057],
      [cottage.doorClearWidth * 0.7, cottage.doorClearHeight * 0.34, 0.035],
    ),
    box(
      'door.front-panel-lower',
      'Door',
      'darkWood',
      [0, cottage.floorTop + cottage.doorClearHeight * 0.27, frontZ + 0.057],
      [cottage.doorClearWidth * 0.7, cottage.doorClearHeight * 0.29, 0.035],
    ),
    ...openings
      .filter((opening) => opening.module === 'Window')
      .flatMap((opening) => createWindowBoxes(opening, frontZ)),
    box(
      'porch.deck',
      'Porch',
      'wood',
      [0, cottage.porchTop - 0.07, frontZ + cottage.porchDepth / 2],
      [cottage.porchWidth, 0.14, cottage.porchDepth],
    ),
    ...Array.from({ length: cottage.stepCount }, (_, index) => {
      const level = cottage.stepCount - index
      const height = level * cottage.stepRise
      return box(
        `steps.tread-${index + 1}`,
        'Steps',
        'wood',
        [0, height / 2, porchFrontZ + cottage.stepDepth * (index + 0.5)],
        [2.72, height, cottage.stepDepth],
      )
    }),
  ]

  const beamHeight = eaveHeight - foundationTop + 0.04
  for (const x of [-cottage.width / 2 + 0.1, cottage.width / 2 - 0.1]) {
    for (const z of [backZ + 0.1, frontZ - 0.1]) {
      boxes.push(
        box(
          `beam.corner-${x < 0 ? 'west' : 'east'}-${z < 0 ? 'back' : 'front'}`,
          'StructuralBeams',
          'darkWood',
          [x, foundationTop + beamHeight / 2, z],
          [0.18, beamHeight, 0.18],
        ),
      )
    }
  }
  boxes.push(
    box(
      'beam.front-eave',
      'StructuralBeams',
      'darkWood',
      [0, eaveHeight - 0.08, frontZ + 0.03],
      [cottage.width, 0.16, 0.16],
    ),
    box(
      'beam.back-eave',
      'StructuralBeams',
      'darkWood',
      [0, eaveHeight - 0.08, backZ - 0.03],
      [cottage.width, 0.16, 0.16],
    ),
    box(
      'beam.gable-front-center',
      'StructuralBeams',
      'darkWood',
      [0, eaveHeight + cottage.roofRise / 2, frontZ + 0.08],
      [0.14, cottage.roofRise, 0.14],
    ),
    box(
      'beam.gable-front-west-rake',
      'StructuralBeams',
      'darkWood',
      [-roofRun / 2, eaveHeight + cottage.roofRise / 2, frontZ + 0.09],
      [roofSlope, 0.13, 0.14],
      [0, 0, roofAngle],
    ),
    box(
      'beam.gable-front-east-rake',
      'StructuralBeams',
      'darkWood',
      [roofRun / 2, eaveHeight + cottage.roofRise / 2, frontZ + 0.09],
      [roofSlope, 0.13, 0.14],
      [0, 0, -roofAngle],
    ),
  )
  for (const side of [-1, 1] as const) {
    boxes.push(
      box(
        `porch.post-${side < 0 ? 'west' : 'east'}`,
        'StructuralBeams',
        'darkWood',
        [
          side * (cottage.porchWidth / 2 - 0.22),
          cottage.porchTop + (eaveHeight - cottage.porchTop) / 2 - 0.02,
          frontZ + cottage.porchDepth * 0.78,
        ],
        [0.2, eaveHeight - cottage.porchTop - 0.04, 0.2],
      ),
    )
  }
  boxes.push(
    box(
      'porch.header',
      'StructuralBeams',
      'darkWood',
      [0, eaveHeight - 0.16, frontZ + cottage.porchDepth * 0.78],
      [cottage.porchWidth, 0.2, 0.2],
    ),
    box(
      'porch.canopy',
      'Porch',
      'roof',
      [0, eaveHeight - 0.08, frontZ + cottage.porchDepth * 0.48],
      [cottage.porchWidth + 0.32, 0.15, cottage.porchDepth + 0.34],
      [0.12, 0, 0],
    ),
    box(
      'porch.canopy-fascia',
      'StructuralBeams',
      'darkWood',
      [0, eaveHeight - 0.21, frontZ + cottage.porchDepth + 0.15],
      [cottage.porchWidth + 0.36, 0.18, 0.16],
    ),
    box(
      'porch.knee-brace-west',
      'StructuralBeams',
      'darkWood',
      [-(cottage.porchWidth / 2 - 0.42), eaveHeight - 0.5, frontZ + cottage.porchDepth * 0.78],
      [0.58, 0.1, 0.1],
      [0, 0, -0.72],
    ),
    box(
      'porch.knee-brace-east',
      'StructuralBeams',
      'darkWood',
      [cottage.porchWidth / 2 - 0.42, eaveHeight - 0.5, frontZ + cottage.porchDepth * 0.78],
      [0.58, 0.1, 0.1],
      [0, 0, 0.72],
    ),
  )

  return {
    boxes,
    frontWallPanels,
    openings,
    gables: [
      {
        id: 'wall.gable-front',
        module: 'Wall',
        z: frontZ - cottage.wallThickness * 0.54,
        facing: 'front',
        baseY: eaveHeight,
        halfWidth: cottage.width / 2,
        rise: cottage.roofRise,
      },
      {
        id: 'wall.gable-back',
        module: 'Wall',
        z: backZ + cottage.wallThickness * 0.54,
        facing: 'back',
        baseY: eaveHeight,
        halfWidth: cottage.width / 2,
        rise: cottage.roofRise,
      },
    ],
    moduleIds: [
      'Foundation',
      'Wall',
      'Roof',
      'Door',
      'Window',
      'Porch',
      'Steps',
      'StructuralBeams',
    ],
    measurements: {
      width: cottage.width,
      depth: cottage.depth,
      eaveHeight,
      ridgeHeight,
      frontWallZ: frontZ,
      porchFrontZ,
      stepFrontZ,
    },
  }
}

export const COTTAGE_EXTERIOR_KIT = createCottageExteriorKit()
