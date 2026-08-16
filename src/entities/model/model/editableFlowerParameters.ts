import type { ModelParameterSchema } from './modelParameterTypes'
import {
  BLOOM_DURATION_MAX,
  BLOOM_DURATION_MIN,
} from '../items/flower-collection/core/bloomAnimation'

export interface PetalFlowerParameterDefaults {
  renderQuality: string
  petalVisible: boolean
  bloomDuration: number
  petalLength: number
  petalWidth: number
  petalBaseWidth: number
  petalLowerWidth: number
  petalMidLowerWidth: number
  petalUpperWidth: number
  petalTipWidth: number
  petalCup: number
  petalCupPosition: number
  petalCurl: number
  petalCurlFocus: number
  petalSideCurl: number
  petalEdgeWave: number
  petalWaveCount: number
  petalAsymmetry: number
  petalThickness: number
  petalKeel: number
  petalVeinStrength: number
  petalVeinCount: number
  petalRoughness: number
  petalSheen: number
  petalTransmission: number
  textureNormalStrength: number
  petalBaseColor: string
  petalMainColor: string
  petalTipColor: string
  petalVeinColor: string
  leafVisible: boolean
  leafLength: number
  leafWidth: number
  leafHeight: number
  leafSpread: number
  leafCup: number
  leafCurl: number
  leafWave: number
  leafSerration: number
  leafBaseColor: string
  leafTipColor: string
  leafVeinColor: string
  stemVisible: boolean
  stemLength: number
  stemRadius: number
  stemCurve: number
  /** 仅用于单一主花头；花序和藤本物种不提供该参数。 */
  headStemBend?: number
  stemColor: string
}

export interface PetalFlowerParameterOptions {
  organLabel: string
  geometryGroup?: string
  extraParameters?: readonly ModelParameterSchema[]
}

/**
 * 六种独立花瓣型花共享参数结构，但默认值由各物种文件独立持有，便于保存后
 * 精确提升回对应代码默认值，不让一个物种的调参污染另一个物种。
 */
