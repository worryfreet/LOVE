import sunflowerCustomConfiguration from '../configurations/sunflower.custom.json'
import type {
  ModelParameterConfiguration,
  ModelParameterSchema,
  ModelParameterValues,
} from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const SUNFLOWER_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 2.4,
  petalLength: 0.58, petalWidth: 0.13, petalBaseWidth: 0.024,
  petalLowerWidth: 0.064, petalMidLowerWidth: 0.098, petalUpperWidth: 0.076,
  petalTipWidth: 0.012, petalCup: 0.034, petalCupPosition: 0.48,
  petalCurl: -0.065, petalCurlFocus: 1.55, petalSideCurl: 0.012,
  petalEdgeWave: 0.006, petalWaveCount: 3.5, petalAsymmetry: 0.04,
  petalThickness: 0.001, petalKeel: 0.09, petalVeinStrength: 0.08,
  petalVeinCount: 7, petalRoughness: 0.69, petalSheen: 0.28,
  petalTransmission: 0.012, textureNormalStrength: 0.2,
  petalBaseColor: '#D97900', petalMainColor: '#F2A600',
  petalTipColor: '#FFC629', petalVeinColor: '#B96600',
  leafVisible: true, leafLength: 1.08, leafWidth: 0.42, leafHeight: 0.05,
  leafSpread: 67, leafCup: 0.07, leafCurl: -0.04, leafWave: 0.012,
  leafSerration: 0.085, leafBaseColor: '#294D1D', leafTipColor: '#63823A',
  leafVeinColor: '#9BAC62', stemVisible: true, stemLength: 2.75,
  stemRadius: 0.075, stemCurve: 0.035, headStemBend: 34, stemColor: '#4D782D',
  outerRayCount: 34, innerRayCount: 28, rayRootRadius: 0.35,
  rayLayerDepth: 0.062, headScale: 0.84, headTilt: 3,
  discFloretCount: 720, discRadius: 0.34, discDome: 0.1,
  discInnerColor: '#7A8E35', discOuterColor: '#9A4C12',
  bractCount: 22, bractLength: 0.46,
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'outerRayCount', type: 'number', group: '花头排列', label: '外层舌状花数', description: '控制外层金黄舌状花数量。', default: SUNFLOWER_DEFAULTS.outerRayCount, min: 6, max: 96, step: 1 },
  { id: 'innerRayCount', type: 'number', group: '花头排列', label: '内层舌状花数', description: '控制内层错位舌状花数量。', default: SUNFLOWER_DEFAULTS.innerRayCount, min: 4, max: 80, step: 1 },
  { id: 'rayRootRadius', type: 'number', group: '花头排列', label: '花瓣根位半径', description: '控制舌状花围绕花盘的起始半径。', default: SUNFLOWER_DEFAULTS.rayRootRadius, min: 0.18, max: 0.55, step: 0.005 },
  { id: 'rayLayerDepth', type: 'number', group: '花头排列', label: '双层前后差', description: '控制内外两层舌状花的前后错层。', default: SUNFLOWER_DEFAULTS.rayLayerDepth, min: 0, max: 0.14, step: 0.002 },
  { id: 'headScale', type: 'number', group: '花头排列', label: '花头整体尺度', description: '控制整朵花头相对植株的尺度。', default: SUNFLOWER_DEFAULTS.headScale, min: 0.35, max: 2.4, step: 0.01 },
  { id: 'headTilt', type: 'number', group: '花头排列', label: '花头俯仰', description: '控制花盘朝上或轻微俯垂角度。', default: SUNFLOWER_DEFAULTS.headTilt, min: -28, max: 20, step: 1, unit: '°' },
  { id: 'discFloretCount', type: 'number', group: '花盘与总苞', label: '花盘小花数量', description: '控制黄金角花盘的实例数量。', default: SUNFLOWER_DEFAULTS.discFloretCount, min: 120, max: 720, step: 12 },
  { id: 'discRadius', type: 'number', group: '花盘与总苞', label: '花盘半径', description: '控制褐色花盘半径。', default: SUNFLOWER_DEFAULTS.discRadius, min: 0.2, max: 0.58, step: 0.005 },
  { id: 'discDome', type: 'number', group: '花盘与总苞', label: '花盘隆起', description: '控制花盘中央的弧面高度。', default: SUNFLOWER_DEFAULTS.discDome, min: 0, max: 0.18, step: 0.002 },
  { id: 'discInnerColor', type: 'color', group: '花盘与总苞', label: '花盘内圈颜色', description: '控制花盘中央偏绿区域颜色。', default: SUNFLOWER_DEFAULTS.discInnerColor },
  { id: 'discOuterColor', type: 'color', group: '花盘与总苞', label: '花盘外圈颜色', description: '控制成熟管状花的褐色。', default: SUNFLOWER_DEFAULTS.discOuterColor },
  { id: 'bractCount', type: 'number', group: '花盘与总苞', label: '总苞片数量', description: '控制花头背面的绿色总苞片数量。', default: SUNFLOWER_DEFAULTS.bractCount, min: 10, max: 32, step: 1 },
  { id: 'bractLength', type: 'number', group: '花盘与总苞', label: '总苞片长度', description: '控制绿色总苞片长度。', default: SUNFLOWER_DEFAULTS.bractLength, min: 0.2, max: 0.68, step: 0.01 },
] as const satisfies readonly ModelParameterSchema[]

export const SUNFLOWER_PARAMETERS = createPetalFlowerParameterSchema(
  SUNFLOWER_DEFAULTS,
  { organLabel: '舌状花', geometryGroup: '舌状花几何', extraParameters: extras },
)
export const SUNFLOWER_CUSTOM_CONFIGURATION =
  sunflowerCustomConfiguration as ModelParameterConfiguration

/** 模型详情页与外部场景共同消费当前生效的向日葵参数，只允许调用方覆盖明确的场景差异。 */
export function resolveSunflowerParameters(
  overrides: ModelParameterValues = {},
): ModelParameterValues {
  return {
    ...(SUNFLOWER_CUSTOM_CONFIGURATION.values as ModelParameterValues),
    ...overrides,
  }
}
