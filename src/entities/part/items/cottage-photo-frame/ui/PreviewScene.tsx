import type { PartSceneProps } from '../../../model/runtimeTypes'
import { CottagePhotoFrame } from './CottagePhotoFrame'

export function PreviewScene({ parameters, quality }: PartSceneProps) {
  const mount = parameters.mount === 'table' ? 'table' : 'wall'
  const rawHeight = Number(parameters.height)
  const height = Number.isFinite(rawHeight) ? rawHeight / 1000 : 0.4

  return (
    <group
      position={[0, mount === 'table' ? -height / 2 : 0, 0]}
      rotation={[0.03, -0.32, 0]}
      scale={2.25}
    >
      <CottagePhotoFrame
        parameters={parameters}
        quality={quality}
      />
    </group>
  )
}
