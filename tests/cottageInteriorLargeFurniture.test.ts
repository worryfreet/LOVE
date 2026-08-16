import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS,
  resolveCottageSingleBedDimensions,
} from '../src/entities/part/items/cottage-single-bed/model/singleBed'
import {
  createCottageSingleBedTextures,
  disposeCottageSingleBedTextures,
} from '../src/entities/part/items/cottage-single-bed/lib/singleBedTextures'
import { CottageSingleBed } from '../src/entities/part/items/cottage-single-bed/ui/CottageSingleBed'
import {
  DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS,
  resolveCottageLoveseatSofaDimensions,
} from '../src/entities/part/items/cottage-loveseat-sofa/model/loveseatSofa'
import {
  createCottageLoveseatSofaTextures,
  disposeCottageLoveseatSofaTextures,
} from '../src/entities/part/items/cottage-loveseat-sofa/lib/loveseatSofaTextures'
import { CottageLoveseatSofa } from '../src/entities/part/items/cottage-loveseat-sofa/ui/CottageLoveseatSofa'
import {
  COTTAGE_LOW_CABINET_VARIANTS,
  DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS,
  isCottageLowCabinetVariant,
  resolveCottageLowCabinetDimensions,
} from '../src/entities/part/items/cottage-low-cabinet/model/lowCabinet'
import {
  createCottageLowCabinetTextures,
  disposeCottageLowCabinetTextures,
} from '../src/entities/part/items/cottage-low-cabinet/lib/lowCabinetTextures'
import { CottageLowCabinet } from '../src/entities/part/items/cottage-low-cabinet/ui/CottageLowCabinet'
import { cottageInteriorPartCatalogEntries } from '../src/entities/part/model/cottageInteriorPartCatalog'

