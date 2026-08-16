import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageLowCabinet } from './CottageLowCabinet'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group rotation={[0.02, -0.42, 0]} position={[0, -0.42, 0]}>
      <CottageLowCabinet parameters={parameters} quality={quality} />
    </group>
  )
}

