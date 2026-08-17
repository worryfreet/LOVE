import { z } from 'zod'
import {
  COTTAGE_INTERIOR_DEFAULT_DOCUMENT,
  type CottageInteriorInstance,
} from '@/entities/scene/items/cottage-flower-garden/model/cottageInteriorInstances'
import {
  applyCottageGardenWeatherPreset,
  COTTAGE_GARDEN_PROJECT_TUNING,
  normalizeCottageGardenTuning,
  type CottageGardenTuning,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenTuning'
import { sanitizePlainText } from '@/shared/lib'

export const LOVE_PROJECT_SCHEMA_VERSION = 1 as const
export const LOVE_PROJECT_MAX_PHOTOS = 9
export const DEFAULT_LOVE_ENDING_MESSAGE =
  '这座花园的浪漫先到这里，\n但我想和你的故事，才刚刚开始。'

const plainText = (maximum: number, multiline = false) =>
  z.string().transform((value) =>
    sanitizePlainText(value, {
      maxLength: maximum,
      multiline,
      collapseBlankLines: multiline,
      trim: true,
    }),
  )

function sanitizeInteriorInstances(values: unknown[]) {
  return values.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value
    const instance = value as Record<string, unknown>
    const rawParameters = instance.parameters
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
      return value
    }
    return {
      ...instance,
      parameters: {
        ...(rawParameters as Record<string, unknown>),
        imageUrl: '',
      },
    }
  })
}

export const loveProjectConfigSchema = z.object({
  schemaVersion: z.literal(LOVE_PROJECT_SCHEMA_VERSION),
  identity: z.object({
    senderName: plainText(32),
    recipientName: plainText(32),
    giftTitle: plainText(64),
  }),
  letter: z.object({
    title: plainText(48),
    salutation: plainText(48),
    body: plainText(1_200, true),
    signature: plainText(64),
  }),
  gallery: z
    .array(
      z.object({
        assetId: z.string().uuid(),
        slotId: z.string().regex(/^photo-(0[1-9])$/u),
        focalX: z.number().min(0).max(1),
        focalY: z.number().min(0).max(1),
      }),
    )
    .max(LOVE_PROJECT_MAX_PHOTOS),
  ambience: z.object({
    timeOfDay: z.enum(['dawn', 'noon', 'dusk', 'evening']),
    weatherPreset: z.enum(['clear', 'soft-clouds', 'overcast', 'mist']),
    skyMessage: plainText(24),
    musicAssetId: z.string().uuid().optional(),
  }),
  experience: z
    .object({
      immersiveEnabled: z.boolean(),
      endingMessage: plainText(120, true),
    })
    .default({
      immersiveEnabled: true,
      endingMessage: DEFAULT_LOVE_ENDING_MESSAGE,
    }),
  garden: z.object({
    rosePaletteId: z.enum([
      'mixed',
      'scarlet-red',
      'deep-red',
      'light-pink',
      'deep-pink',
      'peach-pink',
      'snow-white',
      'friendship-yellow',
      'royal-purple',
      'orange-flame',
      'orange-red',
      'cream-pink-gradient',
      'red-white-bicolor',
      'berry-tie-dye',
    ]),
    layoutPresetId: z.enum(['classic', 'dense', 'calm']),
  }),
  interior: z.object({
    layoutPresetId: z.enum(['classic', 'cozy', 'gallery']),
    instances: z.array(z.unknown()).max(96).transform(sanitizeInteriorInstances),
  }),
})

export type LoveProjectConfig = z.infer<typeof loveProjectConfigSchema>

export interface ResolvedLovePhoto {
  assetId: string
  url: string
}

export interface LoveExperienceConfig {
  project: LoveProjectConfig
  tuning: CottageGardenTuning
  interiorInstances: CottageInteriorInstance[]
  photos: readonly ResolvedLovePhoto[]
}

export const DEFAULT_LOVE_PROJECT_CONFIG: LoveProjectConfig = {
  schemaVersion: LOVE_PROJECT_SCHEMA_VERSION,
  identity: {
    senderName: '谭少康',
    recipientName: '丁晓杰',
    giftTitle: '为你种下的一座花园',
  },
  letter: {
    title: '写给我最珍惜的你',
    salutation: '亲爱的：',
    body:
      '我想把那些没有来得及说出口的话，慢慢写进这封信里。\n\n谢谢你让平凡的日子有了值得期待的光。愿这座小院替我收藏我们的照片、笑声和每一次认真想念。\n\n往后的很多天，我也想继续站在你身边，和你一起看花开、等黄昏、把普通生活过成我们喜欢的样子。',
    signature: '永远爱你的人',
  },
  gallery: [],
  ambience: {
    timeOfDay: 'dusk',
    weatherPreset: 'soft-clouds',
    skyMessage: 'I LOVE YOU!',
  },
  experience: {
    immersiveEnabled: true,
    endingMessage: DEFAULT_LOVE_ENDING_MESSAGE,
  },
  garden: {
    rosePaletteId: 'mixed',
    layoutPresetId: 'classic',
  },
  interior: {
    layoutPresetId: 'classic',
    instances: [...COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances],
  },
}

export function normalizeLoveProjectConfig(value: unknown): LoveProjectConfig {
  const result = loveProjectConfigSchema.safeParse(value)
  return result.success ? result.data : structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
}

export function resolveLoveExperienceConfig(
  config: LoveProjectConfig,
  photoAssets: readonly ResolvedLovePhoto[] = [],
): LoveExperienceConfig {
  const photoUrlById = new Map(photoAssets.map((asset) => [asset.assetId, asset.url]))
  const slotUrl = new Map(
    config.gallery.map((item) => [item.slotId, photoUrlById.get(item.assetId) ?? '']),
  )
  const baseInstances = config.interior.instances.length
    ? (config.interior.instances as CottageInteriorInstance[])
    : [...COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances]
  let photoIndex = 0
  const interiorInstances = baseInstances.map((instance) => {
    if (instance.partId === 'cottage-photo-frame') {
      photoIndex += 1
      return {
        ...instance,
        parameters: {
          ...instance.parameters,
          imageUrl: slotUrl.get(`photo-${String(photoIndex).padStart(2, '0')}`) ?? '',
        },
      }
    }
    if (instance.partId === 'cottage-envelope') {
      return {
        ...instance,
        parameters: {
          ...instance.parameters,
          letterTitle: config.letter.title,
          letterSalutation: config.letter.salutation,
          letterBody: config.letter.body,
          letterSignature: config.letter.signature,
        },
      }
    }
    return instance
  })

  const weatherTuning = applyCottageGardenWeatherPreset(
    COTTAGE_GARDEN_PROJECT_TUNING,
    config.ambience.weatherPreset,
  )
  const withRosePalette = (side: typeof weatherTuning.garden.left) => ({
    ...side,
    blocks: side.blocks.map((block) => ({
      ...block,
      primary: {
        ...block.primary,
        roseColorSelectionId: config.garden.rosePaletteId,
      },
      companion: block.companion
        ? {
            ...block.companion,
            roseColorSelectionId: config.garden.rosePaletteId,
          }
        : null,
    })),
  })
  const tuning = normalizeCottageGardenTuning({
    ...weatherTuning,
    garden: {
      ...weatherTuning.garden,
      left: withRosePalette(weatherTuning.garden.left),
      right: withRosePalette(weatherTuning.garden.right),
    },
    time: {
      ...weatherTuning.time,
      target: config.ambience.timeOfDay,
    },
  })

  return {
    project: config,
    tuning,
    interiorInstances,
    photos: photoAssets,
  }
}
