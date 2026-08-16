import type { ModelSceneProps } from '@/entities/model'
import { FlowerSpeciesScene } from './FlowerSpecies'

export function ClassicRose(props: ModelSceneProps) {
  return <FlowerSpeciesScene {...props} species="classic-rose" />
}
