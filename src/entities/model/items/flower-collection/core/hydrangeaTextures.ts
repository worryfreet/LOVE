import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
} from 'three'
import type { RibbonTextureSet } from './types'

const petalColorUrl = new URL(
  '../assets/hydrangea/hydrangea-petal-color.png',
  import.meta.url,
).href
const petalNormalUrl = new URL(
  '../assets/hydrangea/hydrangea-petal-normal.png',
  import.meta.url,
).href
const petalRoughnessUrl = new URL(
  '../assets/hydrangea/hydrangea-petal-roughness.png',
  import.meta.url,
).href
const leafColorUrl = new URL(
  '../assets/hydrangea/hydrangea-leaf-color.png',
  import.meta.url,
).href
const leafNormalUrl = new URL(
  '../assets/hydrangea/hydrangea-leaf-normal.png',
  import.meta.url,
).href
const leafRoughnessUrl = new URL(
  '../assets/hydrangea/hydrangea-leaf-roughness.png',
  import.meta.url,
).href

export interface HydrangeaSurfaceTextures {
  petal: RibbonTextureSet
  leaf: RibbonTextureSet
}

/**
 * 同一株绣球的全部实例共享六张 Texture；颜色图使用 sRGB，数据图保持线性。
 */
export function useHydrangeaSurfaceTextures(): HydrangeaSurfaceTextures {
  const [
    petalColor,
    petalNormal,
    petalRoughness,
    leafColor,
    leafNormal,
    leafRoughness,
  ] = useTexture([
    petalColorUrl,
    petalNormalUrl,
    petalRoughnessUrl,
    leafColorUrl,
    leafNormalUrl,
    leafRoughnessUrl,
  ])

  return useMemo(() => {
    const colorMaps = [petalColor, leafColor]
    const dataMaps = [
      petalNormal,
      petalRoughness,
      leafNormal,
      leafRoughness,
    ]
    colorMaps.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace
    })
    dataMaps.forEach((texture) => {
      texture.colorSpace = NoColorSpace
    })
    const allMaps = [...colorMaps, ...dataMaps]
    allMaps.forEach((texture) => {
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = ClampToEdgeWrapping
      texture.magFilter = LinearFilter
      texture.minFilter = LinearMipmapLinearFilter
      texture.anisotropy = 4
      texture.needsUpdate = true
    })
    return {
      petal: {
        colorMap: petalColor,
        normalMap: petalNormal,
        roughnessMap: petalRoughness,
      },
      leaf: {
        colorMap: leafColor,
        normalMap: leafNormal,
        roughnessMap: leafRoughness,
      },
    }
  }, [
    leafColor,
    leafNormal,
    leafRoughness,
    petalColor,
    petalNormal,
    petalRoughness,
  ])
}
