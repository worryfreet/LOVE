import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function Hydrangea(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="hydrangea" />
}
