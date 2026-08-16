import { useEffect, useMemo } from 'react'
import type { Vector3Tuple } from 'three'
import { createPinnatifidLeafGeometry } from './geometry'
import { RibbonSurfaceMaterial } from './FlowerPrimitives'
import { createLeafOrientationQuaternion } from './leafOrientation'
import type { FlowerSurfaceQuality, RibbonTextureSet } from './types'

interface PinnatifidLeafProps {
  name: string
  length: number
  width: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
  direction?: Vector3Tuple
  surfaceNormal?: Vector3Tuple
  scale?: number
  lobePairs?: number
  notchDepth?: number
  cup?: number
  curl?: number
  twist?: number
  thickness?: number
  lengthSegments?: number
  widthSegments?: number
  baseColor: string
  tipColor: string
  veinColor: string
  surfaceTextures?: RibbonTextureSet
  textureNormalStrength?: number
  surfaceQuality: FlowerSurfaceQuality
}

/** 蒲公英专属羽状深裂基生叶，根位在局部原点并沿 +Y 生长。 */
export function PinnatifidLeaf({
  name,
  length,
  width,
  position,
  rotation,
  direction,
  surfaceNormal,
  scale = 1,
  lobePairs = 7,
  notchDepth = 0.48,
  cup = 0.018,
  curl = -0.015,
  twist = 0.06,
  thickness,
  lengthSegments,
  widthSegments,
  baseColor,
  tipColor,
  veinColor,
  surfaceTextures,
  textureNormalStrength = 0.26,
  surfaceQuality,
}: PinnatifidLeafProps) {
  const orientation = useMemo(
    () => direction && surfaceNormal
      ? createLeafOrientationQuaternion(direction, surfaceNormal)
      : undefined,
    [direction, surfaceNormal],
  )
  const options = useMemo(() => ({
    length,
    width,
    lobePairs,
    notchDepth,
    cup,
    curl,
    twist,
    thickness,
    lengthSegments,
    widthSegments,
    baseColor,
    tipColor,
    veinColor,
  }), [
    baseColor, cup, curl, length, lengthSegments, lobePairs, notchDepth,
    thickness, tipColor, twist, veinColor, width, widthSegments,
  ])
  const geometry = useMemo(
    () => createPinnatifidLeafGeometry(options),
    [options],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group
      name={name}
      position={position}
      rotation={orientation ? undefined : rotation}
      quaternion={orientation}
      scale={scale}
    >
      <mesh
        geometry={geometry}
        castShadow={surfaceQuality.petalShadows}
        receiveShadow={surfaceQuality.petalShadows}
      >
        <RibbonSurfaceMaterial
          roughness={0.82}
          sheen={0.16}
          sheenColor="#A4B76D"
          surfaceTextures={surfaceTextures}
          textureNormalStrength={textureNormalStrength}
          surfaceQuality={surfaceQuality}
        />
      </mesh>
    </group>
  )
}
