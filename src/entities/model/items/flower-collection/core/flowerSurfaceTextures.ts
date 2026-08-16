import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
} from 'three'
import type { Texture } from 'three'
import type {
  EditableFlowerSpeciesId,
  RibbonTextureSet,
} from './types'

function textureUrls(species: EditableFlowerSpeciesId) {
  const urls: Record<EditableFlowerSpeciesId, readonly string[]> = {
    sunflower: [
      new URL('../assets/sunflower/sunflower-petal-color.png', import.meta.url).href,
      new URL('../assets/sunflower/sunflower-petal-normal.png', import.meta.url).href,
      new URL('../assets/sunflower/sunflower-petal-roughness.png', import.meta.url).href,
      new URL('../assets/sunflower/sunflower-leaf-color.png', import.meta.url).href,
      new URL('../assets/sunflower/sunflower-leaf-normal.png', import.meta.url).href,
      new URL('../assets/sunflower/sunflower-leaf-roughness.png', import.meta.url).href,
    ],
    rose: [
      new URL('../assets/rose/rose-petal-color.png', import.meta.url).href,
      new URL('../assets/rose/rose-petal-normal.png', import.meta.url).href,
      new URL('../assets/rose/rose-petal-roughness.png', import.meta.url).href,
      new URL('../assets/rose/rose-leaf-color.png', import.meta.url).href,
      new URL('../assets/rose/rose-leaf-normal.png', import.meta.url).href,
      new URL('../assets/rose/rose-leaf-roughness.png', import.meta.url).href,
    ],
    'classic-rose': [
      new URL('../assets/classic-rose/classic-rose-petal-color.png', import.meta.url).href,
      new URL('../assets/classic-rose/classic-rose-petal-normal.png', import.meta.url).href,
      new URL('../assets/classic-rose/classic-rose-petal-roughness.png', import.meta.url).href,
      new URL('../assets/classic-rose/classic-rose-leaf-color.png', import.meta.url).href,
      new URL('../assets/classic-rose/classic-rose-leaf-normal.png', import.meta.url).href,
      new URL('../assets/classic-rose/classic-rose-leaf-roughness.png', import.meta.url).href,
    ],
    lily: [
      new URL('../assets/lily/lily-petal-color.png', import.meta.url).href,
      new URL('../assets/lily/lily-petal-normal.png', import.meta.url).href,
      new URL('../assets/lily/lily-petal-roughness.png', import.meta.url).href,
      new URL('../assets/lily/lily-leaf-color.png', import.meta.url).href,
      new URL('../assets/lily/lily-leaf-normal.png', import.meta.url).href,
      new URL('../assets/lily/lily-leaf-roughness.png', import.meta.url).href,
    ],
    orchid: [
      new URL('../assets/orchid/orchid-petal-color.png', import.meta.url).href,
      new URL('../assets/orchid/orchid-petal-normal.png', import.meta.url).href,
      new URL('../assets/orchid/orchid-petal-roughness.png', import.meta.url).href,
      new URL('../assets/orchid/orchid-leaf-color.png', import.meta.url).href,
      new URL('../assets/orchid/orchid-leaf-normal.png', import.meta.url).href,
      new URL('../assets/orchid/orchid-leaf-roughness.png', import.meta.url).href,
    ],
    lotus: [
      new URL('../assets/lotus/lotus-petal-color.png', import.meta.url).href,
      new URL('../assets/lotus/lotus-petal-normal.png', import.meta.url).href,
      new URL('../assets/lotus/lotus-petal-roughness.png', import.meta.url).href,
      new URL('../assets/lotus/lotus-leaf-color.png', import.meta.url).href,
      new URL('../assets/lotus/lotus-leaf-normal.png', import.meta.url).href,
      new URL('../assets/lotus/lotus-leaf-roughness.png', import.meta.url).href,
    ],
    dandelion: [
      new URL('../assets/dandelion/dandelion-petal-color.png', import.meta.url).href,
      new URL('../assets/dandelion/dandelion-petal-normal.png', import.meta.url).href,
      new URL('../assets/dandelion/dandelion-petal-roughness.png', import.meta.url).href,
      new URL('../assets/dandelion/dandelion-leaf-color.png', import.meta.url).href,
      new URL('../assets/dandelion/dandelion-leaf-normal.png', import.meta.url).href,
      new URL('../assets/dandelion/dandelion-leaf-roughness.png', import.meta.url).href,
    ],
    'morning-glory': [
      new URL('../assets/morning-glory/morning-glory-petal-color.png', import.meta.url).href,
      new URL('../assets/morning-glory/morning-glory-petal-normal.png', import.meta.url).href,
      new URL('../assets/morning-glory/morning-glory-petal-roughness.png', import.meta.url).href,
      new URL('../assets/morning-glory/morning-glory-leaf-color.png', import.meta.url).href,
      new URL('../assets/morning-glory/morning-glory-leaf-normal.png', import.meta.url).href,
      new URL('../assets/morning-glory/morning-glory-leaf-roughness.png', import.meta.url).href,
    ],
  }
  return urls[species]
}

const configuredTextures = new WeakSet<Texture>()

export interface FlowerSurfaceTextures {
  petal: RibbonTextureSet
  leaf: RibbonTextureSet
}

/** 同一物种的整株、器官预览和全部实例共用六张贴图。 */
export function useFlowerSurfaceTextures(
  species: EditableFlowerSpeciesId,
): FlowerSurfaceTextures {
  const urls = useMemo(() => [...textureUrls(species)], [species])
  const textures = useTexture(urls)

  return useMemo(() => {
    const [
      petalColor,
      petalNormal,
      petalRoughness,
      leafColor,
      leafNormal,
      leafRoughness,
    ] = textures
    for (const [index, texture] of textures.entries()) {
      if (configuredTextures.has(texture)) continue
      texture.colorSpace = index === 0 || index === 3
        ? SRGBColorSpace
        : NoColorSpace
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = ClampToEdgeWrapping
      texture.magFilter = LinearFilter
      texture.minFilter = LinearMipmapLinearFilter
      texture.anisotropy = 4
      texture.needsUpdate = true
      configuredTextures.add(texture)
    }
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
  }, [textures])
}
