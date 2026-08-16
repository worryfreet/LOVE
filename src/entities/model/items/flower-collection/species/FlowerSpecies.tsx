import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { Group } from 'three'
import type {
  ModelParameterValues,
  ModelSceneProps,
} from '@/entities/model'
import {
  getFlowerRuntimeSpec,
  resolveBloomTransform,
} from '../core/layout'
import type { FlowerSpeciesId } from '../core/types'
import {
  resolveBloomDuration,
  resolveBloomOrganDelay,
  resolveOrganBloomTransform,
} from '../core/bloomAnimation'
import { studioBloomAt } from '../core/studioFlower'
import { DandelionAssembly } from './DandelionPlant'
import { HydrangeaAssembly } from './HydrangeaPlant'
import { LilyAssembly } from './LilyPlant'
import { LotusAssembly } from './LotusPlant'
import { MorningGloryAssembly } from './MorningGloryPlant'
import { OrchidAssembly } from './OrchidPlant'
import { ClassicRoseAssembly, RoseAssembly } from './RosePlant'
import { SunflowerAssembly } from './SunflowerPlant'

function FlowerAssembly({
  species,
  bloomRef,
  parameters,
}: {
  species: FlowerSpeciesId
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  switch (species) {
    case 'sunflower':
      return <SunflowerAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'rose':
      return <RoseAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'classic-rose':
      return <ClassicRoseAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'lily':
      return <LilyAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'orchid':
      return <OrchidAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'lotus':
      return <LotusAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'dandelion':
      return <DandelionAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'morning-glory':
      return <MorningGloryAssembly bloomRef={bloomRef} parameters={parameters} />
    case 'hydrangea':
      return <HydrangeaAssembly bloomRef={bloomRef} parameters={parameters} />
  }
}

export function FlowerSpeciesScene({
  species,
  command,
  reducedMotion = false,
  parameters,
}: ModelSceneProps & { species: FlowerSpeciesId }) {
  const spec = getFlowerRuntimeSpec(species)
  const bloomDuration = resolveBloomDuration(
    parameters?.bloomDuration,
    spec.bloomDuration,
  )
  const plantRef = useRef<Group>(null)
  const bloomRef = useRef<Group>(null)
  const bloomProgress = useRef(1)
  const breezeImpulse = useRef(0)
  const handledNonce = useRef(-1)
  const restBloomScale = useRef<Vector3 | null>(null)
  const restBloomQuaternion = useRef<Quaternion | null>(null)
  const bloomDeltaQuaternion = useRef(new Quaternion())
  const bloomAxis = useRef(new Vector3(0, 0, 1))
  const instanceBloomRigs = useRef<Array<{
    mesh: InstancedMesh
    parts: Array<{
      position: Vector3
      quaternion: Quaternion
      scale: Vector3
      delay: number
      phase: number
    }>
  }>>([])
  const studioBloomMaterials = useRef<Array<{
    uniforms: { uBloom: { value: number } }
    bloomMax: number
  }>>([])
  const studioBloomScanComplete = useRef(false)
  const objectBloomRigs = useRef<Array<{
    object: Object3D
    scale: Vector3
    quaternion: Quaternion
    delay: number
    phase: number
    fold: boolean
  }>>([])
  const animationObject = useRef(new Object3D())
  const animationMatrix = useRef(new Matrix4())
  const organDeltaQuaternion = useRef(new Quaternion())
  const organFoldQuaternion = useRef(new Quaternion())
  const organFoldAxis = useRef(new Vector3(1, 0, 0))
  const flexibleObjects = useRef<Array<{
    object: Object3D
    quaternion: Quaternion
    phase: number
    stiffness: number
  }>>([])

  useEffect(() => {
    restBloomScale.current = null
    restBloomQuaternion.current = null
    instanceBloomRigs.current = []
    studioBloomMaterials.current = []
    studioBloomScanComplete.current = false
    objectBloomRigs.current = []
    flexibleObjects.current = []
  }, [parameters, species])

  useEffect(() => {
    if (!command || command.nonce === handledNonce.current) return
    handledNonce.current = command.nonce
    if (command.name === 'bloom-replay') bloomProgress.current = 0
    if (command.name === 'breeze') breezeImpulse.current = 1
  }, [command])

  useFrame(({ clock }, delta) => {
    const bloom = bloomRef.current
    const plant = plantRef.current
    if (!bloom || !plant) return
    if (!studioBloomScanComplete.current) {
      let studioBatchCount = 0
      const discoveredMaterials: typeof studioBloomMaterials.current = []
      bloom.traverse((object) => {
        const mesh = object as InstancedMesh
        if (!mesh.isInstancedMesh) return
        if (mesh.userData.flowerStudioBloom !== true) return
        studioBatchCount += 1
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        const candidate = materials.find((material) =>
          Boolean(material.userData.flowerStudioUniforms?.uBloom),
        )
        const uniforms = candidate?.userData.flowerStudioUniforms as
          | { uBloom: { value: number } }
          | undefined
        if (!candidate || !uniforms?.uBloom) return
        discoveredMaterials.push({
          uniforms,
          bloomMax: Number(
            candidate.userData.flowerStudioBloomMax ?? 0.78,
          ),
        })
      })
      studioBloomMaterials.current = discoveredMaterials
      // R3F 可能在 InstancedMesh 挂载后一帧才附上最终材质；只有全部 Studio
      // 批次都找到真实材质后才冻结扫描，避免月季只缩放而不真正收拢成花苞。
      studioBloomScanComplete.current = studioBatchCount === 0 ||
        discoveredMaterials.length === studioBatchCount
    }
    if (!restBloomScale.current || !restBloomQuaternion.current) {
      restBloomScale.current = bloom.scale.clone()
      restBloomQuaternion.current = bloom.quaternion.clone()
      let meshOrder = 0
      let objectOrder = 0
      let flexibleOrder = 0
      bloom.traverse((object) => {
        const name = object.name.toLowerCase()
        const isAnimatedOrgan = /(petal|tepal|ligule|ray|sepal|floret)/.test(name)
        if (
          object instanceof InstancedMesh &&
          object.userData.flowerStudioBloom === true
        ) {
          return
        }
        if (object instanceof InstancedMesh && isAnimatedOrgan) {
          const parts = Array.from({ length: object.count }, (_, index) => {
            object.getMatrixAt(index, animationMatrix.current)
            const position = new Vector3()
            const quaternion = new Quaternion()
            const scale = new Vector3()
            animationMatrix.current.decompose(position, quaternion, scale)
            return {
              position,
              quaternion,
              scale,
              delay: resolveBloomOrganDelay(index, object.count, meshOrder),
              phase: index * 1.73 + meshOrder * 0.81,
            }
          })
          instanceBloomRigs.current.push({ mesh: object, parts })
          meshOrder += 1
          return
        }
        const isOrchidBloom =
          species === 'orchid' && /^flower\.orchid\.bloom\.\d+$/.test(name)
        const isContinuousCorolla =
          species === 'morning-glory' && name === 'flower.morning-glory.corolla'
        const isIndependentOrgan =
          species !== 'orchid' && isAnimatedOrgan && object.type === 'Mesh'
        if (isOrchidBloom || isContinuousCorolla || isIndependentOrgan) {
          objectBloomRigs.current.push({
            object,
            scale: object.scale.clone(),
            quaternion: object.quaternion.clone(),
            delay: Math.min(0.48, objectOrder * 0.075),
            phase: objectOrder * 1.41 + 0.6,
            fold: isIndependentOrgan,
          })
          objectOrder += 1
        }
      })
      plant.traverse((object) => {
        if (object === plant || object === bloom) return
        let ancestor: Object3D | null = object.parent
        let insideBloom = false
        while (ancestor) {
          if (ancestor === bloom) {
            insideBloom = true
            break
          }
          ancestor = ancestor.parent
        }
        if (insideBloom) return
        const name = object.name.toLowerCase()
        if (!/(foliage|leaf|petiole|pedicel|inflorescence|vine|scape)/.test(name)) return
        if (object instanceof InstancedMesh) return
        const stiffness = /(leaf|foliage)/.test(name)
          ? 0.72
          : /(pedicel|petiole)/.test(name)
            ? 0.48
            : 0.3
        flexibleObjects.current.push({
          object,
          quaternion: object.quaternion.clone(),
          phase: flexibleOrder * 1.37 + spec.seed * 0.013,
          stiffness,
        })
        flexibleOrder += 1
      })
    }
    const baseScale = restBloomScale.current
    const baseQuaternion = restBloomQuaternion.current
    const applyStudioBloomProgress = (progress: number) => {
      studioBloomMaterials.current.forEach(({ uniforms, bloomMax }) => {
        uniforms.uBloom.value = studioBloomAt(progress, bloomMax)
      })
    }

    const applyOrganProgress = (progress: number) => {
      instanceBloomRigs.current.forEach(({ mesh, parts }) => {
        parts.forEach((part, index) => {
          const transform = resolveOrganBloomTransform(
            progress,
            part.delay,
            part.phase,
          )
          organDeltaQuaternion.current.setFromAxisAngle(
            bloomAxis.current,
            transform.twist,
          )
          organFoldQuaternion.current.setFromAxisAngle(
            organFoldAxis.current,
            transform.fold,
          )
          animationObject.current.position.copy(part.position)
          animationObject.current.quaternion
            .copy(part.quaternion)
            .multiply(organDeltaQuaternion.current)
            .multiply(organFoldQuaternion.current)
          animationObject.current.scale.set(
            part.scale.x * transform.scale[0],
            part.scale.y * transform.scale[1],
            part.scale.z * transform.scale[2],
          )
          animationObject.current.updateMatrix()
          mesh.setMatrixAt(index, animationObject.current.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      })
      objectBloomRigs.current.forEach((rig) => {
        const transform = resolveOrganBloomTransform(
          progress,
          rig.delay,
          rig.phase,
        )
        organDeltaQuaternion.current.setFromAxisAngle(
          bloomAxis.current,
          transform.twist,
        )
        organFoldQuaternion.current.setFromAxisAngle(
          organFoldAxis.current,
          rig.fold ? transform.fold : 0,
        )
        rig.object.scale.set(
          rig.scale.x * transform.scale[0],
          rig.scale.y * transform.scale[1],
          rig.scale.z * transform.scale[2],
        )
        rig.object.quaternion
          .copy(rig.quaternion)
          .multiply(organDeltaQuaternion.current)
          .multiply(organFoldQuaternion.current)
      })
    }

    if (reducedMotion) {
      bloomProgress.current = 1
      bloom.scale.copy(baseScale)
      bloom.quaternion.copy(baseQuaternion)
      applyStudioBloomProgress(1)
      applyOrganProgress(1)
      plant.rotation.set(0, 0, 0)
      flexibleObjects.current.forEach((rig) => {
        rig.object.quaternion.copy(rig.quaternion)
      })
      return
    }

    bloomProgress.current = Math.min(
      1,
      bloomProgress.current + delta / bloomDuration,
    )
    breezeImpulse.current = Math.max(0, breezeImpulse.current - delta * 0.28)
    const bloomTransform = resolveBloomTransform(bloomProgress.current)
    applyOrganProgress(bloomProgress.current)
    applyStudioBloomProgress(bloomProgress.current)
    // 连续曲面玫瑰也需要经历花苞整体膨大；局部卷曲和整冠尺度分别表达
    // 花瓣舒展与花苞体积增长，二者在盛放端点都精确回到原始变换。
    bloom.scale.set(
      baseScale.x * bloomTransform.scale[0],
      baseScale.y * bloomTransform.scale[1],
      baseScale.z * bloomTransform.scale[2],
    )
    bloomDeltaQuaternion.current.setFromAxisAngle(
      bloomAxis.current,
      bloomTransform.rotationZ,
    )
    bloom.quaternion
      .copy(baseQuaternion)
      .multiply(bloomDeltaQuaternion.current)

    const wind = spec.windAmplitude * (1 + breezeImpulse.current * 2.6)
    const time = clock.elapsedTime
    plant.rotation.z = Math.sin(time * 0.72 + spec.seed * 0.01) * wind
    plant.rotation.x = Math.sin(time * 0.47 + spec.seed * 0.02) * wind * 0.42
    flexibleObjects.current.forEach((rig) => {
      const localWind = wind * rig.stiffness * (
        Math.sin(time * (0.76 + rig.stiffness * 0.22) + rig.phase) * 0.7 +
        Math.sin(time * 1.31 + rig.phase * 0.63) * 0.3
      )
      organDeltaQuaternion.current.setFromAxisAngle(
        bloomAxis.current,
        localWind,
      )
      rig.object.quaternion.copy(rig.quaternion).multiply(organDeltaQuaternion.current)
    })
  })

  return (
    <group ref={plantRef} name={species}>
      <FlowerAssembly
        species={species}
        bloomRef={bloomRef}
        parameters={parameters}
      />
    </group>
  )
}
