import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageEnvelope } from './CottageEnvelope'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group
      position={[0, -0.86, 0.12]}
      rotation={[-0.18, -0.42, 0]}
      scale={6.4}
    >
      <CottageEnvelope parameters={parameters} quality={quality} />
    </group>
  )
}
