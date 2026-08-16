import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COTTAGE_GARDEN_LOD,
  resolveCottageGardenLodState,
  resolveCottageGardenLodTier,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenLod'
import {
  COTTAGE_GARDEN_INITIAL_TIME,
  COTTAGE_GARDEN_TIME_ORDER,
  COTTAGE_GARDEN_TIME_PRESETS,
  resolveCottageGardenForwardTargetPhase,
  sampleCottageGardenTime,
  sampleCottageGardenTransitionPhase,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenTime'

describe('花海小院远中近分级渲染', () => {
  it('以带滞回的米制阈值稳定切换近、中、远景', () => {
    assert.deepEqual(COTTAGE_GARDEN_LOD.transitions, {
      nearToMiddle: 34,
      middleToFar: 82,
      hysteresis: 4,
    })
    assert.equal(resolveCottageGardenLodTier(20, 'near'), 'near')
    assert.equal(resolveCottageGardenLodTier(36, 'near'), 'near')
    assert.equal(resolveCottageGardenLodTier(42, 'near'), 'middle')
    assert.equal(resolveCottageGardenLodTier(84, 'far'), 'far')
    assert.equal(resolveCottageGardenLodTier(76, 'far'), 'middle')
  })

  it('连续 Turf 不参与几何 LOD，远景只降级非关键构造', () => {
    const near = resolveCottageGardenLodState('near')
    const middle = resolveCottageGardenLodState('middle')
    const far = resolveCottageGardenLodState('far')
    assert.equal(near.cottage.climbingFoliage, true)
    assert.equal(near.meadow.outerLawn, true)
    assert.equal(middle.meadow.outerLawn, true)
    assert.equal(far.meadow.outerLawn, true)
    assert.equal(middle.cottage.fineDetails, true)
    assert.equal('grass' in middle, false)
    assert.equal('grass' in far, false)
    assert.equal(far.cottage.fineDetails, false)
    assert.equal(far.fence.surfaceDetails, false)
    assert.equal('path' in far, false)
  })
})

describe('花海小院四时段自然时间轴', () => {
  it('固定清晨、中午、黄昏、傍晚的顺时针循环顺序', () => {
    assert.deepEqual(COTTAGE_GARDEN_TIME_ORDER, [
      'dawn',
      'noon',
      'dusk',
      'evening',
    ])
    assert.equal(COTTAGE_GARDEN_INITIAL_TIME, 'noon')
    assert.deepEqual(
      COTTAGE_GARDEN_TIME_ORDER.map(
        (time) => COTTAGE_GARDEN_TIME_PRESETS[time].label,
      ),
      ['清晨', '中午', '黄昏', '傍晚'],
    )
  })

  it('傍晚端点进入深靛蓝夜色，并同步压低天空与环境照明', () => {
    const dusk = COTTAGE_GARDEN_TIME_PRESETS.dusk
    const evening = COTTAGE_GARDEN_TIME_PRESETS.evening
    const luminance = (color: readonly [number, number, number]) =>
      color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722

    assert.ok(evening.exposure <= 0.82)
    assert.ok(luminance(evening.sky.zenith) < luminance(evening.sky.horizon))
    assert.ok(luminance(evening.sky.zenith) < 0.025)
    assert.ok(
      evening.lights.directionalIntensity <
        dusk.lights.directionalIntensity * 0.1,
    )
    assert.ok(
      evening.lights.hemisphereIntensity <
        dusk.lights.hemisphereIntensity * 0.3,
    )
    assert.ok(
      evening.lights.ambientIntensity < dusk.lights.ambientIntensity * 0.4,
    )
  })

  it('任意目标只沿自然时间前进，并在跨日时连续绕回清晨', () => {
    for (const start of [0, 0.1, 0.25, 0.6, 0.75, 0.92]) {
      for (const target of COTTAGE_GARDEN_TIME_ORDER) {
        const resolved = resolveCottageGardenForwardTargetPhase(start, target)
        assert.ok(resolved > start)
        assert.ok(resolved <= start + 1)
        assert.equal(
          Number((resolved % 1).toFixed(8)),
          COTTAGE_GARDEN_TIME_PRESETS[target].phase,
        )
      }
    }
    assert.equal(resolveCottageGardenForwardTargetPhase(0.75, 'dawn'), 1)
  })

  it('10 秒从清晨到黄昏会在 5 秒精确经过中午', () => {
    const target = resolveCottageGardenForwardTargetPhase(0, 'dusk')
    assert.equal(target, 0.5)
    assert.equal(sampleCottageGardenTransitionPhase(0, target, 0, 10), 0)
    assert.equal(sampleCottageGardenTransitionPhase(0, target, 5, 10), 0.25)
    assert.equal(sampleCottageGardenTransitionPhase(0, target, 10, 10), 0.5)
    const midpoint = sampleCottageGardenTime(0.25)
    assert.equal(midpoint.from, 'noon')
    assert.equal(midpoint.blend, 0)
  })

  it('中途重定向从当前相位继续，不回跳到上一个关键帧', () => {
    const current = sampleCottageGardenTransitionPhase(0, 0.75, 4, 10)
    const nextTarget = resolveCottageGardenForwardTargetPhase(current, 'dawn')
    assert.equal(
      sampleCottageGardenTransitionPhase(current, nextTarget, 0, 6),
      current,
    )
    assert.equal(
      sampleCottageGardenTransitionPhase(current, nextTarget, 6, 6),
      nextTarget,
    )
  })
})
