import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Dandelion(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="dandelion" />
}
