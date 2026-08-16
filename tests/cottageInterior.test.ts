import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { describe, it } from 'node:test'
import {
  COTTAGE_INTERIOR_KIT,
  COTTAGE_INTERIOR_RUNTIME_VISIBILITY,
  COTTAGE_TABLE_HYDRANGEA_OCCURRENCES,
  createCottageInteriorKit,
  isCottageInteriorRuntimeVisible,
} from '../src/entities/scene/items/cottage-flower-garden/model/cottageInterior'
import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_INTERIOR_ENTRY_REVIEW_VIEW,
  COTTAGE_INTERIOR_NAVIGATION,
  getCottageBuiltWalkSurfaceHeight,
  isCottageFlowerGardenWalkable,
} from '../src/entities/scene/items/cottage-flower-garden/model/gardenLayout'
import {
  COTTAGE_INTERIOR_DEFAULT_DOCUMENT,
  COTTAGE_INTERIOR_MAX_PATH_POINTS,
  COTTAGE_INTERIOR_MAX_PHOTOS,
  COTTAGE_INTERIOR_PART_IDS,
  createCottageInteriorInstance,
  createDefaultCottageInteriorInstances,
  duplicateCottageInteriorInstance,
  hasCottageInteriorRenderablePath,
  normalizeCottageInteriorPartParameters,
  normalizeCottageInteriorInstances,
  parseCottageInteriorDocument,
  migrateLegacyCottageInteriorInstances,
} from '../src/entities/scene/items/cottage-flower-garden/model/cottageInteriorInstances'
import {
  findCottageInteriorTableSupport,
  getCottageInteriorInstanceBounds,
  getCottageInteriorRoofClearanceY,
  getCottageRoundTableTopY,
  isCottageInteriorFurniturePositionClear,
  moveCottageInteriorTabletopInstance,
  removeCottageInteriorInstance,
  resolveCottageWallPhotoSurface,
  sanitizeCottageInteriorInstanceTransform,
} from '../src/entities/scene/items/cottage-flower-garden/model/cottageInteriorCollision'

