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
