import type { ModelParameterConfiguration, ModelParameterSchema, ModelParameterValues } from './modelParameterTypes'
import hydrangeaCustomConfiguration from './configurations/hydrangea.custom.json'
import {
  BLOOM_DURATION_MAX,
  BLOOM_DURATION_MIN,
} from '../items/flower-collection/core/bloomAnimation'
const DEG_TO_RAD = Math.PI / 180
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/iu
function decimalPlaces(value: number) {
  const text = String(value).toLowerCase()
  if (text.includes('e-')) return Number(text.slice(text.indexOf('e-') + 2))
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0
}
export const HYDRANGEA_PETAL_PARAMETERS = [
  {
    id: 'renderQuality',
    type: 'select',
    group: '显示与渲染',
    label: '画质档位',
    description: '切换花瓣细分、材质、阴影和像素密度的综合质量预算。',
    default: 'high',
    options: [
      { value: 'ultra', label: '超高' }, { value: 'high', label: '高' },
      { value: 'medium', label: '中' }, { value: 'low', label: '低' },
    ],
  },
  {
    id: 'petalVisible',
    type: 'boolean',
    group: '显示与渲染',
    label: '显示花瓣',
    description: '控制所有装饰花瓣是否显示，花心与分枝保持可见。',
    default: true,
  },
  {
    id: 'bloomDuration',
    type: 'number',
    group: '开花与风动',
    label: '开花时长',
    description: '控制整组小花从花苞错峰展开到球形盛放所需的时间。',
    default: 3.3,
    min: BLOOM_DURATION_MIN,
    max: BLOOM_DURATION_MAX,
    step: 0.1,
    unit: '秒',
  },
  {
    id: 'petalLength',
    type: 'number',
    group: '花瓣几何',
    label: '花瓣长度',
    description: '控制花瓣从花心到末端的长度。',
    default: 0.17,
    min: 0.06,
    max: 0.32,
    step: 0.005,
  },
  {
    id: 'petalCurl',
    type: 'number',
    group: '花瓣几何',
    label: '纵向卷曲',
    description: '控制花瓣沿长度方向向外或向内卷曲。',
    default: 0.0306,
    min: -0.08,
    max: 0.1,
    step: 0.0001,
  },
  {
    id: 'petalCurlFocus',
    type: 'number',
    group: '花瓣几何',
    label: '卷曲焦点',
    description: '控制纵向卷曲集中在基部、全段或花瓣末端。',
    default: 1.52,
    min: 0.3,
    max: 4,
    step: 0.01,
  },
  {
    id: 'petalCup',
    type: 'number',
    group: '花瓣几何',
    label: '杯状深度',
    description: '控制花瓣横向浅杯的凹凸程度。',
    default: 0.0323,
    min: -0.05,
    max: 0.08,
    step: 0.0001,
  },
  {
    id: 'petalSideCurl',
    type: 'number',
    group: '花瓣几何',
    label: '边缘卷曲',
    description: '控制花瓣两侧边缘向上或向下翻卷。',
    default: 0.0119,
    min: -0.05,
    max: 0.06,
    step: 0.0001,
  },
  {
    id: 'petalWave',
    type: 'number',
    group: '花瓣几何',
    label: '边缘起伏',
    description: '控制花瓣边缘柔和波浪的幅度。',
    default: 0.00306,
    min: 0,
    max: 0.025,
    step: 0.00001,
  },
  {
    id: 'petalWaveCount',
    type: 'number',
    group: '花瓣几何',
    label: '起伏次数',
    description: '控制花瓣从基部到顶部的波浪密度。',
    default: 2.1,
    min: 0.5,
    max: 8,
    step: 0.1,
  },
  {
    id: 'petalAsymmetry',
    type: 'number',
    group: '花瓣几何',
    label: '左右不对称',
    description: '控制单片花瓣左右轮廓的自然偏差。',
    default: 0.034,
    min: -0.2,
    max: 0.2,
    step: 0.002,
  },
  {
    id: 'petalThickness',
    type: 'number',
    group: '花瓣几何',
    label: '花瓣厚度',
    description: '控制闭合薄壳厚度，最大值仍受自然薄壳上限保护。',
    default: 0.00027,
    min: 0.00005,
    max: 0.0005,
    step: 0.00001,
  },
  {
    id: 'petalTipRoundness',
    type: 'number',
    group: '花瓣几何',
    label: '顶部圆润度',
    description: '控制顶部从平缓宽圆到明显圆帽的程度。',
    default: 0.9,
    min: 0,
    max: 1.4,
    step: 0.01,
  },
  {
    id: 'petalTipNotch',
    type: 'number',
    group: '花瓣几何',
    label: '顶部浅缺口',
    description: '控制花瓣顶端中央向内收回的浅缺口深度。',
    default: 0,
    min: 0,
    max: 0.03,
    step: 0.0005,
  },
  {
    id: 'petalCupCenter',
    type: 'number',
    group: '花瓣几何',
    label: '杯深位置',
    description: '控制横向浅杯最明显的位置沿花瓣长度上下移动。',
    default: 0.46,
    min: 0.18,
    max: 0.82,
    step: 0.01,
  },
  {
    id: 'petalKeel',
    type: 'number',
    group: '花瓣几何',
    label: '中央脊高',
    description: '控制花瓣中央纵向脊线的立体隆起程度。',
    default: 0.032,
    min: -0.08,
    max: 0.18,
    step: 0.002,
  },
  {
    id: 'petalVeinStrength',
    type: 'number',
    group: '花瓣几何',
    label: '花脉强度',
    description: '控制放射花脉与花瓣底色混合的可见程度。',
    default: 0.34,
    min: 0,
    max: 0.8,
    step: 0.01,
  },
  {
    id: 'petalVeinCount',
    type: 'number',
    group: '花瓣几何',
    label: '花脉数量',
    description: '控制单片花瓣横向可见的放射花脉数量。',
    default: 5,
    min: 1,
    max: 12,
    step: 1,
    unit: '条',
  },
  {
    id: 'petalBaseWidth',
    type: 'number',
    group: '花瓣几何',
    label: '基部宽度',
    description: '控制花瓣连接花心位置的收束宽度。',
    default: 0.0262,
    min: 0.003,
    max: 0.12,
    step: 0.0001,
  },
  {
    id: 'petalLowerWidth',
    type: 'number',
    group: '花瓣几何',
    label: '下段宽度',
    description: '对应轮廓编辑器最下方节点的横向宽度。',
    default: 0.0617,
    min: 0.003,
    max: 0.2,
    step: 0.0001,
  },
  {
    id: 'petalMidLowerWidth',
    type: 'number',
    group: '花瓣几何',
    label: '中下段宽度',
    description: '对应轮廓编辑器第二个节点的横向宽度。',
    default: 0.0888,
    min: 0.003,
    max: 0.2,
    step: 0.0001,
  },
  {
    id: 'petalWidth',
    type: 'number',
    group: '花瓣几何',
    label: '中段宽度',
    description: '对应轮廓编辑器中间节点，也是花瓣轮廓的尺度基准。',
    default: 0.0935,
    min: 0.003,
    max: 0.2,
    step: 0.0001,
  },
  {
    id: 'petalUpperWidth',
    type: 'number',
    group: '花瓣几何',
    label: '中上段宽度',
    description: '对应轮廓编辑器第四个节点的横向宽度。',
    default: 0.086,
    min: 0.003,
    max: 0.2,
    step: 0.0001,
  },
  {
    id: 'petalTipWidth',
    type: 'number',
    group: '花瓣几何',
    label: '顶部宽度',
    description: '对应轮廓编辑器顶部节点的横向宽度。',
    default: 0.0468,
    min: 0.003,
    max: 0.2,
    step: 0.0001,
  },
  {
    id: 'petalCount',
    type: 'number',
    group: '小花组合',
    label: '每朵花瓣数',
    description: '控制每朵装饰花围绕花心生成的花瓣数量。',
    default: 4,
    min: 2,
    max: 12,
    step: 1,
    unit: '片',
  },
  {
    id: 'floretScale',
    type: 'number',
    group: '小花组合',
    label: '小花整体尺度',
    description: '统一缩放每朵小花的四片花瓣与花心，不改变花球端点。',
    default: 1,
    min: 0.3,
    max: 2,
    step: 0.01,
  },
  {
    id: 'floretRootOffset',
    type: 'number',
    group: '小花组合',
    label: '花瓣根部间距',
    description: '控制四片花瓣根部离开花心的距离与中心重叠程度。',
    default: 0.004,
    min: 0,
    max: 0.03,
    step: 0.0005,
  },
  {
    id: 'floretDepthStagger',
    type: 'number',
    group: '小花组合',
    label: '花瓣深度错层',
    description: '让相邻花瓣沿花面法线前后错开，避免四片完全共面。',
    default: 0,
    min: -0.03,
    max: 0.03,
    step: 0.0005,
  },
  {
    id: 'floretAlternatingScale',
    type: 'number',
    group: '小花组合',
    label: '交替大小差',
    description: '控制相邻花瓣一大一小的自然尺度差。',
    default: 0,
    min: 0,
    max: 0.25,
    step: 0.005,
  },
  {
    id: 'floretTiltVariation',
    type: 'number',
    group: '小花组合',
    label: '交替张角差',
    description: '控制相邻花瓣张开角度的前后层次差。',
    default: 0,
    min: 0,
    max: 20,
    step: 0.5,
    unit: '°',
  },
  {
    id: 'bloomRadius',
    type: 'number',
    group: '花球排列',
    label: '花球半径',
    description: '控制整组绣球花冠及其承托分枝的空间半径。',
    default: 0.78,
    min: 0.25,
    max: 1.8,
    step: 0.01,
  },
  {
    id: 'cymeCount',
    type: 'number',
    group: '花球排列',
    label: '聚伞簇数量',
    description: '控制花球表面的聚伞花簇密度，每簇保持七朵小花。',
    default: 18,
    min: 4,
    max: 48,
    step: 1,
    unit: '簇',
  },
  {
    id: 'petalOpenAngle',
    type: 'number',
    group: '小花组合',
    label: '张开角度',
    description: '控制花瓣相对花面的整体抬升或下压角度。',
    default: 5.3,
    min: -20,
    max: 45,
    step: 0.1,
    unit: '°',
  },
  {
    id: 'petalRotationOffset',
    type: 'number',
    group: '小花组合',
    label: '旋转偏移',
    description: '控制每朵小花全部花瓣围绕花心的整体旋转。',
    default: 0,
    min: -180,
    max: 180,
    step: 1,
    unit: '°',
  },
  {
    id: 'petalVariation',
    type: 'number',
    group: '小花组合',
    label: '自然差异',
    description: '控制不同花瓣之间的尺寸、角度与颜色微差。',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    id: 'petalBaseTint',
    type: 'color',
    group: '花瓣表面',
    label: '花瓣根部色',
    description: '控制单片花瓣从花心长出的根部渐变颜色。',
    default: '#F1F5FF',
  },
  {
    id: 'petalTipTint',
    type: 'color',
    group: '花瓣表面',
    label: '花瓣边缘色',
    description: '控制单片花瓣顶部与外缘的渐变颜色。',
    default: '#DCE6FF',
  },
  {
    id: 'petalCenterTint',
    type: 'color',
    group: '花瓣表面',
    label: '花瓣中脊色',
    description: '控制单片花瓣中央脊线附近的提亮颜色。',
    default: '#FFFFFF',
  },
  {
    id: 'petalRoughness',
    type: 'number',
    group: '花瓣表面',
    label: '表面粗糙度',
    description: '控制花瓣高光从柔和漫射到集中高光的程度。',
    default: 0.72,
    min: 0.25,
    max: 1,
    step: 0.01,
  },
  {
    id: 'petalSheen',
    type: 'number',
    group: '花瓣表面',
    label: '柔光强度',
    description: '控制花瓣纤维表面的柔和边缘反光。',
    default: 0.48,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'petalTransmission',
    type: 'number',
    group: '花瓣表面',
    label: '透光强度',
    description: '控制薄花瓣受背光时的透光程度。',
    default: 0.008,
    min: 0,
    max: 0.2,
    step: 0.002,
  },
  {
    id: 'petalDeepColor',
    type: 'color',
    group: '花球配色',
    label: '深部颜色',
    description: '控制花冠遮挡较深区域的花瓣颜色。',
    default: '#6F88D5',
  },
  {
    id: 'petalMainColor',
    type: 'color',
    group: '花球配色',
    label: '主体颜色',
    description: '控制花冠中占比最高的主体颜色。',
    default: '#7F96DC',
  },
  {
    id: 'petalMiddleColor',
    type: 'color',
    group: '花球配色',
    label: '中间颜色',
    description: '控制深浅花瓣之间的过渡颜色。',
    default: '#898BD5',
  },
  {
    id: 'petalLightColor',
    type: 'color',
    group: '花球配色',
    label: '浅部颜色',
    description: '控制受光和花冠顶部区域的浅色。',
    default: '#8FA1E2',
  },
  {
    id: 'petalPurpleColor',
    type: 'color',
    group: '花球配色',
    label: '紫调颜色',
    description: '控制蓝紫花冠中的紫色变化。',
    default: '#9489D9',
  },
  {
    id: 'petalVeinColor',
    type: 'color',
    group: '花球配色',
    label: '花脉颜色',
    description: '控制单片花瓣纵向花脉的颜色。',
    default: '#7091DA',
  },
  {
    id: 'leafVisible',
    type: 'boolean',
    group: '叶片形态',
    label: '显示叶片',
    description: '控制花冠下方两片对生阔叶是否显示。',
    default: true,
  },
  {
    id: 'leafLength',
    type: 'number',
    group: '叶片形态',
    label: '叶片长度',
    description: '控制两片阔叶从叶柄到叶尖的整体长度。',
    default: 1.145,
    min: 0.45,
    max: 1.8,
    step: 0.005,
  },
  {
    id: 'leafWidth',
    type: 'number',
    group: '叶片形态',
    label: '叶片宽度',
    description: '控制叶片中段的横向宽度。',
    default: 0.335,
    min: 0.12,
    max: 0.65,
    step: 0.005,
  },
  {
    id: 'leafOpenAngle',
    type: 'number',
    group: '叶片形态',
    label: '展开角度',
    description: '控制左右叶片围绕主茎向两侧展开的角度。',
    default: 74,
    min: 25,
    max: 125,
    step: 1,
    unit: '°',
  },
  {
    id: 'leafHeight',
    type: 'number',
    group: '叶片形态',
    label: '垂直位置',
    description: '控制叶片相对花球底部连接主茎位置的整体高低。',
    default: -0.26,
    min: -0.35,
    max: 0.2,
    step: 0.01,
  },
  {
    id: 'leafSerration',
    type: 'number',
    group: '叶片形态',
    label: '锯齿强度',
    description: '控制叶缘锯齿向外伸出的幅度。',
    default: 0.032,
    min: 0,
    max: 0.08,
    step: 0.001,
  },
  {
    id: 'leafSerrationCount',
    type: 'number',
    group: '叶片形态',
    label: '锯齿数量',
    description: '控制一侧叶缘从叶基到叶尖的锯齿密度。',
    default: 18,
    min: 4,
    max: 32,
    step: 1,
    unit: '组',
  },
  {
    id: 'leafCup',
    type: 'number',
    group: '叶片形态',
    label: '杯状深度',
    description: '控制叶片横向凹凸与主叶脉隆起。',
    default: 0.09,
    min: -0.12,
    max: 0.2,
    step: 0.002,
  },
  {
    id: 'leafCurl',
    type: 'number',
    group: '叶片形态',
    label: '末端卷曲',
    description: '控制叶片沿长度方向向上或向下弯曲。',
    default: -0.032,
    min: -0.18,
    max: 0.18,
    step: 0.002,
  },
  {
    id: 'leafWave',
    type: 'number',
    group: '叶片形态',
    label: '边缘起伏',
    description: '控制锯齿叶缘之外的柔和波浪。',
    default: 0.01,
    min: 0,
    max: 0.05,
    step: 0.001,
  },
  {
    id: 'leafBaseColor',
    type: 'color',
    group: '叶片颜色',
    label: '基部颜色',
    description: '控制叶片靠近叶柄和遮挡区域的颜色。',
    default: '#244B27',
  },
  {
    id: 'leafTipColor',
    type: 'color',
    group: '叶片颜色',
    label: '顶部颜色',
    description: '控制叶片外缘与叶尖的颜色。',
    default: '#365E2E',
  },
  {
    id: 'leafVeinColor',
    type: 'color',
    group: '叶片颜色',
    label: '叶脉颜色',
    description: '控制主叶脉与侧叶脉的颜色。',
    default: '#607E4E',
  },
  {
    id: 'stemVisible',
    type: 'boolean',
    group: '茎与分枝',
    label: '显示主茎',
    description: '控制花冠下方切枝主茎是否显示。',
    default: true,
  },
  {
    id: 'stemLength',
    type: 'number',
    group: '茎与分枝',
    label: '主茎长度',
    description: '控制可见切枝从花冠底部向下延伸的长度。',
    default: 0.5,
    min: 0.15,
    max: 3.5,
    step: 0.01,
  },
  {
    id: 'stemRadius',
    type: 'number',
    group: '茎与分枝',
    label: '主茎粗细',
    description: '控制主茎的横截面半径。',
    default: 0.046,
    min: 0.015,
    max: 0.09,
    step: 0.001,
  },
  {
    id: 'stemCurve',
    type: 'number',
    group: '茎与分枝',
    label: '主茎弯曲',
    description: '控制主茎中段向左右偏移的弯曲量。',
    default: 0.004,
    min: -0.6,
    max: 0.6,
    step: 0.002,
  },
  {
    id: 'stemColor',
    type: 'color',
    group: '茎与分枝',
    label: '主茎颜色',
    description: '控制花冠下方主茎的表面颜色。',
    default: '#365B27',
  },
  {
    id: 'branchVisible',
    type: 'boolean',
    group: '茎与分枝',
    label: '显示分枝',
    description: '控制花球内部承托小花的多级聚伞分枝是否显示。',
    default: true,
  },
  {
    id: 'branchThickness',
    type: 'number',
    group: '茎与分枝',
    label: '分枝粗细',
    description: '统一缩放花球内部各层分枝的半径。',
    default: 1,
    min: 0.35,
    max: 2.2,
    step: 0.05,
  },
  {
    id: 'branchMainColor',
    type: 'color',
    group: '茎与分枝',
    label: '主分枝颜色',
    description: '控制花序中轴和最粗分枝的颜色。',
    default: '#365B27',
  },
  {
    id: 'branchSecondaryColor',
    type: 'color',
    group: '茎与分枝',
    label: '次分枝颜色',
    description: '控制连接聚伞簇的次级分枝颜色。',
    default: '#42672C',
  },
  {
    id: 'branchTerminalColor',
    type: 'color',
    group: '茎与分枝',
    label: '末端分枝颜色',
    description: '控制直接连接小花的细分枝颜色。',
    default: '#345732',
  },
  {
    id: 'centerVisible',
    type: 'boolean',
    group: '花心',
    label: '显示花心',
    description: '控制每朵装饰花中央的真实小花花心是否显示。',
    default: true,
  },
  {
    id: 'centerSize',
    type: 'number',
    group: '花心',
    label: '花心大小',
    description: '控制每个球状花心的半径。',
    default: 0.0048,
    min: 0.001,
    max: 0.012,
    step: 0.0001,
  },
  {
    id: 'centerColor',
    type: 'color',
    group: '花心',
    label: '花心颜色',
    description: '控制所有小花中央花心的颜色。',
    default: '#829B90',
  },
] as const satisfies readonly ModelParameterSchema[]
export const HYDRANGEA_CUSTOM_CONFIGURATION =
  hydrangeaCustomConfiguration as ModelParameterConfiguration
