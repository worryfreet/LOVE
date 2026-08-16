import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function MorningGlory(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="morning-glory" />
}
