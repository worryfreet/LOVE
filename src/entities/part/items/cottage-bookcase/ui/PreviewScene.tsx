import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageBookcase } from './CottageBookcase'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group rotation={[0.02, -0.5, 0]} position={[0, -0.92, 0]}>
      <CottageBookcase parameters={parameters} quality={quality} />
    </group>
  )
}