export function createPetalFlowerParameterSchema(
  defaults: PetalFlowerParameterDefaults,
  {
    organLabel,
    geometryGroup = '单瓣几何',
    extraParameters = [],
  }: PetalFlowerParameterOptions,
): readonly ModelParameterSchema[] {
  const geometryDescription = (property: string) =>
    `控制${organLabel}${property}，整株与顶部真实三维预览同步更新。`
  return [
    {
      id: 'renderQuality', type: 'select', group: '显示与渲染', label: '画质档位',
      description: '切换曲面细分、材质、贴图、阴影和像素密度的综合预算。',
      default: defaults.renderQuality,
      options: [
        { value: 'ultra', label: '超高' }, { value: 'high', label: '高' },
        { value: 'medium', label: '中' }, { value: 'low', label: '低' },
      ],
    },
    {
      id: 'petalVisible', type: 'boolean', group: '显示与渲染',
      label: `显示${organLabel}`, description: `控制全部${organLabel}是否显示。`,
      default: defaults.petalVisible,
    },
    {
      id: 'bloomDuration', type: 'number', group: '开花与风动',
      label: '开花时长', description: '控制花苞完整展开到盛放状态所需的时间。',
      default: defaults.bloomDuration,
      min: BLOOM_DURATION_MIN, max: BLOOM_DURATION_MAX, step: 0.1, unit: '秒',
    },
    {
      id: 'petalLength', type: 'number', group: geometryGroup, label: `${organLabel}长度`,
      description: geometryDescription('从基部到末端的长度'), default: defaults.petalLength,
      min: 0.02, max: 2.2, step: 0.005,
    },
    {
      id: 'petalWidth', type: 'number', group: geometryGroup, label: `${organLabel}宽度`,
      description: geometryDescription('最宽位置的半宽'), default: defaults.petalWidth,
      min: 0.003, max: 1.2, step: 0.002,
    },
    {
      id: 'petalBaseWidth', type: 'number', group: geometryGroup, label: '基部宽度',
      description: geometryDescription('根部收束宽度'), default: defaults.petalBaseWidth,
      min: 0.001, max: 0.7, step: 0.001,
    },
    {
      id: 'petalLowerWidth', type: 'number', group: geometryGroup, label: '下段宽度',
      description: geometryDescription('下段轮廓宽度'), default: defaults.petalLowerWidth,
      min: 0.002, max: 0.95, step: 0.002,
    },
    {
      id: 'petalMidLowerWidth', type: 'number', group: geometryGroup, label: '中下段宽度',
      description: geometryDescription('中下段轮廓宽度'), default: defaults.petalMidLowerWidth,
      min: 0.002, max: 1.2, step: 0.002,
    },
    {
      id: 'petalUpperWidth', type: 'number', group: geometryGroup, label: '上段宽度',
      description: geometryDescription('上段轮廓宽度'), default: defaults.petalUpperWidth,
      min: 0.002, max: 1.2, step: 0.002,
    },
    {
      id: 'petalTipWidth', type: 'number', group: geometryGroup, label: '末端宽度',
      description: geometryDescription('末端轮廓宽度'), default: defaults.petalTipWidth,
      min: 0.001, max: 0.95, step: 0.001,
    },
    {
      id: 'petalCup', type: 'number', group: geometryGroup, label: '杯状深度',
      description: geometryDescription('横向杯深'), default: defaults.petalCup,
      min: -0.6, max: 0.9, step: 0.002,
    },
    {
      id: 'petalCupPosition', type: 'number', group: geometryGroup, label: '杯深位置',
      description: geometryDescription('最大杯深沿长度的位置'), default: defaults.petalCupPosition,
      min: 0.12, max: 0.88, step: 0.01,
    },
    {
      id: 'petalCurl', type: 'number', group: geometryGroup, label: '纵向卷曲',
      description: geometryDescription('沿长度方向的真实弯曲'), default: defaults.petalCurl,
      min: -1.2, max: 1.2, step: 0.002,
    },
    {
      id: 'petalCurlFocus', type: 'number', group: geometryGroup, label: '卷曲焦点',
      description: geometryDescription('卷曲向基部或末端集中的程度'), default: defaults.petalCurlFocus,
      min: 0.35, max: 3.4, step: 0.01,
    },
    {
      id: 'petalSideCurl', type: 'number', group: geometryGroup, label: '边缘卷曲',
      description: geometryDescription('左右边缘卷起量'), default: defaults.petalSideCurl,
      min: -3, max: 3, step: 0.01,
    },
    {
      id: 'petalEdgeWave', type: 'number', group: geometryGroup, label: '边缘起伏',
      description: geometryDescription('边缘柔和波浪幅度'), default: defaults.petalEdgeWave,
      min: 0, max: 0.25, step: 0.001,
    },
    {
      id: 'petalWaveCount', type: 'number', group: geometryGroup, label: '起伏次数',
      description: geometryDescription('边缘波浪次数'), default: defaults.petalWaveCount,
      min: 1, max: 12, step: 0.5,
    },
    {
      id: 'petalAsymmetry', type: 'number', group: geometryGroup, label: '左右不对称',
      description: geometryDescription('自然左右差异'), default: defaults.petalAsymmetry,
      min: -0.6, max: 0.6, step: 0.01,
    },
    {
      id: 'petalThickness', type: 'number', group: geometryGroup, label: '薄壳厚度',
      description: geometryDescription('闭合薄壳厚度请求值'), default: defaults.petalThickness,
      min: 0.00005, max: 0.05, step: 0.0001,
    },
    {
      id: 'petalKeel', type: 'number', group: geometryGroup, label: '中央背脊',
      description: geometryDescription('中央龙骨隆起强度'), default: defaults.petalKeel,
      min: 0, max: 0.3, step: 0.002,
    },
    {
      id: 'petalVeinStrength', type: 'number', group: geometryGroup, label: '花脉强度',
      description: geometryDescription('程序化纵脉参与程度'), default: defaults.petalVeinStrength,
      min: 0, max: 0.5, step: 0.01,
    },
    {
      id: 'petalVeinCount', type: 'number', group: geometryGroup, label: '花脉数量',
      description: geometryDescription('纵向放射脉数量'), default: defaults.petalVeinCount,
      min: 0, max: 20, step: 1,
    },
    {
      id: 'petalRoughness', type: 'number', group: '表面材质', label: '表面粗糙度',
      description: `控制${organLabel}高光扩散程度。`, default: defaults.petalRoughness,
      min: 0.25, max: 1, step: 0.01,
    },
    {
      id: 'petalSheen', type: 'number', group: '表面材质', label: '柔光强度',
      description: `控制${organLabel}组织的柔和边缘反光。`, default: defaults.petalSheen,
      min: 0, max: 1, step: 0.01,
    },
    {
      id: 'petalTransmission', type: 'number', group: '表面材质', label: '透光强度',
      description: `控制${organLabel}薄组织透光量。`, default: defaults.petalTransmission,
      min: 0, max: 0.45, step: 0.01,
    },
    {
      id: 'textureNormalStrength', type: 'number', group: '表面材质', label: '纹理凹凸',
      description: '控制贴图中的纵脉与细褶皱凹凸强度。', default: defaults.textureNormalStrength,
      min: 0, max: 0.8, step: 0.01,
    },
    {
      id: 'petalBaseColor', type: 'color', group: '花瓣配色', label: '基部颜色',
      description: `控制${organLabel}根部颜色。`, default: defaults.petalBaseColor,
    },
    {
      id: 'petalMainColor', type: 'color', group: '花瓣配色', label: '主体颜色',
      description: `控制${organLabel}主体颜色。`, default: defaults.petalMainColor,
    },
    {
      id: 'petalTipColor', type: 'color', group: '花瓣配色', label: '末端颜色',
      description: `控制${organLabel}末端颜色。`, default: defaults.petalTipColor,
    },
    {
      id: 'petalVeinColor', type: 'color', group: '花瓣配色', label: '花脉颜色',
      description: `控制${organLabel}纵向脉纹颜色。`, default: defaults.petalVeinColor,
    },
    {
      id: 'leafVisible', type: 'boolean', group: '叶片形态', label: '显示叶片',
      description: '控制整株叶片是否显示。', default: defaults.leafVisible,
    },
    {
      id: 'leafLength', type: 'number', group: '叶片形态', label: '叶片长度',
      description: '控制叶片基部到叶尖的长度。', default: defaults.leafLength,
      min: 0.04, max: 3, step: 0.01,
    },
    {
      id: 'leafWidth', type: 'number', group: '叶片形态', label: '叶片宽度',
      description: '控制叶片最宽位置半宽。', default: defaults.leafWidth,
      min: 0.01, max: 1.4, step: 0.005,
    },
    {
      id: 'leafHeight', type: 'number', group: '叶片形态', label: '叶片起始高度',
      description: '控制最低一层叶片相对植株基部的高度。', default: defaults.leafHeight,
      min: -1, max: 3, step: 0.01,
    },
    {
      id: 'leafSpread', type: 'number', group: '叶片形态', label: '叶片展开角',
      description: '控制叶片从主茎向外展开的角度。', default: defaults.leafSpread,
      min: 0, max: 180, step: 1, unit: '°',
    },
    {
      id: 'leafCup', type: 'number', group: '叶片形态', label: '叶片杯深',
      description: '控制叶面横向弧度。', default: defaults.leafCup,
      min: -0.35, max: 0.55, step: 0.002,
    },
    {
      id: 'leafCurl', type: 'number', group: '叶片形态', label: '叶尖卷曲',
      description: '控制叶片纵向卷曲。', default: defaults.leafCurl,
      min: -0.7, max: 0.7, step: 0.002,
    },
    {
      id: 'leafWave', type: 'number', group: '叶片形态', label: '叶缘起伏',
      description: '控制叶片边缘柔和起伏。', default: defaults.leafWave,
      min: 0, max: 0.2, step: 0.001,
    },
    {
      id: 'leafSerration', type: 'number', group: '叶片形态', label: '锯齿强度',
      description: '控制叶缘锯齿或裂片强度。', default: defaults.leafSerration,
      min: 0, max: 0.5, step: 0.002,
    },
    {
      id: 'leafBaseColor', type: 'color', group: '叶片颜色', label: '叶片基色',
      description: '控制叶片基部色调。', default: defaults.leafBaseColor,
    },
    {
      id: 'leafTipColor', type: 'color', group: '叶片颜色', label: '叶片顶色',
      description: '控制叶片顶部色调。', default: defaults.leafTipColor,
    },
    {
      id: 'leafVeinColor', type: 'color', group: '叶片颜色', label: '叶脉颜色',
      description: '控制叶片主脉与侧脉色调。', default: defaults.leafVeinColor,
    },
    {
      id: 'stemVisible', type: 'boolean', group: '茎与结构', label: '显示主茎',
      description: '控制主茎或花葶是否显示。', default: defaults.stemVisible,
    },
    {
      id: 'stemLength', type: 'number', group: '茎与结构', label: '主茎长度',
      description: '控制植株基部到主花部的高度。', default: defaults.stemLength,
      min: 0.15, max: 5.5, step: 0.01,
    },
    {
      id: 'stemRadius', type: 'number', group: '茎与结构', label: '主茎粗细',
      description: '控制主茎或花葶半径。', default: defaults.stemRadius,
      min: 0.004, max: 0.24, step: 0.001,
    },
    {
      id: 'stemCurve', type: 'number', group: '茎与结构', label: '主茎弯曲',
      description: '控制主茎在正面方向的弯曲量。', default: defaults.stemCurve,
      min: -1.5, max: 1.5, step: 0.01,
    },
    ...(defaults.headStemBend === undefined ? [] : [{
      id: 'headStemBend', type: 'number' as const, group: '茎与结构',
      label: '花头茎弯度',
      description: '控制花头重量造成的上段茎连续弯腰；花托与花头会沿整茎末端同步移动和转向。',
      default: defaults.headStemBend,
      min: 0, max: 85, step: 1, unit: '°',
    }]),
    {
      id: 'stemColor', type: 'color', group: '茎与结构', label: '主茎颜色',
      description: '控制主茎与主要连接枝颜色。', default: defaults.stemColor,
    },
    ...extraParameters,
  ]
}
