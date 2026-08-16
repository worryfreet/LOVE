import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  CylinderGeometry,
  InstancedMesh,
  Line as ThreeLine,
  LineBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three'
import {
  resolveStringLightPath,
  resolveStringLightWarmColor,
  STRING_LIGHT_MAX_BULBS,
  type StringLightPoint,
} from '../lib/stringLightPath'
import type { PartParameterValues } from '../../../model/partTypes'

export interface StringLightsPartModelProps {
  readonly id: string
  /** 相对于组件根节点的有序三维控制点，单位：米。 */
  readonly points: readonly StringLightPoint[]
  /** 灯泡目标间距，单位：米。 */
  readonly bulbSpacing: number
  /** 每个控制点跨度的最大下垂量，单位：米。 */
  readonly sag: number
  readonly cableColor: string
  /** 0 为琥珀色，1 为偏象牙白的暖光。 */
  readonly warmth: number
  /** 自发光强度，建议范围 0–6。 */
  readonly intensity: number
  readonly lit: boolean
  readonly quality?: 'desktop' | 'mobile'
  readonly maxBulbs?: number
}

export type CottageStringLightPointInput =
  | StringLightPoint
  | Readonly<{ x: number; y: number; z: number }>

export interface CottageStringLightsProps {
  readonly id?: string
  readonly parameters: PartParameterValues
  readonly points?: readonly CottageStringLightPointInput[]
  /** `path` 是 `points` 的编辑器兼容别名；同时提供时以 points 为准。 */
  readonly path?: readonly CottageStringLightPointInput[]
  readonly quality?: 'desktop' | 'mobile'
}

export const COTTAGE_STRING_LIGHT_MATERIAL_SLOT_IDS = [
  'cable',
  'socket',
  'bulb',
] as const

interface StringLightResources {
  readonly cableGeometry: BufferGeometry
  readonly bulbGeometry: SphereGeometry
  readonly socketGeometry: CylinderGeometry
  readonly cableMaterial: LineBasicMaterial
  readonly bulbMaterial: MeshStandardMaterial
  readonly socketMaterial: MeshStandardMaterial
}

function validateIntensity(intensity: number) {
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 12) {
    throw new RangeError('彩灯强度必须是 0 到 12 之间的有限数值')
  }
}

function disposeStringLightResources(resources: StringLightResources) {
  resources.cableGeometry.dispose()
  resources.bulbGeometry.dispose()
  resources.socketGeometry.dispose()
  Object.values({
    cable: resources.cableMaterial,
    bulb: resources.bulbMaterial,
    socket: resources.socketMaterial,
  }).forEach((material) => (material as Material).dispose())
}

/**
 * CPU 解析路径，GPU 只负责一条 Line 与两个 InstancedMesh 的展示。
 * 组件不创建独立动画循环或逐灯 PointLight。
 */
