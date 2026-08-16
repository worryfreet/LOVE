import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isFirstPersonMovementKey,
  resolveConstrainedFirstPersonPosition,
  resolveFirstPersonEyeY,
  resolveFirstPersonMovementVector,
  resolveTouchControlMode,
  resolveTouchMovement,
} from '../src/shared/three/controls/firstPersonInput'

describe('第一人称输入规则', () => {
  it('只识别预定的键盘移动键', () => {
    assert.equal(isFirstPersonMovementKey('KeyW'), true)
    assert.equal(isFirstPersonMovementKey('ArrowLeft'), true)
    assert.equal(isFirstPersonMovementKey('ShiftLeft'), true)
    assert.equal(isFirstPersonMovementKey('Enter'), false)
  })

  it('让 WASD 在所有朝向下始终相对相机前向与右向移动', () => {
    assert.deepEqual(resolveFirstPersonMovementVector(0, 1, 0), { x: 0, z: -1 })
    const right = resolveFirstPersonMovementVector(0, 0, 1)
    assert.equal(right.x, 1)
    assert.ok(Math.abs(right.z) < 1e-12)

    const facingLeft = resolveFirstPersonMovementVector(Math.PI / 2, 1, 0)
    assert.ok(Math.abs(facingLeft.x + 1) < 1e-12)
    assert.ok(Math.abs(facingLeft.z) < 1e-12)
    const rightFromLeft = resolveFirstPersonMovementVector(Math.PI / 2, 0, 1)
    assert.ok(Math.abs(rightFromLeft.x) < 1e-12)
    assert.ok(Math.abs(rightFromLeft.z + 1) < 1e-12)

    const facingRight = resolveFirstPersonMovementVector(-Math.PI / 2, 1, 0)
    assert.ok(Math.abs(facingRight.x - 1) < 1e-12)
    assert.ok(Math.abs(facingRight.z) < 1e-12)

    const diagonal = resolveFirstPersonMovementVector(0.37, 1, 1)
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12)
  })

  it('把触屏左侧划分为移动区，右侧划分为观察区', () => {
    assert.equal(resolveTouchControlMode(140, 20, 400), 'move')
    assert.equal(resolveTouchControlMode(280, 20, 400), 'look')
  })

  it('把拖动距离归一化为前进和横移，并限制最大速度', () => {
    assert.deepEqual(
      resolveTouchMovement({ x: 100, y: 100 }, { x: 132, y: 68 }),
      { forward: 0.5, strafe: 0.5 },
    )
    assert.deepEqual(
      resolveTouchMovement({ x: 0, y: 0 }, { x: 500, y: 500 }),
      { forward: -1, strafe: 1 },
    )
  })

  it('按世界边界与占用约束解析移动，并允许沿障碍边缘滑动', () => {
    const bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }
    const result = resolveConstrainedFirstPersonPosition(
      { x: 0.4, z: 0.6 },
      { x: 0.3, z: 0.5 },
      bounds,
      ({ x, z }) => !(x > 0.5 && z > 0.5),
    )

    assert.deepEqual(result, { x: 0.4, z: 1 })
    assert.deepEqual(
      resolveConstrainedFirstPersonPosition(
        { x: 0, z: 0 },
        { x: 5, z: -5 },
        bounds,
      ),
      { x: 1, z: -1 },
    )
  })

  it('使用共享地形高度保持眼高，并对非法采样安全回退', () => {
    const point = { x: 2, z: 3 }
    assert.equal(
      resolveFirstPersonEyeY(
        point,
        1.7,
        1.65,
        ({ x, z }) => x * 0.1 + z * 0.05,
      ),
      2,
    )
    assert.equal(resolveFirstPersonEyeY(point, 1.7, 1.65), 1.7)
    assert.equal(
      resolveFirstPersonEyeY(point, 1.7, 1.65, () => Number.NaN),
      1.7,
    )
  })
})
