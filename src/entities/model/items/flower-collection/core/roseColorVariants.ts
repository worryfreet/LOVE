import type { StudioFlowerPalette } from './studioFlower'
import type { StudioRosePetalPattern } from './studioPetalPattern'

export type RoseColorVariantId =
  | 'scarlet-red'
  | 'deep-red'
  | 'light-pink'
  | 'deep-pink'
  | 'peach-pink'
  | 'snow-white'
  | 'friendship-yellow'
  | 'royal-purple'
  | 'orange-flame'
  | 'orange-red'
  | 'cream-pink-gradient'
  | 'red-white-bicolor'
  | 'berry-tie-dye'

export interface RoseColorPreset {
  id: RoseColorVariantId
  label: string
  category: string
  palette: StudioFlowerPalette
  pattern: StudioRosePetalPattern
}

function preset(
  id: RoseColorVariantId,
  label: string,
  category: string,
  palette: StudioFlowerPalette,
  style: StudioRosePetalPattern['style'],
  accentColor: string,
  strength = 0.72,
): RoseColorPreset {
  return {
    id,
    label,
    category,
    palette,
    pattern: { kind: 'rose', style, accentColor, strength },
  }
}

/**
 * 每种玫瑰色都使用五段组织色阶，而不是把整朵花简单乘上一个颜色。
 * 前两段负责受光边缘，中段负责主体，后两段压出层叠花瓣之间的深色缝隙。
 */
export const ROSE_COLOR_PRESETS = [
  preset('scarlet-red', '鲜红', '红色', ['#FF5561', '#F22D3F', '#D71532', '#9A0B25', '#520010'], 'solid', '#7D061B', 0),
  preset('deep-red', '深红', '红色', ['#C84152', '#9E1F38', '#711128', '#420817', '#21030C'], 'solid', '#31040F', 0),
  preset('light-pink', '浅粉', '粉色', ['#FFF0F4', '#FFD7E1', '#F5A8BC', '#D66D8D', '#8E365A'], 'solid', '#B85074', 0),
  preset('deep-pink', '深粉', '粉色', ['#FF9FBC', '#F45B91', '#D72E72', '#97194E', '#57102F'], 'solid', '#7D1744', 0),
  preset('peach-pink', '蜜桃粉', '粉色', ['#F28C7A', '#E96858', '#D94F47', '#AD393D', '#6F2432'], 'gradient', '#EE8072', 0.16),
  preset('snow-white', '雪山白', '白色', ['#FFFFFF', '#F8F7F2', '#ECEBE4', '#D6D6CE', '#A9AEA5'], 'solid', '#DDE2DB', 0),
  preset('friendship-yellow', '友情黄', '黄色', ['#FFF7B2', '#FFE76C', '#F5C932', '#CE9418', '#87530B'], 'solid', '#A6650B', 0),
  preset('royal-purple', '路易十四紫', '紫色', ['#D9B5EB', '#A96CC8', '#743F9D', '#482363', '#26102F'], 'gradient', '#E3C9F0', 0.2),
  preset('orange-flame', '活力橙', '橙色', ['#FFE1A5', '#FFB34E', '#F47A1F', '#C84418', '#76200D'], 'solid', '#A63212', 0),
  preset('orange-red', '橘红', '橙色', ['#FFC08A', '#FF7A42', '#EF3F25', '#B51C1B', '#6E0C12'], 'gradient', '#FFD09A', 0.18),
  preset('cream-pink-gradient', '奶油粉渐变', '渐变色', ['#FFFDF2', '#FFF0D5', '#F8C2C7', '#E57D9B', '#9E3B67'], 'gradient', '#F2A6B6', 0.48),
  preset('red-white-bicolor', '红白双色', '双色', ['#FFFDF9', '#FFF4EE', '#F6D7D4', '#D94A50', '#811322'], 'bicolor', '#B5122F', 0.9),
  preset('berry-tie-dye', '莓果扎染', '扎染', ['#FFF5F8', '#F4C9D9', '#D98CAF', '#9A4A78', '#542541'], 'tie-dye', '#B22B6A', 0.52),
] as const satisfies readonly RoseColorPreset[]

const PRESET_MAP = new Map(
  ROSE_COLOR_PRESETS.map((colorPreset) => [colorPreset.id, colorPreset]),
)

function colorChannels(value: string) {
  const matched = /^#([\da-f]{6})$/i.exec(value.trim())
  if (!matched) return null
  const packed = Number.parseInt(matched[1], 16)
  return [packed >> 16, (packed >> 8) & 0xff, packed & 0xff] as const
}

/** 将旧花圃自由色映射到最近的模型库组织色预设，避免退化为整朵单色染色。 */
export function resolveClosestRoseColorPreset(value: string) {
  const target = colorChannels(value)
  if (!target) return ROSE_COLOR_PRESETS[0]
  let closest = ROSE_COLOR_PRESETS[0]
  let closestDistance = Number.POSITIVE_INFINITY
  for (const colorPreset of ROSE_COLOR_PRESETS) {
    for (const swatch of colorPreset.palette) {
      const candidate = colorChannels(swatch)
      if (!candidate) continue
      const distance =
        (target[0] - candidate[0]) ** 2 +
        (target[1] - candidate[1]) ** 2 +
        (target[2] - candidate[2]) ** 2
      if (distance < closestDistance) {
        closest = colorPreset
        closestDistance = distance
      }
    }
  }
  return closest
}

export function resolveRoseColorPreset(value: unknown) {
  if (typeof value === 'string') {
    const matched = PRESET_MAP.get(value as RoseColorVariantId)
    if (matched) return matched
  }
  return ROSE_COLOR_PRESETS[0]
}