export function StringLightsPartModel({
  id,
  points,
  bulbSpacing,
  sag,
  cableColor,
  warmth,
  intensity,
  lit,
  quality = 'desktop',
  maxBulbs = STRING_LIGHT_MAX_BULBS,
}: StringLightsPartModelProps) {
  validateIntensity(intensity)
  const requestedMaximum = Number.isFinite(maxBulbs)
    ? Math.floor(maxBulbs)
    : STRING_LIGHT_MAX_BULBS
  const safeMaximum = Math.min(
    quality === 'mobile' ? 96 : STRING_LIGHT_MAX_BULBS,
    Math.max(1, requestedMaximum),
  )
  const segmentsPerSpan = quality === 'mobile' ? 10 : 18
  const resolved = useMemo(
    () =>
      resolveStringLightPath(
        points,
        bulbSpacing,
        sag,
        safeMaximum,
        segmentsPerSpan,
      ),
    [bulbSpacing, points, safeMaximum, sag, segmentsPerSpan],
  )
  const warmColor = resolveStringLightWarmColor(warmth)
  const bulbRef = useRef<InstancedMesh>(null)
  const socketRef = useRef<InstancedMesh>(null)

  const resources = useMemo<StringLightResources>(() => {
    const cableGeometry = new BufferGeometry().setFromPoints(
      resolved.sampledPoints.map(
        ([x, y, z]) => new Vector3(x, y, z),
      ),
    )
    cableGeometry.computeBoundingBox()
    cableGeometry.computeBoundingSphere()
    const bulbGeometry = new SphereGeometry(
      0.024,
      quality === 'mobile' ? 8 : 12,
      quality === 'mobile' ? 6 : 9,
    )
    bulbGeometry.scale(0.9, 1.08, 0.9)
    const socketGeometry = new CylinderGeometry(
      0.011,
      0.014,
      0.025,
      quality === 'mobile' ? 6 : 9,
    )

    return {
      cableGeometry,
      bulbGeometry,
      socketGeometry,
      cableMaterial: new LineBasicMaterial({ color: cableColor }),
      bulbMaterial: new MeshStandardMaterial({
        color: lit ? warmColor : '#b9aa91',
        emissive: warmColor,
        emissiveIntensity: lit ? intensity : 0,
        roughness: 0.28,
        metalness: 0.02,
        transparent: true,
        opacity: lit ? 0.94 : 0.7,
        toneMapped: false,
      }),
      socketMaterial: new MeshStandardMaterial({
        color: '#79603e',
        roughness: 0.46,
        metalness: 0.66,
      }),
    }
  }, [cableColor, intensity, lit, quality, resolved.sampledPoints, warmColor])

  useEffect(
    () => () => {
      disposeStringLightResources(resources)
    },
    [resources],
  )

  const cableLine = useMemo(() => {
    const line = new ThreeLine(
      resources.cableGeometry,
      resources.cableMaterial,
    )
    line.name = `${id}:cable`
    line.userData.materialSlot = 'cable'
    return line
  }, [id, resources.cableGeometry, resources.cableMaterial])

  useLayoutEffect(() => {
    const bulbs = bulbRef.current
    const sockets = socketRef.current
    if (!bulbs || !sockets) return
    const transform = new Object3D()

    resolved.bulbs.forEach((placement, index) => {
      const [x, y, z] = placement.position
      transform.position.set(x, y - 0.018, z)
      transform.rotation.set(0, 0, 0)
      transform.scale.set(1, 1, 1)
      transform.updateMatrix()
      sockets.setMatrixAt(index, transform.matrix)

      transform.position.set(x, y - 0.049, z)
      transform.updateMatrix()
      bulbs.setMatrixAt(index, transform.matrix)
    })

    sockets.instanceMatrix.needsUpdate = true
    bulbs.instanceMatrix.needsUpdate = true
    sockets.computeBoundingBox()
    sockets.computeBoundingSphere()
    bulbs.computeBoundingBox()
    bulbs.computeBoundingSphere()
  }, [resolved.bulbs])

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        componentType: 'cottage-string-lights',
        origin: 'local-control-point-space',
        forwardAxis: '+Z',
        upAxis: '+Y',
        controlPointCount: resolved.controlPoints.length,
        arcLength: resolved.arcLength,
        bulbCount: resolved.bulbs.length,
        bulbLimit: STRING_LIGHT_MAX_BULBS,
        materialSlots: COTTAGE_STRING_LIGHT_MATERIAL_SLOT_IDS,
        resources: ['cable-line', 'bulb-instances', 'socket-instances'],
      }}
    >
      <primitive object={cableLine} />
      <instancedMesh
        key={`sockets-${resolved.bulbs.length}`}
        ref={socketRef}
        name={`${id}:sockets`}
        args={[
          resources.socketGeometry,
          resources.socketMaterial,
          resolved.bulbs.length,
        ]}
        userData={{ materialSlot: 'socket' }}
      />
      <instancedMesh
        key={`bulbs-${resolved.bulbs.length}`}
        ref={bulbRef}
        name={`${id}:bulbs`}
        args={[
          resources.bulbGeometry,
          resources.bulbMaterial,
          resolved.bulbs.length,
        ]}
        userData={{ materialSlot: 'bulb', lit }}
      />
    </group>
  )
}

function readNumber(
  value: PartParameterValues[string] | undefined,
  fallback: number,
) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readClampedNumber(
  value: PartParameterValues[string] | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(maximum, Math.max(minimum, readNumber(value, fallback)))
}

function toTuple(point: CottageStringLightPointInput): StringLightPoint {
  if (Array.isArray(point)) {
    return [Number(point[0]), Number(point[1]), Number(point[2])]
  }
  const vector = point as Readonly<{ x: number; y: number; z: number }>
  return [Number(vector.x), Number(vector.y), Number(vector.z)]
}

/** 目录与室内编辑器统一入口；尺寸参数使用毫米，控制点仍使用米。 */
export function CottageStringLights({
  id = 'part:cottage-string-lights',
  parameters,
  points,
  path,
  quality = 'desktop',
}: CottageStringLightsProps) {
  const length = readClampedNumber(parameters.length, 2400, 1000, 20000) / 1000
  const suppliedPath = points ?? path
  const resolvedPoints = useMemo<readonly StringLightPoint[]>(
    () =>
      suppliedPath?.map(toTuple) ?? [
        [-length / 2, 0.18, 0],
        [-length * 0.18, 0.25, 0.04],
        [length * 0.18, 0.2, -0.035],
        [length / 2, 0.3, 0],
      ],
    [length, suppliedPath],
  )

  return (
    <StringLightsPartModel
      id={id}
      points={resolvedPoints}
      bulbSpacing={
        readClampedNumber(parameters.bulbSpacing, 240, 120, 800) / 1000
      }
      sag={readClampedNumber(parameters.sag, 120, 0, 500) / 1000}
      cableColor={
        typeof parameters.cableColor === 'string'
          ? parameters.cableColor
          : '#34271f'
      }
      warmth={readClampedNumber(parameters.warmth, 0.24, 0, 1)}
      intensity={readClampedNumber(parameters.intensity, 3.4, 0, 6)}
      lit={parameters.lit !== false}
      quality={quality}
      maxBulbs={readClampedNumber(
        parameters.maxBulbs,
        STRING_LIGHT_MAX_BULBS,
        2,
        STRING_LIGHT_MAX_BULBS,
      )}
    />
  )
}
