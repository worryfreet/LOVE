import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Sunflower(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="sunflower" />
}
