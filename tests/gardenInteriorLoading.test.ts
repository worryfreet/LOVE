import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { isCottageInteriorPreparing } from '../src/features/garden-experience/model/interiorPreparation'

const experienceSource = await readFile(
  new URL('../src/features/garden-experience/GardenExperience.tsx', import.meta.url),
  'utf8',
)
const loadingSource = await readFile(
  new URL(
    '../src/features/garden-experience/ui/GardenSceneLoadingVeil.tsx',
    import.meta.url,
  ),
  'utf8',
)
const loadingStyles = await readFile(
  new URL(
    '../src/features/garden-experience/gardenExperience.module.css',
    import.meta.url,
  ),
  'utf8',
)

describe('小屋首次进入加载过渡', () => {
  it('只在开启事务尚未收到同 epoch 首帧时显示', () => {
    const opening = { epoch: 4, motion: 'opening', visualOpen: true } as const
    const opened = { ...opening, motion: 'open' } as const

    assert.equal(isCottageInteriorPreparing(opening, null), true)
    assert.equal(isCottageInteriorPreparing(opened, 3), true)
    assert.equal(isCottageInteriorPreparing(opened, 4), false)
    assert.equal(
      isCottageInteriorPreparing(
        { ...opening, epoch: 5 },
        4,
      ),
      true,
    )
    assert.equal(
      isCottageInteriorPreparing(
        { ...opening, motion: 'closing' },
        null,
      ),
      false,
    )
    assert.equal(
      isCottageInteriorPreparing(
        { epoch: 5, motion: 'closed', visualOpen: false },
        null,
      ),
      false,
    )
  })

  it('室内拥有独立 Suspense 边界，并在连续三帧后确认准备完成', () => {
    assert.match(
      experienceSource,
      /<Suspense fallback=\{<group name="cottage\.interior\.preparing" \/>\}>/u,
    )
    assert.match(experienceSource, /renderedFrames\.current < 3/u)
    assert.match(experienceSource, /onInteriorSceneReady\(interiorLoadEpoch\)/u)
    assert.match(experienceSource, /fallback=\{<GardenSceneFallback \/>\}/u)
    assert.doesNotMatch(experienceSource, /<Suspense fallback=\{null\}>/u)
  })

  it('加载层使用小屋语义、淡出状态和减弱动画降级', () => {
    assert.match(loadingSource, /data-testid="garden-scene-loading"/u)
    assert.match(loadingSource, /正在点亮小屋/u)
    assert.match(loadingSource, /照片、书信与灯火正在就位/u)
    assert.match(loadingSource, /正在打开花园/u)
    assert.match(loadingSource, /花海与晚风正在回到门外/u)
    assert.match(loadingStyles, /\.sceneLoadingVeil\[data-visible='true'\]/u)
    assert.match(loadingStyles, /threshold-breathe/u)
    assert.match(loadingStyles, /prefers-reduced-motion: reduce/u)
  })
})
