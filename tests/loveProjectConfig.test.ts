import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_LOVE_PROJECT_CONFIG,
  loveProjectConfigSchema,
  normalizeLoveProjectConfig,
  resolveLoveExperienceConfig,
} from '@/domain/loveProjectConfig'
import { createCottageGardenMessageStars } from '@/entities/scene/items/cottage-flower-garden/model/gardenSkyAnimation'

test('统一配置会清理文本并拒绝未知协议字段', () => {
  const input = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  input.identity.senderName = '  小\u0000林  '
  const parsed = loveProjectConfigSchema.parse(input)
  assert.equal(parsed.identity.senderName, '小林')
  assert.equal(parsed.schemaVersion, 1)
})

test('无效配置只在读取旧数据时安全回退默认值', () => {
  const normalized = normalizeLoveProjectConfig({ schemaVersion: 99 })
  assert.deepEqual(normalized, DEFAULT_LOVE_PROJECT_CONFIG)
})

test('旧发布快照缺少体验字段时会补齐沉浸默认值', () => {
  const legacy = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG) as Partial<
    typeof DEFAULT_LOVE_PROJECT_CONFIG
  >
  delete legacy.experience
  const normalized = normalizeLoveProjectConfig(legacy)
  assert.equal(normalized.experience.immersiveEnabled, true)
  assert.match(normalized.experience.endingMessage, /故事/u)
})

test('照片与情书只从统一项目配置派生到小屋实例', () => {
  const config = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  const assetId = 'f4b41d36-1c7a-4a61-9ad4-7df253df31c2'
  config.gallery = [{ assetId, slotId: 'photo-01', focalX: 0.5, focalY: 0.5 }]
  config.letter.body = '这是只属于发布快照的正文。'
  const resolved = resolveLoveExperienceConfig(config, [{ assetId, url: `/media/${assetId}` }])
  const photo = resolved.interiorInstances.find((item) => item.partId === 'cottage-photo-frame')
  const envelope = resolved.interiorInstances.find((item) => item.partId === 'cottage-envelope')
  assert.equal(photo?.parameters.imageUrl, `/media/${assetId}`)
  assert.equal(envelope?.parameters.letterBody, config.letter.body)
})

test('照片按明确位置绑定，不受室内实例数组顺序影响', () => {
  const config = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  const assetId = '8c0a2d49-c6b4-4dc3-8f98-ce3050b03be5'
  config.gallery = [{ assetId, slotId: 'photo-08', focalX: 0.5, focalY: 0.5 }]
  config.interior.instances.reverse()
  const resolved = resolveLoveExperienceConfig(config, [
    { assetId, url: `/media/${assetId}` },
  ])
  const target = resolved.interiorInstances.find(
    (item) => item.parameters.photoSlotId === 'photo-08',
  )
  const otherPhotos = resolved.interiorInstances.filter(
    (item) =>
      item.partId === 'cottage-photo-frame' &&
      item.parameters.photoSlotId !== 'photo-08',
  )
  assert.equal(target?.parameters.imageUrl, `/media/${assetId}`)
  assert.ok(otherPhotos.every((item) => item.parameters.imageUrl === ''))
})

test('同一照片位置不能重复绑定', () => {
  const config = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  config.gallery = [
    {
      assetId: '8c0a2d49-c6b4-4dc3-8f98-ce3050b03be5',
      slotId: 'photo-03',
      focalX: 0.5,
      focalY: 0.5,
    },
    {
      assetId: '6f494027-bc64-43bc-8cde-779bfaef42b3',
      slotId: 'photo-03',
      focalX: 0.5,
      focalY: 0.5,
    },
  ]
  const parsed = loveProjectConfigSchema.safeParse(config)
  assert.equal(parsed.success, false)
})

test('时段、天气和玫瑰花色都会进入场景调参', () => {
  const config = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
  config.ambience.timeOfDay = 'evening'
  config.ambience.weatherPreset = 'mist'
  config.garden.rosePaletteId = 'deep-red'
  const resolved = resolveLoveExperienceConfig(config)
  assert.equal(resolved.tuning.time.target, 'evening')
  assert.equal(resolved.tuning.weather.preset, 'mist')
  const roseSlots = [
    ...resolved.tuning.garden.left.blocks,
    ...resolved.tuning.garden.right.blocks,
  ].flatMap((block) => [block.primary, block.companion].filter(Boolean))
  assert.ok(roseSlots.every((slot) => slot?.roseColorSelectionId === 'deep-red'))
})

test('自定义英文和数字可以生成告白星阵', () => {
  assert.ok(createCottageGardenMessageStars(42, 'FOREVER 2026!').length > 100)
})
