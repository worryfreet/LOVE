import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageRoundTable } from './CottageRoundTable'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group position={[0, -1.15, 0]} rotation={[0, -0.34, 0]} scale={2.05}>
      <CottageRoundTable parameters={parameters} quality={quality} />
    </group>
  )
}
