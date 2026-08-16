import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageSingleBed } from './CottageSingleBed'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group rotation={[0.03, -0.5, 0]} position={[0, -0.54, 0]}>
      <CottageSingleBed parameters={parameters} quality={quality} />
    </group>
  )
}

