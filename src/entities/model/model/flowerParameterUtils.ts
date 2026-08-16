import type {
  ModelParameterSchema,
  ModelParameterValues,
} from './modelParameterTypes'
import {
  resolveFlowerRenderQualityProfile,
  type FlowerRenderQualityProfile,
} from './flowerRenderQuality'
import type { RibbonGeometryOptions } from '../items/flower-collection/core/types'

function schemaDefault(
  schema: readonly ModelParameterSchema[],
  id: string,
) {
  return schema.find((parameter) => parameter.id === id)?.default
}

export function readFlowerNumber(
  schema: readonly ModelParameterSchema[],
  values: ModelParameterValues | undefined,
  id: string,
) {
  const value = Number(values?.[id] ?? schemaDefault(schema, id))
  if (!Number.isFinite(value)) {
    throw new Error(`花朵数值参数 ${id} 缺少有效默认值`)
  }
  return value
}

export function readFlowerBoolean(
  schema: readonly ModelParameterSchema[],
  values: ModelParameterValues | undefined,
  id: string,
) {
  const value = values?.[id] ?? schemaDefault(schema, id)
  if (typeof value !== 'boolean') {
    throw new Error(`花朵布尔参数 ${id} 缺少有效默认值`)
  }
  return value
}

export function readFlowerColor(
  schema: readonly ModelParameterSchema[],
  values: ModelParameterValues | undefined,
  id: string,
) {
  return readFlowerString(schema, values, id)
}

export function readFlowerString(
  schema: readonly ModelParameterSchema[],
  values: ModelParameterValues | undefined,
  id: string,
) {
  const value = values?.[id] ?? schemaDefault(schema, id)
  if (typeof value !== 'string') {
    throw new Error(`花朵文本参数 ${id} 缺少有效默认值`)
  }
  return value
}

export interface EditableFlowerPetalSettings extends RibbonGeometryOptions {
  visible: boolean
  flatShading: boolean
  roughness: number
  sheen: number
  transmission: number
  textureNormalStrength: number
  mainColor: string
  veinColor: string
}

export interface EditableFlowerLeafSettings {
  visible: boolean
  length: number
  width: number
  height: number
  spread: number
  cup: number
  curl: number
  wave: number
  serration: number
  baseColor: string
  tipColor: string
  veinColor: string
}

export interface EditableFlowerStemSettings {
  visible: boolean
  length: number
  radius: number
  curve: number
  color: string
}

export interface EditableFlowerSettings {
  quality: FlowerRenderQualityProfile
  petal: EditableFlowerPetalSettings
  leaf: EditableFlowerLeafSettings
  stem: EditableFlowerStemSettings
}

export function resolveEditableFlowerSettings(
  schema: readonly ModelParameterSchema[],
  values?: ModelParameterValues,
): EditableFlowerSettings {
  const quality = resolveFlowerRenderQualityProfile(values)
  const width = readFlowerNumber(schema, values, 'petalWidth')
  const widthProfile = [
    readFlowerNumber(schema, values, 'petalBaseWidth') / width,
    readFlowerNumber(schema, values, 'petalLowerWidth') / width,
    readFlowerNumber(schema, values, 'petalMidLowerWidth') / width,
    1,
    readFlowerNumber(schema, values, 'petalUpperWidth') / width,
    readFlowerNumber(schema, values, 'petalTipWidth') / width,
  ] as const

  return {
    quality,
    petal: {
      visible: readFlowerBoolean(schema, values, 'petalVisible'),
      flatShading: false,
      length: readFlowerNumber(schema, values, 'petalLength'),
      width,
      baseWidth: readFlowerNumber(schema, values, 'petalBaseWidth'),
      tipWidth: readFlowerNumber(schema, values, 'petalTipWidth'),
      widthProfile,
      cup: readFlowerNumber(schema, values, 'petalCup'),
      cupCenter: readFlowerNumber(schema, values, 'petalCupPosition'),
      curl: readFlowerNumber(schema, values, 'petalCurl'),
      curlBias: readFlowerNumber(schema, values, 'petalCurlFocus'),
      sideCurl: readFlowerNumber(schema, values, 'petalSideCurl'),
      wave: readFlowerNumber(schema, values, 'petalEdgeWave'),
      waveCount: readFlowerNumber(schema, values, 'petalWaveCount'),
      asymmetry: readFlowerNumber(schema, values, 'petalAsymmetry'),
      thickness: readFlowerNumber(schema, values, 'petalThickness'),
      keel: readFlowerNumber(schema, values, 'petalKeel'),
      veinStrength: readFlowerNumber(schema, values, 'petalVeinStrength'),
      veinCount: Math.round(readFlowerNumber(schema, values, 'petalVeinCount')),
      baseColor: readFlowerColor(schema, values, 'petalBaseColor'),
      centerColor: readFlowerColor(schema, values, 'petalMainColor'),
      mainColor: readFlowerColor(schema, values, 'petalMainColor'),
      tipColor: readFlowerColor(schema, values, 'petalTipColor'),
      veinColor: readFlowerColor(schema, values, 'petalVeinColor'),
      roughness: readFlowerNumber(schema, values, 'petalRoughness'),
      sheen: readFlowerNumber(schema, values, 'petalSheen'),
      transmission: readFlowerNumber(schema, values, 'petalTransmission'),
      textureNormalStrength: readFlowerNumber(
        schema,
        values,
        'textureNormalStrength',
      ),
      lengthSegments: quality.petalLengthSegments,
      widthSegments: quality.petalWidthSegments,
    },
    leaf: {
      visible: readFlowerBoolean(schema, values, 'leafVisible'),
      length: readFlowerNumber(schema, values, 'leafLength'),
      width: readFlowerNumber(schema, values, 'leafWidth'),
      height: readFlowerNumber(schema, values, 'leafHeight'),
      spread: readFlowerNumber(schema, values, 'leafSpread'),
      cup: readFlowerNumber(schema, values, 'leafCup'),
      curl: readFlowerNumber(schema, values, 'leafCurl'),
      wave: readFlowerNumber(schema, values, 'leafWave'),
      serration: readFlowerNumber(schema, values, 'leafSerration'),
      baseColor: readFlowerColor(schema, values, 'leafBaseColor'),
      tipColor: readFlowerColor(schema, values, 'leafTipColor'),
      veinColor: readFlowerColor(schema, values, 'leafVeinColor'),
    },
    stem: {
      visible: readFlowerBoolean(schema, values, 'stemVisible'),
      length: readFlowerNumber(schema, values, 'stemLength'),
      radius: readFlowerNumber(schema, values, 'stemRadius'),
      curve: readFlowerNumber(schema, values, 'stemCurve'),
      color: readFlowerColor(schema, values, 'stemColor'),
    },
  }
}
