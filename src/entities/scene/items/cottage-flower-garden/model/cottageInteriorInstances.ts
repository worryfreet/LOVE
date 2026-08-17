import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_INTERIOR_NAVIGATION,
} from './gardenLayout'
import {
  findCottageInteriorTableSupport,
  sanitizeCottageInteriorInstanceTransform,
} from './cottageInteriorCollision'
import { sanitizePlainText } from '@/shared/lib'

export const COTTAGE_INTERIOR_PART_IDS = [
  'cottage-single-bed',
  'cottage-loveseat-sofa',
  'cottage-photo-frame',
  'cottage-cast-iron-stove',
  'cottage-round-table',
  'cottage-wood-chair',
  'cottage-low-cabinet',
  'cottage-bookcase',
  'cottage-candle',
  'cottage-envelope',
  'cottage-string-lights',
] as const

export type CottageInteriorPartId = (typeof COTTAGE_INTERIOR_PART_IDS)[number]

export interface CottageInteriorPoint {
  x: number
  y: number
  z: number
}

export type CottageInteriorParameterValue = number | string | boolean
export type CottageInteriorParameters = Record<
  string,
  CottageInteriorParameterValue
>

export interface CottageInteriorInstance {
  id: string
  partId: CottageInteriorPartId
  position: CottageInteriorPoint
  rotation: CottageInteriorPoint
  scale: CottageInteriorPoint
  parameters: CottageInteriorParameters
  path?: readonly CottageInteriorPoint[]
  /** 桌面摆件以稳定实例 ID 记录承载桌，位置仍保存为房间局部坐标。 */
  supportId?: string
  createdAt: number
}

export interface CottageInteriorDocument {
  schemaVersion: 2
  sceneId: 'cottage-flower-garden'
  instances: readonly CottageInteriorInstance[]
}

export const COTTAGE_INTERIOR_STORAGE_KEY =
  'atlas-scene:cottage-flower-garden:interior:v2'
export const COTTAGE_INTERIOR_LEGACY_STORAGE_KEY =
  'atlas-scene:cottage-flower-garden:interior:v1'
export const COTTAGE_INTERIOR_MAX_PHOTOS = 9
export const COTTAGE_INTERIOR_PHOTO_SLOT_IDS = [
  'photo-01',
  'photo-02',
  'photo-03',
  'photo-04',
  'photo-05',
  'photo-06',
  'photo-07',
  'photo-08',
  'photo-09',
] as const
export type CottageInteriorPhotoSlotId =
  (typeof COTTAGE_INTERIOR_PHOTO_SLOT_IDS)[number]
export const COTTAGE_INTERIOR_MAX_PATH_POINTS = 32
export const COTTAGE_INTERIOR_MAX_INSTANCES = 96
export const COTTAGE_INTERIOR_MAX_EMBEDDED_PHOTO_CHARACTERS = 180_000

const INSTANCE_ID_PATTERN = /^interior-instance-(\d{3,})$/u
const PART_ID_SET = new Set<string>(COTTAGE_INTERIOR_PART_IDS)
const PHOTO_SLOT_ID_SET = new Set<string>(COTTAGE_INTERIOR_PHOTO_SLOT_IDS)
const floorY = COTTAGE_INTERIOR_NAVIGATION.floorTop

export function isCottageInteriorPhotoSlotId(
  value: unknown,
): value is CottageInteriorPhotoSlotId {
  return typeof value === 'string' && PHOTO_SLOT_ID_SET.has(value)
}

function transform(
  position: readonly [number, number, number],
  rotationY = 0,
  scale: readonly [number, number, number] = [1, 1, 1],
) {
  return {
    position: { x: position[0], y: position[1], z: position[2] },
    rotation: { x: 0, y: rotationY, z: 0 },
    scale: { x: scale[0], y: scale[1], z: scale[2] },
  }
}

