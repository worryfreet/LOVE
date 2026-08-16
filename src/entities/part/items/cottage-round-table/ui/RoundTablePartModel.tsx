import type { Material } from 'three'
import {
  ROUND_TABLE_LOCAL_FRAME,
  ROUND_TABLE_MATERIAL_SLOTS,
  ROUND_TABLE_SOCKETS,
  resolveRoundTableDimensions,
  type RoundTableDimensions,
} from '../model/roundTable'

export interface RoundTableMaterials {
  readonly wood: Material
  readonly edge: Material
}

export interface RoundTablePartModelProps {
  readonly id: string
  readonly dimensions?: Partial<RoundTableDimensions>
  readonly materials: RoundTableMaterials
  readonly quality?: 'desktop' | 'mobile'
}

const LEG_ANGLES = [
  { id: 'east', angle: 0 },
  { id: 'north', angle: Math.PI / 2 },
  { id: 'west', angle: Math.PI },
  { id: 'south', angle: Math.PI * 1.5 },
] as const

export function RoundTablePartModel({
  id,
  dimensions,
  materials,
  quality = 'desktop',
}: RoundTablePartModelProps) {
  const { diameter, height, topThickness } = resolveRoundTableDimensions(dimensions)
  const radialSegments = quality === 'desktop' ? 64 : 36
  const radius = diameter / 2
  const legHeight = height - topThickness * 1.25
  const legWidth = Math.min(0.105, diameter * 0.1)
  const legDepth = legWidth * 0.78
  const legRadius = radius * 0.46
  const splay = 0.1
  const legCenterY =
    Math.cos(splay) * legHeight / 2 + Math.sin(splay) * legWidth / 2
  const apronY = height - topThickness - legWidth * 0.55

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partId: 'cottage-round-table',
        localFrame: ROUND_TABLE_LOCAL_FRAME,
        size: { width: diameter, depth: diameter, height },
        materialSlots: ROUND_TABLE_MATERIAL_SLOTS,
        collider: {
          type: 'cylinder',
          radius,
          height,
          axis: '+Y',
        },
      }}
    >
      <mesh
        name={`${id}:tabletop`}
        material={materials.wood}
        position={[0, height - topThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[radius, radius, topThickness, radialSegments]}
        />
      </mesh>
      <mesh
        name={`${id}:edge-band`}
        material={materials.edge}
        position={[0, height - topThickness / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry
          args={[
            radius - topThickness * 0.18,
            topThickness * 0.18,
            quality === 'desktop' ? 10 : 6,
            radialSegments,
          ]}
        />
      </mesh>
      <object3D
        name={ROUND_TABLE_SOCKETS.tabletopCenter}
        position={[0, height, 0]}
        userData={{
          socketId: ROUND_TABLE_SOCKETS.tabletopCenter,
          plane: 'XZ',
          normal: '+Y',
        }}
      />

      <mesh
        name={`${id}:underframe-hub`}
        material={materials.wood}
        position={[0, apronY, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[diameter * 0.15, diameter * 0.18, legWidth, 8]}
        />
      </mesh>

      {LEG_ANGLES.map(({ id: legId, angle }) => (
        <group key={legId} name={`${id}:leg.${legId}`} rotation={[0, -angle, 0]}>
          <mesh
            material={materials.wood}
            position={[legRadius, legCenterY, 0]}
            rotation={[0, 0, splay]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[legWidth, legHeight, legDepth]} />
          </mesh>
          <mesh
            name={`${id}:brace.${legId}`}
            material={materials.edge}
            position={[legRadius * 0.48, apronY, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <boxGeometry args={[legWidth * 0.7, legRadius, legDepth * 0.75]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
