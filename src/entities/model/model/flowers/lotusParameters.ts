import lotusCustomConfiguration from '../configurations/lotus.custom.json'
import type { ModelParameterConfiguration, ModelParameterSchema } from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const LOTUS_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 3.1,
  petalLength: 0.74, petalWidth: 0.4, petalBaseWidth: 0.092,
  petalLowerWidth: 0.25, petalMidLowerWidth: 0.37, petalUpperWidth: 0.31,
  petalTipWidth: 0.03, petalCup: 0.245, petalCupPosition: 0.57,
  petalCurl: -0.025, petalCurlFocus: 1.62, petalSideCurl: 0.04,
  petalEdgeWave: 0.006, petalWaveCount: 3, petalAsymmetry: 0.025,
  petalThickness: 0.001, petalKeel: 0.14, petalVeinStrength: 0.08,
  petalVeinCount: 12, petalRoughness: 0.62, petalSheen: 0.48,
  petalTransmission: 0.08, textureNormalStrength: 0.2,
  petalBaseColor: '#F2D7CB', petalMainColor: '#E7759E',
  petalTipColor: '#DA3879', petalVeinColor: '#B92B66',
  leafVisible: true, leafLength: 1.02, leafWidth: 0.48, leafHeight: 0.12,
  leafSpread: 82, leafCup: 0.08, leafCurl: -0.035, leafWave: 0.026,
  leafSerration: 0.018, leafBaseColor: '#315D38', leafTipColor: '#7A9B6A',
  leafVeinColor: '#AFC49A', stemVisible: true, stemLength: 2.13,
  stemRadius: 0.05, stemCurve: 0.02, headStemBend: 14, stemColor: '#4E793A',
  outerCount: 10, middleCount: 10, innerCount: 8,
  outerTilt: 8, middleTilt: 42, innerTilt: 78,
  outerScale: 1.08, middleScale: 0.96, innerScale: 0.78,
  bloomScale: 1.18, receptacleSize: 0.2, receptacleColor: '#E8CF58',
  stamenCount: 60, stamenLength: 0.21, stamenColor: '#F2B31D',
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'outerCount', type: 'number', group: '花冠排列', label: '外层花瓣数量', description: '控制最低外展层舟形花瓣数量。', default: LOTUS_DEFAULTS.outerCount, min: 3, max: 32, step: 1 },
  { id: 'middleCount', type: 'number', group: '花冠排列', label: '中层花瓣数量', description: '控制中间斜展层花瓣数量。', default: LOTUS_DEFAULTS.middleCount, min: 3, max: 28, step: 1 },
  { id: 'innerCount', type: 'number', group: '花冠排列', label: '内层花瓣数量', description: '控制围绕莲蓬的直立花瓣数量。', default: LOTUS_DEFAULTS.innerCount, min: 2, max: 20, step: 1 },
  { id: 'outerTilt', type: 'number', group: '花冠排列', label: '外层展开角', description: '控制外层低展程度。', default: LOTUS_DEFAULTS.outerTilt, min: -25, max: 18, step: 1, unit: '°' },
  { id: 'middleTilt', type: 'number', group: '花冠排列', label: '中层展开角', description: '控制中层斜展程度。', default: LOTUS_DEFAULTS.middleTilt, min: -2, max: 58, step: 1, unit: '°' },
  { id: 'innerTilt', type: 'number', group: '花冠排列', label: '内层直立角', description: '控制内层围拢程度。', default: LOTUS_DEFAULTS.innerTilt, min: 18, max: 82, step: 1, unit: '°' },
  { id: 'outerScale', type: 'number', group: '花冠排列', label: '外层尺度', description: '控制外层花瓣整体尺度。', default: LOTUS_DEFAULTS.outerScale, min: 0.75, max: 1.35, step: 0.01 },
  { id: 'middleScale', type: 'number', group: '花冠排列', label: '中层尺度', description: '控制中层花瓣整体尺度。', default: LOTUS_DEFAULTS.middleScale, min: 0.62, max: 1.2, step: 0.01 },
  { id: 'innerScale', type: 'number', group: '花冠排列', label: '内层尺度', description: '控制内层花瓣整体尺度。', default: LOTUS_DEFAULTS.innerScale, min: 0.45, max: 1, step: 0.01 },
  { id: 'bloomScale', type: 'number', group: '花冠排列', label: '花冠整体尺度', description: '控制花冠相对茎叶的整体尺度。', default: LOTUS_DEFAULTS.bloomScale, min: 0.35, max: 2.4, step: 0.01 },
  { id: 'receptacleSize', type: 'number', group: '莲蓬与雄蕊', label: '莲蓬大小', description: '控制中央黄色莲蓬尺度。', default: LOTUS_DEFAULTS.receptacleSize, min: 0.08, max: 0.25, step: 0.005 },
  { id: 'receptacleColor', type: 'color', group: '莲蓬与雄蕊', label: '莲蓬颜色', description: '控制中央莲蓬颜色。', default: LOTUS_DEFAULTS.receptacleColor },
  { id: 'stamenCount', type: 'number', group: '莲蓬与雄蕊', label: '雄蕊数量', description: '控制围绕莲蓬的黄色雄蕊数量。', default: LOTUS_DEFAULTS.stamenCount, min: 18, max: 84, step: 2 },
  { id: 'stamenLength', type: 'number', group: '莲蓬与雄蕊', label: '雄蕊长度', description: '控制黄色花丝长度。', default: LOTUS_DEFAULTS.stamenLength, min: 0.1, max: 0.3, step: 0.005 },
  { id: 'stamenColor', type: 'color', group: '莲蓬与雄蕊', label: '雄蕊颜色', description: '控制花丝与花药的金黄色。', default: LOTUS_DEFAULTS.stamenColor },
] as const satisfies readonly ModelParameterSchema[]

export const LOTUS_PARAMETERS = createPetalFlowerParameterSchema(
  LOTUS_DEFAULTS,
  { organLabel: '花瓣', extraParameters: extras },
)
export const LOTUS_CUSTOM_CONFIGURATION =
  lotusCustomConfiguration as ModelParameterConfiguration
