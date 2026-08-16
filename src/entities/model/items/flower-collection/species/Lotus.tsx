import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Lotus(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="lotus" />
}
