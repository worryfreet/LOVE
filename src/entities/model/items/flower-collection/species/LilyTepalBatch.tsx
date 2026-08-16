import { StudioPetalBatch } from '../core/StudioPetalBatch'
import type {
  StudioFlowerPetalPlacement,
  StudioPetalShape,
} from '../core/studioFlower'
import type {
  StudioFlowerPalette,
  StudioPetalPattern,
} from '../core/StudioPetalMaterial'

export type LilyTepalWhorl = 'outer' | 'inner'

export interface LilyTepalLayoutOptions {
  whorl: LilyTepalWhorl
  rootRadius: number
  depth: number
  baseTilt: number
  openTilt: number
  jitter: number
}

const WHORL_ANGLES: Readonly<Record<LilyTepalWhorl, readonly number[]>> = {
  outer: [90, 210, 330],
  inner: [30, 150, 270],
}

/** 百合专属 `3+3` 两轮布局；六片根部共享窄花喉，不再形成分离深度层。 */
export function createLilyTepalPlacements({
  whorl,
  rootRadius,
  depth,
  baseTilt,
  openTilt,
  jitter,
}: LilyTepalLayoutOptions): StudioFlowerPetalPlacement[] {
  return WHORL_ANGLES[whorl].map((angleDegrees, index) => {
    const angle = angleDegrees * Math.PI / 180
    const seedIndex = whorl === 'outer' ? index : index + 3
    const signedJitter = Math.sin((seedIndex + 1) * 17.3) * jitter
    return {
      progress: whorl === 'outer' ? 0.72 + index * 0.1 : 0.22 + index * 0.1,
      seed: ((seedIndex * 0.618) % 1) * 20,
      tilt: (openTilt + signedJitter * 0.25) * Math.PI / 180,
      position: [
        Math.sin(angle) * rootRadius,
        Math.cos(angle) * rootRadius,
        depth + signedJitter * 0.012,
      ],
      rotation: [
        (baseTilt + signedJitter) * Math.PI / 180,
        signedJitter * 0.08,
        -angle,
      ],
      scale: 1 + Math.cos((seedIndex + 1) * 2.1) * jitter * 0.004,
    }
  })
}

export function LilyTepalBatch({
  whorl,
  shape,
  placements,
  palette,
  pattern,
  bloomMax,
  transition,
}: {
  whorl: LilyTepalWhorl
  shape: StudioPetalShape
  placements: readonly StudioFlowerPetalPlacement[]
  palette: StudioFlowerPalette
  pattern: StudioPetalPattern
  bloomMax: number
  transition: number
}) {
  return (
    <StudioPetalBatch
      name={`flower.lily.tepals.${whorl}.studio`}
      placements={placements}
      shape={shape}
      palette={palette}
      pattern={pattern}
      bloomMax={bloomMax}
      transition={transition}
      windAmplitude={0.055}
      windSpeed={1.35}
      windHeading={24}
      rotationOrder="ZXY"
    />
  )
}
