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
    assert.equal(resolveRomanticStoryPhase(13), 'bloom-walk')
    assert.equal(resolveRomanticStoryPhase(36.9), 'letter-approach')
    assert.equal(resolveRomanticStoryPhase(37), 'letter-prompt')
    assert.equal(resolveRomanticStoryPhase(37, true), 'return-garden')
    assert.equal(resolveRomanticStoryPhase(44, true), 'finale-sky')
    assert.equal(resolveRomanticStoryPhase(54, true), 'sky-message-hold')
    assert.equal(resolveRomanticStoryPhase(59, true), 'ending-reveal')
    assert.equal(resolveRomanticStoryPhase(63, true), 'ending')
  })

  it('只在珍藏情书后恢复剧情，并在 63 秒停到结尾', () => {
    const runtime = new RomanticStoryRuntime()
    runtime.start()
    for (let index = 0; index < 400; index += 1) runtime.tick(0.1)
    assert.equal(runtime.getSnapshot().phase, 'letter-prompt')
    assert.equal(runtime.getSnapshot().timeSeconds, 37)

    assert.equal(runtime.openLetter(), true)
    runtime.tick(10)
    assert.equal(runtime.getSnapshot().phase, 'letter-reading')
    assert.equal(runtime.closeLetter(), true)
    assert.equal(runtime.getSnapshot().phase, 'letter-prompt')
    assert.equal(runtime.openLetter(), true)
    assert.equal(runtime.keepLetter(), true)

    for (let index = 0; index < 300; index += 1) runtime.tick(0.1)
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
    const gate = sampleRomanticCameraPose(13)
    const gallery = sampleRomanticCameraPose(31.8)
    const letter = sampleRomanticCameraPose(37)
    const finale = sampleRomanticCameraPose(54)

    assert.ok(opening.position[0] < -11)
    assert.ok(gate.position[2] > 19)
    assert.ok(gallery.position[2] < -11)
    assert.ok(letter.position[2] < -11)
    assert.deepEqual(finale.position, [0, 1.42, 4.2])
    assert.ok(finale.target[1] > 35)
  })

  it('玫瑰开放波在镜头前方触发且不同花区确定性错峰', () => {
    const entranceTrigger = resolveCottageGardenRoseBloomTriggerSeconds(15)
    const cottageTrigger = resolveCottageGardenRoseBloomTriggerSeconds(-7)
    assert.ok(entranceTrigger >= 13 && entranceTrigger < 17)
    assert.ok(cottageTrigger > entranceTrigger && cottageTrigger <= 23)
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
    assert.equal(material.userData.roseBloom.lookAheadMeters, 2.7)
    material.dispose()
  })

  it('剧情夜色只在离开情书后从黄昏平滑推进到星夜', () => {
    assert.equal(resolveCottageGardenRomanticTimePhase(0), 0.5)
    assert.equal(resolveCottageGardenRomanticTimePhase(37), 0.5)
    assert.ok(resolveCottageGardenRomanticTimePhase(40.5) > 0.5)
    assert.equal(resolveCottageGardenRomanticTimePhase(44), 0.75)
    assert.equal(resolveCottageGardenRomanticTimePhase(63), 0.75)
  })
})
