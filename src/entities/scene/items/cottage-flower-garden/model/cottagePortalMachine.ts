import { COTTAGE_ARCHITECTURE } from './cottageArchitecture'

export type CottageDoorMotion =
  | 'closed'
  | 'opening'
  | 'open'
  | 'closing'

export type CottageExperienceZone = 'exterior' | 'threshold' | 'interior'

export interface CottagePortalSnapshot {
  readonly portalId: typeof COTTAGE_ARCHITECTURE.door.id
  readonly epoch: number
  readonly motion: CottageDoorMotion
  readonly openProgress: number
  readonly visualOpen: boolean
  readonly colliderOpen: boolean
  readonly navigationOpen: boolean
  readonly zone: CottageExperienceZone
  readonly interiorBlend: number
}

export interface CottageDoorObserver {
  position: readonly [number, number, number]
  direction: readonly [number, number, number]
}

const OPEN_DURATION_SECONDS = 0.85
const CLOSE_DURATION_SECONDS = 0.72
const INTERIOR_BLEND_DURATION_SECONDS = 0.48

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function createSnapshot(epoch = 0): CottagePortalSnapshot {
  return {
    portalId: COTTAGE_ARCHITECTURE.door.id,
    epoch,
    motion: 'closed',
    openProgress: 0,
    visualOpen: false,
    colliderOpen: false,
    navigationOpen: false,
    zone: 'exterior',
    interiorBlend: 0,
  }
}

function worldDoorHandlePosition() {
  const { envelope, datums, door } = COTTAGE_ARCHITECTURE
  return [
    envelope.centerX + door.clearWidth * 0.31,
    datums.thresholdTop + door.clearHeight * 0.5,
    envelope.centerZ + envelope.depth / 2 + 0.13,
  ] as const
}

/**
 * 只把真实室内平面与有限门洞过渡带归入小屋场景。
 * 房屋侧面、后院以及正立面门洞以外的位置始终属于室外。
 */
export function resolveCottageExperienceZone(
  position: readonly [number, number, number],
): CottageExperienceZone {
  const { envelope, door } = COTTAGE_ARCHITECTURE
  const localX = position[0] - envelope.centerX
  const localZ = position[2] - envelope.centerZ
  const frontZ = envelope.depth / 2
  const rearZ = -envelope.depth / 2

  const doorwayTransitionHalfWidth =
    door.clearWidth / 2 + envelope.wallThickness
  const insideDoorwayTransition =
    Math.abs(localX) <= doorwayTransitionHalfWidth &&
    localZ >= frontZ - door.thresholdDepth &&
    localZ <= frontZ + door.thresholdDepth
  if (insideDoorwayTransition) return 'threshold'

  const interiorHalfWidth = envelope.width / 2 - envelope.wallThickness
  const insideInteriorPlan =
    Math.abs(localX) <= interiorHalfWidth &&
    localZ >= rearZ + envelope.wallThickness &&
    localZ <= frontZ - envelope.wallThickness
  return insideInteriorPlan ? 'interior' : 'exterior'
}

export function isCottageDoorObserverEligible(observer: CottageDoorObserver) {
  const handle = worldDoorHandlePosition()
  const offsetX = handle[0] - observer.position[0]
  const offsetY = handle[1] - observer.position[1]
  const offsetZ = handle[2] - observer.position[2]
  const distance = Math.hypot(offsetX, offsetY, offsetZ)
  if (
    !Number.isFinite(distance) ||
    distance > COTTAGE_ARCHITECTURE.door.interactionDistance ||
    distance < 0.001
  ) {
    return false
  }
  const directionLength = Math.hypot(...observer.direction)
  if (!Number.isFinite(directionLength) || directionLength < 0.001) {
    return false
  }
  const facing =
    (offsetX * observer.direction[0] +
      offsetY * observer.direction[1] +
      offsetZ * observer.direction[2]) /
    (distance * directionLength)
  if (
    facing < Math.cos(COTTAGE_ARCHITECTURE.door.interactionFacingRadians)
  ) {
    return false
  }

  const localX = observer.position[0] - COTTAGE_ARCHITECTURE.envelope.centerX
  const localZ = observer.position[2] - COTTAGE_ARCHITECTURE.envelope.centerZ
  const frontZ = COTTAGE_ARCHITECTURE.envelope.depth / 2
  return (
    Math.abs(localX) <= COTTAGE_ARCHITECTURE.door.clearWidth * 1.7 &&
    localZ >= frontZ - 1.25 &&
    localZ <= frontZ + 2.2
  )
}

export function isCottageDoorSweepBlocked(
  position: readonly [number, number, number],
) {
  const localX = position[0] - COTTAGE_ARCHITECTURE.envelope.centerX
  const localZ = position[2] - COTTAGE_ARCHITECTURE.envelope.centerZ
  const frontZ = COTTAGE_ARCHITECTURE.envelope.depth / 2
  const hingeX = -COTTAGE_ARCHITECTURE.door.clearWidth / 2
  const radialDistance = Math.hypot(localX - hingeX, localZ - frontZ)
  return (
    localZ <= frontZ + 0.18 &&
    localZ >= frontZ - COTTAGE_ARCHITECTURE.door.clearWidth - 0.34 &&
    radialDistance <= COTTAGE_ARCHITECTURE.door.clearWidth + 0.34
  )
}

class CottagePortalRuntime {
  private snapshot = createSnapshot()
  private readonly subscribers = new Set<() => void>()
  private traversalOrigin: 'exterior' | 'interior' | null = null
  private traversalEnteredThreshold = false
  private traversalReachedOppositeSide = false

