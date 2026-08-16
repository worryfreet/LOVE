import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  InstancedBufferAttribute,
  InstancedMesh,
  MeshPhysicalMaterial,
  Object3D,
} from 'three'
import type { EulerOrder } from 'three'
import {
  StudioPetalMaterial,
  type StudioFlowerPalette,
  type StudioPetalPattern,
} from './StudioPetalMaterial'
import { createPetalUvGeometry } from './deformablePetal'
import type {
  StudioFlowerPetalPlacement,
  StudioPetalShape,
} from './studioFlower'
import type { RibbonTextureSet } from './types'

const ignoreFlowerRaycast = () => undefined

export interface StudioPetalBatchProps {
  name: string
  placements: readonly StudioFlowerPetalPlacement[]
  shape: StudioPetalShape
  palette: StudioFlowerPalette
  bloomMax?: number
  transition?: number
  windAmplitude?: number
  windSpeed?: number
  windHeading?: number
  flat?: boolean
  pattern?: StudioPetalPattern
  rotationOrder?: EulerOrder
  lengthSegments?: number
  widthSegments?: number
  surfaceTextures?: RibbonTextureSet
  roughness?: number
  sheen?: number
  transmission?: number
  textureNormalStrength?: number
}

/**
 * Flower Studio 实例花瓣的 React Three Fiber 生命周期封装。
 * 几何属性、实例矩阵和 Shader 输入保持 Studio 语义，不在物种层重复实现。
 */
export function StudioPetalBatch({
  name,
  placements,
  shape,
  palette,
  bloomMax = 0.78,
  transition = 0.35,
  windAmplitude = 0.15,
  windSpeed = 1.5,
  windHeading = 35,
  flat = false,
  pattern,
  rotationOrder = 'YXZ',
  lengthSegments = 64,
  widthSegments = 24,
  surfaceTextures,
  roughness = 0.72,
  sheen = 0.18,
  transmission = 0.08,
  textureNormalStrength = 0.16,
}: StudioPetalBatchProps) {
  const geometry = useMemo(() => {
    const tipStyle = (shape.tipWidth ?? 0) > 0.001 ? 'rounded' : 'pointed'
    const created = createPetalUvGeometry(
      widthSegments,
      lengthSegments,
      tipStyle,
    )
    created.setAttribute(
      'aU',
      new InstancedBufferAttribute(
        new Float32Array(placements.map(({ progress }) => progress)),
        1,
      ),
    )
    created.setAttribute(
      'aSeed',
      new InstancedBufferAttribute(
        new Float32Array(placements.map(({ seed }) => seed)),
        1,
      ),
    )
    created.setAttribute(
      'aTilt',
      new InstancedBufferAttribute(
        new Float32Array(placements.map(({ tilt }) => tilt)),
        1,
      ),
    )
    created.userData.sampling.representationSignature =
      'flower-studio-instanced-petal'
    return created
  }, [lengthSegments, placements, shape.tipWidth, widthSegments])
  const mesh = useRef<InstancedMesh>(null)
  const bloomMaterial = useRef<MeshPhysicalMaterial>(null)

  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    placements.forEach((placement, index) => {
      dummy.position.set(...placement.position)
      dummy.rotation.set(...placement.rotation, rotationOrder)
      dummy.scale.setScalar(placement.scale)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [placements, rotationOrder])

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, placements.length]}
      name={name}
      userData={{
        flowerStudioBloom: true,
        flowerStudioMaterialRef: bloomMaterial,
      }}
      frustumCulled={false}
      raycast={ignoreFlowerRaycast}
    >
      <StudioPetalMaterial
        shape={shape}
        palette={palette}
        bloomMax={bloomMax}
        transition={transition}
        windAmplitude={windAmplitude}
        windSpeed={windSpeed}
        windHeading={windHeading}
        flat={flat}
        pattern={pattern}
        surfaceTextures={surfaceTextures}
        roughness={roughness}
        sheen={sheen}
        transmission={transmission}
        textureNormalStrength={textureNormalStrength}
        materialRef={bloomMaterial}
      />
    </instancedMesh>
  )
}
