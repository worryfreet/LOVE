const movementKeys = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
])

export interface PointerPosition {
  x: number
  y: number
}

export interface FirstPersonGroundPoint {
  x: number
  z: number
}

export interface FirstPersonGroundBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function isFirstPersonMovementKey(code: string) {
  return movementKeys.has(code)
}

export function resolveTouchControlMode(
  pointerX: number,
  canvasLeft: number,
  canvasWidth: number,
): 'move' | 'look' {
  return pointerX - canvasLeft < canvasWidth * 0.45 ? 'move' : 'look'
}

export function resolveTouchMovement(
  start: PointerPosition,
  current: PointerPosition,
  sensitivity = 64,
) {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))

  return {
    forward: clamp((start.y - current.y) / sensitivity),
    strafe: clamp((current.x - start.x) / sensitivity),
  }
}

/**
 * 将输入轴投影到相机的水平前向与右向。
 * yaw=0 时相机朝 -Z，保证键位语义与 Three.js 的 YXZ 相机旋转完全一致。
 */
export function resolveFirstPersonMovementVector(
  yaw: number,
  forward: number,
  strafe: number,
) {
  if (![yaw, forward, strafe].every(Number.isFinite)) return { x: 0, z: 0 }
  const x = -Math.sin(yaw) * forward + Math.cos(yaw) * strafe
  const z = -Math.cos(yaw) * forward - Math.sin(yaw) * strafe
  const length = Math.hypot(x, z)
  return length > 1 ? { x: x / length, z: z / length } : { x, z }
}

/**
 * 分轴解析下一步位置，使碰到体块时仍能沿边缘滑动，而不是整步停住。
 */
export function resolveConstrainedFirstPersonPosition(
  current: FirstPersonGroundPoint,
  delta: FirstPersonGroundPoint,
  bounds: FirstPersonGroundBounds,
  isPositionAllowed?: (point: FirstPersonGroundPoint) => boolean,
) {
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value))
  const allowed = isPositionAllowed ?? (() => true)
  const candidateX = clamp(current.x + delta.x, bounds.minX, bounds.maxX)
  const candidateZ = clamp(current.z + delta.z, bounds.minZ, bounds.maxZ)
  let x = current.x
  let z = current.z

  if (allowed({ x: candidateX, z })) x = candidateX
  if (allowed({ x, z: candidateZ })) z = candidateZ

  return { x, z }
}

/**
 * 有地形采样器时以真实地面高度保持眼高；普通平面场景继续使用出生点 Y。
 */
export function resolveFirstPersonEyeY(
  point: FirstPersonGroundPoint,
  spawnY: number,
  eyeHeight: number | undefined,
  groundHeightAt?: (point: FirstPersonGroundPoint) => number,
) {
  if (!groundHeightAt) return spawnY
  const groundHeight = groundHeightAt(point)
  return Number.isFinite(groundHeight)
    ? groundHeight + (eyeHeight ?? spawnY)
    : spawnY
}
