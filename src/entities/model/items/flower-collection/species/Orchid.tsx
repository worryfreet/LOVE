import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Orchid(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="orchid" />
}
