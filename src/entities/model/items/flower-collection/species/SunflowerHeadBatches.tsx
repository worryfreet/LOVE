import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { createSeededRandom, seededRange } from '@/shared/plant'
import { createPetalGeometry } from '../core/geometry'
import {
  applyFlowerPetalWindAttributes,
  type FlowerWindUniforms,
} from '../core/flowerWindMaterial'
import { RibbonSurfaceMaterial } from '../core/FlowerPrimitives'
import type {
  FlowerSurfaceQuality,
  RibbonGeometryOptions,
  RibbonTextureSet,
} from '../core/types'

const ignoreFlowerRaycast = () => undefined

export interface SunflowerOrganPlacement {
  position: readonly [number, number, number]
  angle: number
  tilt: number
  roll: number
  scale: number
  tint: string
}

export interface SunflowerRingLayoutOptions {
  count: number
  radius: number
  depth: number
  tilt: number
  scale: number
  phase: number
  seed: number
  radiusJitter?: number
  depthJitter?: number
  tiltJitter?: number
  tint: readonly [string, string]
}

/** 向日葵专属的舌状花 / 总苞排列，不作为其他物种的通用花环。 */
export function createSunflowerOrganPlacements({
  count,
  radius,
  depth,
  tilt,
  scale,
  phase,
  seed,
  radiusJitter = 0.035,
  depthJitter = 0.025,
  tiltJitter = 0.075,
  tint,
}: SunflowerRingLayoutOptions): SunflowerOrganPlacement[] {
  const random = createSeededRandom(seed)
  const tintA = new Color(tint[0])
  const tintB = new Color(tint[1])
  const sampled = new Color()
  return Array.from({ length: count }, (_, index) => {
    const progress = count > 1 ? index / (count - 1) : 0
    const angle = index / count * Math.PI * 2 + phase + seededRange(random, -0.028, 0.028)
    const localRadius = radius * seededRange(random, 1 - radiusJitter, 1 + radiusJitter)
    return {
      position: [
        Math.sin(angle) * localRadius,
        Math.cos(angle) * localRadius,
        depth + seededRange(random, -depthJitter, depthJitter),
      ],
      angle,
      tilt: tilt + seededRange(random, -tiltJitter, tiltJitter),
      roll: seededRange(random, -0.055, 0.055),
      scale: scale * seededRange(random, 0.93, 1.06),
      tint: `#${sampled.lerpColors(tintA, tintB, progress).getHexString()}`,
    }
  })
}

export function SunflowerOrganBatch({
  name,
  options,
  placements,
  textures,
  quality,
  roughness,
  sheen = 0.18,
  transmission = 0,
  sheenColor,
  textureNormalStrength,
  emissive,
  emissiveIntensity,
  windUniforms,
}: {
  name: string
  options: RibbonGeometryOptions
  placements: readonly SunflowerOrganPlacement[]
  textures: RibbonTextureSet
  quality: FlowerSurfaceQuality
  roughness: number
  sheen?: number
  transmission?: number
  sheenColor: string
  textureNormalStrength: number
  emissive?: string
  emissiveIntensity?: number
  windUniforms?: FlowerWindUniforms
}) {
  const optionsKey = JSON.stringify(options)
  const geometry = useMemo(
    () => applyFlowerPetalWindAttributes(createPetalGeometry(options)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsKey],
  )
  const mesh = useRef<InstancedMesh>(null)
  const instanceColors = useMemo(
    () => new Float32Array(placements.length * 3).fill(1),
    [placements.length],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    const around = new Quaternion()
    const tilt = new Quaternion()
    const roll = new Quaternion()
    const axisZ = new Vector3(0, 0, 1)
    const axisX = new Vector3(1, 0, 0)
    const axisY = new Vector3(0, 1, 0)
    const color = new Color()
    placements.forEach((placement, index) => {
      dummy.position.set(...placement.position)
      around.setFromAxisAngle(axisZ, -placement.angle)
      tilt.setFromAxisAngle(axisX, placement.tilt)
      roll.setFromAxisAngle(axisY, placement.roll)
      dummy.quaternion.copy(around).multiply(tilt).multiply(roll)
      dummy.scale.setScalar(placement.scale)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
      mesh.current?.setColorAt(index, color.set(placement.tint))
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [placements])

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, placements.length]}
      name={name}
      castShadow={quality.petalShadows}
      receiveShadow={quality.petalShadows}
      raycast={ignoreFlowerRaycast}
    >
      <instancedBufferAttribute attach="instanceColor" args={[instanceColors, 3]} />
      <RibbonSurfaceMaterial
        roughness={roughness}
        sheen={sheen}
        transmission={transmission}
        sheenColor={sheenColor}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        surfaceTextures={textures}
        textureNormalStrength={textureNormalStrength}
        surfaceQuality={quality}
        windUniforms={windUniforms}
        windPetalAmplitude={0.012}
      />
    </instancedMesh>
  )
}
