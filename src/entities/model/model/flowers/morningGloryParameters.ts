import morningGloryCustomConfiguration from '../configurations/morning-glory.custom.json'
import type {
  ModelParameterConfiguration,
  ModelParameterSchema,
  ModelParameterValues,
} from '../modelParameterTypes'
import {
  readFlowerBoolean,
  readFlowerColor,
  readFlowerNumber,
} from '../flowerParameterUtils'
import { resolveFlowerRenderQualityProfile } from '../flowerRenderQuality'
import {
  BLOOM_DURATION_MAX,
  BLOOM_DURATION_MIN,
} from '../../items/flower-collection/core/bloomAnimation'

export const MORNING_GLORY_DEFAULTS = {
  renderQuality: 'ultra', corollaVisible: true, bloomDuration: 2.8,
  corollaDepth: 1.08, corollaThroatRadius: 0.078, corollaMidRadius: 0.28,
  corollaRimRadius: 0.68, corollaRimWave: 0.042, corollaFlarePower: 1.2,
  corollaRimCurl: 0.012, corollaThickness: 0.0014,
  corollaRoughness: 0.74, corollaSheen: 0.3, corollaTransmission: 0.055,
  textureNormalStrength: 0.1, throatColor: '#FFF7EE',
  middleColor: '#7381E5', rimColor: '#3457D5', veinColor: '#6A177D',
  flowerTilt: -3, leafVisible: true, leafLength: 0.86, leafWidth: 0.34,
  leafHeight: -0.02, leafSpread: 64, leafCup: 0.075, leafCurl: -0.055,
  leafWave: 0.01, leafSerration: 0.008, leafBaseColor: '#295420',
  leafTipColor: '#719545', leafVeinColor: '#A7B76B', vineVisible: true,
  vineLength: 2.05, vineRadius: 0.022, vineCurve: 0.38, vineTwist: 0.4,
  vineColor: '#456D2B', budVisible: true, budCount: 2, budSize: 0.16,
  budColor: '#6D64C9', calyxColor: '#5E8B38',
} as const satisfies Record<string, string | number | boolean>

