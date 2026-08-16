import {
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import type { Vector3Tuple } from 'three'

const LOCAL_FALLBACK_NORMAL = new Vector3(0, 0, 1)
const WORLD_FALLBACK_NORMAL = new Vector3(0, 1, 0)

/**
 * 用叶片的生长方向和正面朝向共同确定空间姿态。
 * 局部 +Y 对齐主脉，局部 +Z 对齐叶面法线，避免只靠单个欧拉角把整片叶子压在同一平面。
 */
export function createLeafOrientationQuaternion(
  direction: Vector3Tuple,
  normalHint: Vector3Tuple,
) {
  const lengthAxis = new Vector3(...direction)
  if (lengthAxis.lengthSq() < 1e-10) lengthAxis.set(0, 1, 0)
  lengthAxis.normalize()

  const normalAxis = new Vector3(...normalHint)
  if (normalAxis.lengthSq() < 1e-10) normalAxis.copy(LOCAL_FALLBACK_NORMAL)
  normalAxis.addScaledVector(lengthAxis, -normalAxis.dot(lengthAxis))
  if (normalAxis.lengthSq() < 1e-8) {
    normalAxis.copy(WORLD_FALLBACK_NORMAL)
    normalAxis.addScaledVector(lengthAxis, -normalAxis.dot(lengthAxis))
  }
  if (normalAxis.lengthSq() < 1e-8) {
    normalAxis.copy(LOCAL_FALLBACK_NORMAL)
    normalAxis.addScaledVector(lengthAxis, -normalAxis.dot(lengthAxis))
  }
  normalAxis.normalize()

  const widthAxis = new Vector3().crossVectors(lengthAxis, normalAxis).normalize()
  normalAxis.crossVectors(widthAxis, lengthAxis).normalize()

  return new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(widthAxis, lengthAxis, normalAxis),
  )
}
