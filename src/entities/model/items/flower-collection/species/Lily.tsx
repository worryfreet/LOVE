import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Lily(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="lily" />
}