export const MORNING_GLORY_PARAMETERS = [
  { id: 'renderQuality', type: 'select', group: '显示与渲染', label: '画质档位', description: '切换连续花冠细分、材质、贴图、阴影和像素密度预算。', default: MORNING_GLORY_DEFAULTS.renderQuality, options: [{ value: 'ultra', label: '超高' }, { value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'low', label: '低' }] },
  { id: 'corollaVisible', type: 'boolean', group: '显示与渲染', label: '显示花冠', description: '控制连续漏斗花冠是否显示。', default: MORNING_GLORY_DEFAULTS.corollaVisible },
  { id: 'bloomDuration', type: 'number', group: '开花与风动', label: '开花时长', description: '控制花苞完整展开到盛放状态所需的时间。', default: MORNING_GLORY_DEFAULTS.bloomDuration, min: BLOOM_DURATION_MIN, max: BLOOM_DURATION_MAX, step: 0.1, unit: '秒' },
  { id: 'corollaDepth', type: 'number', group: '花冠剖面', label: '花冠深度', description: '控制花喉到花口的连续漏斗深度。', default: MORNING_GLORY_DEFAULTS.corollaDepth, min: 0.2, max: 2, step: 0.01 },
  { id: 'corollaThroatRadius', type: 'number', group: '花冠剖面', label: '花喉半径', description: '控制漏斗最窄花喉半径。', default: MORNING_GLORY_DEFAULTS.corollaThroatRadius, min: 0.04, max: 0.18, step: 0.002 },
  { id: 'corollaMidRadius', type: 'number', group: '花冠剖面', label: '中段半径', description: '控制漏斗中段扩张宽度。', default: MORNING_GLORY_DEFAULTS.corollaMidRadius, min: 0.12, max: 0.48, step: 0.005 },
  { id: 'corollaRimRadius', type: 'number', group: '花冠剖面', label: '花口半径', description: '控制蓝紫花口的最大半径。', default: MORNING_GLORY_DEFAULTS.corollaRimRadius, min: 0.18, max: 1.6, step: 0.005 },
  { id: 'corollaRimWave', type: 'number', group: '花冠剖面', label: '五裂波幅', description: '控制花口五个宽浅圆裂的波浪幅度。', default: MORNING_GLORY_DEFAULTS.corollaRimWave, min: 0, max: 0.14, step: 0.002 },
  { id: 'corollaFlarePower', type: 'number', group: '花冠剖面', label: '扩张焦点', description: '控制漏斗从花喉到花口的扩张节奏。', default: MORNING_GLORY_DEFAULTS.corollaFlarePower, min: 0.55, max: 2.4, step: 0.02 },
  { id: 'corollaRimCurl', type: 'number', group: '花冠剖面', label: '花口卷边', description: '控制花口边缘向前或向后卷起。', default: MORNING_GLORY_DEFAULTS.corollaRimCurl, min: -0.12, max: 0.12, step: 0.002 },
  { id: 'corollaThickness', type: 'number', group: '花冠剖面', label: '花冠薄壳厚度', description: '控制连续双层花冠的闭合薄壳厚度请求值。', default: MORNING_GLORY_DEFAULTS.corollaThickness, min: 0.0005, max: 0.01, step: 0.0001 },
  { id: 'flowerTilt', type: 'number', group: '花冠剖面', label: '花冠朝向', description: '控制整朵花冠轻微抬头或俯垂角度。', default: MORNING_GLORY_DEFAULTS.flowerTilt, min: -35, max: 25, step: 1, unit: '°' },
  { id: 'corollaRoughness', type: 'number', group: '表面材质', label: '表面粗糙度', description: '控制花冠高光扩散程度。', default: MORNING_GLORY_DEFAULTS.corollaRoughness, min: 0.25, max: 1, step: 0.01 },
  { id: 'corollaSheen', type: 'number', group: '表面材质', label: '柔光强度', description: '控制花冠薄组织的柔和边缘反光。', default: MORNING_GLORY_DEFAULTS.corollaSheen, min: 0, max: 1, step: 0.01 },
  { id: 'corollaTransmission', type: 'number', group: '表面材质', label: '透光强度', description: '控制花冠薄组织透光量。', default: MORNING_GLORY_DEFAULTS.corollaTransmission, min: 0, max: 0.45, step: 0.01 },
  { id: 'textureNormalStrength', type: 'number', group: '表面材质', label: '纹理凹凸', description: '控制五条放射脉与纵向细褶皱的凹凸强度。', default: MORNING_GLORY_DEFAULTS.textureNormalStrength, min: 0, max: 0.8, step: 0.01 },
  { id: 'throatColor', type: 'color', group: '花冠配色', label: '花喉颜色', description: '控制漏斗最深处乳白色。', default: MORNING_GLORY_DEFAULTS.throatColor },
  { id: 'middleColor', type: 'color', group: '花冠配色', label: '中段颜色', description: '控制花喉到花口之间的粉紫过渡色。', default: MORNING_GLORY_DEFAULTS.middleColor },
  { id: 'rimColor', type: 'color', group: '花冠配色', label: '花口颜色', description: '控制花口蓝紫主体颜色。', default: MORNING_GLORY_DEFAULTS.rimColor },
  { id: 'veinColor', type: 'color', group: '花冠配色', label: '放射脉颜色', description: '控制五条紫色放射脉颜色。', default: MORNING_GLORY_DEFAULTS.veinColor },
  { id: 'leafVisible', type: 'boolean', group: '叶片形态', label: '显示叶片', description: '控制心形叶是否显示。', default: MORNING_GLORY_DEFAULTS.leafVisible },
  { id: 'leafLength', type: 'number', group: '叶片形态', label: '叶片长度', description: '控制心形叶长度。', default: MORNING_GLORY_DEFAULTS.leafLength, min: 0.25, max: 1.1, step: 0.01 },
  { id: 'leafWidth', type: 'number', group: '叶片形态', label: '叶片宽度', description: '控制心形叶半宽。', default: MORNING_GLORY_DEFAULTS.leafWidth, min: 0.1, max: 0.45, step: 0.005 },
  { id: 'leafHeight', type: 'number', group: '叶片形态', label: '最低叶片高度', description: '控制最低一片叶相对藤蔓基部位置。', default: MORNING_GLORY_DEFAULTS.leafHeight, min: -0.3, max: 0.8, step: 0.01 },
  { id: 'leafSpread', type: 'number', group: '叶片形态', label: '叶片展开角', description: '控制心形叶向外展开角度。', default: MORNING_GLORY_DEFAULTS.leafSpread, min: 25, max: 140, step: 1, unit: '°' },
  { id: 'leafCup', type: 'number', group: '叶片形态', label: '叶片杯深', description: '控制叶面横向弧度。', default: MORNING_GLORY_DEFAULTS.leafCup, min: -0.12, max: 0.24, step: 0.002 },
  { id: 'leafCurl', type: 'number', group: '叶片形态', label: '叶尖卷曲', description: '控制叶片纵向卷曲。', default: MORNING_GLORY_DEFAULTS.leafCurl, min: -0.3, max: 0.3, step: 0.002 },
  { id: 'leafWave', type: 'number', group: '叶片形态', label: '叶缘起伏', description: '控制叶缘柔和起伏。', default: MORNING_GLORY_DEFAULTS.leafWave, min: 0, max: 0.08, step: 0.001 },
  { id: 'leafSerration', type: 'number', group: '叶片形态', label: '叶缘锯齿', description: '控制心形叶边缘锯齿。', default: MORNING_GLORY_DEFAULTS.leafSerration, min: 0, max: 0.08, step: 0.001 },
  { id: 'leafBaseColor', type: 'color', group: '叶片颜色', label: '叶片基色', description: '控制心形叶基部颜色。', default: MORNING_GLORY_DEFAULTS.leafBaseColor },
  { id: 'leafTipColor', type: 'color', group: '叶片颜色', label: '叶片顶色', description: '控制心形叶顶部颜色。', default: MORNING_GLORY_DEFAULTS.leafTipColor },
  { id: 'leafVeinColor', type: 'color', group: '叶片颜色', label: '叶脉颜色', description: '控制心形叶主脉与侧脉颜色。', default: MORNING_GLORY_DEFAULTS.leafVeinColor },
  { id: 'vineVisible', type: 'boolean', group: '藤蔓与花苞', label: '显示藤蔓', description: '控制缠绕主藤是否显示。', default: MORNING_GLORY_DEFAULTS.vineVisible },
  { id: 'vineLength', type: 'number', group: '藤蔓与花苞', label: '藤蔓长度', description: '控制藤蔓基部到花冠的高度。', default: MORNING_GLORY_DEFAULTS.vineLength, min: 0.4, max: 5.5, step: 0.01 },
  { id: 'vineRadius', type: 'number', group: '藤蔓与花苞', label: '藤蔓粗细', description: '控制主藤半径。', default: MORNING_GLORY_DEFAULTS.vineRadius, min: 0.012, max: 0.06, step: 0.001 },
  { id: 'vineCurve', type: 'number', group: '藤蔓与花苞', label: '藤蔓弯曲', description: '控制藤蔓左右摆动幅度。', default: MORNING_GLORY_DEFAULTS.vineCurve, min: -1.2, max: 1.2, step: 0.01 },
  { id: 'vineTwist', type: 'number', group: '藤蔓与花苞', label: '藤蔓缠绕', description: '控制藤蔓前后缠绕幅度。', default: MORNING_GLORY_DEFAULTS.vineTwist, min: 0, max: 0.55, step: 0.01 },
  { id: 'vineColor', type: 'color', group: '藤蔓与花苞', label: '藤蔓颜色', description: '控制主藤与花梗颜色。', default: MORNING_GLORY_DEFAULTS.vineColor },
  { id: 'budVisible', type: 'boolean', group: '藤蔓与花苞', label: '显示花苞', description: '控制侧生未开放花苞是否显示。', default: MORNING_GLORY_DEFAULTS.budVisible },
  { id: 'budCount', type: 'number', group: '藤蔓与花苞', label: '花苞数量', description: '控制侧生花苞数量。', default: MORNING_GLORY_DEFAULTS.budCount, min: 0, max: 10, step: 1 },
  { id: 'budSize', type: 'number', group: '藤蔓与花苞', label: '花苞大小', description: '控制未开放花苞尺度。', default: MORNING_GLORY_DEFAULTS.budSize, min: 0.08, max: 0.26, step: 0.005 },
  { id: 'budColor', type: 'color', group: '藤蔓与花苞', label: '花苞颜色', description: '控制未开放花苞蓝紫色。', default: MORNING_GLORY_DEFAULTS.budColor },
  { id: 'calyxColor', type: 'color', group: '藤蔓与花苞', label: '花萼颜色', description: '控制花冠基部和花苞萼片颜色。', default: MORNING_GLORY_DEFAULTS.calyxColor },
] as const satisfies readonly ModelParameterSchema[]

