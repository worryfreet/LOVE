import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BufferGeometry, Color, Vector3 } from 'three'
import {
  createMeadowGrassClumpGeometry,
  createMeadowGrassLayout,
  createMeadowTurfGeometry,
  createWildflowerGeometry,
  createWildflowerMeadowLayout,
  resolveWildflowerBreezeSway,
  WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT,
  WILDFLOWER_MEADOW_PLANT_COUNT,
  WILDFLOWER_MEADOW_SIZE,
  WILDFLOWER_SPECIES_IDS,
  WILDFLOWER_SPECS,
} from '../src/entities/model/items/meadow-wildflowers'

function resolveColoredTriangleArea(
  geometry: BufferGeometry,
  colorValues: readonly string[],
) {
  const positions = geometry.getAttribute('position')
  const colors = geometry.getAttribute('color')
  const targets = colorValues.map((value) => new Color(value))
  const indices = geometry.index
  const triangleVertexCount = indices?.count ?? positions.count
  const pointA = new Vector3()
  const pointB = new Vector3()
  const pointC = new Vector3()
  const edgeAB = new Vector3()
  const edgeAC = new Vector3()
  let area = 0

  const matchesTargetColor = (vertexIndex: number) =>
    targets.some(
      (target) =>
        Math.abs(colors.getX(vertexIndex) - target.r) < 1e-6 &&
        Math.abs(colors.getY(vertexIndex) - target.g) < 1e-6 &&
        Math.abs(colors.getZ(vertexIndex) - target.b) < 1e-6,
    )

  for (let offset = 0; offset < triangleVertexCount; offset += 3) {
    const vertexA = indices?.getX(offset) ?? offset
    const vertexB = indices?.getX(offset + 1) ?? offset + 1
    const vertexC = indices?.getX(offset + 2) ?? offset + 2
    if (
      !matchesTargetColor(vertexA) ||
      !matchesTargetColor(vertexB) ||
      !matchesTargetColor(vertexC)
    ) {
      continue
    }

    pointA.fromBufferAttribute(positions, vertexA)
    pointB.fromBufferAttribute(positions, vertexB)
    pointC.fromBufferAttribute(positions, vertexC)
    edgeAB.subVectors(pointB, pointA)
    edgeAC.subVectors(pointC, pointA)
    area += edgeAB.cross(edgeAC).length() * 0.5
  }

  return area
}

describe('三种小野花的物种身份与共享几何', () => {
  it('三种花拥有不同花瓣轮廓、花瓣数与叶型', () => {
    const specs = WILDFLOWER_SPECIES_IDS.map((id) => WILDFLOWER_SPECS[id])
    assert.deepEqual(
      specs.map((spec) => spec.petalProfile),
      ['rounded', 'notched', 'forked'],
    )
    assert.deepEqual(
      specs.map((spec) => spec.petalCount),
      [12, 8, 12],
    )
    assert.deepEqual(
      specs.map((spec) => spec.leafProfile),
      ['spoon', 'thread', 'lance'],
    )
  })

  it('共享工厂生成带颜色、法线和米制包围盒的完整植株', () => {
    WILDFLOWER_SPECIES_IDS.forEach((species) => {
      const spec = WILDFLOWER_SPECS[species]
      const geometry = createWildflowerGeometry(species)
      assert.ok(geometry.getAttribute('position').count > 100)
      assert.equal(
        geometry.getAttribute('color').count,
        geometry.getAttribute('position').count,
      )
      assert.equal(
        geometry.getAttribute('normal').count,
        geometry.getAttribute('position').count,
      )
      assert.equal(geometry.userData.species, species)
      assert.equal(geometry.userData.petalProfile, spec.petalProfile)
      assert.ok(geometry.boundingBox)
      assert.ok(geometry.boundingBox.min.y >= -0.001)
      assert.ok(geometry.boundingBox.max.y >= spec.height - 0.0001)
      assert.ok(
        geometry.boundingBox.max.y < spec.height + spec.petalLength * 0.55,
      )
      geometry.dispose()
    })
  })

  it('花园外草坪复用同一物种轮廓并使用低面数场景级几何', () => {
    WILDFLOWER_SPECIES_IDS.forEach((species) => {
      const specimen = createWildflowerGeometry(species)
      const field = createWildflowerGeometry(species, 'field')
      assert.equal(field.userData.species, species)
      assert.equal(field.userData.detail, 'field')
      assert.ok(field.getAttribute('position').count < specimen.getAttribute('position').count)
      specimen.dispose()
      field.dispose()
    })

    const sampleGrass = createMeadowGrassClumpGeometry()
    const fieldGrass = createMeadowGrassClumpGeometry('field')
    assert.equal(fieldGrass.userData.detail, 'field')
    assert.equal(fieldGrass.userData.bladeCount, sampleGrass.userData.bladeCount)
    assert.equal(fieldGrass.index?.count, fieldGrass.userData.bladeCount * 3)
    assert.ok((fieldGrass.index?.count ?? 0) < (sampleGrass.index?.count ?? 0))
    sampleGrass.dispose()
    fieldGrass.dispose()
  })

  it('场景级野雏菊保留有面积的圆润花瓣，不退化成只有黄色花心', () => {
    const spec = WILDFLOWER_SPECS['wild-daisy']
    const geometry = createWildflowerGeometry('wild-daisy', 'field')
    const petalArea = resolveColoredTriangleArea(geometry, [
      spec.petalColor,
      spec.petalAccent,
    ])

    assert.ok(
      petalArea > spec.petalCount * spec.petalLength * spec.petalWidth * 0.2,
      `野雏菊花瓣面积过小：${petalArea}`,
    )
    geometry.dispose()
  })
})

