import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { SRGBColorSpace, Texture } from 'three'
import {
  resolveCottagePhotoFrameSpec,
  resolveCoverUvTransform,
} from '../src/entities/part/items/cottage-photo-frame/lib/photoFrame'
import {
  configurePhotoTexture,
  createPhotoSurfaceGeometry,
  loadPhotoTextureWithFallback,
  loadSharedPhotoTexture,
  type PhotoTextureLoader,
} from '../src/entities/part/items/cottage-photo-frame/lib/photoTexture'
import {
  STRING_LIGHT_MAX_BULBS,
  computeStringLightBulbPlacements,
  measureStringLightArcLength,
  normalizeStringLightControlPoints,
  resolveStringLightBulbCount,
  resolveStringLightPath,
  resolveStringLightWarmColor,
  sampleStringLightPath,
  type StringLightPoint,
} from '../src/entities/part/items/cottage-string-lights/lib/stringLightPath'

const photoFrameSource = await readFile(
  new URL(
    '../src/entities/part/items/cottage-photo-frame/ui/CottagePhotoFrame.tsx',
    import.meta.url,
  ),
  'utf8',
)
const interiorPanelSource = await readFile(
  new URL(
    '../src/widgets/scene-editor/ui/CottageInteriorEditorPanel.tsx',
    import.meta.url,
  ),
  'utf8',
)

describe('小院纪念相框', () => {
  it('墙挂与桌放使用不同且可复核的局部原点', () => {
    const wall = resolveCottagePhotoFrameSpec({
      mount: 'wall',
      width: 0.32,
      height: 0.4,
      matWidth: 0.032,
    })
    const table = resolveCottagePhotoFrameSpec({
      mount: 'table',
      width: 0.24,
      height: 0.3,
      matWidth: 0.02,
    })

    assert.equal(wall.origin, 'back-center')
    assert.equal(wall.localBounds.min[1], -0.2)
    assert.equal(wall.localBounds.max[1], 0.2)
    assert.equal(table.origin, 'support-surface')
    assert.equal(table.localBounds.min[1], 0)
    assert.equal(table.localBounds.max[1], 0.3)
    assert.ok(table.localBounds.min[2] < 0)
    assert.ok(wall.photoWidth > 0 && wall.photoHeight > 0)
  })

  it('大图允许细木框与极窄卡纸，让照片开口占据主体面积', () => {
    const hero = resolveCottagePhotoFrameSpec({
      mount: 'wall',
      width: 1.5,
      height: 1,
      frameRailWidth: 0.016,
      matWidth: 0.003,
    })
    assert.equal(hero.frameRailWidth, 0.016)
    assert.ok(
      (hero.photoWidth * hero.photoHeight) / (hero.width * hero.height) > 0.9,
    )
  })

  it('拒绝失去照片开口的卡纸和非法尺寸', () => {
    assert.throws(
      () =>
        resolveCottagePhotoFrameSpec({
          mount: 'wall',
          width: 0.1,
          height: 0.4,
          matWidth: 0.02,
        }),
      /相框宽度/,
    )
    assert.throws(
      () =>
        resolveCottagePhotoFrameSpec({
          mount: 'wall',
          width: 0.2,
          height: 0.2,
          matWidth: 0.08,
        }),
      /卡纸边宽/,
    )
  })

  it('横图进入竖框时居中裁切，且配置为 sRGB 照片纹理', () => {
    const transform = resolveCoverUvTransform(1536, 1024, 0.18, 0.28)
    assert.ok(transform.repeat[0] < 1)
    assert.equal(transform.repeat[1], 1)
    assert.ok(Math.abs(transform.offset[0] - (1 - transform.repeat[0]) / 2) < 1e-12)

    const texture = new Texture({ width: 1536, height: 1024 } as HTMLImageElement)
    configurePhotoTexture(texture, 0.18, 0.28)
    assert.equal(texture.colorSpace, SRGBColorSpace)
    assert.equal(texture.repeat.x, transform.repeat[0])
    assert.equal(texture.offset.x, transform.offset[0])
    texture.dispose()
  })

  it('把不同画幅的 cover 裁切写入平面 UV，以共享默认 GPU 纹理', () => {
    const texture = new Texture({ width: 1536, height: 1024 } as HTMLImageElement)
    const geometry = createPhotoSurfaceGeometry(texture, 0.18, 0.28)
    const uv = geometry.attributes.uv
    const xValues = Array.from({ length: uv.count }, (_, index) =>
      uv.getX(index),
    )
    const yValues = Array.from({ length: uv.count }, (_, index) =>
      uv.getY(index),
    )
    const transform = resolveCoverUvTransform(1536, 1024, 0.18, 0.28)
    assert.ok(
      Math.abs(Math.min(...xValues) - transform.offset[0]) < 0.000_001,
    )
    assert.ok(
      Math.abs(
        Math.max(...xValues) -
          (transform.offset[0] + transform.repeat[0]),
      ) < 0.000_001,
    )
    assert.ok(
      Math.abs(Math.min(...yValues) - transform.offset[1]) < 0.000_001,
    )
    assert.ok(
      Math.abs(
        Math.max(...yValues) -
          (transform.offset[1] + transform.repeat[1]),
      ) < 0.000_001,
    )
    geometry.dispose()
    texture.dispose()
  })

  it('相同默认照片只加载一份共享 Texture，玻璃不触发透射预渲染', async () => {
    let calls = 0
    const texture = new Texture()
    const loader: PhotoTextureLoader = {
      async loadAsync() {
        calls += 1
        return texture
      },
    }
    const [first, second] = await Promise.all([
      loadSharedPhotoTexture(loader, '/shared-default-photo.png'),
      loadSharedPhotoTexture(loader, '/shared-default-photo.png'),
    ])
    assert.equal(first, texture)
    assert.equal(second, texture)
    assert.equal(calls, 1)
    assert.match(photoFrameSource, /loadSharedPhotoTexture/u)
    assert.match(photoFrameSource, /createPhotoSurfaceGeometry/u)
    assert.doesNotMatch(photoFrameSource, /transmission\s*:/u)
    texture.dispose()
  })

  it('照片 URL 异步预检使用版本号与实例 ID 阻止旧请求回写', () => {
    assert.match(interiorPanelSource, /photoValidationNonce/u)
    assert.match(interiorPanelSource, /selectedPhotoId\.current !== instanceId/u)
    assert.match(interiorPanelSource, /requestNonce !== photoValidationNonce\.current/u)
  })

  it('跨域请求失败后回退默认照片且不抛出场景错误', async () => {
    const calls: string[] = []
    const fallbackTexture = new Texture()
    const loader: PhotoTextureLoader = {
      async loadAsync(url) {
        calls.push(url)
        if (url === 'https://invalid.example/private.jpg') {
          throw new Error('模拟 CORS 失败')
        }
        return fallbackTexture
      },
    }

    const result = await loadPhotoTextureWithFallback(
      loader,
      'https://invalid.example/private.jpg',
      '/default-memory-photo.png',
    )
    assert.deepEqual(calls, [
      'https://invalid.example/private.jpg',
      '/default-memory-photo.png',
    ])
    assert.equal(result.texture, fallbackTexture)
    assert.equal(result.usedFallback, true)
    assert.equal(result.sourceUrl, '/default-memory-photo.png')
    fallbackTexture.dispose()
  })

  it('项目内默认照片资源真实存在', () => {
    assert.equal(
      existsSync(
        new URL(
          '../src/entities/part/items/cottage-photo-frame/assets/default-memory-photo.png',
          import.meta.url,
        ),
      ),
      true,
    )
  })
})