function instance(
  sequence: number,
  partId: CottageInteriorPartId,
  position: readonly [number, number, number],
  rotationY: number,
  parameters: CottageInteriorParameters,
  options: {
    scale?: readonly [number, number, number]
    path?: readonly CottageInteriorPoint[]
    supportId?: string
  } = {},
): CottageInteriorInstance {
  return {
    id: `interior-instance-${String(sequence).padStart(3, '0')}`,
    partId,
    ...transform(position, rotationY, options.scale),
    parameters,
    ...(options.path ? { path: options.path } : {}),
    ...(options.supportId ? { supportId: options.supportId } : {}),
    createdAt: sequence,
  }
}

function createDefaultBookcaseInstance() {
  return instance(1, 'cottage-bookcase', [3.49, floorY, -1.8], -Math.PI / 2, {
    width: 1.35,
    depth: 0.38,
    height: 1.95,
    shelfCount: 4,
    woodColor: '#87542F',
    backColor: '#65402A',
  })
}

/** 默认陈设使用局部米制坐标，入口位于 +Z，北侧照片墙位于 -Z。 */
export function createDefaultCottageInteriorInstances() {
  const tableTop = floorY + 0.74
  const photoZ =
    COTTAGE_INTERIOR_NAVIGATION.minZ -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
    0.027
  const defaults: CottageInteriorInstance[] = [
    createDefaultBookcaseInstance(),
    instance(2, 'cottage-loveseat-sofa', [-2.25, floorY, 0.42], Math.PI / 2, {
      width: 1.84,
      depth: 0.82,
      height: 0.86,
      fabricColor: '#E9D8C6',
      pillowColor: '#C87578',
      secondaryPillowColor: '#A5A88A',
    }),
    instance(3, 'cottage-cast-iron-stove', [-3.05, floorY, -1.74], Math.PI / 2, {
      width: 0.62,
      depth: 0.5,
      height: 0.82,
      fireLit: true,
    }),
    instance(4, 'cottage-round-table', [0.08, floorY, -0.12], 0, {
      diameter: 1.1,
      height: 0.74,
      woodColor: '#8B552E',
    }),
    instance(5, 'cottage-wood-chair', [-0.82, floorY, -0.12], Math.PI / 2, {
      width: 0.44,
      cushionColor: '#D8B998',
      hasCushion: true,
    }),
    instance(6, 'cottage-wood-chair', [0.98, floorY, -0.12], -Math.PI / 2, {
      width: 0.44,
      cushionColor: '#D8B998',
      hasCushion: true,
    }),
    instance(7, 'cottage-low-cabinet', [-0.55, floorY, -2.65], 0, {
      width: 2.05,
      depth: 0.44,
      height: 0.72,
      woodColor: '#89542F',
      variant: 'cabinet',
    }),
    instance(
      8,
      'cottage-candle',
      [-0.04, tableTop, -0.18],
      0,
      { diameter: 0.09, height: 0.26, color: '#FFF1D2', lit: true },
      { supportId: 'interior-instance-004' },
    ),
    instance(
      11,
      'cottage-envelope',
      [-0.12, tableTop, 0.18],
      -0.09,
      {
        width: 0.22,
        depth: 0.16,
        paperColor: '#E8D0AC',
        openProgress: 0,
      },
      { supportId: 'interior-instance-004' },
    ),
    // 北墙：八张常规比例照片沿同一抬高中心线形成完整画廊。
    instance(12, 'cottage-photo-frame', [-0.425, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-01',
      width: 1500,
      height: 1000,
      frameRailWidth: 16,
      matWidth: 3,
      frameColor: '#74462B',
      imageUrl: '',
    }),
    instance(13, 'cottage-photo-frame', [-2.955, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-02',
      width: 720,
      height: 480,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#956640',
      imageUrl: '',
    }),
    instance(14, 'cottage-photo-frame', [-2.225, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-03',
      width: 480,
      height: 720,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#6E4328',
      imageUrl: '',
    }),
    instance(15, 'cottage-photo-frame', [0.735, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-04',
      width: 480,
      height: 720,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#8A5835',
      imageUrl: '',
    }),
    instance(16, 'cottage-photo-frame', [2.955, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-05',
      width: 720,
      height: 480,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#A06B43',
      imageUrl: '',
    }),
    instance(17, 'cottage-photo-frame', [-1.575, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-06',
      width: 480,
      height: 720,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#74462B',
      imageUrl: '',
    }),
    instance(18, 'cottage-photo-frame', [1.485, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-07',
      width: 720,
      height: 480,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#9A6A45',
      imageUrl: '',
    }),
    instance(19, 'cottage-photo-frame', [2.235, 1.89, photoZ], 0, {
      mount: 'wall',
      photoSlotId: 'photo-08',
      width: 480,
      height: 720,
      frameRailWidth: 16,
      matWidth: 5,
      frameColor: '#805033',
      imageUrl: '',
    }),
    // 桌面相框收在左后侧并略朝房间中心偏转，与右侧花瓶形成平衡。
    instance(
      20,
      'cottage-photo-frame',
      [-0.31, tableTop, -0.29],
      0.12,
      {
        mount: 'table',
        photoSlotId: 'photo-09',
        width: 240,
        height: 360,
        frameRailWidth: 16,
        matWidth: 6,
        frameColor: '#8A5835',
        imageUrl: '',
      },
      { supportId: 'interior-instance-004' },
    ),
    instance(
      21,
      'cottage-string-lights',
      [0, 0, 0],
      0,
      {
        bulbSpacing: 280,
        sag: 110,
        cableColor: '#3D3028',
        warmth: 0.24,
        intensity: 1.15,
        lit: true,
      },
      {
        path: [
          { x: -3.45, y: 2.48, z: 2.72 },
          { x: -3.45, y: 2.48, z: -2.72 },
          { x: 0, y: 2.56, z: -2.78 },
          { x: 3.45, y: 2.48, z: -2.72 },
          { x: 3.45, y: 2.48, z: 2.72 },
          { x: 0.62, y: 2.42, z: 2.78 },
          { x: -0.62, y: 2.42, z: 2.78 },
          { x: -3.45, y: 2.48, z: 2.72 },
        ],
      },
    ),
  ]
  return defaults
}

