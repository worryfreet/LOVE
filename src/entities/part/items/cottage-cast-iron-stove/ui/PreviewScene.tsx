import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageCastIronStove } from './CottageCastIronStove'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group position={[0, -1.15, 0]} rotation={[0, -0.38, 0]} scale={2.35}>
      <CottageCastIronStove parameters={parameters} quality={quality} />
    </group>
  )
}
