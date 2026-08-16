import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageWoodChair } from './CottageWoodChair'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group position={[0, -1.15, 0]} rotation={[0, -0.45, 0]} scale={2.15}>
      <CottageWoodChair parameters={parameters} quality={quality} />
    </group>
  )
}