const interiorRuntimeSource = await readFile(
  new URL(
    '../src/widgets/scene-editor/ui/CottageInteriorRuntime.tsx',
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
const interiorEditorHookSource = await readFile(
  new URL(
    '../src/widgets/scene-editor/model/useCottageInteriorEditor.ts',
    import.meta.url,
  ),
  'utf8',
)
const gardenExperienceSource = await readFile(
  new URL(
    '../src/features/garden-experience/GardenExperience.tsx',
    import.meta.url,
  ),
  'utf8',
)
const interiorWorldSource = await readFile(
  new URL(
    '../src/entities/scene/items/cottage-flower-garden/ui/World.tsx',
    import.meta.url,
  ),
  'utf8',
)

describe('花海小院室内建筑骨架', () => {
  it('由同一米制边界生成木地板、内墙、内屋顶和结构梁', () => {
    assert.deepEqual(createCottageInteriorKit(), COTTAGE_INTERIOR_KIT)
    const floorBoards = COTTAGE_INTERIOR_KIT.boxes.filter(
      (box) => box.material === 'floor',
    )
    assert.equal(floorBoards.length, 21)
    assert.ok(COTTAGE_INTERIOR_KIT.boxes.some((box) => box.id.includes('north-lining')))
    assert.equal(
      COTTAGE_INTERIOR_KIT.measurements.floorTop,
      COTTAGE_INTERIOR_NAVIGATION.floorTop,
    )
    assert.ok(
      COTTAGE_INTERIOR_KIT.measurements.ridgeHeight >
        COTTAGE_INTERIOR_KIT.measurements.eaveHeight,
    )
  })

  it('让主路经台阶、门廊和门洞连续进入房间，同时阻挡实体墙', () => {
    for (let z = -8.2; z >= -15.6; z -= 0.12) {
      assert.equal(
        isCottageFlowerGardenWalkable({ x: 0, z }, true),
        true,
        `入口中心线 z=${z.toFixed(2)} 应连续可行走`,
      )
    }
    assert.equal(isCottageFlowerGardenWalkable({ x: 3.62, z: -14 }), false)
    assert.equal(isCottageFlowerGardenWalkable({ x: 1.2, z: -10.84 }, true), false)
    assert.equal(isCottageFlowerGardenWalkable({ x: 0, z: -10.84 }), false)
  })

  it('在房间、门廊和三级台阶返回稳定完成面高度', () => {
    assert.equal(
      getCottageBuiltWalkSurfaceHeight({ x: 0, z: -14 }),
      COTTAGE_INTERIOR_NAVIGATION.floorTop,
    )
    assert.equal(getCottageBuiltWalkSurfaceHeight({ x: 0, z: -10.2 }), 0.42)
    assert.ok(
      Math.abs(
        (getCottageBuiltWalkSurfaceHeight({ x: 0, z: -8.85 }) ?? 0) - 0.28,
      ) < 1e-9,
    )
    assert.ok(
      Math.abs(
        (getCottageBuiltWalkSurfaceHeight({ x: 0, z: -8.45 }) ?? 0) - 0.14,
      ) < 1e-9,
    )
    assert.equal(getCottageBuiltWalkSurfaceHeight({ x: 3, z: -10.4 }), null)
  })

  it('固定验收相机从门内朝照片墙观察，不把门放到画面对面', () => {
    const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
    assert.equal(
      COTTAGE_INTERIOR_ENTRY_REVIEW_VIEW.position[2],
      cottage.centerZ + 2.72,
    )
    assert.ok(
      COTTAGE_INTERIOR_ENTRY_REVIEW_VIEW.target[2] <
        COTTAGE_INTERIOR_ENTRY_REVIEW_VIEW.position[2],
    )
  })

  it('圆桌以三个确定性 occurrence 直接复用模型库绣球花', () => {
    assert.equal(COTTAGE_TABLE_HYDRANGEA_OCCURRENCES.length, 3)
    assert.equal(
      new Set(COTTAGE_TABLE_HYDRANGEA_OCCURRENCES.map(({ id }) => id)).size,
      3,
    )
    COTTAGE_TABLE_HYDRANGEA_OCCURRENCES.forEach((occurrence) => {
      assert.ok(occurrence.scale >= 0.12 && occurrence.scale <= 0.18)
      assert.ok(occurrence.position.every(Number.isFinite))
      assert.ok(Number.isFinite(occurrence.rotationY))
    })
    assert.match(interiorRuntimeSource, /HydrangeaAssembly/)
    assert.match(interiorRuntimeSource, /HYDRANGEA_CUSTOM_CONFIGURATION/)
    assert.match(interiorRuntimeSource, /COTTAGE_TABLE_HYDRANGEA_OCCURRENCES\.map/)
    assert.doesNotMatch(interiorRuntimeSource, /COTTAGE_TABLE_BOUQUET_FLOWERS/)
    assert.doesNotMatch(interiorRuntimeSource, /cottage\.table\.default-bouquet/)
  })

  it('庭院远景不绘制不可辨识陈设，接近门廊或编辑时恢复完整室内', () => {
    const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
    const radius = COTTAGE_INTERIOR_RUNTIME_VISIBILITY.exteriorRadiusMeters
    assert.equal(
      isCottageInteriorRuntimeVisible(
        { x: cottage.centerX, z: cottage.centerZ + radius + 0.01 },
        false,
      ),
      false,
    )
    assert.equal(
      isCottageInteriorRuntimeVisible(
        { x: cottage.centerX, z: cottage.centerZ + radius - 0.01 },
        false,
      ),
      true,
    )
    assert.equal(
      isCottageInteriorRuntimeVisible({ x: 1_000, z: 1_000 }, true),
      true,
    )
    assert.match(interiorRuntimeSource, /portal-zone-with-doorway-preview/)
    assert.match(interiorRuntimeSource, /isCottageDoorwayPreviewPart/u)
    assert.match(
      interiorRuntimeSource,
      /portalSnapshot\.zone === 'interior'/u,
    )
  })
})

describe('花海小院室内实例文档', () => {
  it('冻结十类目录零件与 v6 九张照片礼物叙事陈设', () => {
    assert.equal(COTTAGE_INTERIOR_PART_IDS.length, 10)
    const defaults = createDefaultCottageInteriorInstances()
    assert.deepEqual(defaults, COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances)
    const photos = defaults.filter(
      (instance) => instance.partId === 'cottage-photo-frame',
    )
    assert.equal(COTTAGE_INTERIOR_MAX_PHOTOS, 9)
    assert.equal(photos.length, COTTAGE_INTERIOR_MAX_PHOTOS)
    assert.equal(
      defaults.filter((instance) => instance.partId === 'cottage-candle').length,
      3,
    )
    assert.equal(
      defaults.filter((instance) => instance.partId === 'cottage-wood-chair')
        .length,
      2,
    )
    const northWallPhotos = photos.filter(
      (photo) =>
        photo.parameters.mount === 'wall' && photo.rotation.y === 0,
    )
    const eastWallPhotos = photos.filter(
      (photo) =>
        photo.parameters.mount === 'wall' &&
        photo.rotation.y === -Math.PI / 2,
    )
    const tablePhoto = photos.find(
      (photo) => photo.parameters.mount === 'table',
    )
    assert.equal(northWallPhotos.length, 5)
    assert.equal(eastWallPhotos.length, 3)
    assert.ok(tablePhoto)
    const northHero = northWallPhotos.reduce((largest, photo) =>
      Number(photo.parameters.width) * Number(photo.parameters.height) >
      Number(largest.parameters.width) * Number(largest.parameters.height)
        ? photo
        : largest,
    )
    assert.equal(northHero.position.x, 0)
    assert.equal(northHero.parameters.width, 900)
    assert.equal(northHero.parameters.height, 700)
    assert.ok(
      new Set(
        northWallPhotos
          .filter((photo) => photo.id !== northHero.id)
          .map((photo) =>
            `${String(photo.parameters.width)}×${String(photo.parameters.height)}`,
          ),
      ).size >= 4,
    )
    assert.ok(
      eastWallPhotos.every(
        (photo) =>
          Math.abs(
            photo.position.x -
              (COTTAGE_INTERIOR_NAVIGATION.maxX -
                COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX -
                0.027),
          ) < 0.000_001,
      ),
    )
    assert.ok(
      defaults.some(
        (instance) =>
          instance.partId === 'cottage-single-bed' && instance.position.x > 1,
      ),
    )
    const table = defaults.find(
      (instance) => instance.partId === 'cottage-round-table',
    )
    assert.ok(table)
    assert.equal(tablePhoto.supportId, table.id)
    assert.equal(tablePhoto.position.y, getCottageRoundTableTopY(table))
    assert.ok(
      defaults
        .filter(
          (instance) =>
            instance.partId === 'cottage-candle' ||
            instance.partId === 'cottage-envelope' ||
            (instance.partId === 'cottage-photo-frame' &&
              instance.parameters.mount === 'table'),
        )
        .every((instance) => instance.supportId === table.id),
    )
    const tabletopY = COTTAGE_INTERIOR_NAVIGATION.floorTop + 0.74
    assert.ok(
      defaults
        .filter((instance) => instance.partId === 'cottage-candle')
        .every((instance) => instance.position.y === tabletopY),
    )
    assert.equal(
      defaults.find((instance) => instance.partId === 'cottage-envelope')
        ?.position.y,
      tabletopY,
    )
    const stove = defaults.find(
      (instance) => instance.partId === 'cottage-cast-iron-stove',
    )
    const cabinet = defaults.find(
      (instance) =>
        instance.partId === 'cottage-low-cabinet' &&
        instance.parameters.variant === 'cabinet',
    )
    assert.ok(stove && cabinet)
    assert.ok(
      defaults.some(
        (instance) =>
          instance.partId === 'cottage-loveseat-sofa' &&
          instance.position.x < -1 &&
          instance.position.z > 0,
      ),
    )
    const bed = defaults.find(
      (instance) => instance.partId === 'cottage-single-bed',
    )
    assert.equal(bed?.parameters.width, 1.5)
  })

  it('限制照片、彩灯控制点、缩放和未知参数', () => {
    const photo = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.find(
      (instance) => instance.partId === 'cottage-photo-frame',
    )
    const lights = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.find(
      (instance) => instance.partId === 'cottage-string-lights',
    )
    assert.ok(photo && lights)
    const candidates = [
      ...Array.from({ length: COTTAGE_INTERIOR_MAX_PHOTOS + 4 }, (_, index) => ({
        ...photo,
        id: `interior-instance-${String(100 + index).padStart(3, '0')}`,
        scale: { x: 99, y: -4, z: 1 },
        parameters: { imageUrl: 'x', invalid_key: {}, finite: Number.NaN },
      })),
      {
        ...lights,
        id: 'interior-instance-999',
        path: Array.from(
          { length: COTTAGE_INTERIOR_MAX_PATH_POINTS + 8 },
          (_, index) => ({ x: index, y: 2, z: 0 }),
        ),
      },
    ]
    const normalized = normalizeCottageInteriorInstances(candidates)
    assert.equal(
      normalized.filter((instance) => instance.partId === 'cottage-photo-frame')
        .length,
      COTTAGE_INTERIOR_MAX_PHOTOS,
    )
    assert.equal(normalized.at(-1)?.path?.length, COTTAGE_INTERIOR_MAX_PATH_POINTS)
    assert.deepEqual(normalized[0].scale, { x: 3, y: 0.25, z: 1 })
    assert.deepEqual(normalized[0].parameters, { imageUrl: 'x' })
    const oversizedPhoto = normalizeCottageInteriorInstances([
      {
        ...photo,
        parameters: { imageUrl: `data:image/jpeg;base64,${'x'.repeat(200_000)}` },
      },
    ])
    assert.equal(oversizedPhoto[0]?.parameters.imageUrl, '')
  })

  it('按零件约束修复脏参数，并拒绝退化为同一点的彩灯路径', () => {
    assert.deepEqual(
      normalizeCottageInteriorPartParameters('cottage-single-bed', {
        width: 0,
        length: 9_999,
        bedHeight: Number.NaN,
        unknown: 42,
      }),
      { width: 0.72, length: 2_200, bedHeight: 0.48 },
    )
    assert.deepEqual(
      normalizeCottageInteriorPartParameters('cottage-photo-frame', {
        width: 999_999,
        height: -1,
        matWidth: 999_999,
        mount: 'ceiling',
      }),
      { width: 900, height: 240, matWidth: 40, mount: 'wall' },
    )
    const lights = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.find(
      (instance) => instance.partId === 'cottage-string-lights',
    )
    assert.ok(lights)
    const identical = [
      { x: 0, y: 2, z: 0 },
      { x: 0, y: 2, z: 0 },
    ]
    assert.equal(hasCottageInteriorRenderablePath(identical), false)
    assert.deepEqual(
      normalizeCottageInteriorInstances([{ ...lights, path: identical }]),
      [],
    )
  })

  it('损坏数据回退默认，v1 按归一化房间坐标迁移，合法空布局保持为空', () => {
    assert.equal(parseCottageInteriorDocument('{broken').instances.length, 21)
    assert.equal(
      parseCottageInteriorDocument(
        JSON.stringify({ schemaVersion: 0, sceneId: 'cottage-flower-garden' }),
      ).instances.length,
      21,
    )
    assert.deepEqual(
      parseCottageInteriorDocument(
        JSON.stringify({
          schemaVersion: 1,
          sceneId: 'cottage-flower-garden',
          instances: [],
        }),
      ).instances,
      [],
    )
    const legacy = createDefaultCottageInteriorInstances()[0]
    const migrated = migrateLegacyCottageInteriorInstances([
      { ...legacy, position: { x: 2.2, y: 0.325, z: -1.2 } },
    ])
    assert.ok(
      typeof migrated[0] === 'object' &&
        migrated[0] !== null &&
        'position' in migrated[0] &&
        (migrated[0].position as { x: number }).x > 2.2,
    )
  })

  it('新增与复制实例使用稳定序号，并保持可编辑参数相互独立', () => {
    const source = createCottageInteriorInstance(
      'cottage-candle',
      40,
      { height: 0.16, lit: true },
      { x: 0, y: COTTAGE_INTERIOR_NAVIGATION.floorTop, z: 0 },
    )
    const copy = duplicateCottageInteriorInstance(source, 41)

    assert.equal(source.id, 'interior-instance-040')
    assert.equal(copy.id, 'interior-instance-041')
    assert.notEqual(copy.parameters, source.parameters)
    assert.deepEqual(copy.position, {
      x: source.position.x + 0.28,
      y: source.position.y,
      z: source.position.z + 0.22,
    })

    const lights = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.find(
      (instance) => instance.partId === 'cottage-string-lights',
    )
    assert.ok(lights?.path)
    const lightsCopy = duplicateCottageInteriorInstance(lights, 42)
    assert.deepEqual(lightsCopy.position, { x: 0, y: 0, z: 0 })
    assert.equal(
      lightsCopy.path?.[0].x,
      (lights.path?.[0].x ?? 0) + 0.16,
    )
    assert.equal(
      lightsCopy.path?.[0].z,
      (lights.path?.[0].z ?? 0) + 0.12,
    )
  })

  it('北墙与东墙相框分别吸附正确墙面并朝向室内', () => {
    const photos = createDefaultCottageInteriorInstances().filter(
      (instance) =>
        instance.partId === 'cottage-photo-frame' &&
        instance.parameters.mount === 'wall',
    )
    const northPhoto = photos.find((photo) => photo.rotation.y === 0)
    const eastPhoto = photos.find((photo) => photo.rotation.y === -Math.PI / 2)
    assert.ok(northPhoto && eastPhoto)
    assert.equal(resolveCottageWallPhotoSurface(0.12), 'north')
    assert.equal(resolveCottageWallPhotoSurface(-1.42), 'east')

    const normalizedNorth = sanitizeCottageInteriorInstanceTransform({
      ...northPhoto,
      position: { ...northPhoto.position, x: -99, z: 99 },
      rotation: { x: 0, y: 0.12, z: 0 },
    })
    const normalizedEast = sanitizeCottageInteriorInstanceTransform({
      ...eastPhoto,
      position: { ...eastPhoto.position, x: -99, z: 99 },
      rotation: { x: 0, y: -1.42, z: 0 },
    })
    assert.equal(normalizedNorth.rotation.y, 0)
    assert.equal(
      normalizedNorth.position.z,
      COTTAGE_INTERIOR_NAVIGATION.minZ -
        COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerZ +
        0.027,
    )
    assert.equal(normalizedEast.rotation.y, -Math.PI / 2)
    assert.equal(
      normalizedEast.position.x,
      COTTAGE_INTERIOR_NAVIGATION.maxX -
        COTTAGE_FLOWER_GARDEN_LAYOUT.cottage.centerX -
        0.027,
    )
  })

  it('第一人称避开落地家具，同时保留入口和圆桌两侧通道', () => {
    const instances = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances
    const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
    assert.equal(
      isCottageInteriorFurniturePositionClear(
        { x: cottage.centerX, y: 0, z: cottage.centerZ },
        instances,
      ),
      false,
    )
    assert.equal(
      isCottageInteriorFurniturePositionClear(
        { x: cottage.centerX, y: 0, z: cottage.centerZ + 2.25 },
        instances,
      ),
      true,
    )
    assert.equal(
      isCottageInteriorFurniturePositionClear(
        { x: cottage.centerX + 1.5, y: 0, z: cottage.centerZ + 0.25 },
        instances,
      ),
      true,
    )
  })

  it('统一约束复制、落地高度、屋顶净高和桌面承载关系', () => {
    const defaults = createDefaultCottageInteriorInstances()
    const bed = defaults.find(
      (instance) => instance.partId === 'cottage-single-bed',
    )
    const table = defaults.find(
      (instance) => instance.partId === 'cottage-round-table',
    )
    const candle = defaults.find(
      (instance) => instance.partId === 'cottage-candle',
    )
    const cabinet = defaults.find(
      (instance) =>
        instance.partId === 'cottage-low-cabinet' &&
        instance.parameters.variant === 'cabinet',
    )
    assert.ok(bed && table && candle && cabinet)

    const tallBed = sanitizeCottageInteriorInstanceTransform({
      ...bed,
      position: { ...bed.position, y: 2.4 },
      scale: { x: 1, y: 3, z: 1 },
      parameters: { ...bed.parameters, bedHeight: 0.65 },
    })
    const bedBounds = getCottageInteriorInstanceBounds(tallBed)
    assert.equal(tallBed.position.y, COTTAGE_INTERIOR_NAVIGATION.floorTop)
    assert.ok(
      tallBed.position.y + bedBounds[1] * tallBed.scale.y <=
        getCottageInteriorRoofClearanceY(
          tallBed.position.x,
          (bedBounds[0] * tallBed.scale.x) / 2,
        ),
    )
    assert.equal(bedBounds[1], 1.03)

    const copiedCabinet = sanitizeCottageInteriorInstanceTransform(
      duplicateCottageInteriorInstance(
        { ...cabinet, position: { ...cabinet.position, x: 2.65 } },
        90,
      ),
    )
    const cabinetBounds = getCottageInteriorInstanceBounds(copiedCabinet)
    const cabinetHalfX =
      (cabinetBounds[0] *
        copiedCabinet.scale.x *
        Math.abs(Math.cos(copiedCabinet.rotation.y)) +
        cabinetBounds[2] *
          copiedCabinet.scale.z *
          Math.abs(Math.sin(copiedCabinet.rotation.y))) /
      2
    assert.ok(
      copiedCabinet.position.x + cabinetHalfX <=
        COTTAGE_INTERIOR_NAVIGATION.maxX + 0.001,
    )

    const movedTable = sanitizeCottageInteriorInstanceTransform({
      ...table,
      position: { ...table.position, x: 0.45, z: -0.25 },
      rotation: { x: 0, y: Math.PI / 3, z: 0 },
      scale: { x: 1.2, y: 1.1, z: 0.9 },
      parameters: { ...table.parameters, height: 0.86 },
    })
    const movedCandle = moveCottageInteriorTabletopInstance(
      candle,
      table,
      movedTable,
    )
    assert.equal(movedCandle.supportId, table.id)
    assert.ok(
      Math.abs(movedCandle.position.y - getCottageRoundTableTopY(movedTable)) <
        0.000_001,
    )
    assert.ok(
      Math.abs(
        movedCandle.rotation.y -
          (candle.rotation.y + movedTable.rotation.y - table.rotation.y),
      ) < 0.000_001,
    )

    const wideThinTable = sanitizeCottageInteriorInstanceTransform({
      ...table,
      scale: { x: 3, y: 1, z: 0.25 },
    })
    const outsideThinAxis = sanitizeCottageInteriorInstanceTransform({
      ...candle,
      position: {
        x: wideThinTable.position.x,
        y: getCottageRoundTableTopY(wideThinTable),
        z: wideThinTable.position.z + 0.8,
      },
    })
    assert.equal(
      findCottageInteriorTableSupport(outsideThinAxis, [wideThinTable]),
      undefined,
    )

    const largeTable = sanitizeCottageInteriorInstanceTransform({
      ...table,
      parameters: { ...table.parameters, diameter: 1.6 },
    })
    const edgeEnvelope = sanitizeCottageInteriorInstanceTransform({
      ...candle,
      position: {
        x: largeTable.position.x + 0.7,
        y: getCottageRoundTableTopY(largeTable),
        z: largeTable.position.z,
      },
    })
    const smallTable = sanitizeCottageInteriorInstanceTransform({
      ...largeTable,
      parameters: { ...largeTable.parameters, diameter: 0.8 },
    })
    const scaledEnvelope = moveCottageInteriorTabletopInstance(
      edgeEnvelope,
      largeTable,
      smallTable,
    )
    assert.ok(
      Math.abs(scaledEnvelope.position.x - smallTable.position.x - 0.35) <
        0.000_001,
    )
    assert.equal(
      findCottageInteriorTableSupport(scaledEnvelope, [smallTable])?.id,
      smallTable.id,
    )
  })

  it('桌面摆件可重绑承载桌，删除桌子时迁移或落地', () => {
    const defaults = createDefaultCottageInteriorInstances()
    const table = defaults.find(
      (instance) => instance.partId === 'cottage-round-table',
    )
    const envelope = defaults.find(
      (instance) => instance.partId === 'cottage-envelope',
    )
    assert.ok(table && envelope)

    const replacement = sanitizeCottageInteriorInstanceTransform({
      ...table,
      id: 'interior-instance-090',
      position: { ...table.position, x: 1.15, z: 0.42 },
      rotation: { x: 0, y: Math.PI / 4, z: 0 },
      parameters: { ...table.parameters, diameter: 0.8, height: 0.86 },
    })
    const movedEnvelope = sanitizeCottageInteriorInstanceTransform({
      ...envelope,
      position: {
        x: replacement.position.x + 0.08,
        y: getCottageRoundTableTopY(replacement),
        z: replacement.position.z + 0.06,
      },
    })
    assert.equal(
      findCottageInteriorTableSupport(movedEnvelope, [table, replacement])?.id,
      replacement.id,
    )

    const normalized = normalizeCottageInteriorInstances([
      table,
      replacement,
      { ...movedEnvelope, supportId: table.id },
    ])
    assert.equal(
      normalized.find((instance) => instance.id === movedEnvelope.id)
        ?.supportId,
      replacement.id,
    )

    const migrated = removeCottageInteriorInstance(
      [...defaults, replacement],
      table.id,
    )
    const migratedEnvelope = migrated.find(
      (instance) => instance.id === envelope.id,
    )
    assert.equal(migratedEnvelope?.supportId, replacement.id)
    assert.ok(
      Math.abs(
        (migratedEnvelope?.position.y ?? 0) -
          getCottageRoundTableTopY(replacement),
      ) < 0.000_001,
    )

    const dropped = removeCottageInteriorInstance(defaults, table.id)
    const droppedEnvelope = dropped.find(
      (instance) => instance.id === envelope.id,
    )
    assert.equal(droppedEnvelope?.supportId, undefined)
    assert.equal(
      droppedEnvelope?.position.y,
      COTTAGE_INTERIOR_NAVIGATION.floorTop,
    )
  })
})

describe('花海小院室内编辑器集成', () => {
  it('十类资源都以独立实现进入零件库与场景运行时', async () => {
    for (const partId of COTTAGE_INTERIOR_PART_IDS) {
      const implementation = new URL(
        `../src/entities/part/items/${partId}/index.ts`,
        import.meta.url,
      )
      assert.ok((await stat(implementation)).size > 100, `${partId} 实现不可为空`)
      assert.match(interiorRuntimeSource, new RegExp(`case '${partId}'`, 'u'))
    }
  })

  it('编辑器覆盖数量、位置、尺寸、增删复制、照片替换和柔性彩灯路径', () => {
    assert.match(interiorPanelSource, /三轴尺寸倍率/u)
    assert.match(interiorPanelSource, /onDuplicate/u)
    assert.match(interiorPanelSource, /onDelete/u)
    assert.match(interiorPanelSource, /accept="image\/\*"/u)
    assert.match(interiorPanelSource, /imageFileToDataUrl/u)
    assert.match(interiorPanelSource, /COTTAGE_INTERIOR_MAX_PHOTOS/u)
    assert.match(
      interiorPanelSource,
      /photoCount\}\/\{COTTAGE_INTERIOR_MAX_PHOTOS\}/u,
    )
    assert.doesNotMatch(interiorPanelSource, /photoCount\}\/10/u)
    assert.match(interiorPanelSource, /COTTAGE_INTERIOR_MAX_PATH_POINTS/u)
    assert.match(interiorPanelSource, /addPathPoint/u)
    assert.match(interiorPanelSource, /暖白比例/u)
    assert.match(interiorPanelSource, /发光强度/u)
    assert.match(interiorPanelSource, /零件参数/u)
    assert.match(interiorPanelSource, /从门内预览/u)
    assert.match(interiorPanelSource, /hasCottageInteriorRenderablePath/u)
    assert.match(interiorPanelSource, /图片地址无法加载或不允许跨域读取/u)
    assert.match(interiorPanelSource, /persistenceError/u)
    assert.match(interiorRuntimeSource, /TransformControls/u)
    assert.match(interiorRuntimeSource, /selectedPathPointIndex/u)
    assert.match(interiorEditorHookSource, /entryPreview/u)
    assert.match(interiorEditorHookSource, /previewEntry/u)
    assert.match(gardenExperienceSource, /interiorEditor/u)
    assert.match(
      gardenExperienceSource,
      /CottageInteriorRuntime/u,
    )
  })

  it('编辑模式切换为无前墙无屋顶的剖切视图，漫游模式按门户层级切换详细家具', () => {
    assert.match(interiorWorldSource, /<CottageExterior tuning=\{tuning\}/u)
    assert.match(
      interiorWorldSource,
      /<CottageInterior tuning=\{tuning\} cutaway=\{interiorEditMode\}/u,
    )
    assert.match(interiorWorldSource, /const detailedInteriorVisible/u)
    assert.match(interiorWorldSource, /\{detailedInteriorVisible && children\}/u)
  })
})