export const COTTAGE_INTERIOR_DEFAULT_DOCUMENT: CottageInteriorDocument = {
  schemaVersion: 2,
  sceneId: 'cottage-flower-garden',
  instances: createDefaultCottageInteriorInstances(),
}

function matchesLegacyDefaultBed(candidate: unknown) {
  if (!candidate || typeof candidate !== 'object') return false
  const source = candidate as Partial<CottageInteriorInstance>
  return (
    source.id === 'interior-instance-001' &&
    source.partId === 'cottage-single-bed' &&
    source.position?.x === 2.45 &&
    source.position?.z === -1.62 &&
    source.rotation?.y === 0 &&
    source.scale?.x === 1 &&
    source.scale?.y === 1 &&
    source.scale?.z === 1 &&
    Number(source.parameters?.width) === 1.5 &&
    Number(source.parameters?.length) === 2 &&
    Number(source.parameters?.bedHeight) === 0.48
  )
}

const matchesLegacyDefaultPhoto = (
  candidate: unknown,
  id: string,
  position: readonly [number, number, number],
  rotationY: number,
  size: readonly [number, number],
) => {
  if (!candidate || typeof candidate !== 'object') return false
  const source = candidate as Partial<CottageInteriorInstance>
  return (
    source.id === id &&
    source.partId === 'cottage-photo-frame' &&
    source.position?.x === position[0] &&
    source.position?.y === position[1] &&
    source.position?.z === position[2] &&
    source.rotation?.y === rotationY &&
    Number(source.parameters?.width) === size[0] &&
    Number(source.parameters?.height) === size[1]
  )
}

const matchesLegacyDefaultCandle = (
  candidate: unknown,
  id: string,
  position: readonly [number, number, number],
  size: readonly [number, number],
) => {
  if (!candidate || typeof candidate !== 'object') return false
  const source = candidate as Partial<CottageInteriorInstance>
  return (
    source.id === id &&
    source.partId === 'cottage-candle' &&
    source.position?.x === position[0] &&
    source.position?.y === position[1] &&
    source.position?.z === position[2] &&
    Number(source.parameters?.diameter) === size[0] &&
    Number(source.parameters?.height) === size[1]
  )
}

