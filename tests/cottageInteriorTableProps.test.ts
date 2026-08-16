import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { describe, it } from 'node:test'
import { Vector3 } from 'three'
import {
  CAST_IRON_STOVE_LOCAL_FRAME,
  CAST_IRON_STOVE_MATERIAL_SLOTS,
  CAST_IRON_STOVE_SOCKETS,
  CastIronStovePartModel,
  CottageCastIronStove,
  DEFAULT_CAST_IRON_STOVE_DIMENSIONS,
  resolveCastIronStoveDimensions,
} from '../src/entities/part/items/cottage-cast-iron-stove'
import {
  DEFAULT_ROUND_TABLE_DIMENSIONS,
  ROUND_TABLE_LOCAL_FRAME,
  ROUND_TABLE_MATERIAL_SLOTS,
  CottageRoundTable,
  RoundTablePartModel,
  resolveRoundTableDimensions,
} from '../src/entities/part/items/cottage-round-table'
import {
  DEFAULT_WOOD_CHAIR_DIMENSIONS,
  WOOD_CHAIR_LOCAL_FRAME,
  WOOD_CHAIR_MATERIAL_SLOTS,
  CottageWoodChair,
  WoodChairPartModel,
  resolveWoodChairDimensions,
} from '../src/entities/part/items/cottage-wood-chair'
import {
  CANDLE_LOCAL_FRAME,
  CANDLE_MATERIAL_SLOTS,
  CandlePartModel,
  CottageCandle,
  createCandleBodyGeometry,
  resolveCandleDimensions,
} from '../src/entities/part/items/cottage-candle'
import {
  DEFAULT_ENVELOPE_DIMENSIONS,
  ENVELOPE_LOCAL_FRAME,
  ENVELOPE_MATERIAL_SLOTS,
  ENVELOPE_PIVOTS,
  CottageEnvelope,
  EnvelopePartModel,
  resolveEnvelopeDimensions,
  resolveEnvelopeOpenState,
} from '../src/entities/part/items/cottage-envelope'

const PART_IDS = [
  'cottage-cast-iron-stove',
  'cottage-round-table',
  'cottage-wood-chair',
  'cottage-candle',
  'cottage-envelope',
] as const

function assertUnique(values: readonly string[]) {
  assert.equal(new Set(values).size, values.length)
}

