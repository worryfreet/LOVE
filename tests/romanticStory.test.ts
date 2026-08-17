import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ROMANTIC_STORY_TIMELINE,
  RomanticStoryRuntime,
  createRomanticStoryCompletionKey,
  resolveRomanticStoryPhase,
} from '@/features/garden-experience/model/romanticStory'
import { sampleRomanticCameraPose } from '@/features/garden-experience/model/romanticCameraPath'
import {
  COTTAGE_GARDEN_SKY_DOME_RADIUS_METERS,
  COTTAGE_GARDEN_SKY_RENDER_FAR_METERS,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenSkyAnimation'
import {
  configureCottageGardenRoseBloomMaterial,
  createCottageGardenRoseBloomUniforms,
  resolveCottageGardenRoseBloomProgress,
  resolveCottageGardenRoseBloomTriggerSeconds,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenRoseBloom'
import { resolveCottageGardenRomanticTimePhase } from '@/entities/scene/items/cottage-flower-garden/model/gardenRomanticExperience'
import { MeshStandardMaterial } from 'three'

describe('分享页沉浸浪漫剧情时钟', () => {
  it('按冻结端点解析约一分钟剧情阶段', () => {
    assert.equal(resolveRomanticStoryPhase(0), 'reveal')
    assert.equal(resolveRomanticStoryPhase(9), 'plaque')
    assert.equal(resolveRomanticStoryPhase(14), 'bloom-walk')
    assert.equal(resolveRomanticStoryPhase(53.9), 'letter-approach')
    assert.equal(resolveRomanticStoryPhase(54), 'letter-prompt')
    assert.equal(resolveRomanticStoryPhase(54, true), 'return-garden')
    assert.equal(resolveRomanticStoryPhase(68, true), 'finale-sky')
    assert.equal(resolveRomanticStoryPhase(78, true), 'sky-message-hold')
    assert.equal(resolveRomanticStoryPhase(83, true), 'ending-reveal')
    assert.equal(resolveRomanticStoryPhase(87, true), 'ending')
  })

  it('只在珍藏情书后恢复剧情，并在 87 秒停到结尾', () => {
    const runtime = new RomanticStoryRuntime()
    runtime.start()
    for (let index = 0; index < 600; index += 1) runtime.tick(0.1)
    assert.equal(runtime.getSnapshot().phase, 'letter-prompt')
    assert.equal(runtime.getSnapshot().timeSeconds, 54)

    assert.equal(runtime.openLetter(), true)
    runtime.tick(10)
    assert.equal(runtime.getSnapshot().phase, 'letter-reading')
    assert.equal(runtime.closeLetter(), true)
    assert.equal(runtime.getSnapshot().phase, 'letter-prompt')
    assert.equal(runtime.openLetter(), true)
    assert.equal(runtime.keepLetter(), true)

    for (let index = 0; index < 400; index += 1) runtime.tick(0.1)
    assert.equal(runtime.getSnapshot().phase, 'ending')
    assert.equal(
      runtime.getSnapshot().timeSeconds,
      ROMANTIC_STORY_TIMELINE.endingRevealEnd,
    )
    assert.equal(runtime.getFrameSnapshot().skyTimeSeconds, 10)
  })

  it('暂停、页面隐藏、跳过和重放都有确定性端点', () => {
    const runtime = new RomanticStoryRuntime()
    runtime.start()
    runtime.tick(2)
    const beforePause = runtime.getFrameSnapshot().timeSeconds
    runtime.togglePaused()
    runtime.tick(1)
    assert.equal(runtime.getFrameSnapshot().timeSeconds, beforePause)
    runtime.togglePaused()
    runtime.setPageVisible(false)
    runtime.tick(1)
    assert.equal(runtime.getFrameSnapshot().timeSeconds, beforePause)
    runtime.setPageVisible(true)
    runtime.tick(0.1)
    assert.ok(runtime.getFrameSnapshot().timeSeconds > beforePause)

    runtime.skipToFree()
    assert.equal(runtime.getSnapshot().phase, 'free')
    assert.equal(runtime.getFrameSnapshot().automaticCamera, false)
    assert.equal(runtime.getFrameSnapshot().storyEnvironmentActive, false)
    runtime.replay()
    assert.equal(runtime.getSnapshot().phase, 'reveal')
    assert.equal(runtime.getFrameSnapshot().roseStoryActive, true)
  })

  it('完成状态键只包含公开体验版本标识', () => {
    assert.equal(
      createRomanticStoryCompletionKey('rose-garden:revision-2'),
      'love:romantic-story:rose-garden:revision-2:completed',
    )
  })

  it('自动镜头沿入口、照片墙、情书桌和花园中段连续取样', () => {
    const opening = sampleRomanticCameraPose(0)
    const gate = sampleRomanticCameraPose(14)
    const gallery = sampleRomanticCameraPose(48.8)
    const letter = sampleRomanticCameraPose(54)
    const finale = sampleRomanticCameraPose(78)

    assert.ok(opening.position[0] < -11)
    assert.ok(gate.position[2] > 19)
    assert.ok(gallery.position[2] < -11)
    assert.ok(letter.position[2] < -11)
    assert.deepEqual(finale.position, [0, 1.42, 4.2])
    assert.ok(finale.target[1] > 35)
  })

  it('院门到屋门只沿主路中线慢速直行并始终看向屋门', () => {
    const nearGate = sampleRomanticCameraPose(17)
    const middle = sampleRomanticCameraPose(28)
    const nearDoor = sampleRomanticCameraPose(39)

    assert.deepEqual(
      [nearGate.position[0], middle.position[0], nearDoor.position[0]],
      [0, 0, 0],
    )
    assert.deepEqual(
      [nearGate.target[0], middle.target[0], nearDoor.target[0]],
      [0, 0, 0],
    )
    assert.ok(nearGate.position[2] - middle.position[2] < 14)
    assert.ok(middle.position[2] - nearDoor.position[2] < 15)
    assert.equal(
      ROMANTIC_STORY_TIMELINE.bloomWalkEnd -
        ROMANTIC_STORY_TIMELINE.plaqueEnd,
      25,
    )
    assert.ok(
      sampleRomanticCameraPose(16).target[1] >
        sampleRomanticCameraPose(17).target[1],
    )
  })

  it('玫瑰开放波在进入花株五米范围时确定性触发', () => {
    const entranceTrigger = resolveCottageGardenRoseBloomTriggerSeconds(15, 2)
    const cottageTrigger = resolveCottageGardenRoseBloomTriggerSeconds(-7, 3)
    assert.ok(entranceTrigger >= 14 && entranceTrigger < 17)
    assert.ok(cottageTrigger > entranceTrigger && cottageTrigger <= 39)
    assert.ok(
      Math.abs(
        Math.hypot(
          sampleRomanticCameraPose(entranceTrigger).position[2] - 15,
          2,
        ) - 5,
      ) < 0.001,
    )
    assert.ok(
      Math.abs(
        Math.hypot(
          sampleRomanticCameraPose(cottageTrigger).position[2] + 7,
          3,
        ) - 5,
      ) < 0.001,
    )
    assert.equal(
      resolveCottageGardenRoseBloomProgress(entranceTrigger - 0.5, 2, 15),
      0,
    )
    assert.equal(
      resolveCottageGardenRoseBloomProgress(entranceTrigger + 3, 2, 15),
      1,
    )
  })

  it('花开材质把统一剧情时钟注入实例化花瓣顶点阶段', () => {
    const material = new MeshStandardMaterial()
    const uniforms = createCottageGardenRoseBloomUniforms()
    configureCottageGardenRoseBloomMaterial(material, uniforms, 1.2)
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\nvoid main(){\n#include <begin_vertex>\n}',
      fragmentShader: '',
    }
    material.onBeforeCompile(shader as never, {} as never)
    assert.match(shader.vertexShader, /uRoseStoryTime/u)
    assert.match(shader.vertexShader, /instanceMatrix\[3\]\.xz/u)
    assert.equal(material.userData.roseBloom.lookAheadMeters, 5)
    material.dispose()
  })

  it('剧情夜色只在离开情书后从黄昏平滑推进到星夜', () => {
    assert.equal(resolveCottageGardenRomanticTimePhase(0), 0.5)
    assert.equal(resolveCottageGardenRomanticTimePhase(54), 0.5)
    assert.ok(resolveCottageGardenRomanticTimePhase(60) > 0.5)
    assert.equal(resolveCottageGardenRomanticTimePhase(66), 0.75)
    assert.equal(resolveCottageGardenRomanticTimePhase(87), 0.75)
  })

  it('终幕相机先完成抬头，远裁剪面覆盖完整星空穹顶', () => {
    const beforeSky = sampleRomanticCameraPose(66)
    const skyStart = sampleRomanticCameraPose(
      ROMANTIC_STORY_TIMELINE.returnGardenEnd,
    )

    beforeSky.position.forEach((coordinate, axis) => {
      assert.ok(Math.abs(coordinate - skyStart.position[axis]) < 0.001)
    })
    assert.ok(beforeSky.target[1] < 5)
    assert.ok(skyStart.target[1] >= 70)
    assert.ok(
      COTTAGE_GARDEN_SKY_RENDER_FAR_METERS >
        COTTAGE_GARDEN_SKY_DOME_RADIUS_METERS,
    )
  })
})