/** 只迁移历版原封不动的默认陈设，用户自行改过位置或尺寸的实例继续保留。 */
export function migrateLegacyDefaultCottageInteriorInstances(value: unknown) {
  if (!Array.isArray(value)) return value
  const nextDefaults = createDefaultCottageInteriorInstances()
  const nextById = new Map(nextDefaults.map((item) => [item.id, item]))
  const tableTop = floorY + 0.74
  const photoZ =
    COTTAGE_INTERIOR_NAVIGATION.minZ -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
    0.027
  const eastPhotoX =
    COTTAGE_INTERIOR_NAVIGATION.maxX -
    COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX -
    0.027
  const legacyPhotos = new Map<string, {
    position: readonly [number, number, number]
    rotationY: number
    size: readonly [number, number]
  }>([
    ['interior-instance-012', { position: [0, 1.74, photoZ], rotationY: 0, size: [1180, 740] }],
    ['interior-instance-013', { position: [-1.55, 1.74, photoZ], rotationY: 0, size: [430, 300] }],
    ['interior-instance-014', { position: [-0.92, 1.74, photoZ], rotationY: 0, size: [340, 480] }],
    ['interior-instance-015', { position: [0.92, 1.74, photoZ], rotationY: 0, size: [340, 480] }],
    ['interior-instance-016', { position: [1.55, 1.74, photoZ], rotationY: 0, size: [430, 300] }],
    ['interior-instance-017', { position: [eastPhotoX, 1.84, -0.72], rotationY: -Math.PI / 2, size: [380, 520] }],
    ['interior-instance-018', { position: [eastPhotoX, 1.84, 0.12], rotationY: -Math.PI / 2, size: [500, 340] }],
    ['interior-instance-019', { position: [eastPhotoX, 1.84, 0.96], rotationY: -Math.PI / 2, size: [380, 520] }],
    ['interior-instance-020', { position: [-0.31, tableTop, -0.29], rotationY: 0.12, size: [210, 270] }],
  ])
  const legacyCandles = new Map<string, {
    position: readonly [number, number, number]
    size: readonly [number, number]
  }>([
    ['interior-instance-008', { position: [-0.1, tableTop, -0.17], size: [0.065, 0.19] }],
    ['interior-instance-009', { position: [0.02, tableTop, -0.24], size: [0.055, 0.14] }],
    ['interior-instance-010', { position: [0.15, tableTop, -0.16], size: [0.05, 0.11] }],
  ])

  return value.flatMap((candidate) => {
    if (matchesLegacyDefaultBed(candidate)) return [createDefaultBookcaseInstance()]
    if (!candidate || typeof candidate !== 'object') return [candidate]
    const source = candidate as Partial<CottageInteriorInstance>
    const photo = typeof source.id === 'string' ? legacyPhotos.get(source.id) : undefined
    if (
      photo &&
      matchesLegacyDefaultPhoto(
        candidate,
        source.id as string,
        photo.position,
        photo.rotationY,
        photo.size,
      )
    ) {
      const replacement = nextById.get(source.id as string)
      if (!replacement) return [candidate]
      const imageUrl = source.parameters?.imageUrl
      return [{
        ...replacement,
        parameters: {
          ...replacement.parameters,
          ...(typeof imageUrl === 'string' ? { imageUrl } : {}),
        },
      }]
    }
    const candle = typeof source.id === 'string' ? legacyCandles.get(source.id) : undefined
    if (
      candle &&
      matchesLegacyDefaultCandle(
        candidate,
        source.id as string,
        candle.position,
        candle.size,
      )
    ) {
      return source.id === 'interior-instance-008'
        ? [nextById.get(source.id) ?? candidate]
        : []
    }
    return [candidate]
  })
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

type NumericRule = readonly [
  minimum: number,
  maximum: number,
  fallback: number,
  unitMode?: 'meters-or-millimeters',
]

interface ParameterRuleSet {
  numbers?: Readonly<Record<string, NumericRule>>
  colors?: Readonly<Record<string, string>>
  booleans?: Readonly<Record<string, boolean>>
  enums?: Readonly<Record<string, readonly [string, readonly string[]]>>
  texts?: Readonly<Record<string, readonly [number, boolean?]>>
}

/** 与零件目录相同的运行时安全边界；双单位项保留调用方原有的米/mm 表示。 */
const PART_PARAMETER_RULES: Readonly<
  Record<CottageInteriorPartId, ParameterRuleSet>
> = {
  'cottage-single-bed': {
    numbers: {
      width: [0.72, 1.6, 1.5, 'meters-or-millimeters'],
      length: [1.65, 2.2, 1.9, 'meters-or-millimeters'],
      bedHeight: [0.42, 0.65, 0.48, 'meters-or-millimeters'],
    },
    colors: {
      woodColor: '#87542F', beddingColor: '#F2DFD0',
      throwColor: '#C8787B', accentPillowColor: '#B86C6E',
    },
  },
  'cottage-loveseat-sofa': {
    numbers: {
      width: [1.4, 2.2, 1.72, 'meters-or-millimeters'],
      depth: [0.65, 1, 0.78, 'meters-or-millimeters'],
      height: [0.7, 1.05, 0.84, 'meters-or-millimeters'],
    },
    colors: {
      fabricColor: '#E9D8C6', pillowColor: '#C87578',
      secondaryPillowColor: '#A5A88A', woodColor: '#7B4A2A',
    },
  },
  'cottage-photo-frame': {
    numbers: {
      width: [240, 1600, 520], height: [240, 1200, 400],
      frameRailWidth: [12, 50, 24], matWidth: [0, 40, 16],
    },
    colors: { frameColor: '#8A5835' },
    enums: {
      mount: ['wall', ['wall', 'table']],
      photoSlotId: ['photo-01', COTTAGE_INTERIOR_PHOTO_SLOT_IDS],
    },
  },
  'cottage-cast-iron-stove': {
    numbers: {
      width: [0.45, 0.85, 0.62], depth: [0.38, 0.72, 0.5],
      height: [0.62, 1.1, 0.82],
    },
    colors: { color: '#181716' },
    booleans: { fireLit: true },
  },
  'cottage-round-table': {
    numbers: {
      diameter: [0.8, 1.6, 1.15], height: [0.65, 0.86, 0.74],
      topThickness: [0.04, 0.09, 0.055],
    },
    colors: { woodColor: '#A96E35' },
  },
  'cottage-wood-chair': {
    numbers: {
      width: [0.38, 0.62, 0.46], depth: [0.42, 0.7, 0.5],
      height: [0.72, 1.1, 0.88], seatHeight: [0.38, 0.51, 0.46],
    },
    colors: { woodColor: '#A96E35', cushionColor: '#F1E6D1' },
    booleans: { hasCushion: true },
  },
  'cottage-low-cabinet': {
    numbers: {
      width: [1.1, 2.6, 2.15, 'meters-or-millimeters'],
      depth: [0.36, 0.62, 0.46, 'meters-or-millimeters'],
      height: [0.54, 0.9, 0.76, 'meters-or-millimeters'],
    },
    colors: {
      woodColor: '#89542F', cushionColor: '#D8B998',
      pipingColor: '#B78862',
    },
    enums: {
      variant: ['cabinet', ['cabinet', 'cushioned-bench']],
    },
  },
  'cottage-bookcase': {
    numbers: {
      width: [0.9, 1.8, 1.35, 'meters-or-millimeters'],
      depth: [0.28, 0.5, 0.38, 'meters-or-millimeters'],
      height: [1.5, 2.15, 1.95, 'meters-or-millimeters'],
      shelfCount: [3, 6, 4],
    },
    colors: { woodColor: '#87542F', backColor: '#65402A' },
  },
  'cottage-candle': {
    numbers: { diameter: [0.03, 0.12, 0.065], height: [0.08, 0.4, 0.16] },
    colors: { color: '#F5E4B7' },
    booleans: { lit: true },
  },
  'cottage-envelope': {
    numbers: {
      width: [0.14, 0.34, 0.22], depth: [0.1, 0.24, 0.16],
      paperThickness: [0.0002, 0.001, 0.00035], openProgress: [0, 1, 0],
    },
    colors: { paperColor: '#EEDDBB', sealColor: '#B76870' },
    texts: {
      letterTitle: [48], letterSalutation: [48],
      letterBody: [1_200, true], letterSignature: [64],
    },
  },
  'cottage-string-lights': {
    numbers: {
      length: [1_000, 20_000, 6_000], bulbSpacing: [120, 800, 280],
      sag: [0, 500, 110], warmth: [0, 1, 0.24], intensity: [0, 6, 1.15],
    },
    colors: { cableColor: '#3D3028' },
    booleans: { lit: true },
  },
}

function normalizePoint(
  value: unknown,
  fallback: CottageInteriorPoint,
  min = -20,
  max = 20,
) {
  if (!value || typeof value !== 'object') return { ...fallback }
  const point = value as Partial<CottageInteriorPoint>
  return {
    x: finite(point.x) ? Math.min(max, Math.max(min, point.x)) : fallback.x,
    y: finite(point.y) ? Math.min(max, Math.max(min, point.y)) : fallback.y,
    z: finite(point.z) ? Math.min(max, Math.max(min, point.z)) : fallback.z,
  }
}

export function normalizeCottageInteriorPartParameters(
  partId: CottageInteriorPartId,
  value: unknown,
): CottageInteriorParameters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const rules = PART_PARAMETER_RULES[partId]
  const result: CottageInteriorParameters = {}
  for (const [key, rule] of Object.entries(rules.numbers ?? {})) {
    if (!(key in source)) continue
    const [minimum, maximum, fallback, unitMode] = rule
    const candidate = source[key]
    if (!finite(candidate)) {
      result[key] = fallback
      continue
    }
    const millimeters = unitMode === 'meters-or-millimeters' && candidate > 10
    const meters = millimeters ? candidate / 1_000 : candidate
    const normalized = Math.min(maximum, Math.max(minimum, meters))
    result[key] = millimeters ? normalized * 1_000 : normalized
  }
  for (const [key, fallback] of Object.entries(rules.colors ?? {})) {
    if (!(key in source)) continue
    const candidate = source[key]
    result[key] =
      typeof candidate === 'string' && /^#[\da-f]{6}$/iu.test(candidate)
        ? candidate
        : fallback
  }
  for (const [key, fallback] of Object.entries(rules.booleans ?? {})) {
    if (!(key in source)) continue
    result[key] = typeof source[key] === 'boolean' ? source[key] : fallback
  }
  for (const [key, [fallback, options]] of Object.entries(rules.enums ?? {})) {
    if (!(key in source)) continue
    const candidate = source[key]
    result[key] =
      typeof candidate === 'string' && options.includes(candidate)
        ? candidate
        : fallback
  }
  for (const [key, [maxLength, multiline]] of Object.entries(rules.texts ?? {})) {
    if (!(key in source) || typeof source[key] !== 'string') continue
    result[key] = sanitizePlainText(source[key], {
      maxLength,
      multiline,
      collapseBlankLines: multiline,
    })
  }
  if (partId === 'cottage-photo-frame' && 'imageUrl' in source) {
    const candidate = source.imageUrl
    result.imageUrl =
      typeof candidate !== 'string'
        ? ''
        : candidate.startsWith('data:image/')
          ? candidate.length <= COTTAGE_INTERIOR_MAX_EMBEDDED_PHOTO_CHARACTERS
            ? candidate
            : ''
          : candidate.slice(0, 2_048)
  }
  return result
}

