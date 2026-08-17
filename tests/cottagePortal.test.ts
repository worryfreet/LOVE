import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COTTAGE_ARCHITECTURE,
  COTTAGE_ARCHITECTURE_MEASUREMENTS,
} from '../src/entities/scene/items/cottage-flower-garden/model/cottageArchitecture'
import {
  cottagePortalRuntime,
  isCottageDoorObserverEligible,
  isCottageDoorPassable,
  isCottageDoorSweepBlocked,
  resolveCottageExperienceZone,
} from '../src/entities/scene/items/cottage-flower-garden/model/cottagePortalMachine'

describe('写实小屋建筑权威与门户事务', () => {
  it('冻结扩建后的平立剖尺寸与可用室内面积', () => {
    assert.deepEqual(
      [
        COTTAGE_ARCHITECTURE.envelope.width,
        COTTAGE_ARCHITECTURE.envelope.depth,
      ],
      [8, 6.5],
    )
    assert.equal(COTTAGE_ARCHITECTURE.datums.eave, 2.8)
    assert.equal(COTTAGE_ARCHITECTURE.datums.ridge, 4.2)
    assert.equal(COTTAGE_ARCHITECTURE.door.clearWidth, 1.02)
    assert.ok(COTTAGE_ARCHITECTURE_MEASUREMENTS.interiorArea > 45)
    assert.ok(COTTAGE_ARCHITECTURE_MEASUREMENTS.rearMaintenanceDepth >= 1.2)
  })

  it('只允许距离、朝向和门前包络同时满足的访客操作', () => {
    const { envelope } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    assert.equal(
      isCottageDoorObserverEligible({
        position: [0, 1.65, frontZ + 1.2],
        direction: [0, 0, -1],
      }),
      true,
    )
    assert.equal(
      isCottageDoorObserverEligible({
        position: [0, 1.65, frontZ + 1.2],
        direction: [0, 0, 1],
      }),
      false,
    )
    assert.equal(
      isCottageDoorObserverEligible({
        position: [0, 1.65, frontZ + 2.2],
        direction: [0, 0, -1],
      }),
      false,
    )
  })

  it('视觉、碰撞和导航在同一 epoch 达到 88% 后共同开放', () => {
    cottagePortalRuntime.reset()
    const initial = cottagePortalRuntime.getSnapshot()
    assert.equal(initial.motion, 'closed')
    assert.equal(isCottageDoorPassable(), false)
    assert.equal(cottagePortalRuntime.requestOpen(), true)
    for (let index = 0; index < 14; index += 1) {
      cottagePortalRuntime.tick(0.05)
    }
    assert.equal(cottagePortalRuntime.getSnapshot().visualOpen, true)
    assert.equal(isCottageDoorPassable(), false)
    for (let index = 0; index < 4; index += 1) {
      cottagePortalRuntime.tick(0.05)
    }
    const opened = cottagePortalRuntime.getSnapshot()
    assert.equal(opened.motion, 'open')
    assert.equal(opened.colliderOpen, true)
    assert.equal(opened.navigationOpen, true)
  })

  it('关门前拒绝门扇扫掠体内的访客，并拒绝 reset 前的旧写入', () => {
    const { envelope } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    cottagePortalRuntime.reset()
    assert.equal(cottagePortalRuntime.requestOpen([0, 1.65, frontZ + 1]), true)
    for (let index = 0; index < 18; index += 1) cottagePortalRuntime.tick(0.05)
    assert.equal(isCottageDoorSweepBlocked([-0.2, 1.65, frontZ - 0.3]), true)
    assert.equal(
      cottagePortalRuntime.requestClose([-0.2, 1.65, frontZ - 0.3]),
      false,
    )
    const capturedEpoch = cottagePortalRuntime.getSnapshot().epoch
    cottagePortalRuntime.reset()
    assert.equal(
      cottagePortalRuntime.commitIfCurrent(capturedEpoch, (snapshot) => ({
        ...snapshot,
        motion: 'open',
      })),
      false,
    )
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'closed')
  })

  it('从室外进入后越过门扇扫掠区自动关门，未真正穿门时保持开启', () => {
    const { envelope, door } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    const outside = [envelope.centerX, 1.65, frontZ + 1] as const
    const threshold = [envelope.centerX, 1.65, frontZ] as const
    const shallowInterior = [
      envelope.centerX,
      1.65,
      frontZ - door.thresholdDepth - 0.05,
    ] as const
    const safeInterior = [
      envelope.centerX,
      1.65,
      frontZ - door.clearWidth - 0.5,
    ] as const

    cottagePortalRuntime.reset()
    cottagePortalRuntime.updateZoneFromPosition(outside)
    assert.equal(cottagePortalRuntime.requestOpen(outside), true)
    for (let index = 0; index < 18; index += 1) cottagePortalRuntime.tick(0.05)
    cottagePortalRuntime.updateZoneFromPosition(outside)
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'open')
    cottagePortalRuntime.updateZoneFromPosition(threshold)
    cottagePortalRuntime.updateZoneFromPosition(shallowInterior)
    assert.equal(cottagePortalRuntime.getSnapshot().zone, 'interior')
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'open')
    cottagePortalRuntime.updateZoneFromPosition(safeInterior)
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'closing')
    for (let index = 0; index < 15; index += 1) cottagePortalRuntime.tick(0.05)
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'closed')
    assert.equal(cottagePortalRuntime.getSnapshot().zone, 'interior')
  })

  it('从室内按 E 开门离开后，在室外一侧自动关门', () => {
    const { envelope } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    const inside = [envelope.centerX, 1.65, envelope.centerZ] as const
    const threshold = [envelope.centerX, 1.65, frontZ] as const
    const outside = [envelope.centerX, 1.65, frontZ + 0.8] as const

    cottagePortalRuntime.reset()
    cottagePortalRuntime.updateZoneFromPosition(inside)
    assert.equal(cottagePortalRuntime.requestOpen(inside), true)
    for (let index = 0; index < 18; index += 1) cottagePortalRuntime.tick(0.05)
    cottagePortalRuntime.updateZoneFromPosition(threshold)
    cottagePortalRuntime.updateZoneFromPosition(outside)
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'closing')
    for (let index = 0; index < 15; index += 1) cottagePortalRuntime.tick(0.05)
    assert.equal(cottagePortalRuntime.getSnapshot().motion, 'closed')
    assert.equal(cottagePortalRuntime.getSnapshot().zone, 'exterior')
  })

  it('跨过带滞回门槛后进入室内层并平滑提高室内权重', () => {
    cottagePortalRuntime.reset()
    const { envelope, door } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    cottagePortalRuntime.updateZoneFromPosition([
      envelope.centerX,
      1.65,
      frontZ - door.thresholdDepth - 0.01,
    ])
    for (let index = 0; index < 5; index += 1) cottagePortalRuntime.tick(0.05)
    const midpoint = cottagePortalRuntime.getSnapshot()
    assert.equal(midpoint.zone, 'interior')
    assert.ok(midpoint.interiorBlend > 0 && midpoint.interiorBlend < 1)
    for (let index = 0; index < 5; index += 1) cottagePortalRuntime.tick(0.05)
    assert.equal(cottagePortalRuntime.getSnapshot().interiorBlend, 1)
  })

  it('侧面、后院和门洞外立面始终保留在室外层', () => {
    const { envelope, door } = COTTAGE_ARCHITECTURE
    const frontZ = envelope.centerZ + envelope.depth / 2
    const rearZ = envelope.centerZ - envelope.depth / 2
    const sideExterior = [
      envelope.centerX - envelope.width / 2 - 0.45,
      1.65,
      envelope.centerZ,
    ] as const
    const rearExterior = [
      envelope.centerX,
      1.65,
      rearZ - 0.45,
    ] as const
    const frontWallExterior = [
      envelope.centerX + door.clearWidth * 1.5,
      1.65,
      frontZ,
    ] as const

    assert.equal(resolveCottageExperienceZone(sideExterior), 'exterior')
    assert.equal(resolveCottageExperienceZone(rearExterior), 'exterior')
    assert.equal(resolveCottageExperienceZone(frontWallExterior), 'exterior')
    assert.equal(
      resolveCottageExperienceZone([envelope.centerX, 1.65, frontZ]),
      'threshold',
    )
    assert.equal(
      resolveCottageExperienceZone([
        envelope.centerX,
        1.65,
        envelope.centerZ,
      ]),
      'interior',
    )

    cottagePortalRuntime.reset()
    cottagePortalRuntime.updateZoneFromPosition([
      envelope.centerX,
      1.65,
      envelope.centerZ,
    ])
    assert.equal(cottagePortalRuntime.getSnapshot().zone, 'interior')
    cottagePortalRuntime.updateZoneFromPosition(sideExterior)
    assert.equal(cottagePortalRuntime.getSnapshot().zone, 'exterior')
  })
})
