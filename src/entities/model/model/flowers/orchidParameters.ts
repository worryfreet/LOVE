import orchidCustomConfiguration from '../configurations/orchid.custom.json'
import type { ModelParameterConfiguration, ModelParameterSchema } from '../modelParameterTypes'
import { createPetalFlowerParameterSchema, type PetalFlowerParameterDefaults } from '../editableFlowerParameters'

export const ORCHID_DEFAULTS = {
  renderQuality: 'ultra', petalVisible: true, bloomDuration: 3.2,
  petalLength: 0.52, petalWidth: 0.29, petalBaseWidth: 0.062,
  petalLowerWidth: 0.17, petalMidLowerWidth: 0.255, petalUpperWidth: 0.24,
  petalTipWidth: 0.21, petalCup: 0.085, petalCupPosition: 0.52,
  petalCurl: -0.035, petalCurlFocus: 1.82, petalSideCurl: 0.03,
  petalEdgeWave: 0.008, petalWaveCount: 3.5, petalAsymmetry: 0.025,
  petalThickness: 0.001, petalKeel: 0.035, petalVeinStrength: 0.07,
  petalVeinCount: 10, petalRoughness: 0.63, petalSheen: 0.48,
  petalTransmission: 0.065, textureNormalStrength: 0.19,
  petalBaseColor: '#F0C4E5', petalMainColor: '#D779CC',
  petalTipColor: '#EEA7DE', petalVeinColor: '#AF389F',
  leafVisible: true, leafLength: 1.26, leafWidth: 0.34, leafHeight: -0.11,
  leafSpread: 66, leafCup: 0.105, leafCurl: -0.1, leafWave: 0.006,
  leafSerration: 0, leafBaseColor: '#28521E', leafTipColor: '#6C923F',
  leafVeinColor: '#9BAF64', stemVisible: true, stemLength: 2.3,
  stemRadius: 0.03, stemCurve: 0.24, stemColor: '#4C6A2D',
  bloomCount: 7, bloomScale: 1.08, bloomSpacing: 0.38,
  archWidth: 1.6, archHeight: 0.78, archDroop: 0.52,
  sepalScale: 0.92, wingScale: 1.12,
  lipLength: 0.29, lipWidth: 0.13, lipCup: 0.11, lipCurl: -0.035,
  lipBaseColor: '#8F1458', lipTipColor: '#E93698', lipCoreColor: '#F4C34D',
  budCount: 5, budSize: 0.12, potVisible: true, potOpacity: 0.34,
  rootVisible: true,
} as const satisfies PetalFlowerParameterDefaults & Record<string, string | number | boolean>

