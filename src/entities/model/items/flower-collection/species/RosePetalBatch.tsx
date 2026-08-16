import { StudioPetalBatch } from '../core/StudioPetalBatch'
import type {
  StudioFlowerPalette,
  StudioPetalPattern,
} from '../core/StudioPetalMaterial'
import {
  createStudioFlowerLayout,
} from '../core/studioFlower'
import type {
  StudioFlowerLayoutOptions,
  StudioFlowerPetalPlacement,
  StudioPetalShape,
} from '../core/studioFlower'
import type { RibbonTextureSet } from '../core/types'

export type RoseCrownLayoutOptions = StudioFlowerLayoutOptions
export type RosePetalPlacement = StudioFlowerPetalPlacement

/** 月季首先原样采用 Flower Studio 的黄金角连续花冠，不再拆成三组水平轮层。 */
export function createRoseCrownLayout(options: RoseCrownLayoutOptions) {
  return createStudioFlowerLayout(options)
}

export function RosePetalBatch({
  name,
  placements,
  shape,
  palette,
  bloomMax = 0.78,
  transition = 0.35,
  windAmplitude = 0.06,
  windSpeed = 1.5,
  windHeading = 35,
  flat = false,
  pattern,
  lengthSegments,
  widthSegments,
  surfaceTextures,
  roughness,
  sheen,
  transmission,
  textureNormalStrength,
}: {
  name: string
  placements: readonly RosePetalPlacement[]
  shape: StudioPetalShape
  palette: StudioFlowerPalette
  bloomMax?: number
  transition?: number
  windAmplitude?: number
  windSpeed?: number
  windHeading?: number
  flat?: boolean
  pattern?: StudioPetalPattern
  lengthSegments?: number
  widthSegments?: number
  surfaceTextures?: RibbonTextureSet
  roughness?: number
  sheen?: number
  transmission?: number
  textureNormalStrength?: number
}) {
  return (
    <StudioPetalBatch
      name={name}
      placements={placements}
      shape={shape}
      palette={palette}
      bloomMax={bloomMax}
      transition={transition}
      windAmplitude={windAmplitude}
      windSpeed={windSpeed}
      windHeading={windHeading}
      flat={flat}
      pattern={pattern}
      lengthSegments={lengthSegments}
      widthSegments={widthSegments}
      surfaceTextures={surfaceTextures}
      roughness={roughness}
      sheen={sheen}
      transmission={transmission}
      textureNormalStrength={textureNormalStrength}
    />
  )
}
