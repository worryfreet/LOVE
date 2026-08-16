export type { ModelParameterValues } from './model/modelParameterTypes'
export type { ModelSceneProps } from './model/modelTypes'

export {
  HYDRANGEA_CUSTOM_CONFIGURATION,
  HYDRANGEA_PETAL_PARAMETERS,
  resolveHydrangeaPetalSettings,
} from './model/hydrangeaPetalParameters'
export {
  HYDRANGEA_RENDER_QUALITIES,
  HYDRANGEA_RENDER_QUALITY_DPR,
  HYDRANGEA_RENDER_QUALITY_PROFILES,
  resolveHydrangeaRenderQuality,
  resolveHydrangeaRenderQualityProfile,
} from './model/hydrangeaRenderQuality'
export {
  FLOWER_RENDER_QUALITY_PROFILES,
  resolveFlowerRenderQuality,
  resolveFlowerRenderQualityProfile,
} from './model/flowerRenderQuality'
export type {
  FlowerRenderQuality,
  FlowerRenderQualityProfile,
} from './model/flowerRenderQuality'
export { HydrangeaAssembly } from './items/flower-collection/species/HydrangeaPlant'
export {
  SunflowerAssembly,
  SUNFLOWER_GROUND_Y,
} from './items/flower-collection/species/SunflowerPlant'
export { resolveSunflowerParameters } from './model/flowers/sunflowerParameters'
export {
  ROSE_COLOR_PRESETS,
  createClassicRoseBlueprint,
  FLOWER_PETAL_WIND_ATTRIBUTES,
  applyFlowerPetalWindAttributes,
  configureFlowerWindMaterial,
  createFlowerWindUniforms,
  updateFlowerWindUniforms,
} from './items/flower-collection'
export type {
  FlowerWindUniforms,
  RoseColorVariantId,
} from './items/flower-collection'
export {
  createMeadowGrassClumpGeometry,
  createWildflowerGeometry,
  WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE,
  WILDFLOWER_SPECIES_IDS,
  WILDFLOWER_SPECS,
} from './items/meadow-wildflowers'
export {
  FLOWER_POPULATION_QUALITIES,
  MORNING_GLORY_ATTACHMENT_SOURCE_SIZES,
  createMorningGloryAttachmentGeometry,
} from './items/flower-collection/core/flowerPopulationGeometry'
export type {
  FlowerPopulationQuality,
  MorningGloryAttachmentKind,
} from './items/flower-collection/core/flowerPopulationGeometry'
export {
  CLASSIC_ROSE_POPULATION_PETAL_SEGMENTS,
  createClassicRosePopulationGeometry,
  createClassicRosePopulationPrototype,
} from './items/flower-collection/core/classicRosePopulation'
export type {
  ClassicRosePopulationPrototype,
} from './items/flower-collection/core/classicRosePopulation'
export type { WildflowerSpeciesId } from './items/meadow-wildflowers/model/spec'
