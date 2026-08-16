import type { Texture } from 'three'

export type FlowerSpeciesId =
  | 'sunflower'
  | 'rose'
  | 'classic-rose'
  | 'lily'
  | 'orchid'
  | 'lotus'
  | 'dandelion'
  | 'morning-glory'
  | 'hydrangea'

export type EditableFlowerSpeciesId = Exclude<FlowerSpeciesId, 'hydrangea'>

export type RibbonTipStyle = 'pointed' | 'rounded' | 'toothed'

export interface RibbonMorphologyOptions {
  widthProfile?: readonly [number, number, number, number, number, number]
  tipStyle?: RibbonTipStyle
  tipRoundness?: number
  tipNotch?: number
  tipTeeth?: number
  cupCenter?: number
  curlBias?: number
  tipCurl?: number
  tipCurlStart?: number
  twist?: number
  twistBias?: number
  edgeFlare?: number
  keel?: number
  /** 宏观侧脉对叶肉的几何牵引高度，贴图只补更细的网状脉。 */
  veinRelief?: number
  veinColor?: string
  veinStrength?: number
  veinCount?: number
}

export interface RibbonGeometryOptions extends RibbonMorphologyOptions {
  length: number
  width: number
  baseWidth?: number
  tipWidth?: number
  cup?: number
  curl?: number
  sideCurl?: number
  wave?: number
  waveCount?: number
  asymmetry?: number
  serration?: number
  serrationCount?: number
  thickness?: number
  lengthSegments?: number
  widthSegments?: number
  baseColor: string
  tipColor: string
  centerColor?: string
}

export interface RibbonTextureSet {
  colorMap: Texture
  normalMap: Texture
  roughnessMap: Texture
}

export interface FlowerSurfaceQuality {
  material: 'physical' | 'standard'
  colorMap: boolean
  normalMap: boolean
  roughnessMap: boolean
  petalShadows: boolean
  detailShadows: boolean
}

export interface LotusPetalPlacement {
  position: readonly [number, number, number]
  angle: number
  tilt: number
  scale: number
  roll: number
  band: 'outer' | 'middle' | 'inner'
  tint: string
}

export interface TrumpetGeometryOptions {
  depth: number
  throatRadius: number
  midRadius?: number
  rimRadius: number
  thickness: number
  rimWave: number
  seamDepth?: number
  seamWidth?: number
  radialUndulation?: number
  radialUndulationCount?: number
  asymmetry?: number
  flarePower?: number
  rimCurl?: number
  radialSegments?: number
  depthSegments?: number
  throatColor: string
  middleColor?: string
  rimColor: string
  veinColor: string
}

export interface FlowerSpeciesRuntimeSpec {
  id: FlowerSpeciesId
  displayName: string
  seed: number
  bloomDuration: number
  windAmplitude: number
  identityFeatures: readonly string[]
  organCounts: Readonly<Record<string, number>>
}
