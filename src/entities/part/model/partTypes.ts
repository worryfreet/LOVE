export type PartSource =
  | {
      type: 'designed'
    }
  | {
      type: 'model'
      modelId: string
      modelName: string
      componentId: string
    }

export type PartKind = 'basic' | 'compound'

interface PartParameterBase {
  id: string
  label: string
  description: string
  group: string
}

export interface NumberPartParameter extends PartParameterBase {
  type: 'number'
  default: number
  unit?: string
  min: number
  max: number
  step: number
}

export interface EnumPartParameterOption {
  value: string
  label: string
}

export interface EnumPartParameter extends PartParameterBase {
  type: 'enum'
  default: string
  options: readonly EnumPartParameterOption[]
}

export interface ColorPartParameter extends PartParameterBase {
  type: 'color'
  default: string
}

export interface BooleanPartParameter extends PartParameterBase {
  type: 'boolean'
  default: boolean
}

export interface TextPartParameter extends PartParameterBase {
  type: 'text'
  default: string
  multiline?: boolean
  maxLength: number
}

export type PartParameterSchema =
  | NumberPartParameter
  | EnumPartParameter
  | ColorPartParameter
  | BooleanPartParameter
  | TextPartParameter

export type PartParameterValue = number | string | boolean

export type PartParameterValues = Record<string, PartParameterValue>

export interface PartCatalogEntry {
  id: string
  index: string
  name: string
  englishName: string
  description: string
  category: string
  source: PartSource
  kind: PartKind
  tags: readonly string[]
  accent: string
  stage: string
  parameters: readonly PartParameterSchema[]
}