const extras = [
  { id: 'bloomCount', type: 'number', group: '花序排列', label: '开放花朵数量', description: '控制弓形花梗上的开放花朵数量。', default: ORCHID_DEFAULTS.bloomCount, min: 1, max: 16, step: 1 },
  { id: 'bloomScale', type: 'number', group: '花序排列', label: '单花整体尺度', description: '控制每朵蝶形花整体尺度。', default: ORCHID_DEFAULTS.bloomScale, min: 0.3, max: 2, step: 0.01 },
  { id: 'bloomSpacing', type: 'number', group: '花序排列', label: '花朵间距', description: '控制相邻花朵沿弓形花梗的间距。', default: ORCHID_DEFAULTS.bloomSpacing, min: 0.2, max: 0.58, step: 0.01 },
  { id: 'archWidth', type: 'number', group: '花序排列', label: '花梗横向跨度', description: '控制弓形总状花序左右跨度。', default: ORCHID_DEFAULTS.archWidth, min: 0.3, max: 3, step: 0.01 },
  { id: 'archHeight', type: 'number', group: '花序排列', label: '花梗拱高', description: '控制花序弧线最高点高度。', default: ORCHID_DEFAULTS.archHeight, min: 0.35, max: 1.1, step: 0.01 },
  { id: 'archDroop', type: 'number', group: '花序排列', label: '末端下垂', description: '控制花序末端向下弯垂程度。', default: ORCHID_DEFAULTS.archDroop, min: 0.12, max: 0.9, step: 0.01 },
  { id: 'sepalScale', type: 'number', group: '单花组合', label: '萼片尺度', description: '控制后层三枚萼片相对尺度。', default: ORCHID_DEFAULTS.sepalScale, min: 0.65, max: 1.2, step: 0.01 },
  { id: 'wingScale', type: 'number', group: '单花组合', label: '翼瓣尺度', description: '控制左右两枚宽翼瓣相对尺度。', default: ORCHID_DEFAULTS.wingScale, min: 0.8, max: 1.45, step: 0.01 },
  { id: 'lipLength', type: 'number', group: '唇瓣与花心', label: '唇瓣长度', description: '控制前下方三裂唇瓣长度。', default: ORCHID_DEFAULTS.lipLength, min: 0.16, max: 0.44, step: 0.005 },
  { id: 'lipWidth', type: 'number', group: '唇瓣与花心', label: '唇瓣宽度', description: '控制三裂唇瓣整体宽度。', default: ORCHID_DEFAULTS.lipWidth, min: 0.07, max: 0.22, step: 0.005 },
  { id: 'lipCup', type: 'number', group: '唇瓣与花心', label: '唇瓣槽深', description: '控制唇瓣中央深槽。', default: ORCHID_DEFAULTS.lipCup, min: 0, max: 0.2, step: 0.005 },
  { id: 'lipCurl', type: 'number', group: '唇瓣与花心', label: '唇瓣回钩', description: '控制唇瓣前端下垂与回钩。', default: ORCHID_DEFAULTS.lipCurl, min: -0.18, max: 0.12, step: 0.005 },
  { id: 'lipBaseColor', type: 'color', group: '唇瓣与花心', label: '唇瓣基色', description: '控制唇瓣深紫红基色。', default: ORCHID_DEFAULTS.lipBaseColor },
  { id: 'lipTipColor', type: 'color', group: '唇瓣与花心', label: '唇瓣顶色', description: '控制唇瓣前端颜色。', default: ORCHID_DEFAULTS.lipTipColor },
  { id: 'lipCoreColor', type: 'color', group: '唇瓣与花心', label: '花喉颜色', description: '控制唇瓣中央黄色花喉。', default: ORCHID_DEFAULTS.lipCoreColor },
  { id: 'budCount', type: 'number', group: '盆器与花苞', label: '末端花苞数量', description: '控制花序末端未开放花苞数量。', default: ORCHID_DEFAULTS.budCount, min: 0, max: 7, step: 1 },
  { id: 'budSize', type: 'number', group: '盆器与花苞', label: '花苞大小', description: '控制末端花苞尺度。', default: ORCHID_DEFAULTS.budSize, min: 0.06, max: 0.2, step: 0.005 },
  { id: 'potVisible', type: 'boolean', group: '盆器与花苞', label: '显示透明盆', description: '控制透明盆器和基质是否显示。', default: ORCHID_DEFAULTS.potVisible },
  { id: 'potOpacity', type: 'number', group: '盆器与花苞', label: '盆器透明度', description: '控制透明盆壁不透明程度。', default: ORCHID_DEFAULTS.potOpacity, min: 0.12, max: 0.75, step: 0.01 },
  { id: 'rootVisible', type: 'boolean', group: '盆器与花苞', label: '显示可见根', description: '控制盆内肉质根系是否显示。', default: ORCHID_DEFAULTS.rootVisible },
] as const satisfies readonly ModelParameterSchema[]

export const ORCHID_PARAMETERS = createPetalFlowerParameterSchema(
  ORCHID_DEFAULTS,
  { organLabel: '翼瓣', geometryGroup: '翼瓣几何', extraParameters: extras },
)
export const ORCHID_CUSTOM_CONFIGURATION =
  orchidCustomConfiguration as ModelParameterConfiguration
