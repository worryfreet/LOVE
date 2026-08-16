import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottageCandle } from './CottageCandle'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  return (
    <group position={[0, -1.15, 0]} rotation={[0, -0.34, 0]} scale={6.5}>
      <CottageCandle parameters={parameters} quality={quality} />
    </group>
  )
}