export function hasCottageInteriorRenderablePath(
  path: readonly CottageInteriorPoint[] | undefined,
) {
  if (!path || path.length < 2) return false
  const first = path[0]
  return path.some(
    (point) =>
      Math.hypot(point.x - first.x, point.y - first.y, point.z - first.z) >
      0.0001,
  )
}

export function normalizeCottageInteriorInstances(value: unknown) {
  if (!Array.isArray(value)) return []
  const normalized: CottageInteriorInstance[] = []
  const ids = new Set<string>()
  let photoCount = 0

  for (const candidate of value.slice(0, COTTAGE_INTERIOR_MAX_INSTANCES)) {
    if (!candidate || typeof candidate !== 'object') continue
    const source = candidate as Partial<CottageInteriorInstance>
    if (
      typeof source.id !== 'string' ||
      !INSTANCE_ID_PATTERN.test(source.id) ||
      ids.has(source.id) ||
      typeof source.partId !== 'string' ||
      !PART_ID_SET.has(source.partId)
    ) {
      continue
    }
    if (source.partId === 'cottage-photo-frame') {
      if (photoCount >= COTTAGE_INTERIOR_MAX_PHOTOS) continue
      photoCount += 1
    }
    const partId = source.partId as CottageInteriorPartId
    const parameters = normalizeCottageInteriorPartParameters(
      partId,
      source.parameters,
    )
    const path =
      partId === 'cottage-string-lights' && Array.isArray(source.path)
        ? source.path
            .slice(0, COTTAGE_INTERIOR_MAX_PATH_POINTS)
            .map((point) => normalizePoint(point, { x: 0, y: 2, z: 0 }))
        : undefined
    if (
      partId === 'cottage-string-lights' &&
      !hasCottageInteriorRenderablePath(path)
    ) {
      continue
    }

    ids.add(source.id)
    const normalizedInstance: CottageInteriorInstance = {
      id: source.id,
      partId,
      position: normalizePoint(source.position, { x: 0, y: floorY, z: 0 }),
      rotation: normalizePoint(source.rotation, { x: 0, y: 0, z: 0 }, -Math.PI * 2, Math.PI * 2),
      scale: normalizePoint(source.scale, { x: 1, y: 1, z: 1 }, 0.25, 3),
      parameters,
      ...(path ? { path } : {}),
      ...(typeof source.supportId === 'string' &&
      INSTANCE_ID_PATTERN.test(source.supportId)
        ? { supportId: source.supportId }
        : {}),
      createdAt: finite(source.createdAt) ? source.createdAt : 0,
    }
    normalized.push(
      sanitizeCottageInteriorInstanceTransform(normalizedInstance),
    )
  }
  const tables = normalized.filter(
    (item) => item.partId === 'cottage-round-table',
  )
  const tableIds = new Set(tables.map((item) => item.id))
  return normalized.map((item) => {
    const tabletopPart =
      item.partId === 'cottage-candle' ||
      item.partId === 'cottage-envelope' ||
      (item.partId === 'cottage-photo-frame' &&
        item.parameters.mount === 'table')
    const storedSupport =
      tabletopPart && item.supportId && tableIds.has(item.supportId)
        ? tables.find((table) => table.id === item.supportId)
        : undefined
    if (!tabletopPart) {
      return { ...item, supportId: undefined }
    }
    const support =
      (storedSupport &&
        findCottageInteriorTableSupport(item, [storedSupport])) ||
      findCottageInteriorTableSupport(item, normalized)
    return { ...item, supportId: support?.id }
  })
}

