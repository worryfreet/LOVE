import dandelionCustomConfiguration from '../configurations/dandelion.custom.json'
import type { ModelParameterConfiguration, ModelParameterSchema } from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const DANDELION_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 2.2,
  petalLength: 0.34, petalWidth: 0.036, petalBaseWidth: 0.011,
  petalLowerWidth: 0.026, petalMidLowerWidth: 0.034, petalUpperWidth: 0.034,
  petalTipWidth: 0.012, petalCup: 0.012, petalCupPosition: 0.46,
  petalCurl: -0.02, petalCurlFocus: 1.5, petalSideCurl: 0.006,
  petalEdgeWave: 0.004, petalWaveCount: 3, petalAsymmetry: 0.035,
  petalThickness: 0.0005, petalKeel: 0.045, petalVeinStrength: 0.055,
  petalVeinCount: 5, petalRoughness: 0.72, petalSheen: 0.28,
  petalTransmission: 0.025, textureNormalStrength: 0.14,
  petalBaseColor: '#B96C00', petalMainColor: '#E5A000',
  petalTipColor: '#FFD11A', petalVeinColor: '#9D5700',
  leafVisible: true, leafLength: 1.55, leafWidth: 0.22, leafHeight: -0.48,
  leafSpread: 84, leafCup: 0.018, leafCurl: -0.015, leafWave: 0.018,
  leafSerration: 0.18, leafBaseColor: '#1F4218', leafTipColor: '#456E2C',
  leafVeinColor: '#A4B76D', stemVisible: true, stemLength: 2.08,
  stemRadius: 0.028, stemCurve: 0.04, headStemBend: 25, stemColor: '#5B812F',
  outerCount: 82, middleCount: 72, innerCount: 62,
  outerTilt: -4, middleTilt: 18, innerTilt: 38,
  rootRadius: 0.17, headScale: 1.12,
  calyxCount: 18, calyxLength: 0.22,
  centerRadius: 0.032, centerColor: '#D78D00', rootVisible: true,
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'outerCount', type: 'number', group: '花头排列', label: '外层小花数量', description: '控制最外层长舌状小花数量。', default: DANDELION_DEFAULTS.outerCount, min: 8, max: 160, step: 2 },
  { id: 'middleCount', type: 'number', group: '花头排列', label: '中层小花数量', description: '控制中层舌状小花数量。', default: DANDELION_DEFAULTS.middleCount, min: 8, max: 140, step: 2 },
  { id: 'innerCount', type: 'number', group: '花头排列', label: '内层小花数量', description: '控制中心较短舌状小花数量。', default: DANDELION_DEFAULTS.innerCount, min: 6, max: 120, step: 2 },
  { id: 'outerTilt', type: 'number', group: '花头排列', label: '外层展开角', description: '控制外层舌状小花的平展程度。', default: DANDELION_DEFAULTS.outerTilt, min: -16, max: 18, step: 1, unit: '°' },
  { id: 'middleTilt', type: 'number', group: '花头排列', label: '中层展开角', description: '控制中层小花抬升角度。', default: DANDELION_DEFAULTS.middleTilt, min: -5, max: 30, step: 1, unit: '°' },
  { id: 'innerTilt', type: 'number', group: '花头排列', label: '内层直立角', description: '控制中心小花直立程度。', default: DANDELION_DEFAULTS.innerTilt, min: 5, max: 48, step: 1, unit: '°' },
  { id: 'rootRadius', type: 'number', group: '花头排列', label: '小花根位半径', description: '控制三层舌状小花的根部范围。', default: DANDELION_DEFAULTS.rootRadius, min: 0.08, max: 0.28, step: 0.005 },
  { id: 'headScale', type: 'number', group: '花头排列', label: '花头整体尺度', description: '控制黄色头状花序整体尺度。', default: DANDELION_DEFAULTS.headScale, min: 0.35, max: 2.4, step: 0.01 },
  { id: 'calyxCount', type: 'number', group: '总苞与根颈', label: '总苞片数量', description: '控制花头背面绿色总苞片数量。', default: DANDELION_DEFAULTS.calyxCount, min: 10, max: 28, step: 1 },
  { id: 'calyxLength', type: 'number', group: '总苞与根颈', label: '总苞片长度', description: '控制绿色总苞片长度。', default: DANDELION_DEFAULTS.calyxLength, min: 0.12, max: 0.34, step: 0.005 },
  { id: 'centerRadius', type: 'number', group: '总苞与根颈', label: '花心半径', description: '控制头状花序中央柔和花心尺度。', default: DANDELION_DEFAULTS.centerRadius, min: 0.03, max: 0.12, step: 0.002 },
  { id: 'centerColor', type: 'color', group: '总苞与根颈', label: '花心颜色', description: '控制花心橙黄色。', default: DANDELION_DEFAULTS.centerColor },
  { id: 'rootVisible', type: 'boolean', group: '总苞与根颈', label: '显示根颈与根系', description: '控制莲座叶中央根颈和细根是否显示。', default: DANDELION_DEFAULTS.rootVisible },
] as const satisfies readonly ModelParameterSchema[]

export const DANDELION_PARAMETERS = createPetalFlowerParameterSchema(
  DANDELION_DEFAULTS,
  { organLabel: '舌状小花', geometryGroup: '舌状小花几何', extraParameters: extras },
)
export const DANDELION_CUSTOM_CONFIGURATION =
  dandelionCustomConfiguration as ModelParameterConfiguration
