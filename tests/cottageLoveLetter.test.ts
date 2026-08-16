import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  DEFAULT_LOVE_LETTER_CONTENT,
  resolveLoveLetterContent,
  sanitizeLoveLetterText,
} from '../src/entities/part/items/cottage-envelope'
import { resolveEnvelopeOpenState } from '../src/entities/part/items/cottage-envelope/model/envelope'
import { createEnvelopePaperTextures, disposeEnvelopePaperTextures } from '../src/entities/part/items/cottage-envelope/lib/envelopePaperTextures'
import {
  LOVE_LETTER_INTERACTION_DISTANCE,
  isLoveLetterInteractionEligible,
} from '../src/widgets/scene-editor/model/cottageLoveLetterInteraction'

describe('花海小屋情书体验', () => {
  it('开封、抽信和两次展开遵守阶段顺序且可确定性回放', () => {
    const samples = [0, 0.12, 0.3, 0.58, 0.76, 0.94, 1].map(
      resolveEnvelopeOpenState,
    )
    assert.equal(samples[0].phase, 'sealed')
    assert.ok(samples[1].sealBreak > 0)
    assert.equal(samples[1].letterTravel, 0)
    assert.ok(samples[2].flapAngle < -Math.PI * 0.7)
    assert.ok(samples[3].letterTravel > 0.9)
    assert.ok(samples[4].topFoldAngle < samples[3].topFoldAngle)
    assert.ok(samples[5].bottomFoldAngle === 0)
    assert.equal(samples[6].readerReady, true)
    assert.deepEqual(resolveEnvelopeOpenState(0.58), samples[3])
    assert.deepEqual(resolveEnvelopeOpenState(0), samples[0])
  })

  it('默认情书是完整正文，个性化内容会清理控制字符并安全限长', () => {
    assert.ok(DEFAULT_LOVE_LETTER_CONTENT.body.split('\n\n').length >= 4)
    assert.match(DEFAULT_LOVE_LETTER_CONTENT.body, /未来/u)
    assert.equal(
      sanitizeLoveLetterText('  亲爱\u0000的你\r\n：  ', '', 8, false),
      '亲爱的你 ：',
    )
    const content = resolveLoveLetterContent({
      letterTitle: '我们的故事',
      letterSalutation: '宝贝：',
      letterBody: '第一段\n\n\n第二段',
      letterSignature: '爱你的人',
    })
    assert.deepEqual(content, {
      title: '我们的故事',
      salutation: '宝贝：',
      body: '第一段\n\n第二段',
      signature: '爱你的人',
    })
  })

  it('纸纤维贴图确定生成并由显式生命周期释放', () => {
    const first = createEnvelopePaperTextures(16)
    const second = createEnvelopePaperTextures(16)
    assert.deepEqual(
      Array.from(first.color.image.data).slice(0, 64),
      Array.from(second.color.image.data).slice(0, 64),
    )
    assert.notDeepEqual(
      Array.from(first.color.image.data).slice(0, 16),
      Array.from(first.roughness.image.data).slice(0, 16),
    )
    disposeEnvelopePaperTextures(first)
    disposeEnvelopePaperTextures(second)
  })

  it('只有近距离且视线朝向信封时允许拆信', () => {
    assert.equal(isLoveLetterInteractionEligible(1.6, 0.8), true)
    assert.equal(
      isLoveLetterInteractionEligible(LOVE_LETTER_INTERACTION_DISTANCE + 0.01, 1),
      false,
    )
    assert.equal(isLoveLetterInteractionEligible(1, 0.1), false)
  })

  it('二维阅读层提供对话框、焦点、关闭与移动端阅读语义', () => {
    const readerSource = readFileSync(
      new URL('../src/widgets/scene-editor/ui/LoveLetterReader.tsx', import.meta.url),
      'utf8',
    )
    const runtimeSource = readFileSync(
      new URL('../src/widgets/scene-editor/ui/InteractiveCottageEnvelope.tsx', import.meta.url),
      'utf8',
    )
    assert.match(readerSource, /role="dialog"/u)
    assert.match(readerSource, /aria-modal="true"/u)
    assert.match(readerSource, /data-love-letter-reader/u)
    assert.match(readerSource, /closeButtonRef\.current\?\.focus/u)
    assert.match(runtimeSource, /document\.exitPointerLock/u)
    assert.match(runtimeSource, /data-love-letter-action/u)
  })
})
