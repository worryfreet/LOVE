import type { ComponentType } from 'react'
import type { PartParameterValues } from './partTypes'

export interface PartSceneProps {
  parameters: PartParameterValues
  quality: 'desktop' | 'mobile'
}

export type PartSceneComponent = ComponentType<PartSceneProps>

export interface PartSceneModule {
  default: PartSceneComponent
}