  getSnapshot = () => this.snapshot

  subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }

  private publish(next: CottagePortalSnapshot, notify = true) {
    this.snapshot = next
    if (notify) this.subscribers.forEach((subscriber) => subscriber())
  }

  private clearTraversal() {
    this.traversalOrigin = null
    this.traversalEnteredThreshold = false
    this.traversalReachedOppositeSide = false
  }

  reset() {
    this.clearTraversal()
    this.publish(createSnapshot(this.snapshot.epoch + 1))
  }

  requestOpen(observerPosition?: readonly [number, number, number]) {
    if (
      this.snapshot.motion !== 'closed' &&
      this.snapshot.motion !== 'closing'
    ) {
      return false
    }
    const frontZ =
      COTTAGE_ARCHITECTURE.envelope.centerZ +
      COTTAGE_ARCHITECTURE.envelope.depth / 2
    this.traversalOrigin = observerPosition
      ? observerPosition[2] <= frontZ
        ? 'interior'
        : 'exterior'
      : this.snapshot.zone === 'interior'
        ? 'interior'
        : 'exterior'
    this.traversalEnteredThreshold = false
    this.traversalReachedOppositeSide = false
    this.publish({
      ...this.snapshot,
      epoch: this.snapshot.epoch + 1,
      motion: 'opening',
      visualOpen: true,
    })
    return true
  }

  requestClose(observerPosition?: readonly [number, number, number]) {
    if (
      this.snapshot.motion !== 'open' &&
      this.snapshot.motion !== 'opening'
    ) {
      return false
    }
    if (observerPosition && isCottageDoorSweepBlocked(observerPosition)) {
      return false
    }
    this.clearTraversal()
    this.publish({
      ...this.snapshot,
      epoch: this.snapshot.epoch + 1,
      motion: 'closing',
      colliderOpen: false,
      navigationOpen: false,
    })
    return true
  }

  requestToggle(observer: CottageDoorObserver) {
    if (!isCottageDoorObserverEligible(observer)) return false
    if (
      this.snapshot.motion === 'open' ||
      this.snapshot.motion === 'opening'
    ) {
      return this.requestClose(observer.position)
    }
    return this.requestOpen(observer.position)
  }

  setZone(zone: CottageExperienceZone) {
    if (zone === this.snapshot.zone) return
    this.publish({ ...this.snapshot, zone })
  }

  updateZoneFromPosition(position: readonly [number, number, number]) {
    const zone = resolveCottageExperienceZone(position)
    this.setZone(zone)
    if (
      !this.traversalOrigin ||
      this.snapshot.motion === 'closed' ||
      this.snapshot.motion === 'closing'
    ) {
      return
    }
    if (zone === 'threshold') {
      this.traversalEnteredThreshold = true
      return
    }
    if (zone === this.traversalOrigin) {
      if (!this.traversalReachedOppositeSide) {
        this.traversalEnteredThreshold = false
      }
      return
    }
    if (!this.traversalEnteredThreshold) return
    this.traversalReachedOppositeSide = true
    if (!isCottageDoorSweepBlocked(position)) {
      this.requestClose()
    }
  }

  tick(deltaSeconds: number) {
    const safeDelta = Math.min(0.05, Math.max(0, deltaSeconds))
    let next = this.snapshot
    let notify = false
    if (next.motion === 'opening') {
      const openProgress = clamp01(
        next.openProgress + safeDelta / OPEN_DURATION_SECONDS,
      )
      const passable =
        openProgress >= COTTAGE_ARCHITECTURE.door.passableProgress
      const completed = openProgress >= 1
      notify = passable !== next.navigationOpen || completed
      next = {
        ...next,
        openProgress,
        visualOpen: true,
        colliderOpen: passable,
        navigationOpen: passable,
        motion: completed ? 'open' : 'opening',
      }
    } else if (next.motion === 'closing') {
      const openProgress = clamp01(
        next.openProgress - safeDelta / CLOSE_DURATION_SECONDS,
      )
      const completed = openProgress <= 0
      notify = completed
      next = {
        ...next,
        openProgress,
        visualOpen: !completed,
        colliderOpen: false,
        navigationOpen: false,
        motion: completed ? 'closed' : 'closing',
      }
    }

    const targetBlend = next.zone === 'interior' ? 1 : 0
    const interiorBlend = clamp01(
      next.interiorBlend +
        Math.sign(targetBlend - next.interiorBlend) *
          (safeDelta / INTERIOR_BLEND_DURATION_SECONDS),
    )
    if (Math.abs(targetBlend - interiorBlend) > Math.abs(targetBlend - next.interiorBlend)) {
      next = { ...next, interiorBlend: targetBlend }
    } else if (interiorBlend !== next.interiorBlend) {
      next = { ...next, interiorBlend }
    }
    this.publish(next, notify)
  }

  commitIfCurrent(
    capturedEpoch: number,
    update: (snapshot: CottagePortalSnapshot) => CottagePortalSnapshot,
  ) {
    if (capturedEpoch !== this.snapshot.epoch) return false
    this.publish(update(this.snapshot))
    return true
  }
}

export const cottagePortalRuntime = new CottagePortalRuntime()

export function isCottageDoorPassable() {
  const snapshot = cottagePortalRuntime.getSnapshot()
  return snapshot.colliderOpen && snapshot.navigationOpen
}
