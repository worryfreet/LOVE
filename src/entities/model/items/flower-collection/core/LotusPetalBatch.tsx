import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { DeformablePetalMaterial } from './DeformablePetalMaterial'
import {
  attachDeformablePetalAttributes,
  createPetalUvGeometry,
} from './deformablePetal'
import type {
  FlowerSurfaceQuality,
  LotusPetalPlacement,
  RibbonGeometryOptions,
  RibbonTextureSet,
} from './types'

const ignoreFlowerRaycast = () => undefined

export function LotusPetalBatch({
  name,
  options,
  placements,
  surfaceTextures,
  surfaceQuality,
  roughness,
  sheen,
  transmission,
  sheenColor,
  textureNormalStrength,
  opacity = 1,
}: {
  name: string
  options: RibbonGeometryOptions
  placements: readonly LotusPetalPlacement[]
  surfaceTextures: RibbonTextureSet
  surfaceQuality: FlowerSurfaceQuality
  roughness: number
  sheen: number
  transmission: number
  sheenColor: string
  textureNormalStrength: number
  opacity?: number
}) {
  const geometry = useMemo(() => attachDeformablePetalAttributes(
    createPetalUvGeometry(
      Math.max(8, options.widthSegments ?? 18),
      Math.max(18, options.lengthSegments ?? 40),
    ),
    placements.map((placement, index) => ({
      progress: placements.length > 1 ? index / (placements.length - 1) : 0,
      seed: index * 0.754877666 + placement.roll * 9,
      tilt: 0,
      curlScale: 0.94 + Math.sin(index * 1.19) * 0.07,
      cupScale: 0.96 + Math.cos(index * 0.93) * 0.08,
    })),
  ), [options, placements])
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
      tilt.setFromAxisAngle(axisX, Math.PI * 0.5 - placement.tilt)
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
      castShadow={surfaceQuality.petalShadows}
      receiveShadow={surfaceQuality.petalShadows}
      raycast={ignoreFlowerRaycast}
    >
      <instancedBufferAttribute attach="instanceColor" args={[instanceColors, 3]} />
      <DeformablePetalMaterial
        shape={{
          length: options.length,
          widths: options.widthProfile
            ? options.widthProfile.map((ratio) => ratio * options.width) as [
                number, number, number, number, number, number,
              ]
            : [
                options.baseWidth ?? options.width * 0.18,
                options.width * 0.55,
                options.width * 0.9,
                options.width,
                options.width * 0.82,
                options.tipWidth ?? options.width * 0.12,
              ],
          curl: (options.curl ?? 0) / Math.max(options.length, 0.0001) * 1.8,
          curlBias: options.curlBias ?? 1.55,
          cup: (options.cup ?? 0) / Math.max(options.width, 0.0001) * 0.62,
          sideCurl: (options.sideCurl ?? 0) / Math.max(options.width, 0.0001) * 1.2,
          wave: options.wave ?? 0,
          waveCount: options.waveCount ?? 4,
          asymmetry: options.asymmetry ?? 0,
          noise: Math.max(0.0015, (options.wave ?? 0) * 0.5),
        }}
        textures={surfaceTextures}
        baseColor={options.baseColor}
        tipColor={options.tipColor}
        centerColor={options.centerColor ?? sheenColor}
        roughness={roughness}
        transmission={transmission}
        normalStrength={surfaceQuality.normalMap ? textureNormalStrength : 0}
        windAmplitude={0.004 + sheen * 0.002}
        opacity={opacity}
      />
    </instancedMesh>
  )
}
