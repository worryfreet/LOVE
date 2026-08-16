import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Rose(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="rose" />
}