describe('1㎡野花草坪样板', () => {
  it('布局确定、边界安全且三种野花都达到可见密度', () => {
    const first = createWildflowerMeadowLayout()
    const second = createWildflowerMeadowLayout()
    assert.deepEqual(first, second)
    assert.equal(first.length, WILDFLOWER_MEADOW_PLANT_COUNT)
    assert.equal(WILDFLOWER_MEADOW_PLANT_COUNT, 160)
    assert.equal(new Set(first.map((placement) => placement.id)).size, first.length)
    first.forEach((placement) => {
      assert.ok(Math.abs(placement.x) <= WILDFLOWER_MEADOW_SIZE * 0.46)
      assert.ok(Math.abs(placement.z) <= WILDFLOWER_MEADOW_SIZE * 0.46)
      assert.ok(placement.scale >= 0.72 && placement.scale <= 1.1)
    })
    WILDFLOWER_SPECIES_IDS.forEach((species) => {
      assert.ok(
        first.filter((placement) => placement.species === species).length >= 20,
      )
    })
  })

  it('薄地表的 X/Z 包围盒精确为 1m 且只负责遮住草根间隙', () => {
    const geometry = createMeadowTurfGeometry()
    assert.ok(geometry.boundingBox)
    assert.equal(
      geometry.boundingBox.max.x - geometry.boundingBox.min.x,
      WILDFLOWER_MEADOW_SIZE,
    )
    assert.equal(
      geometry.boundingBox.max.z - geometry.boundingBox.min.z,
      WILDFLOWER_MEADOW_SIZE,
    )
    assert.equal(geometry.userData.surface, 'root-gap-underlay')
    assert.equal(geometry.userData.visuallyDominant, false)
    assert.equal(geometry.getAttribute('color').count, 17 * 17)
    geometry.dispose()
  })

  it('确定性短草簇连续覆盖样板且具有真实立体草叶', () => {
    const first = createMeadowGrassLayout()
    const second = createMeadowGrassLayout()
    assert.deepEqual(first, second)
    assert.equal(first.length, WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT)
    assert.equal(new Set(first.map((placement) => placement.id)).size, first.length)
    first.forEach((placement) => {
      assert.ok(Math.abs(placement.x) <= WILDFLOWER_MEADOW_SIZE * 0.484)
      assert.ok(Math.abs(placement.z) <= WILDFLOWER_MEADOW_SIZE * 0.484)
      assert.ok(placement.widthScale >= 0.82 && placement.widthScale <= 1.16)
      assert.ok(placement.heightScale >= 0.99 && placement.heightScale <= 1.12)
    })

    const geometry = createMeadowGrassClumpGeometry()
    assert.equal(geometry.userData.semanticRole, 'short-dense-grass-clump')
    assert.ok(geometry.userData.bladeCount >= 7)
    assert.ok(
      WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT * geometry.userData.bladeCount >=
        12000,
    )
    assert.ok(geometry.boundingBox)
    assert.ok(geometry.boundingBox.min.y >= 0)
    assert.ok(geometry.boundingBox.max.y >= 0.05)
    assert.ok(geometry.boundingBox.max.y <= 0.052)
    const shortestFlowerHeight = Math.min(
      ...WILDFLOWER_SPECIES_IDS.map((species) => WILDFLOWER_SPECS[species].height),
    )
    const bladeHeightRange = geometry.userData.bladeHeightRange as [number, number]
    const shortestGrass = bladeHeightRange[0] * 0.99
    const tallestGrass = bladeHeightRange[1] * 1.12
    assert.ok(shortestGrass >= shortestFlowerHeight * 0.5)
    assert.ok(tallestGrass <= shortestFlowerHeight * (2 / 3) + 0.0001)
    assert.equal(
      geometry.getAttribute('color').count,
      geometry.getAttribute('position').count,
    )
    geometry.dispose()
  })
})

describe('小野花轻风动作', () => {
  it('轻风从静止出发、保持有界并精确回到静止', () => {
    assert.equal(resolveWildflowerBreezeSway(0, 0.055), 0)
    assert.ok(
      Math.abs(resolveWildflowerBreezeSway(0.36, 0.055)) <= 0.055,
    )
    assert.ok(Math.abs(resolveWildflowerBreezeSway(1, 0.055)) < 1e-12)
    assert.equal(resolveWildflowerBreezeSway(-1, 0.055), 0)
    assert.ok(Math.abs(resolveWildflowerBreezeSway(2, 0.055)) < 1e-12)
  })
})
