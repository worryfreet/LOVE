import lilyCustomConfiguration from '../configurations/lily.custom.json'
import type { ModelParameterConfiguration, ModelParameterSchema } from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const LILY_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 2.7,
  petalLength: 1.12, petalWidth: 0.255, petalBaseWidth: 0.07,
  petalLowerWidth: 0.17, petalMidLowerWidth: 0.22, petalUpperWidth: 0.2,
  petalTipWidth: 0.06, petalCup: 0.2, petalCupPosition: 0.43,
  petalCurl: 0.06, petalCurlFocus: 2.9, petalSideCurl: 0.22,
  petalEdgeWave: 0.028, petalWaveCount: 7, petalAsymmetry: 0.035,
  petalThickness: 0.001, petalKeel: 0.15, petalVeinStrength: 0.075,
  petalVeinCount: 9, petalRoughness: 0.64, petalSheen: 0.43,
  petalTransmission: 0.07, textureNormalStrength: 0.2,
  petalBaseColor: '#F5EBDD', petalMainColor: '#F3A6BE',
  petalTipColor: '#FBD8E3', petalVeinColor: '#C94778',
  leafVisible: true, leafLength: 1.35, leafWidth: 0.08, leafHeight: 0.02,
  leafSpread: 65, leafCup: 0.035, leafCurl: -0.18, leafWave: 0.006,
  leafSerration: 0, leafBaseColor: '#234119', leafTipColor: '#466D28',
  leafVeinColor: '#7D9447', stemVisible: true, stemLength: 2.3,
  stemRadius: 0.042, stemCurve: 0.015, headStemBend: 69, stemColor: '#547D34',
  bloomScale: 1, outerTilt: 18, innerTilt: 38,
  outerCurlBoost: -0.02, innerCurlBoost: 0,
  stamenLength: 0.56, antherSize: 0.06, spotVisible: true,
  spotCount: 126, spotColor: '#97234F', filamentColor: '#D9C27B',
  antherColor: '#7E2A17', stigmaColor: '#7F9158',
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'bloomScale', type: 'number', group: '花部排列', label: '花冠整体尺度', description: '控制六枚花被与花蕊的整体尺度。', default: LILY_DEFAULTS.bloomScale, min: 0.35, max: 2.4, step: 0.01 },
  { id: 'outerTilt', type: 'number', group: '花部排列', label: '外轮展开角', description: '控制外轮三枚花被片展开角。', default: LILY_DEFAULTS.outerTilt, min: -10, max: 58, step: 1, unit: '°' },
  { id: 'innerTilt', type: 'number', group: '花部排列', label: '内轮展开角', description: '控制内轮三枚花被片展开角。', default: LILY_DEFAULTS.innerTilt, min: -10, max: 68, step: 1, unit: '°' },
  { id: 'outerCurlBoost', type: 'number', group: '花部排列', label: '外轮反卷补偿', description: '额外控制外轮末端反卷量。', default: LILY_DEFAULTS.outerCurlBoost, min: -0.2, max: 0.12, step: 0.005 },
  { id: 'innerCurlBoost', type: 'number', group: '花部排列', label: '内轮反卷补偿', description: '额外控制内轮末端反卷量。', default: LILY_DEFAULTS.innerCurlBoost, min: -0.2, max: 0.12, step: 0.005 },
  { id: 'stamenLength', type: 'number', group: '花蕊与斑点', label: '雄蕊长度', description: '控制花丝从花心向外伸出的长度。', default: LILY_DEFAULTS.stamenLength, min: 0.2, max: 0.7, step: 0.01 },
  { id: 'antherSize', type: 'number', group: '花蕊与斑点', label: '花药大小', description: '控制深褐色花药尺度。', default: LILY_DEFAULTS.antherSize, min: 0.04, max: 0.16, step: 0.005 },
  { id: 'spotVisible', type: 'boolean', group: '花蕊与斑点', label: '显示花瓣斑点', description: '控制花被片近花心的深色斑点。', default: LILY_DEFAULTS.spotVisible },
  { id: 'spotCount', type: 'number', group: '花蕊与斑点', label: '斑点数量', description: '控制六枚花被上的可见斑点数量。', default: LILY_DEFAULTS.spotCount, min: 0, max: 144, step: 6 },
  { id: 'spotColor', type: 'color', group: '花蕊与斑点', label: '斑点颜色', description: '控制花被斑点颜色。', default: LILY_DEFAULTS.spotColor },
  { id: 'filamentColor', type: 'color', group: '花蕊与斑点', label: '花丝颜色', description: '控制六枚花丝颜色。', default: LILY_DEFAULTS.filamentColor },
  { id: 'antherColor', type: 'color', group: '花蕊与斑点', label: '花药颜色', description: '控制六枚花药颜色。', default: LILY_DEFAULTS.antherColor },
  { id: 'stigmaColor', type: 'color', group: '花蕊与斑点', label: '柱头颜色', description: '控制中央柱头颜色。', default: LILY_DEFAULTS.stigmaColor },
] as const satisfies readonly ModelParameterSchema[]

export const LILY_PARAMETERS = createPetalFlowerParameterSchema(
  LILY_DEFAULTS,
  { organLabel: '花被片', geometryGroup: '花被片几何', extraParameters: extras },
)
export const LILY_CUSTOM_CONFIGURATION =
  lilyCustomConfiguration as ModelParameterConfiguration