export const MORNING_GLORY_CUSTOM_CONFIGURATION =
  morningGloryCustomConfiguration as ModelParameterConfiguration

export function resolveMorningGlorySettings(values?: ModelParameterValues) {
  const schema = MORNING_GLORY_PARAMETERS
  return {
    quality: resolveFlowerRenderQualityProfile(values),
    corolla: {
      visible: readFlowerBoolean(schema, values, 'corollaVisible'),
      flatShading: false,
      depth: readFlowerNumber(schema, values, 'corollaDepth'),
      throatRadius: readFlowerNumber(schema, values, 'corollaThroatRadius'),
      midRadius: readFlowerNumber(schema, values, 'corollaMidRadius'),
      rimRadius: readFlowerNumber(schema, values, 'corollaRimRadius'),
      rimWave: readFlowerNumber(schema, values, 'corollaRimWave'),
      flarePower: readFlowerNumber(schema, values, 'corollaFlarePower'),
      rimCurl: readFlowerNumber(schema, values, 'corollaRimCurl'),
      thickness: readFlowerNumber(schema, values, 'corollaThickness'),
      roughness: readFlowerNumber(schema, values, 'corollaRoughness'),
      sheen: readFlowerNumber(schema, values, 'corollaSheen'),
      transmission: readFlowerNumber(schema, values, 'corollaTransmission'),
      normalStrength: readFlowerNumber(schema, values, 'textureNormalStrength'),
      throatColor: readFlowerColor(schema, values, 'throatColor'),
      middleColor: readFlowerColor(schema, values, 'middleColor'),
      rimColor: readFlowerColor(schema, values, 'rimColor'),
      veinColor: readFlowerColor(schema, values, 'veinColor'),
      tilt: readFlowerNumber(schema, values, 'flowerTilt') * Math.PI / 180,
    },
    leaf: {
      visible: readFlowerBoolean(schema, values, 'leafVisible'),
      length: readFlowerNumber(schema, values, 'leafLength'),
      width: readFlowerNumber(schema, values, 'leafWidth'),
      height: readFlowerNumber(schema, values, 'leafHeight'),
      spread: readFlowerNumber(schema, values, 'leafSpread'),
      cup: readFlowerNumber(schema, values, 'leafCup'),
      curl: readFlowerNumber(schema, values, 'leafCurl'),
      wave: readFlowerNumber(schema, values, 'leafWave'),
      serration: readFlowerNumber(schema, values, 'leafSerration'),
      baseColor: readFlowerColor(schema, values, 'leafBaseColor'),
      tipColor: readFlowerColor(schema, values, 'leafTipColor'),
      veinColor: readFlowerColor(schema, values, 'leafVeinColor'),
    },
    vine: {
      visible: readFlowerBoolean(schema, values, 'vineVisible'),
      length: readFlowerNumber(schema, values, 'vineLength'),
      radius: readFlowerNumber(schema, values, 'vineRadius'),
      curve: readFlowerNumber(schema, values, 'vineCurve'),
      twist: readFlowerNumber(schema, values, 'vineTwist'),
      color: readFlowerColor(schema, values, 'vineColor'),
    },
    bud: {
      visible: readFlowerBoolean(schema, values, 'budVisible'),
      count: Math.round(readFlowerNumber(schema, values, 'budCount')),
      size: readFlowerNumber(schema, values, 'budSize'),
      color: readFlowerColor(schema, values, 'budColor'),
      calyxColor: readFlowerColor(schema, values, 'calyxColor'),
    },
  }
}