describe('小院柔性彩灯', () => {
  const controls = [
    [0, 0, 0],
    [2, 0.2, 0],
    [4, 0, 0.4],
  ] as const satisfies readonly StringLightPoint[]

  it('控制点规范化会过滤非法点与连续重复点', () => {
    const normalized = normalizeStringLightControlPoints([
      controls[0],
      controls[0],
      [Number.NaN, 1, 0],
      controls[1],
      controls[2],
    ])
    assert.deepEqual(normalized, controls)
    assert.throws(
      () => normalizeStringLightControlPoints([[0, 0, 0]]),
      /至少需要两个/,
    )
  })

  it('分段下垂路径保持锚点并增加真实弧长', () => {
    const flat = sampleStringLightPath(controls, 0, 12)
    const sagged = sampleStringLightPath(controls, 0.22, 12)
    assert.deepEqual(sagged[0], controls[0])
    assert.deepEqual(sagged.at(-1), controls.at(-1))
    assert.ok(measureStringLightArcLength(sagged) > measureStringLightArcLength(flat))
    assert.ok(sagged[6][1] < flat[6][1])
  })

  it('灯泡数量由弧长与间距决定，并严格受 160 实例上限约束', () => {
    assert.equal(resolveStringLightBulbCount(4, 0.5), 8)
    assert.equal(
      resolveStringLightBulbCount(80, 0.04, 9999),
      STRING_LIGHT_MAX_BULBS,
    )

    const path = resolveStringLightPath(controls, 0.22, 0.18, 10, 12)
    assert.equal(path.bulbs.length, 10)
    assert.ok(path.arcLength > 4)
    path.bulbs.forEach((bulb) => {
      assert.ok(bulb.position.every(Number.isFinite))
      assert.ok(bulb.tangent.every(Number.isFinite))
    })
  })

  it('灯位沿实际折线路径递增且保持在路径内部', () => {
    const sampled = sampleStringLightPath(
      [
        [0, 0, 0],
        [2, 0, 0],
      ],
      0.16,
      20,
    )
    const placements = computeStringLightBulbPlacements(sampled, 0.4)
    assert.equal(placements.length, 5)
    placements.forEach((placement, index) => {
      assert.ok(placement.position[0] > 0 && placement.position[0] < 2)
      if (index > 0) {
        assert.ok(placement.distance > placements[index - 1].distance)
      }
    })
  })

  it('暖度输出确定性颜色并拒绝越界输入', () => {
    assert.equal(resolveStringLightWarmColor(0), '#ff913f')
    assert.equal(resolveStringLightWarmColor(1), '#ffeec4')
    assert.equal(resolveStringLightWarmColor(0.5), '#ffc082')
    assert.throws(() => resolveStringLightWarmColor(1.1), /暖度/)
  })
})
