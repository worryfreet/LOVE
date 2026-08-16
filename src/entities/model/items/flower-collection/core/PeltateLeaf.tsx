import { useEffect, useMemo } from 'react'
import {
  DoubleSide,
  Vector2,
} from 'three'
import type { Vector3Tuple } from 'three'
import type { FlowerSurfaceQuality, RibbonTextureSet } from './types'
import { createPeltateLeafGeometry } from './leafGeometry'
import { createLeafOrientationQuaternion } from './leafOrientation'

interface PeltateLeafProps {
  name: string
  radius: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
  direction?: Vector3Tuple
  surfaceNormal?: Vector3Tuple
  scale?: number | Vector3Tuple
  cup: number
  curl: number
  wave: number
  baseColor: string
  tipColor: string
  veinColor: string
  radialSegments: number
  ringSegments: number
  thickness?: number
  veinCount?: number
  veinRelief?: number
  surfaceTextures?: RibbonTextureSet
  textureNormalStrength?: number
  surfaceQuality: FlowerSurfaceQuality
}

/** 盾状荷叶的闭合辐射曲面；叶柄中心、辐射脉和波浪边共享同一表面。 */
export function PeltateLeaf({
  name,
  radius,
  position,
  rotation,
  direction,
  surfaceNormal,
  scale = 1,
  cup,
  curl,
  wave,
  baseColor,
  tipColor,
  veinColor,
  radialSegments,
  ringSegments,
  thickness,
  veinCount = 14,
  veinRelief,
  surfaceTextures,
  textureNormalStrength = 0.2,
  surfaceQuality,
}: PeltateLeafProps) {
  const orientation = useMemo(
    () => direction && surfaceNormal
      ? createLeafOrientationQuaternion(direction, surfaceNormal)
      : undefined,
    [direction, surfaceNormal],
  )
  const geometry = useMemo(() => createPeltateLeafGeometry({
    radius,
    cup,
    curl,
    wave,
    baseColor,
    tipColor,
    veinColor,
    radialSegments,
    ringSegments,
    thickness,
    veinCount,
    veinRelief,
  }), [
    baseColor, cup, curl, tipColor, veinColor, radialSegments,
    radius, ringSegments, thickness, veinCount, veinRelief, wave,
  ])
  const normalScale = useMemo(
    () => new Vector2(textureNormalStrength, textureNormalStrength),
    [textureNormalStrength],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const maps = {
    map: surfaceQuality.colorMap ? surfaceTextures?.colorMap : undefined,
    normalMap: surfaceQuality.normalMap ? surfaceTextures?.normalMap : undefined,
    roughnessMap: surfaceQuality.roughnessMap ? surfaceTextures?.roughnessMap : undefined,
  }
  return (
    <mesh
      name={name}
      geometry={geometry}
      position={position}
      rotation={orientation ? undefined : rotation}
      quaternion={orientation}
      scale={scale}
      castShadow={surfaceQuality.petalShadows}
      receiveShadow={surfaceQuality.petalShadows}
    >
      {surfaceQuality.material === 'physical' ? (
        <meshPhysicalMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.76}
          sheen={0.18}
          sheenColor="#B8D18E"
          normalScale={normalScale}
          {...maps}
        />
      ) : (
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.78}
          normalScale={normalScale}
          {...maps}
        />
      )}
    </mesh>
  )
}