describe('花海小院桌面与生活道具零件契约', () => {
  it('五类零件公开稳定组件入口与米制默认包络', () => {
    assert.equal(typeof CastIronStovePartModel, 'function')
    assert.equal(typeof RoundTablePartModel, 'function')
    assert.equal(typeof WoodChairPartModel, 'function')
    assert.equal(typeof CandlePartModel, 'function')
    assert.equal(typeof EnvelopePartModel, 'function')
    assert.equal(typeof CottageCastIronStove, 'function')
    assert.equal(typeof CottageRoundTable, 'function')
    assert.equal(typeof CottageWoodChair, 'function')
    assert.equal(typeof CottageCandle, 'function')
    assert.equal(typeof CottageEnvelope, 'function')

    assert.deepEqual(DEFAULT_CAST_IRON_STOVE_DIMENSIONS, {
      width: 0.62,
      depth: 0.5,
      height: 0.82,
    })
    assert.deepEqual(DEFAULT_ROUND_TABLE_DIMENSIONS, {
      diameter: 1.15,
      height: 0.74,
      topThickness: 0.055,
    })
    assert.deepEqual(DEFAULT_WOOD_CHAIR_DIMENSIONS, {
      width: 0.46,
      depth: 0.5,
      height: 0.88,
      seatHeight: 0.46,
    })
    assert.deepEqual(DEFAULT_ENVELOPE_DIMENSIONS, {
      width: 0.22,
      depth: 0.16,
      paperThickness: 0.00035,
    })
  })

  it('所有局部坐标统一 +Y 向上，木椅与炉体以 +Z 为正面', () => {
    assert.equal(CAST_IRON_STOVE_LOCAL_FRAME.up, '+Y')
    assert.equal(CAST_IRON_STOVE_LOCAL_FRAME.forward, '+Z')
    assert.equal(ROUND_TABLE_LOCAL_FRAME.up, '+Y')
    assert.match(ROUND_TABLE_LOCAL_FRAME.forward, /^\+Z/u)
    assert.equal(WOOD_CHAIR_LOCAL_FRAME.up, '+Y')
    assert.match(WOOD_CHAIR_LOCAL_FRAME.forward, /^\+Z/u)
    assert.equal(CANDLE_LOCAL_FRAME.up, '+Y')
    assert.match(CANDLE_LOCAL_FRAME.forward, /^\+Z/u)
    assert.equal(ENVELOPE_LOCAL_FRAME.up, '+Y')
    assert.match(ENVELOPE_LOCAL_FRAME.forward, /^\+Z/u)
  })

  it('材质槽唯一且交互接口具有稳定语义名', () => {
    assertUnique(CAST_IRON_STOVE_MATERIAL_SLOTS)
    assertUnique(ROUND_TABLE_MATERIAL_SLOTS)
    assertUnique(WOOD_CHAIR_MATERIAL_SLOTS)
    assertUnique(CANDLE_MATERIAL_SLOTS)
    assertUnique(ENVELOPE_MATERIAL_SLOTS)
    assert.equal(CAST_IRON_STOVE_SOCKETS.flue, 'socket.flue')
    assert.equal(ENVELOPE_PIVOTS.flap, 'pivot.flap')
    assert.equal(ENVELOPE_PIVOTS.letterRail, 'pivot.letter-rail')
    assert.equal(ENVELOPE_PIVOTS.letterFoldTop, 'pivot.letter-fold-top')
    assert.equal(ENVELOPE_PIVOTS.letterFoldBottom, 'pivot.letter-fold-bottom')
  })

  it('尺寸解析拒绝非有限值与破坏结构的比例', () => {
    assert.throws(
      () => resolveCastIronStoveDimensions({ width: Number.NaN }),
      /有限正数/u,
    )
    assert.throws(
      () => resolveRoundTableDimensions({ topThickness: 0.3 }),
      /四分之一/u,
    )
    assert.throws(
      () => resolveWoodChairDimensions({ seatHeight: 0.8 }),
      /72%/u,
    )
    assert.throws(
      () => resolveCandleDimensions({ diameter: 0.2 }),
      /0\.14m/u,
    )
    assert.throws(
      () => resolveEnvelopeDimensions({ paperThickness: 0.02 }),
      /5%/u,
    )
  })

  it('蜡烛 LatheGeometry 保持有限属性、承载面原点与精确包络', () => {
    for (const quality of ['desktop', 'mobile'] as const) {
      const geometry = createCandleBodyGeometry(
        { diameter: 0.065, height: 0.16 },
        quality,
      )
      assert.ok(geometry.boundingBox)
      const size = geometry.boundingBox.getSize(new Vector3())
      assert.ok(Math.abs(size.x - 0.065) < 0.001)
      assert.ok(Math.abs(size.y - 0.16) < 1e-6)
      assert.ok(Math.abs(geometry.boundingBox.min.y) < 1e-9)
      Object.values(geometry.attributes).forEach((attribute) => {
        assert.ok(Array.from(attribute.array).every(Number.isFinite))
      })
      geometry.dispose()
    }
  })

  it('信封开合由单一进度纯函数控制，可钳制并精确回到关闭态', () => {
    const closed = resolveEnvelopeOpenState(0)
    const half = resolveEnvelopeOpenState(0.5)
    const open = resolveEnvelopeOpenState(1)
    const replayClosed = resolveEnvelopeOpenState(0)

    assert.deepEqual(replayClosed, closed)
    assert.equal(closed.flapAngle, 0)
    assert.equal(closed.letterReveal, 0)
    assert.equal(closed.phase, 'sealed')
    assert.equal(closed.sealBreak, 0)
    assert.ok(half.flapAngle < 0)
    assert.ok(half.letterReveal > 0 && half.letterReveal < 1)
    assert.equal(open.letterReveal, 1)
    assert.equal(open.topFoldAngle, 0)
    assert.equal(open.bottomFoldAngle, 0)
    assert.equal(open.phase, 'ready-to-read')
    assert.equal(open.readerReady, true)
    assert.equal(resolveEnvelopeOpenState(-2).progress, 0)
    assert.equal(resolveEnvelopeOpenState(3).progress, 1)
    assert.throws(() => resolveEnvelopeOpenState(Number.NaN), /有限数值/u)
  })

  it('每类零件都迁移了独立实现目录而不是运行时占位对象', () => {
    for (const partId of PART_IDS) {
      const implementation = new URL(
        `../src/entities/part/items/${partId}/index.ts`,
        import.meta.url,
      )
      assert.ok(statSync(implementation).size > 100)
    }
  })

  it('蜡烛零件不创建逐支点光，信封源码保留可寻址铰链', () => {
    const candleSource = readFileSync(
      new URL(
        '../src/entities/part/items/cottage-candle/ui/CandlePartModel.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const envelopeSource = readFileSync(
      new URL(
        '../src/entities/part/items/cottage-envelope/ui/EnvelopePartModel.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    assert.doesNotMatch(candleSource, /pointLight/u)
    assert.match(envelopeSource, /name=\{ENVELOPE_PIVOTS\.flap\}/u)
    assert.match(envelopeSource, /name=\{ENVELOPE_PIVOTS\.letterRail\}/u)
    assert.match(envelopeSource, /name=\{ENVELOPE_PIVOTS\.letterFoldTop\}/u)
    assert.match(envelopeSource, /name=\{ENVELOPE_PIVOTS\.letterFoldBottom\}/u)
    assert.match(envelopeSource, /state\.flapAngle/u)
  })

  it('场景烟管挂到真实炉口 socket，圆桌绣球花消费可编辑桌高', () => {
    const stoveSource = readFileSync(
      new URL(
        '../src/entities/part/items/cottage-cast-iron-stove/ui/CastIronStovePartModel.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    const runtimeSource = readFileSync(
      new URL(
        '../src/widgets/scene-editor/ui/CottageInteriorRuntime.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    assert.match(stoveSource, /name=\{CAST_IRON_STOVE_SOCKETS\.flue\}/u)
    assert.match(stoveSource, /\{flueAccessory\}/u)
    assert.match(runtimeSource, /flueAccessory=/u)
    assert.match(runtimeSource, /DefaultTableHydrangeas\s+tableHeight=\{tableHeight\}/u)
    assert.match(runtimeSource, /HydrangeaAssembly/u)
  })

  it('零件预览直接复用场景集成组件，不维护第二套几何', () => {
    const previewContracts = [
      ['cottage-cast-iron-stove', 'CottageCastIronStove'],
      ['cottage-round-table', 'CottageRoundTable'],
      ['cottage-wood-chair', 'CottageWoodChair'],
      ['cottage-candle', 'CottageCandle'],
      ['cottage-envelope', 'CottageEnvelope'],
    ] as const

    for (const [partId, componentName] of previewContracts) {
      const source = readFileSync(
        new URL(
          `../src/entities/part/items/${partId}/ui/PreviewScene.tsx`,
          import.meta.url,
        ),
        'utf8',
      )
      assert.match(source, new RegExp(`<${componentName}\\b`, 'u'))
      assert.doesNotMatch(source, /Geometry\b/u)
    }
  })
})
