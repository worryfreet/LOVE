interface ModelParameterBase {
  id: string
  label: string
  description: string
  group: string
}

export interface NumberModelParameter extends ModelParameterBase {
  type: 'number'
  default: number
  min: number
  max: number
  step: number
  unit?: string
}

export interface ColorModelParameter extends ModelParameterBase {
  type: 'color'
  default: string
}

export interface BooleanModelParameter extends ModelParameterBase {
  type: 'boolean'
  default: boolean
}

export interface SelectModelParameter extends ModelParameterBase {
  type: 'select'
  default: string
  options: readonly {
    value: string
    label: string
  }[]
}

export type ModelParameterSchema =
  | NumberModelParameter
  | ColorModelParameter
  | BooleanModelParameter
  | SelectModelParameter

export type ModelParameterValue = number | string | boolean
export type ModelParameterValues = Readonly<
  Record<string, ModelParameterValue>
>

export interface ModelParameterConfiguration {
  version: 1
  modelId: string
  updatedAt: string | null
  values: Readonly<Record<string, unknown>>
}
