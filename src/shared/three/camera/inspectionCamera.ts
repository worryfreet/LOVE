export type InspectionPoint = readonly [number, number, number]

export interface InspectionOrbitLimits {
  enablePan: true
  screenSpacePanning: true
  zoomToCursor: true
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  maxTargetRadius: number
}

const POLAR_DEAD_ZONE = Math.PI / 36

function distanceBetween(
  position: InspectionPoint,
  target: InspectionPoint,
) {
  return Math.hypot(
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  )
}

/**
 * 依据默认构图距离生成观察约束，让不同尺度的展品获得一致的近景与环绕能力。
 */
export function getInspectionOrbitLimits(
  position: InspectionPoint,
  target: InspectionPoint,
): InspectionOrbitLimits {
  const designDistance = Math.max(distanceBetween(position, target), 0.01)

  return {
    enablePan: true,
    screenSpacePanning: true,
    zoomToCursor: true,
    minDistance: Math.max(0.12, designDistance * 0.04),
    maxDistance: Math.max(12, designDistance * 5),
    minPolarAngle: POLAR_DEAD_ZONE,
    maxPolarAngle: Math.PI - POLAR_DEAD_ZONE,
    maxTargetRadius: Math.max(2.5, designDistance * 0.85),
  }
}
