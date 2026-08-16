export const COTTAGE_ARCHITECTURE = {
  units: 'meter',
  frame: {
    east: '+X',
    north: '-Z',
    up: '+Y',
    entranceFacing: '+Z',
  },
  envelope: {
    centerX: 0,
    centerZ: -14.01,
    width: 8,
    depth: 6.5,
    wallThickness: 0.24,
  },
  datums: {
    ground: 0,
    foundationTop: 0.42,
    porchTop: 0.42,
    thresholdTop: 0.44,
    interiorFloorTop: 0.45,
    eave: 2.8,
    ridge: 4.2,
  },
  roof: {
    overhang: 0.55,
  },
  porch: {
    width: 5.8,
    depth: 1.35,
    stepDepth: 0.38,
    stepCount: 3,
  },
  door: {
    id: 'portal.cottage-door',
    clearWidth: 1.02,
    clearHeight: 2.1,
    leafThickness: 0.075,
    openAngleRadians: Math.PI * (96 / 180),
    passableProgress: 0.88,
    interactionDistance: 1.6,
    interactionFacingRadians: Math.PI / 6,
    thresholdDepth: 0.35,
  },
} as const

const { envelope, datums, porch } = COTTAGE_ARCHITECTURE

export const COTTAGE_ARCHITECTURE_LAYOUT = {
  centerX: envelope.centerX,
  centerZ: envelope.centerZ,
  width: envelope.width,
  depth: envelope.depth,
  foundationHeight: datums.foundationTop,
  floorTop: datums.interiorFloorTop,
  wallHeight: datums.eave - datums.foundationTop,
  roofRise: datums.ridge - datums.eave,
  roofOverhang: COTTAGE_ARCHITECTURE.roof.overhang,
  wallThickness: envelope.wallThickness,
  porchWidth: porch.width,
  porchDepth: porch.depth,
  porchTop: datums.porchTop,
  stepDepth: porch.stepDepth,
  stepCount: porch.stepCount,
  stepRise: datums.porchTop / porch.stepCount,
  doorClearWidth: COTTAGE_ARCHITECTURE.door.clearWidth,
  doorClearHeight: COTTAGE_ARCHITECTURE.door.clearHeight,
} as const

/** 建筑空间、实体门户与主要室内区域共享的稳定语义图。 */
export const COTTAGE_ARCHITECTURE_SPACE_GRAPH = [
  {
    id: 'space.garden-court',
    kind: 'exterior',
    connectsTo: ['zone.cottage-porch'],
  },
  {
    id: 'zone.cottage-porch',
    kind: 'transition',
    connectsTo: ['space.garden-court', 'portal.cottage-door'],
  },
  {
    id: 'portal.cottage-door',
    kind: 'portal',
    state: 'dynamic',
    connectsTo: ['zone.cottage-porch', 'zone.cottage-threshold'],
  },
  {
    id: 'zone.cottage-threshold',
    kind: 'transition',
    connectsTo: ['portal.cottage-door', 'space.cottage-living'],
  },
  {
    id: 'space.cottage-living',
    kind: 'interior',
    connectsTo: [
      'zone.cottage-threshold',
      'zone.cottage-hearth',
      'zone.cottage-memory-wall',
      'zone.cottage-sleeping-nook',
    ],
  },
  {
    id: 'zone.cottage-hearth',
    kind: 'interior-zone',
    connectsTo: ['space.cottage-living'],
  },
  {
    id: 'zone.cottage-memory-wall',
    kind: 'interior-zone',
    connectsTo: ['space.cottage-living'],
  },
  {
    id: 'zone.cottage-sleeping-nook',
    kind: 'interior-zone',
    connectsTo: ['space.cottage-living'],
  },
] as const

export const COTTAGE_ARCHITECTURE_MEASUREMENTS = {
  interiorWidth:
    envelope.width - envelope.wallThickness * 2,
  interiorDepth:
    envelope.depth - envelope.wallThickness * 2,
  interiorArea:
    (envelope.width - envelope.wallThickness * 2) *
    (envelope.depth - envelope.wallThickness * 2),
  porchFrontZ:
    envelope.centerZ + envelope.depth / 2 + porch.depth,
  stepFrontZ:
    envelope.centerZ +
    envelope.depth / 2 +
    porch.depth +
    porch.stepDepth * porch.stepCount,
  rearMaintenanceDepth:
    envelope.centerZ - envelope.depth / 2 - -19,
} as const
