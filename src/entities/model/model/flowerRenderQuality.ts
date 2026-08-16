import type { ModelParameterValues } from './modelParameterTypes'

export const FLOWER_RENDER_QUALITIES = [
  'ultra',
  'high',
  'medium',
  'low',
] as const

export type FlowerRenderQuality = typeof FLOWER_RENDER_QUALITIES[number]

export interface FlowerRenderQualityProfile {
  quality: FlowerRenderQuality
  petalLengthSegments: number
  petalWidthSegments: number
  leafLengthSegments: number
  leafWidthSegments: number
  stemRadialSegments: number
  trumpetRadialSegments: number
  trumpetDepthSegments: number
  material: 'physical' | 'standard'
  colorMap: boolean
  normalMap: boolean
  roughnessMap: boolean
  petalShadows: boolean
  detailShadows: boolean
  maxDpr: number
}

export const FLOWER_RENDER_QUALITY_PROFILES: Readonly<
  Record<FlowerRenderQuality, FlowerRenderQualityProfile>
> = {
  ultra: {
    quality: 'ultra',
    petalLengthSegments: 40,
    petalWidthSegments: 18,
    leafLengthSegments: 48,
    leafWidthSegments: 18,
    stemRadialSegments: 14,
    trumpetRadialSegments: 80,
    trumpetDepthSegments: 28,
    material: 'physical',
    colorMap: true,
    normalMap: true,
    roughnessMap: true,
    petalShadows: true,
    detailShadows: true,
    maxDpr: 1.5,
  },
  high: {
    quality: 'high',
    petalLengthSegments: 16,
    petalWidthSegments: 10,
    leafLengthSegments: 22,
    leafWidthSegments: 10,
    stemRadialSegments: 10,
    trumpetRadialSegments: 56,
    trumpetDepthSegments: 18,
    material: 'standard',
    colorMap: true,
    normalMap: true,
    roughnessMap: true,
    petalShadows: true,
    detailShadows: false,
    maxDpr: 1.25,
  },
  medium: {
    quality: 'medium',
    petalLengthSegments: 10,
    petalWidthSegments: 6,
    leafLengthSegments: 14,
    leafWidthSegments: 7,
    stemRadialSegments: 8,
    trumpetRadialSegments: 40,
    trumpetDepthSegments: 12,
    material: 'standard',
    colorMap: true,
    normalMap: true,
    roughnessMap: false,
    petalShadows: false,
    detailShadows: false,
    maxDpr: 1,
  },
  low: {
    quality: 'low',
    petalLengthSegments: 5,
    petalWidthSegments: 2,
    leafLengthSegments: 6,
    leafWidthSegments: 4,
    stemRadialSegments: 4,
    trumpetRadialSegments: 28,
    trumpetDepthSegments: 8,
    material: 'standard',
    colorMap: true,
    normalMap: false,
    roughnessMap: false,
    petalShadows: false,
    detailShadows: false,
    maxDpr: 0.8,
  },
}

export const FLOWER_RENDER_QUALITY_DPR = Object.fromEntries(
  FLOWER_RENDER_QUALITIES.map((quality) => [
    quality,
    FLOWER_RENDER_QUALITY_PROFILES[quality].maxDpr,
  ]),
) as Readonly<Record<FlowerRenderQuality, number>>

export function resolveFlowerRenderQuality(
  values?: ModelParameterValues,
): FlowerRenderQuality {
  const candidate = values?.renderQuality
  return typeof candidate === 'string' &&
    FLOWER_RENDER_QUALITIES.includes(candidate as FlowerRenderQuality)
    ? candidate as FlowerRenderQuality
    : 'ultra'
}

export function resolveFlowerRenderQualityProfile(
  values?: ModelParameterValues,
) {
  return FLOWER_RENDER_QUALITY_PROFILES[resolveFlowerRenderQuality(values)]
}
