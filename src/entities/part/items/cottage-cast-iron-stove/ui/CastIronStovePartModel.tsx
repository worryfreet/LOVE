import type { ReactNode } from 'react'
import type { Material } from 'three'
import {
  CAST_IRON_STOVE_LOCAL_FRAME,
  CAST_IRON_STOVE_MATERIAL_SLOTS,
  CAST_IRON_STOVE_SOCKETS,
  resolveCastIronStoveDimensions,
  type CastIronStoveDimensions,
} from '../model/castIronStove'

export interface CastIronStoveMaterials {
  readonly castIron: Material
  readonly glass: Material
  readonly hardware: Material
  readonly fire: Material
}

export interface CastIronStovePartModelProps {
  readonly id: string
  readonly dimensions?: Partial<CastIronStoveDimensions>
  readonly materials: CastIronStoveMaterials
  readonly fireLit?: boolean
  readonly quality?: 'desktop' | 'mobile'
  readonly flueAccessory?: ReactNode
}

const FOOT_IDS = ['front-left', 'front-right', 'rear-left', 'rear-right'] as const

export function CastIronStovePartModel({
  id,
  dimensions,
  materials,
  fireLit = false,
  quality = 'desktop',
  flueAccessory,
}: CastIronStovePartModelProps) {
  const { width, depth, height } = resolveCastIronStoveDimensions(dimensions)
  const radialSegments = quality === 'desktop' ? 32 : 20
  const footHeight = height * 0.13
  const collarHeight = height * 0.115
  const topY = height - collarHeight
  const bodyBottom = footHeight * 0.82
  const bodyHeight = topY - bodyBottom
  const frontZ = depth / 2
  const doorWidth = width * 0.72
  const doorHeight = bodyHeight * 0.62
  const doorY = bodyBottom + bodyHeight * 0.53
  const collarRadius = Math.min(width, depth) * 0.145
  const footWidth = width * 0.105
  const footTilt = 0.07
  const footCenterY =
    Math.cos(footTilt) * footHeight / 2 +
    Math.sin(footTilt) * footWidth / 2

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partId: 'cottage-cast-iron-stove',
        localFrame: CAST_IRON_STOVE_LOCAL_FRAME,
        size: { width, depth, height },
        materialSlots: CAST_IRON_STOVE_MATERIAL_SLOTS,
        collider: {
          type: 'box',
          size: [width, height, depth],
          center: [0, height / 2, 0],
        },
      }}
    >
      {FOOT_IDS.map((footId, index) => {
        const sideX = index % 2 === 0 ? -1 : 1
        const sideZ = index < 2 ? 1 : -1
        return (
          <mesh
            key={footId}
            name={`${id}:foot.${footId}`}
            material={materials.castIron}
            position={[
              sideX * width * 0.38,
              footCenterY,
              sideZ * depth * 0.34,
            ]}
            rotation={[0, 0, sideX * -footTilt]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[footWidth, footHeight, depth * 0.15]} />
          </mesh>
        )
      })}

      <mesh
        name={`${id}:body`}
        material={materials.castIron}
        position={[0, bodyBottom + bodyHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.92, bodyHeight, depth * 0.9]} />
      </mesh>
      <mesh
        name={`${id}:top-plate`}
        material={materials.castIron}
        position={[0, topY, 0]}
        castShadow
      >
        <boxGeometry args={[width, height * 0.045, depth]} />
      </mesh>
      <mesh
        name={`${id}:bottom-plinth`}
        material={materials.castIron}
        position={[0, bodyBottom, 0]}
        castShadow
      >
        <boxGeometry args={[width, height * 0.04, depth]} />
      </mesh>

      <mesh
        name={`${id}:flue-collar`}
        material={materials.castIron}
        position={[0, topY + collarHeight / 2, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[collarRadius, collarRadius, collarHeight, radialSegments]}
        />
      </mesh>
      <group
        name={CAST_IRON_STOVE_SOCKETS.flue}
        position={[0, height, 0]}
        userData={{ socketId: CAST_IRON_STOVE_SOCKETS.flue, axis: '+Y' }}
      >
        {flueAccessory}
      </group>

      <mesh
        name={`${id}:door-frame`}
        material={materials.castIron}
        position={[0, doorY, frontZ + depth * 0.008]}
        castShadow
      >
        <boxGeometry args={[doorWidth, doorHeight, depth * 0.055]} />
      </mesh>
      <mesh
        name={`${id}:door-glass`}
        material={materials.glass}
        position={[0, doorY + doorHeight * 0.04, frontZ + depth * 0.04]}
      >
        <boxGeometry args={[doorWidth * 0.78, doorHeight * 0.62, depth * 0.018]} />
      </mesh>
      <mesh
        name={`${id}:air-control`}
        material={materials.hardware}
        position={[0, doorY - doorHeight * 0.38, frontZ + depth * 0.052]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[width * 0.025, width * 0.025, depth * 0.05, 16]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          name={`${id}:vent.${side < 0 ? 'left' : 'right'}`}
          material={materials.glass}
          position={[
            side * width * 0.12,
            doorY - doorHeight * 0.38,
            frontZ + depth * 0.055,
          ]}
        >
          <boxGeometry args={[width * 0.13, height * 0.018, depth * 0.012]} />
        </mesh>
      ))}

      <group
        name={`${id}:door-handle`}
        position={[-doorWidth * 0.57, doorY, frontZ + depth * 0.09]}
      >
        <mesh material={materials.hardware} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[width * 0.014, width * 0.014, depth * 0.16, 12]} />
        </mesh>
        <mesh
          material={materials.hardware}
          position={[0, -doorHeight * 0.16, depth * 0.04]}
        >
          <cylinderGeometry
            args={[width * 0.018, width * 0.018, doorHeight * 0.34, 12]}
          />
        </mesh>
        <object3D
          name={CAST_IRON_STOVE_SOCKETS.doorHandle}
          position={[0, -doorHeight * 0.16, depth * 0.04]}
          userData={{ socketId: CAST_IRON_STOVE_SOCKETS.doorHandle }}
        />
      </group>

      {fireLit && (
        <group
          name={`${id}:fire`}
          position={[0, doorY - doorHeight * 0.04, frontZ + depth * 0.018]}
          userData={{ state: 'lit', castsLight: false }}
        >
          <mesh material={materials.fire} position={[0, -doorHeight * 0.2, 0]}>
            <boxGeometry args={[doorWidth * 0.58, doorHeight * 0.08, depth * 0.025]} />
          </mesh>
          {[-1, 0, 1].map((offset, index) => (
            <mesh
              key={offset}
              name={`${id}:flame.${index + 1}`}
              material={materials.fire}
              position={[offset * doorWidth * 0.17, 0, depth * 0.01]}
              scale={[doorWidth * 0.13, doorHeight * (0.22 + index * 0.04), 0.03]}
            >
              <sphereGeometry args={[0.5, 12, 10]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
