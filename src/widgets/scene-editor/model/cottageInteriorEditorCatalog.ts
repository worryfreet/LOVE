import {
  partCatalogRegistry,
  type PartParameterSchema,
} from '@/entities/part'
import {
  COTTAGE_INTERIOR_DEFAULT_DOCUMENT,
  COTTAGE_INTERIOR_NAVIGATION,
  COTTAGE_INTERIOR_PART_IDS,
  type CottageInteriorParameters,
  type CottageInteriorPartId,
  type CottageInteriorPoint,
} from '@/entities/scene'

export type CottageInteriorTransformMode = 'translate' | 'rotate' | 'scale'

interface CottageInteriorEditorAssetFallback {
  id: CottageInteriorPartId
  name: string
  category: string
  accent: string
  bounds: readonly [number, number, number]
}

const FALLBACKS: readonly CottageInteriorEditorAssetFallback[] = [
  { id: 'cottage-single-bed', name: '温馨单人床', category: '室内家具', accent: '#dba59a', bounds: [0.9, 0.72, 1.9] },
  { id: 'cottage-loveseat-sofa', name: '双人沙发', category: '室内家具', accent: '#d8887e', bounds: [1.72, 0.84, 0.78] },
  { id: 'cottage-photo-frame', name: '纪念相框', category: '纪念展示', accent: '#e1b875', bounds: [0.62, 0.56, 0.08] },
  { id: 'cottage-cast-iron-stove', name: '铸铁火炉', category: '生活设施', accent: '#c46b4f', bounds: [0.58, 1.6, 0.48] },
  { id: 'cottage-round-table', name: '圆形木桌', category: '室内家具', accent: '#b97845', bounds: [1.14, 0.74, 1.14] },
  { id: 'cottage-wood-chair', name: '木椅', category: '室内家具', accent: '#ca9b63', bounds: [0.44, 0.86, 0.5] },
  { id: 'cottage-low-cabinet', name: '低柜与长椅', category: '室内家具', accent: '#a76d42', bounds: [2.15, 0.78, 0.46] },
  { id: 'cottage-candle', name: '暖光蜡烛', category: '桌面摆件', accent: '#ffd38d', bounds: [0.08, 0.2, 0.08] },
  { id: 'cottage-envelope', name: '可拆情书', category: '桌面摆件', accent: '#efd3a5', bounds: [0.22, 0.12, 0.35] },
  { id: 'cottage-string-lights', name: '柔性长线彩灯', category: '室内照明', accent: '#ffbd66', bounds: [5.1, 0.3, 4.4] },
] as const

const FALLBACK_BY_ID = new Map(FALLBACKS.map((item) => [item.id, item]))

export interface CottageInteriorEditorAsset
  extends CottageInteriorEditorAssetFallback {
  description: string
  parameters: readonly PartParameterSchema[]
}

export const COTTAGE_INTERIOR_EDITOR_ASSETS: readonly CottageInteriorEditorAsset[] =
  COTTAGE_INTERIOR_PART_IDS.map((id) => {
    const fallback = FALLBACK_BY_ID.get(id)
    if (!fallback) throw new Error(`室内编辑器缺少 ${id} 的回退定义`)
    const catalog = partCatalogRegistry.find((part) => part.id === id)
    return {
      ...fallback,
      name: catalog?.name ?? fallback.name,
      category: catalog?.category ?? fallback.category,
      accent: catalog?.accent ?? fallback.accent,
      description: catalog?.description ?? '可在花海小院室内自由摆放和缩放。',
      parameters: catalog?.parameters ?? [],
    }
  })

export function getCottageInteriorEditorAsset(partId: CottageInteriorPartId) {
  return COTTAGE_INTERIOR_EDITOR_ASSETS.find((asset) => asset.id === partId)
}

export function getDefaultCottageInteriorParameters(
  partId: CottageInteriorPartId,
): CottageInteriorParameters {
  const catalog = partCatalogRegistry.find((part) => part.id === partId)
  if (catalog) {
    return {
      ...Object.fromEntries(
        catalog.parameters.map((parameter) => [
          parameter.id,
          parameter.default,
        ]),
      ),
      ...(partId === 'cottage-photo-frame' ? { imageUrl: '' } : {}),
    }
  }
  const source = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.find(
    (instance) => instance.partId === partId,
  )
  return source ? { ...source.parameters } : {}
}

export function getNewCottageInteriorPosition(
  partId: CottageInteriorPartId,
): CottageInteriorPoint {
  if (partId === 'cottage-photo-frame') {
    return { x: 0, y: 1.35, z: -2.24 }
  }
  if (partId === 'cottage-string-lights') {
    return { x: 0, y: 0, z: 0 }
  }
  if (partId === 'cottage-candle' || partId === 'cottage-envelope') {
    return {
      x: 0.18,
      y: COTTAGE_INTERIOR_NAVIGATION.floorTop,
      z: 0.12,
    }
  }
  return {
    x: 0,
    y: COTTAGE_INTERIOR_NAVIGATION.floorTop,
    z: 0.92,
  }
}
