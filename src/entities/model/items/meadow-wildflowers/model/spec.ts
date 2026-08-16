export type WildflowerSpeciesId =
  | 'wild-daisy'
  | 'pink-cosmos'
  | 'blue-cornflower'

export type WildflowerPetalProfile = 'rounded' | 'notched' | 'forked'
export type WildflowerLeafProfile = 'spoon' | 'thread' | 'lance'

export interface WildflowerSpec {
  readonly id: WildflowerSpeciesId
  readonly name: string
  readonly height: number
  readonly stemRadius: number
  readonly headRadius: number
  readonly petalCount: number
  readonly petalLength: number
  readonly petalWidth: number
  readonly petalProfile: WildflowerPetalProfile
  readonly petalColor: string
  readonly petalAccent: string
  readonly centerColor: string
  readonly stemColor: string
  readonly leafColor: string
  readonly leafProfile: WildflowerLeafProfile
  readonly leafCount: number
}

export const WILDFLOWER_SPECS = {
  'wild-daisy': {
    id: 'wild-daisy',
    name: '白雏菊',
    height: 0.085,
    stemRadius: 0.0028,
    headRadius: 0.011,
    petalCount: 12,
    petalLength: 0.029,
    petalWidth: 0.011,
    petalProfile: 'rounded',
    petalColor: '#dfe5dd',
    petalAccent: '#bdcec5',
    centerColor: '#f2b72d',
    stemColor: '#4e7f34',
    leafColor: '#3f772f',
    leafProfile: 'spoon',
    leafCount: 5,
  },
  'pink-cosmos': {
    id: 'pink-cosmos',
    name: '粉色波斯菊',
    height: 0.14,
    stemRadius: 0.0025,
    headRadius: 0.011,
    petalCount: 8,
    petalLength: 0.034,
    petalWidth: 0.023,
    petalProfile: 'notched',
    petalColor: '#f17eb0',
    petalAccent: '#d94e91',
    centerColor: '#edb732',
    stemColor: '#477a38',
    leafColor: '#3d7639',
    leafProfile: 'thread',
    leafCount: 8,
  },
  'blue-cornflower': {
    id: 'blue-cornflower',
    name: '蓝色矢车菊',
    height: 0.12,
    stemRadius: 0.0025,
    headRadius: 0.01,
    petalCount: 12,
    petalLength: 0.03,
    petalWidth: 0.016,
    petalProfile: 'forked',
    petalColor: '#4c8fe8',
    petalAccent: '#2867c3',
    centerColor: '#374f9b',
    stemColor: '#4a773b',
    leafColor: '#456f38',
    leafProfile: 'lance',
    leafCount: 5,
  },
} as const satisfies Record<WildflowerSpeciesId, WildflowerSpec>

export const WILDFLOWER_SPECIES_IDS = Object.keys(
  WILDFLOWER_SPECS,
) as WildflowerSpeciesId[]

export const WILDFLOWER_MEADOW_SIZE = 1
export const WILDFLOWER_MEADOW_PLANT_COUNT = 160
export const WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT = 1800
export const WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE = [
  0.043,
  0.0505,
] as const

export interface WildflowerPlacement {
  readonly id: string
  readonly species: WildflowerSpeciesId
  readonly x: number
  readonly z: number
  readonly rotation: number
  readonly scale: number
}

export interface MeadowGrassPlacement {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly rotation: number
  readonly widthScale: number
  readonly heightScale: number
  readonly lean: number
}

function halton(index: number, base: number) {
  let fraction = 1
  let result = 0
  let cursor = index
  while (cursor > 0) {
    fraction /= base
    result += fraction * (cursor % base)
    cursor = Math.floor(cursor / base)
  }
  return result
}

function stableNoise(index: number) {
  const value = Math.sin(index * 91.731 + 17.913) * 43758.5453
  return value - Math.floor(value)
}

export function createWildflowerMeadowLayout(
  count = WILDFLOWER_MEADOW_PLANT_COUNT,
): WildflowerPlacement[] {
  const halfUsableSize = WILDFLOWER_MEADOW_SIZE * 0.46
  return Array.from({ length: count }, (_, index) => {
    const mix = (index * 7 + 3) % 15
    const species: WildflowerSpeciesId =
      mix < 6
        ? 'wild-daisy'
        : mix < 11
          ? 'pink-cosmos'
          : 'blue-cornflower'
    return {
      id: `meadow.${species}.${index}`,
      species,
      x: (halton(index + 1, 2) * 2 - 1) * halfUsableSize,
      z: (halton(index + 1, 3) * 2 - 1) * halfUsableSize,
      rotation: stableNoise(index + 1) * Math.PI * 2,
      scale: 0.72 + stableNoise(index + 113) * 0.38,
    }
  })
}

export function createMeadowGrassLayout(
  count = WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT,
): MeadowGrassPlacement[] {
  const halfUsableSize = WILDFLOWER_MEADOW_SIZE * 0.484
  return Array.from({ length: count }, (_, index) => ({
    id: `meadow.grass.${index}`,
    x: (halton(index + 1, 2) * 2 - 1) * halfUsableSize,
    z: (halton(index + 1, 5) * 2 - 1) * halfUsableSize,
    rotation: stableNoise(index + 701) * Math.PI * 2,
    widthScale: 0.82 + stableNoise(index + 1301) * 0.34,
    heightScale: 0.99 + stableNoise(index + 1901) * 0.13,
    lean: (stableNoise(index + 2501) * 2 - 1) * 0.07,
  }))
}

export function resolveWildflowerBreezeSway(
  progress: number,
  amplitude: number,
) {
  const clamped = Math.min(1, Math.max(0, progress))
  return (
    Math.sin(clamped * Math.PI * 5) *
    Math.sin(clamped * Math.PI) *
    amplitude
  )
}