const LEGACY_INTERIOR = {
  halfWidth: 2.802,
  halfDepth: 2.302,
  floorTop: 0.325,
  eaveHeight: 2.38,
} as const

function migrateLegacyInteriorPoint(value: unknown) {
  if (!value || typeof value !== 'object') return value
  const point = value as Partial<CottageInteriorPoint>
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const halfWidth =
    (COTTAGE_INTERIOR_NAVIGATION.maxX - COTTAGE_INTERIOR_NAVIGATION.minX) / 2
  const halfDepth =
    (COTTAGE_INTERIOR_NAVIGATION.maxZ - COTTAGE_INTERIOR_NAVIGATION.minZ) / 2
  const verticalScale =
    (cottage.foundationHeight + cottage.wallHeight - cottage.floorTop) /
    (LEGACY_INTERIOR.eaveHeight - LEGACY_INTERIOR.floorTop)
  return {
    x:
      typeof point.x === 'number'
        ? (point.x / LEGACY_INTERIOR.halfWidth) * halfWidth
        : point.x,
    y:
      typeof point.y === 'number'
        ? cottage.floorTop +
          (point.y - LEGACY_INTERIOR.floorTop) * verticalScale
        : point.y,
    z:
      typeof point.z === 'number'
        ? (point.z / LEGACY_INTERIOR.halfDepth) * halfDepth
        : point.z,
  }
}

