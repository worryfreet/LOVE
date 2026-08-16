import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageLoveseatSofa } from './CottageLoveseatSofa'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group rotation={[0.02, -0.46, 0]} position={[0, -0.45, 0]}>
      <CottageLoveseatSofa parameters={parameters} quality={quality} />
    </group>
  )
}