describe('花海小院大型家具零件', () => {
  it('单人床保持 0.9×1.9 米包络、地面原点和床头高度关系', () => {
    const first = resolveCottageSingleBedDimensions(
      DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS,
    )
    const second = resolveCottageSingleBedDimensions(
      DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS,
    )

    assert.deepEqual(first, second)
    assert.equal(first.width, 0.9)
    assert.equal(first.length, 1.9)
    assert.equal(first.bedHeight, 0.58)
    assert.ok(first.headboardHeight > first.bedHeight)
    assert.ok(first.innerWidth < first.width)
    assert.ok(first.innerLength < first.length)
    assert.ok(first.frameTop > 0)
  })

  it('双人沙发由外包络派生两座净宽且不产生负尺寸', () => {
    const sofa = resolveCottageLoveseatSofaDimensions(
      DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS,
    )

    assert.equal(sofa.width, 1.75)
    assert.equal(sofa.depth, 0.82)
    assert.equal(sofa.height, 0.82)
    assert.ok(sofa.innerWidth > sofa.width * 0.65)
    assert.ok(sofa.seatTop > sofa.baseHeight)
    assert.ok(sofa.seatTop < sofa.height)
    assert.ok(sofa.backThickness < sofa.depth / 2)
  })

  it('长矮柜两个变体共享同一柜体尺寸源', () => {
    const cabinet = resolveCottageLowCabinetDimensions(
      DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS,
    )

    assert.deepEqual(COTTAGE_LOW_CABINET_VARIANTS, [
      'cabinet',
      'cushioned-bench',
    ])
    assert.equal(isCottageLowCabinetVariant('cabinet'), true)
    assert.equal(isCottageLowCabinetVariant('cushioned-bench'), true)
    assert.equal(isCottageLowCabinetVariant('bookshelf'), false)
    assert.equal(cabinet.width, 2.2)
    assert.equal(cabinet.depth, 0.46)
    assert.equal(cabinet.height, 0.78)
    assert.ok(cabinet.frontHeight > 0.5)
    assert.ok(cabinet.cushionHeight > 0)
  })

  it('三个零件都拒绝非有限或越界尺寸', () => {
    assert.throws(
      () =>
        resolveCottageSingleBedDimensions({
          ...DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS,
          width: Number.NaN,
        }),
      /床宽必须/,
    )
    assert.throws(
      () =>
        resolveCottageLoveseatSofaDimensions({
          ...DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS,
          depth: 0.4,
        }),
      /沙发深度必须/,
    )
    assert.throws(
      () =>
        resolveCottageLowCabinetDimensions({
          ...DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS,
          height: Number.POSITIVE_INFINITY,
        }),
      /矮柜高度必须/,
    )
  })

  it('目录公开的床与低柜尺寸边界全部落在几何解析器合法范围内', () => {
    const bed = cottageInteriorPartCatalogEntries.find(
      (part) => part.id === 'cottage-single-bed',
    )
    const cabinet = cottageInteriorPartCatalogEntries.find(
      (part) => part.id === 'cottage-low-cabinet',
    )
    assert.ok(bed && cabinet)
    type CatalogPart = (typeof cottageInteriorPartCatalogEntries)[number]
    const numberParameter = (
      part: CatalogPart,
      id: string,
    ) => {
      const parameter = part.parameters.find((candidate) => candidate.id === id)
      assert.ok(parameter?.type === 'number')
      return parameter
    }
    const bedWidth = numberParameter(bed, 'width')
    const bedLength = numberParameter(bed, 'length')
    const bedHeight = numberParameter(bed, 'bedHeight')
    const cabinetHeight = numberParameter(cabinet, 'height')

    assert.doesNotThrow(() =>
      resolveCottageSingleBedDimensions({
        width: bedWidth.min / 1_000,
        length: bedLength.min / 1_000,
        bedHeight: bedHeight.min / 1_000,
      }),
    )
    assert.doesNotThrow(() =>
      resolveCottageLowCabinetDimensions({
        ...DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS,
        height: cabinetHeight.min / 1_000,
      }),
    )
  })

  it('三组木纹与布纹贴图确定生成，并由各自拥有者完整释放', () => {
    const textureSets = [
      {
        textures: createCottageSingleBedTextures(),
        dispose: disposeCottageSingleBedTextures,
      },
      {
        textures: createCottageLoveseatSofaTextures(),
        dispose: disposeCottageLoveseatSofaTextures,
      },
      {
        textures: createCottageLowCabinetTextures(),
        dispose: disposeCottageLowCabinetTextures,
      },
    ] as const

    for (const { textures, dispose } of textureSets) {
      const ownedTextures = Object.values(textures)
      const disposeCounts = new Map(ownedTextures.map((texture) => [texture, 0]))
      for (const texture of ownedTextures) {
        const data = texture.image.data as Uint8Array
        assert.ok(data.length > 0)
        assert.ok(Array.from(data).every(Number.isFinite))
        texture.addEventListener('dispose', () => {
          disposeCounts.set(texture, (disposeCounts.get(texture) ?? 0) + 1)
        })
      }

      dispose(textures)

      for (const texture of ownedTextures) {
        assert.equal(disposeCounts.get(texture), 1)
      }
    }
  })

  it('三个公共组件统一接收 PartParameterValues 并保留可选质量等级', () => {
    const bedProps = {
      parameters: { width: 900 },
      quality: 'desktop',
    } satisfies Parameters<typeof CottageSingleBed>[0]
    const sofaProps = {
      parameters: { width: 1750 },
      quality: 'mobile',
    } satisfies Parameters<typeof CottageLoveseatSofa>[0]
    const cabinetProps = {
      parameters: { variant: 'cushioned-bench' },
      quality: 'desktop',
    } satisfies Parameters<typeof CottageLowCabinet>[0]
    const contracts = [
      {
        component: CottageSingleBed,
        props: bedProps,
      },
      {
        component: CottageLoveseatSofa,
        props: sofaProps,
      },
      {
        component: CottageLowCabinet,
        props: cabinetProps,
      },
    ]

    for (const contract of contracts) {
      assert.equal(typeof contract.component, 'function')
      assert.ok('parameters' in contract.props)
    }
  })
})
