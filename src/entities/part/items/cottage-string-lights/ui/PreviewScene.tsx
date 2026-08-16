import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageStringLights } from './CottageStringLights'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group position={[0, 0.18, 0]} rotation={[0.04, -0.12, 0]} scale={1.25}>
      <CottageStringLights
        parameters={parameters}
        quality={quality}
      />
    </group>
  )
}