export interface HydrangeaPetalSettings {
  visible: boolean
  flatShading: boolean
  count: number
  openAngle: number
  rotationOffset: number
  variation: number
  bloomRadius: number
  cymeCount: number
  length: number
  width: number
  baseWidth: number
  lowerWidth: number
  midLowerWidth: number
  upperWidth: number
  tipWidth: number
  cup: number
  curl: number
  curlFocus: number
  sideCurl: number
  wave: number
  waveCount: number
  asymmetry: number
  thickness: number
  tipRoundness: number
  tipNotch: number
  cupCenter: number
  keel: number
  veinStrength: number
  veinCount: number
  baseColor: string
  tipColor: string
  centerColor: string
  material: {
    roughness: number
    sheen: number
    transmission: number
  }
  floret: {
    scale: number
    rootOffset: number
    depthStagger: number
    alternatingScale: number
    tiltVariation: number
  }
  widthProfile: readonly [number, number, number, number, number, number]
  palette: readonly [string, string, string, string, string]
  veinColor: string
  leaf: {
    visible: boolean
    length: number
    width: number
    openAngle: number
    height: number
    serration: number
    serrationCount: number
    cup: number
    curl: number
    wave: number
    baseColor: string
    tipColor: string
    veinColor: string
  }
  stem: {
    visible: boolean
    length: number
    radius: number
    curve: number
    color: string
  }
  branches: {
    visible: boolean
    thickness: number
    mainColor: string
    secondaryColor: string
    terminalColor: string
  }
  center: {
    visible: boolean
    size: number
    color: string
  }
}
const defaults = Object.fromEntries(
  HYDRANGEA_PETAL_PARAMETERS.map((parameter) => [
    parameter.id,
    parameter.default,
  ]),
)
function readNumber(
  values: ModelParameterValues | undefined,
  id: string,
) {
  const schema = HYDRANGEA_PETAL_PARAMETERS.find(
    (parameter) => parameter.id === id && parameter.type === 'number',
  )
  if (!schema || schema.type !== 'number') {
    throw new Error(`绣球花瓣缺少数值参数：${id}`)
  }
  const candidate = Number(values?.[id] ?? defaults[id])
  const finite = Number.isFinite(candidate) ? candidate : schema.default
  const clamped = Math.min(schema.max, Math.max(schema.min, finite))
  const steps = Math.round((clamped - schema.min) / schema.step)
  const aligned = Math.min(
    schema.max,
    Math.max(schema.min, schema.min + steps * schema.step),
  )
  const precision = Math.max(
    decimalPlaces(schema.min),
    decimalPlaces(schema.max),
    decimalPlaces(schema.step),
  )
  return Number(aligned.toFixed(precision))
}
function readColor(
  values: ModelParameterValues | undefined,
  id: string,
) {
  const fallback = String(defaults[id])
  const candidate = values?.[id]
  return typeof candidate === 'string' && HEX_COLOR_PATTERN.test(candidate)
    ? candidate.toUpperCase()
    : fallback
}
function readBoolean(
  values: ModelParameterValues | undefined,
  id: string,
) {
  const candidate = values?.[id]
  return typeof candidate === 'boolean' ? candidate : Boolean(defaults[id])
}
export function resolveHydrangeaPetalSettings(
  values?: ModelParameterValues,
): HydrangeaPetalSettings {
  return {
    visible: readBoolean(values, 'petalVisible'),
    flatShading: false,
    count: Math.round(readNumber(values, 'petalCount')),
    openAngle: readNumber(values, 'petalOpenAngle') * DEG_TO_RAD,
    rotationOffset: readNumber(values, 'petalRotationOffset') * DEG_TO_RAD,
    variation: readNumber(values, 'petalVariation'),
    bloomRadius: readNumber(values, 'bloomRadius'),
    cymeCount: Math.round(readNumber(values, 'cymeCount')),
    length: readNumber(values, 'petalLength'),
    width: readNumber(values, 'petalWidth'),
    baseWidth: readNumber(values, 'petalBaseWidth'),
    lowerWidth: readNumber(values, 'petalLowerWidth'),
    midLowerWidth: readNumber(values, 'petalMidLowerWidth'),
    upperWidth: readNumber(values, 'petalUpperWidth'),
    tipWidth: readNumber(values, 'petalTipWidth'),
    cup: readNumber(values, 'petalCup'),
    curl: readNumber(values, 'petalCurl'),
    curlFocus: readNumber(values, 'petalCurlFocus'),
    sideCurl: readNumber(values, 'petalSideCurl'),
    wave: readNumber(values, 'petalWave'),
    waveCount: readNumber(values, 'petalWaveCount'),
    asymmetry: readNumber(values, 'petalAsymmetry'),
    thickness: readNumber(values, 'petalThickness'),
    tipRoundness: readNumber(values, 'petalTipRoundness'),
    tipNotch: readNumber(values, 'petalTipNotch'),
    cupCenter: readNumber(values, 'petalCupCenter'),
    keel: readNumber(values, 'petalKeel'),
    veinStrength: readNumber(values, 'petalVeinStrength'),
    veinCount: Math.round(readNumber(values, 'petalVeinCount')),
    baseColor: readColor(values, 'petalBaseTint'),
    tipColor: readColor(values, 'petalTipTint'),
    centerColor: readColor(values, 'petalCenterTint'),
    material: {
      roughness: readNumber(values, 'petalRoughness'),
      sheen: readNumber(values, 'petalSheen'),
      transmission: readNumber(values, 'petalTransmission'),
    },
    floret: {
      scale: readNumber(values, 'floretScale'),
      rootOffset: readNumber(values, 'floretRootOffset'),
      depthStagger: readNumber(values, 'floretDepthStagger'),
      alternatingScale: readNumber(values, 'floretAlternatingScale'),
      tiltVariation: readNumber(values, 'floretTiltVariation') * DEG_TO_RAD,
    },
    widthProfile: (() => {
      const width = Math.max(readNumber(values, 'petalWidth'), 0.0001)
      return [
        readNumber(values, 'petalBaseWidth') / width,
        readNumber(values, 'petalLowerWidth') / width,
        readNumber(values, 'petalMidLowerWidth') / width,
        1,
        readNumber(values, 'petalUpperWidth') / width,
        readNumber(values, 'petalTipWidth') / width,
      ] as const
    })(),
    palette: [
      readColor(values, 'petalDeepColor'),
      readColor(values, 'petalMainColor'),
      readColor(values, 'petalMiddleColor'),
      readColor(values, 'petalLightColor'),
      readColor(values, 'petalPurpleColor'),
    ],
    veinColor: readColor(values, 'petalVeinColor'),
    leaf: {
      visible: readBoolean(values, 'leafVisible'),
      length: readNumber(values, 'leafLength'),
      width: readNumber(values, 'leafWidth'),
      openAngle: readNumber(values, 'leafOpenAngle') * DEG_TO_RAD,
      height: readNumber(values, 'leafHeight'),
      serration: readNumber(values, 'leafSerration'),
      serrationCount: Math.round(readNumber(values, 'leafSerrationCount')),
      cup: readNumber(values, 'leafCup'),
      curl: readNumber(values, 'leafCurl'),
      wave: readNumber(values, 'leafWave'),
      baseColor: readColor(values, 'leafBaseColor'),
      tipColor: readColor(values, 'leafTipColor'),
      veinColor: readColor(values, 'leafVeinColor'),
    },
    stem: {
      visible: readBoolean(values, 'stemVisible'),
      length: readNumber(values, 'stemLength'),
      radius: readNumber(values, 'stemRadius'),
      curve: readNumber(values, 'stemCurve'),
      color: readColor(values, 'stemColor'),
    },
    branches: {
      visible: readBoolean(values, 'branchVisible'),
      thickness: readNumber(values, 'branchThickness'),
      mainColor: readColor(values, 'branchMainColor'),
      secondaryColor: readColor(values, 'branchSecondaryColor'),
      terminalColor: readColor(values, 'branchTerminalColor'),
    },
    center: {
      visible: readBoolean(values, 'centerVisible'),
      size: readNumber(values, 'centerSize'),
      color: readColor(values, 'centerColor'),
    },
  }
}
