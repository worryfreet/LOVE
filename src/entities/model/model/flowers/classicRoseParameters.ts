import classicRoseCustomConfiguration from '../configurations/classic-rose.custom.json'
import type {
  ModelParameterConfiguration,
  ModelParameterSchema,
} from '../modelParameterTypes'
import {
  createPetalFlowerParameterSchema,
  type PetalFlowerParameterDefaults,
} from '../editableFlowerParameters'
import { ROSE_COLOR_PRESETS } from '../../items/flower-collection/core/roseColorVariants'

export const CLASSIC_ROSE_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 3.2,
  petalLength: 0.82, petalWidth: 0.345, petalBaseWidth: 0.026,
  petalLowerWidth: 0.19, petalMidLowerWidth: 0.325, petalUpperWidth: 0.285,
  petalTipWidth: 0.13, petalCup: 0.455, petalCupPosition: 0.48,
  petalCurl: -0.18, petalCurlFocus: 2.55, petalSideCurl: 0.36,
  petalEdgeWave: 0.023, petalWaveCount: 8.5, petalAsymmetry: 0.055,
  petalThickness: 0.001, petalKeel: 0.015, petalVeinStrength: 0.028,
  petalVeinCount: 12, petalRoughness: 0.7, petalSheen: 0.52,
  petalTransmission: 0.07, textureNormalStrength: 0.18,
  petalBaseColor: '#9A0B25', petalMainColor: '#D71532',
  petalTipColor: '#FF5561', petalVeinColor: '#520010',
  leafVisible: true, leafLength: 0.72, leafWidth: 0.22, leafHeight: 0.31,
  leafSpread: 64, leafCup: 0.045, leafCurl: -0.028, leafWave: 0.012,
  leafSerration: 0.085, leafBaseColor: '#173F20', leafTipColor: '#4F7437',
  leafVeinColor: '#9BAB68', stemVisible: true, stemLength: 2.28,
  stemRadius: 0.05, stemCurve: 0.018, headStemBend: 4, stemColor: '#35602C',
  colorVariant: 'scarlet-red', petalCount: 52, goldenAngle: 137.5,
  layoutRadius: 0.165, radiusBias: 1.28, receptacleHeight: 0.34,
  heightBias: 1.15, innerScale: 0.5, innerTilt: 8,
  outerAngle: 42, tiltBias: 1.9, petalJitter: 0.055,
  bloomLimit: 0.76, bloomTransition: 0.32, bloomScale: 0.74,
  calyxCount: 6, thornCount: 10,
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  {
    id: 'colorVariant', type: 'select', group: '玫瑰配色', label: '颜色品种',
    description: '切换经独立五段调色和纹理遮罩打磨的玫瑰颜色品种。',
    default: CLASSIC_ROSE_DEFAULTS.colorVariant,
    options: ROSE_COLOR_PRESETS.map(({ id, label, category }) => ({
      value: id,
      label: `${category}·${label}`,
    })),
  },
  { id: 'petalCount', type: 'number', group: '花冠排列', label: '花瓣数量', description: '控制紧密螺旋重瓣的实例数量。', default: CLASSIC_ROSE_DEFAULTS.petalCount, min: 12, max: 220, step: 1 },
  { id: 'goldenAngle', type: 'number', group: '花冠排列', label: '黄金角', description: '控制相邻花瓣沿连续螺旋的角度间隔。', default: CLASSIC_ROSE_DEFAULTS.goldenAngle, min: 90, max: 180, step: 0.1, unit: '°' },
  { id: 'layoutRadius', type: 'number', group: '花冠排列', label: '花托半径', description: '控制花瓣根位螺旋的最大半径。', default: CLASSIC_ROSE_DEFAULTS.layoutRadius, min: 0.08, max: 0.4, step: 0.005 },
  { id: 'radiusBias', type: 'number', group: '花冠排列', label: '半径分布', description: '控制花瓣根位从中心向外扩展的速度。', default: CLASSIC_ROSE_DEFAULTS.radiusBias, min: 0.3, max: 3, step: 0.01 },
  { id: 'receptacleHeight', type: 'number', group: '花冠排列', label: '花托高度', description: '控制中心到外缘的连续杯状高度差。', default: CLASSIC_ROSE_DEFAULTS.receptacleHeight, min: 0.04, max: 0.5, step: 0.005 },
  { id: 'heightBias', type: 'number', group: '花冠排列', label: '高度分布', description: '控制花托高度沿发育相位的分布。', default: CLASSIC_ROSE_DEFAULTS.heightBias, min: 0.3, max: 3, step: 0.01 },
  { id: 'innerScale', type: 'number', group: '花冠排列', label: '内瓣尺度', description: '控制中心紧卷花瓣相对外瓣的尺度。', default: CLASSIC_ROSE_DEFAULTS.innerScale, min: 0.16, max: 0.72, step: 0.01 },
  { id: 'innerTilt', type: 'number', group: '花冠排列', label: '内瓣初始倾角', description: '控制中心花瓣向上包裹的基础倾角。', default: CLASSIC_ROSE_DEFAULTS.innerTilt, min: -10, max: 60, step: 0.5, unit: '°' },
  { id: 'outerAngle', type: 'number', group: '花冠排列', label: '外瓣最大展开角', description: '控制外瓣向外舒展的上限。', default: CLASSIC_ROSE_DEFAULTS.outerAngle, min: 20, max: 95, step: 0.5, unit: '°' },
  { id: 'tiltBias', type: 'number', group: '花冠排列', label: '展开角分布', description: '控制展开角从中心向外增长的速度。', default: CLASSIC_ROSE_DEFAULTS.tiltBias, min: 0.5, max: 6, step: 0.05 },
  { id: 'petalJitter', type: 'number', group: '花冠排列', label: '实例扰动', description: '控制花瓣根位、深度与翻滚的自然微差。', default: CLASSIC_ROSE_DEFAULTS.petalJitter, min: 0, max: 0.25, step: 0.005 },
  { id: 'bloomLimit', type: 'number', group: '开花与风动', label: '开放上限', description: '控制局部开放波前的终点。', default: CLASSIC_ROSE_DEFAULTS.bloomLimit, min: 0.5, max: 1, step: 0.01 },
  { id: 'bloomTransition', type: 'number', group: '开花与风动', label: '开放传播宽度', description: '控制相邻花瓣之间的开放错峰宽度。', default: CLASSIC_ROSE_DEFAULTS.bloomTransition, min: 0.05, max: 1, step: 0.01 },
  { id: 'bloomScale', type: 'number', group: '花冠排列', label: '花冠整体尺度', description: '控制玫瑰花冠与茎叶之间的整体比例。', default: CLASSIC_ROSE_DEFAULTS.bloomScale, min: 0.3, max: 2.2, step: 0.01 },
  { id: 'calyxCount', type: 'number', group: '萼片与皮刺', label: '萼片数量', description: '控制花冠背面的绿色萼片数量。', default: CLASSIC_ROSE_DEFAULTS.calyxCount, min: 5, max: 9, step: 1 },
  { id: 'thornCount', type: 'number', group: '萼片与皮刺', label: '皮刺数量', description: '控制主茎可见皮刺数量。', default: CLASSIC_ROSE_DEFAULTS.thornCount, min: 0, max: 18, step: 1 },
] as const satisfies readonly ModelParameterSchema[]

export const CLASSIC_ROSE_PARAMETERS = createPetalFlowerParameterSchema(
  CLASSIC_ROSE_DEFAULTS,
  { organLabel: '花瓣', extraParameters: extras },
)

export const CLASSIC_ROSE_CUSTOM_CONFIGURATION =
  classicRoseCustomConfiguration as ModelParameterConfiguration
