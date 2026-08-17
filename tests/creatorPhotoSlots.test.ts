import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import { CREATOR_PHOTO_WALL_SLOTS } from '../src/features/creator-studio/PhotoWallSlotEditor'

const creatorSource = await readFile(
  new URL('../src/features/creator-studio/CreatorStudio.tsx', import.meta.url),
  'utf8',
)
const slotEditorSource = await readFile(
  new URL(
    '../src/features/creator-studio/PhotoWallSlotEditor.tsx',
    import.meta.url,
  ),
  'utf8',
)
const assetServiceSource = await readFile(
  new URL('../src/server/projects/assetService.ts', import.meta.url),
  'utf8',
)

describe('创作者按照片墙位置上传', () => {
  it('布局图使用八个常见横竖照片比例，并与场景从左到右一致', () => {
    assert.deepEqual(
      CREATOR_PHOTO_WALL_SLOTS.map((slot) => slot.id),
      [
        'photo-02',
        'photo-03',
        'photo-06',
        'photo-01',
        'photo-04',
        'photo-07',
        'photo-08',
        'photo-05',
      ],
    )
    assert.ok(
      CREATOR_PHOTO_WALL_SLOTS.every(
        (slot) => slot.aspectRatio === '3 / 2' || slot.aspectRatio === '2 / 3',
      ),
    )
    assert.equal(new Set(CREATOR_PHOTO_WALL_SLOTS.map((slot) => slot.id)).size, 8)
  })

  it('点击单个相框只上传或恢复该位置，空位继续使用默认照片', () => {
    assert.match(slotEditorSource, /点击对应相框即可上传或替换/u)
    assert.match(slotEditorSource, /cottageDefaultMemoryPhotoUrl/u)
    assert.match(slotEditorSource, /onUpload\(slot\.id, file\)/u)
    assert.match(slotEditorSource, /onRestoreDefault\(slot\.id\)/u)
    assert.match(creatorSource, /form\.set\('replaceAssetId', currentEntry\.assetId\)/u)
    assert.match(creatorSource, /entry\.slotId !== slotId/u)
  })

  it('后端仅允许替换当前草稿中的照片，并保留正在发布的不可变快照', () => {
    assert.match(assetServiceSource, /replacement_allowed/u)
    assert.match(assetServiceSource, /只能替换当前草稿中正在使用的照片/u)
    assert.match(assetServiceSource, /isPublishedAsset\(projectId, replaceAssetId\)/u)
    assert.match(assetServiceSource, /pruneInactivePhotoAssets/u)
  })
})
