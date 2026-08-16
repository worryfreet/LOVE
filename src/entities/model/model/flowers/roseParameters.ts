import roseCustomConfiguration from '../configurations/rose.custom.json'
import type { ModelParameterConfiguration, ModelParameterSchema } from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const ROSE_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 3,
  petalLength: 0.95, petalWidth: 0.3, petalBaseWidth: 0.03,
  petalLowerWidth: 0.16, petalMidLowerWidth: 0.28, petalUpperWidth: 0.2,
  petalTipWidth: 0.02, petalCup: 0.4, petalCupPosition: 0.5,
  petalCurl: -0.35, petalCurlFocus: 2.3, petalSideCurl: 0.45,
  petalEdgeWave: 0.035, petalWaveCount: 11, petalAsymmetry: 0.08,
  petalThickness: 0.001, petalKeel: 0.018, petalVeinStrength: 0.035,
  petalVeinCount: 11, petalRoughness: 0.66, petalSheen: 0.46,
  petalTransmission: 0.055, textureNormalStrength: 0.16,
  petalBaseColor: '#E35D7B', petalMainColor: '#EF7F98',
  petalTipColor: '#F8B7C6', petalVeinColor: '#C83D61',
  leafVisible: true, leafLength: 0.76, leafWidth: 0.235, leafHeight: 0.35,
  leafSpread: 66, leafCup: 0.04, leafCurl: -0.03, leafWave: 0.012,
  leafSerration: 0.075, leafBaseColor: '#214A22', leafTipColor: '#567A38',
  leafVeinColor: '#9CAB62', stemVisible: true, stemLength: 2.33,
  stemRadius: 0.052, stemCurve: 0.015, headStemBend: 10, stemColor: '#3F6B2E',
  petalCount: 36, goldenAngle: 137.5, layoutRadius: 0.165,
  radiusBias: 1.15, receptacleHeight: 0.155, heightBias: 1.2,
  innerScale: 0.46, innerTilt: 11.5, outerAngle: 68, tiltBias: 2.2,
  petalJitter: 0.04, bloomLimit: 0.78, bloomTransition: 0.35,
  bloomScale: 0.9, calyxCount: 7, thornCount: 9,
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'petalCount', type: 'number', group: '花冠排列', label: '花瓣数量', description: 'Flower Studio 黄金角连续布局的实例数量。', default: ROSE_DEFAULTS.petalCount, min: 3, max: 220, step: 1 },
  { id: 'goldenAngle', type: 'number', group: '花冠排列', label: '黄金角', description: '控制相邻花瓣沿连续螺旋的角度间隔。', default: ROSE_DEFAULTS.goldenAngle, min: 90, max: 180, step: 0.1, unit: '°' },
  { id: 'layoutRadius', type: 'number', group: '花冠排列', label: '花托半径', description: '控制花瓣根位螺旋的最大半径。', default: ROSE_DEFAULTS.layoutRadius, min: 0.08, max: 0.5, step: 0.005 },
  { id: 'radiusBias', type: 'number', group: '花冠排列', label: '半径分布', description: '控制花瓣根位从中心向外扩展的速度。', default: ROSE_DEFAULTS.radiusBias, min: 0.3, max: 3, step: 0.01 },
  { id: 'receptacleHeight', type: 'number', group: '花冠排列', label: '花托高度', description: '控制连续花冠中心到外缘的高度差。', default: ROSE_DEFAULTS.receptacleHeight, min: 0, max: 0.8, step: 0.005 },
  { id: 'heightBias', type: 'number', group: '花冠排列', label: '高度分布', description: '控制花托高度沿发育相位的分布。', default: ROSE_DEFAULTS.heightBias, min: 0.3, max: 3, step: 0.01 },
  { id: 'innerScale', type: 'number', group: '花冠排列', label: '内瓣尺度', description: '控制中心花瓣相对外层花瓣的尺度。', default: ROSE_DEFAULTS.innerScale, min: 0.1, max: 1, step: 0.01 },
  { id: 'innerTilt', type: 'number', group: '花冠排列', label: '内瓣初始倾角', description: '控制全部花瓣实例的基础倾角。', default: ROSE_DEFAULTS.innerTilt, min: -28, max: 86, step: 0.5, unit: '°' },
  { id: 'outerAngle', type: 'number', group: '花冠排列', label: '外瓣最大展开角', description: '控制外层花瓣在开放态向外倾斜的上限。', default: ROSE_DEFAULTS.outerAngle, min: 0, max: 120, step: 0.5, unit: '°' },
  { id: 'tiltBias', type: 'number', group: '花冠排列', label: '展开角分布', description: '控制展开角从中心向外增长的速度。', default: ROSE_DEFAULTS.tiltBias, min: 0.5, max: 6, step: 0.05 },
  { id: 'petalJitter', type: 'number', group: '花冠排列', label: '实例扰动', description: '控制根位、深度与翻滚的确定性轻微差异。', default: ROSE_DEFAULTS.petalJitter, min: 0, max: 0.4, step: 0.005 },
  { id: 'bloomLimit', type: 'number', group: '开花与风动', label: '开放上限', description: '控制 Flower Studio 局部开放波前的终点。', default: ROSE_DEFAULTS.bloomLimit, min: 0.5, max: 1, step: 0.01 },
  { id: 'bloomTransition', type: 'number', group: '开花与风动', label: '开放传播宽度', description: '控制相邻花瓣之间的开放错峰宽度。', default: ROSE_DEFAULTS.bloomTransition, min: 0.05, max: 1, step: 0.01 },
  { id: 'bloomScale', type: 'number', group: '花冠排列', label: '花冠整体尺度', description: '控制 Flower Studio 花冠与茎叶之间的整体比例。', default: ROSE_DEFAULTS.bloomScale, min: 0.3, max: 2.2, step: 0.01 },
  { id: 'calyxCount', type: 'number', group: '萼片与皮刺', label: '萼片数量', description: '控制花冠背面的绿色萼片数量。', default: ROSE_DEFAULTS.calyxCount, min: 5, max: 9, step: 1 },
  { id: 'thornCount', type: 'number', group: '萼片与皮刺', label: '皮刺数量', description: '控制主茎可见皮刺数量。', default: ROSE_DEFAULTS.thornCount, min: 0, max: 18, step: 1 },
] as const satisfies readonly ModelParameterSchema[]

export const ROSE_PARAMETERS = createPetalFlowerParameterSchema(
  ROSE_DEFAULTS,
  { organLabel: '花瓣', extraParameters: extras },
)
export const ROSE_CUSTOM_CONFIGURATION =
  roseCustomConfiguration as ModelParameterConfiguration