/** v1 陈设按房间归一化位置迁移，避免把旧小房间坐标直接留在新空间中央。 */
export function migrateLegacyCottageInteriorInstances(value: unknown) {
  if (!Array.isArray(value)) return []
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const localNorthWall = COTTAGE_INTERIOR_NAVIGATION.minZ - cottage.centerZ
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') return candidate
    const source = candidate as Partial<CottageInteriorInstance>
    const migratedPosition = migrateLegacyInteriorPoint(source.position)
    const position =
      source.partId === 'cottage-photo-frame' &&
      source.parameters?.mount !== 'table' &&
      migratedPosition &&
      typeof migratedPosition === 'object'
        ? { ...migratedPosition, z: localNorthWall + 0.027 }
        : migratedPosition
    return {
      ...source,
      position,
      ...(Array.isArray(source.path)
        ? { path: source.path.map(migrateLegacyInteriorPoint) }
        : {}),
    }
  })
}

export function parseCottageInteriorDocument(serialized: string | null) {
  if (!serialized) return COTTAGE_INTERIOR_DEFAULT_DOCUMENT
  try {
    const candidate = JSON.parse(serialized) as {
      schemaVersion?: unknown
      sceneId?: unknown
      instances?: unknown
    }
    if (candidate.sceneId !== 'cottage-flower-garden') {
      return COTTAGE_INTERIOR_DEFAULT_DOCUMENT
    }
    const sourceInstances =
      candidate.schemaVersion === 2
        ? migrateLegacyDefaultCottageInteriorInstances(candidate.instances)
        : candidate.schemaVersion === 1
          ? migrateLegacyCottageInteriorInstances(candidate.instances)
          : null
    if (sourceInstances === null) return COTTAGE_INTERIOR_DEFAULT_DOCUMENT
    return {
      schemaVersion: 2,
      sceneId: 'cottage-flower-garden',
      instances: normalizeCottageInteriorInstances(sourceInstances),
    } satisfies CottageInteriorDocument
  } catch {
    return COTTAGE_INTERIOR_DEFAULT_DOCUMENT
  }
}

