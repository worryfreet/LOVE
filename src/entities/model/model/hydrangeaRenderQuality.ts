import type { ModelParameterValues } from './modelParameterTypes'

export const HYDRANGEA_RENDER_QUALITIES = [
  'ultra',
  'high',
  'medium',
  'low',
] as const

export type HydrangeaRenderQuality =
  typeof HYDRANGEA_RENDER_QUALITIES[number]

export interface HydrangeaRenderQualityProfile {
  lengthSegments: number
  widthSegments: number
  branchRadialSegments: number
  material: 'physical' | 'standard'
  useNormalMap: boolean
  useRoughnessMap: boolean
  petalShadows: boolean
  shadowProxyDetail: number | null
  maxDpr: number
}

export const HYDRANGEA_RENDER_QUALITY_PROFILES:
Readonly<Record<HydrangeaRenderQuality, HydrangeaRenderQualityProfile>> = {
  ultra: {
    lengthSegments: 16,
    widthSegments: 10,
    branchRadialSegments: 10,
    material: 'physical',
    useNormalMap: true,
    useRoughnessMap: true,
    petalShadows: true,
    shadowProxyDetail: null,
    maxDpr: 1.5,
  },
  high: {
    lengthSegments: 7,
    widthSegments: 6,
    branchRadialSegments: 8,
    material: 'standard',
    useNormalMap: true,
    useRoughnessMap: true,
    petalShadows: false,
    shadowProxyDetail: 2,
    maxDpr: 1.25,
  },
  medium: {
    lengthSegments: 5,
    widthSegments: 4,
    branchRadialSegments: 6,
    material: 'standard',
    useNormalMap: true,
    useRoughnessMap: false,
    petalShadows: false,
    shadowProxyDetail: 1,
    maxDpr: 1,
  },
  low: {
    lengthSegments: 4,
    widthSegments: 2,
    branchRadialSegments: 5,
    material: 'standard',
    useNormalMap: false,
    useRoughnessMap: false,
    petalShadows: false,
    shadowProxyDetail: 0,
    maxDpr: 0.8,
  },
}

export const HYDRANGEA_RENDER_QUALITY_DPR = Object.fromEntries(
  HYDRANGEA_RENDER_QUALITIES.map((quality) => [
    quality,
    HYDRANGEA_RENDER_QUALITY_PROFILES[quality].maxDpr,
  ]),
)

export function resolveHydrangeaRenderQuality(
  values?: ModelParameterValues,
): HydrangeaRenderQuality {
  const candidate = values?.renderQuality
  return typeof candidate === 'string' &&
    HYDRANGEA_RENDER_QUALITIES.includes(candidate as HydrangeaRenderQuality)
    ? candidate as HydrangeaRenderQuality
    : 'high'
}

export function resolveHydrangeaRenderQualityProfile(
  values?: ModelParameterValues,
) {
  return HYDRANGEA_RENDER_QUALITY_PROFILES[
    resolveHydrangeaRenderQuality(values)
  ]
}
