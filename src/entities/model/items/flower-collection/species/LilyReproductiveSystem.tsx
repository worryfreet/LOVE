import { useMemo } from 'react'
import {
  Quaternion,
  Vector3,
} from 'three'
import type { Vector3Tuple } from 'three'
import { CurvedStem } from '../core/FlowerPrimitives'

const BASE_LENGTH = 0.62
const Y_AXIS = new Vector3(0, 1, 0)

interface LilyFilamentTarget {
  x: number
  y: number
  z: number
  baseAngle: number
}

const FILAMENT_TARGETS: readonly LilyFilamentTarget[] = [
  { x: -0.23, y: 0.11, z: 0.57, baseAngle: 208 },
  { x: -0.15, y: 0.2, z: 0.64, baseAngle: 244 },
  { x: -0.055, y: 0.29, z: 0.69, baseAngle: 280 },
  { x: 0.06, y: 0.27, z: 0.68, baseAngle: 316 },
  { x: 0.16, y: 0.18, z: 0.63, baseAngle: 352 },
  { x: 0.24, y: 0.1, z: 0.56, baseAngle: 28 },
] as const

export interface LilyFilamentLayout {
  points: readonly Vector3Tuple[]
  antherPosition: Vector3Tuple
  antherDirection: Vector3Tuple
  antherQuaternion: readonly [number, number, number, number]
}

export interface LilyReproductiveLayout {
  filaments: readonly LilyFilamentLayout[]
  pistilPoints: readonly Vector3Tuple[]
  stigmaPosition: Vector3Tuple
}

/**
 * 百合花蕊的局部坐标权威：六根花丝共享直径不足 0.03 的花喉插槽，
 * 再向花冠正面弯出；花药姿态由末端切线计算，避免旋转视角下产生错位。
 */
export function createLilyReproductiveLayout(
  length: number,
): LilyReproductiveLayout {
  const scale = length / BASE_LENGTH
  const antherHalfLength = 0.056 * scale
  const filaments = FILAMENT_TARGETS.map((target) => {
    const baseAngle = target.baseAngle * Math.PI / 180
    const start: Vector3Tuple = [
      Math.cos(baseAngle) * 0.012,
      Math.sin(baseAngle) * 0.012,
      0.018,
    ]
    const firstControl: Vector3Tuple = [
      target.x * 0.08 * scale,
      target.y * 0.08 * scale,
      0.16 * scale,
    ]
    const secondControl: Vector3Tuple = [
      target.x * 0.5 * scale,
      target.y * 0.55 * scale,
      target.z * 0.55 * scale,
    ]
    const end: Vector3Tuple = [
      target.x * scale,
      target.y * scale,
      target.z * scale,
    ]
    const endPosition = new Vector3(...end)
    const antherDirection = endPosition.clone()
      .sub(new Vector3(...secondControl))
      .normalize()
    const antherPosition = endPosition
      .addScaledVector(antherDirection, antherHalfLength)
    const antherQuaternion = new Quaternion()
      .setFromUnitVectors(Y_AXIS, antherDirection)
    return {
      points: [start, firstControl, secondControl, end],
      antherPosition: antherPosition.toArray() as Vector3Tuple,
      antherDirection: antherDirection.toArray() as Vector3Tuple,
      antherQuaternion: antherQuaternion.toArray(),
    }
  })
  const stigmaPosition: Vector3Tuple = [
    0,
    0.19 * scale,
    0.76 * scale,
  ]

  return {
    filaments,
    pistilPoints: [
      [0, 0, 0.022],
      [-0.006 * scale, 0.025 * scale, 0.22 * scale],
      [0.006 * scale, 0.1 * scale, 0.5 * scale],
      stigmaPosition,
    ],
    stigmaPosition,
  }
}

export function LilyReproductiveSystem({
  length,
  antherSize,
  filamentColor,
  antherColor,
  stigmaColor,
  stemRadialSegments,
  detailShadows,
}: {
  length: number
  antherSize: number
  filamentColor: string
  antherColor: string
  stigmaColor: string
  stemRadialSegments: number
  detailShadows: boolean
}) {
  const layout = useMemo(() => createLilyReproductiveLayout(length), [length])

  return (
    <group name="flower.lily.reproductive-system">
      {layout.filaments.map((filament, index) => (
        <group key={index} name={`flower.lily.stamen.${index + 1}`}>
          <CurvedStem
            name={`flower.lily.stamen.${index + 1}.filament`}
            points={filament.points}
            radius={0.0072}
            color={filamentColor}
            tubularSegments={20}
            radialSegments={Math.max(6, stemRadialSegments - 2)}
          />
          <mesh
            name={`flower.lily.stamen.${index + 1}.anther`}
            position={filament.antherPosition}
            quaternion={filament.antherQuaternion}
            scale={[
              antherSize * 0.24,
              antherSize * 0.56,
              antherSize * 0.21,
            ]}
            castShadow={detailShadows}
          >
            <capsuleGeometry args={[1, 1.8, 6, 10]} />
            <meshPhysicalMaterial
              color={antherColor}
              roughness={0.72}
              clearcoat={0.04}
              clearcoatRoughness={0.88}
            />
          </mesh>
        </group>
      ))}
      <CurvedStem
        name="flower.lily.pistil.style"
        points={layout.pistilPoints}
        radius={0.009}
        color="#7FA45D"
        tubularSegments={22}
        radialSegments={stemRadialSegments}
      />
      <group name="flower.lily.pistil.stigma" position={layout.stigmaPosition}>
        {[-1, 0, 1].map((lobe) => (
          <mesh
            key={lobe}
            position={[lobe * 0.019, Math.abs(lobe) * -0.004, 0]}
            rotation={[0.1, 0, lobe * -0.42]}
            scale={[0.023, 0.013, 0.032]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={stigmaColor} roughness={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