export function getNextCottageInteriorSequence(
  instances: readonly CottageInteriorInstance[],
) {
  return (
    instances.reduce((largest, item) => {
      const match = INSTANCE_ID_PATTERN.exec(item.id)
      return match ? Math.max(largest, Number(match[1])) : largest
    }, 0) + 1
  )
}

export function createCottageInteriorInstance(
  partId: CottageInteriorPartId,
  sequence: number,
  parameters: CottageInteriorParameters,
  position: CottageInteriorPoint = { x: 0, y: floorY, z: 0.85 },
  createdAt = Date.now(),
) {
  const path =
    partId === 'cottage-string-lights'
      ? [
          { x: -1, y: 2, z: 0 },
          { x: 0, y: 2.2, z: 0 },
          { x: 1, y: 2, z: 0 },
        ]
      : undefined
  return {
    id: `interior-instance-${String(sequence).padStart(3, '0')}`,
    partId,
    position: { ...position },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    parameters: { ...parameters },
    ...(path ? { path } : {}),
    createdAt,
  } satisfies CottageInteriorInstance
}

export function duplicateCottageInteriorInstance(
  source: CottageInteriorInstance,
  sequence: number,
  createdAt = Date.now(),
) {
  return {
    ...source,
    id: `interior-instance-${String(sequence).padStart(3, '0')}`,
    position: {
      ...(source.partId === 'cottage-string-lights'
        ? { x: 0, y: 0, z: 0 }
        : {
            ...source.position,
            x: source.position.x + 0.28,
            z: source.position.z + 0.22,
          }),
    },
    rotation: { ...source.rotation },
    scale: { ...source.scale },
    parameters: { ...source.parameters },
    ...(source.path
      ? {
          path: source.path.map((point) => ({
            ...point,
            x: point.x + 0.16,
            z: point.z + 0.12,
          })),
        }
      : {}),
    createdAt,
  }
}
