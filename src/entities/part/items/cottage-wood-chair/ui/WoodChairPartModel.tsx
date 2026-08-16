import type { Material } from 'three'
import {
  WOOD_CHAIR_LOCAL_FRAME,
  WOOD_CHAIR_MATERIAL_SLOTS,
  WOOD_CHAIR_SOCKETS,
  resolveWoodChairDimensions,
  type WoodChairDimensions,
} from '../model/woodChair'

export interface WoodChairMaterials {
  readonly wood: Material
  readonly cushion: Material
  readonly piping: Material
}

export interface WoodChairPartModelProps {
  readonly id: string
  readonly dimensions?: Partial<WoodChairDimensions>
  readonly materials: WoodChairMaterials
  readonly hasCushion?: boolean
  readonly quality?: 'desktop' | 'mobile'
}

export function WoodChairPartModel({
  id,
  dimensions,
  materials,
  hasCushion = true,
  quality = 'desktop',
}: WoodChairPartModelProps) {
  const { width, depth, height, seatHeight } = resolveWoodChairDimensions(dimensions)
  const postRadius = Math.min(width, depth) * 0.055
  const radialSegments = quality === 'desktop' ? 8 : 4
  const frameHeight = Math.min(0.075, seatHeight * 0.16)
  const frontZ = depth * 0.34
  const rearZ = -depth * 0.35
  const legHeight = seatHeight - frameHeight * 0.2
  const backPostHeight = height
  const cushionHeight = Math.min(0.055, height * 0.07)
  const seatTop = seatHeight - cushionHeight
  const backAngle = -0.045
  const backPostCenterY =
    Math.cos(Math.abs(backAngle)) * backPostHeight / 2 +
    Math.sin(Math.abs(backAngle)) * postRadius

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partId: 'cottage-wood-chair',
        localFrame: WOOD_CHAIR_LOCAL_FRAME,
        size: { width, depth, height },
        materialSlots: WOOD_CHAIR_MATERIAL_SLOTS,
        collider: {
          type: 'box',
          size: [width, height, depth],
          center: [0, height / 2, 0],
        },
      }}
    >
      {[-1, 1].map((side) => (
        <mesh
          key={`front-${side}`}
          name={`${id}:leg.front-${side < 0 ? 'left' : 'right'}`}
          material={materials.wood}
          position={[side * width * 0.39, legHeight / 2, frontZ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              postRadius * 0.74,
              postRadius,
              legHeight,
              radialSegments,
            ]}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`rear-${side}`}
          name={`${id}:post.rear-${side < 0 ? 'left' : 'right'}`}
          material={materials.wood}
          position={[side * width * 0.39, backPostCenterY, rearZ]}
          rotation={[backAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              postRadius * 0.8,
              postRadius,
              backPostHeight,
              radialSegments,
            ]}
          />
        </mesh>
      ))}

      <mesh
        name={`${id}:seat-frame`}
        material={materials.wood}
        position={[0, seatTop - frameHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.9, frameHeight, depth * 0.78]} />
      </mesh>
      <mesh
        name={`${id}:front-rail`}
        material={materials.wood}
        position={[0, seatTop * 0.62, frontZ]}
        castShadow
      >
        <boxGeometry args={[width * 0.75, frameHeight * 0.55, postRadius]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`side-rail-${side}`}
          name={`${id}:side-rail.${side < 0 ? 'left' : 'right'}`}
          material={materials.wood}
          position={[side * width * 0.39, seatTop * 0.62, 0]}
          castShadow
        >
          <boxGeometry args={[postRadius, frameHeight * 0.55, depth * 0.68]} />
        </mesh>
      ))}

      {hasCushion ? (
        <group
          name={`${id}:cushion`}
          position={[0, seatTop + cushionHeight / 2, depth * 0.015]}
        >
          <mesh material={materials.piping} castShadow>
            <boxGeometry
              args={[width * 0.86, cushionHeight * 0.76, depth * 0.73]}
            />
          </mesh>
          <mesh
            material={materials.cushion}
            position={[0, cushionHeight * 0.06, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[width * 0.83, cushionHeight, depth * 0.7]}
            />
          </mesh>
        </group>
      ) : (
        <mesh
          name={`${id}:wood-seat`}
          material={materials.wood}
          position={[0, seatHeight - frameHeight * 0.28, depth * 0.015]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.84, frameHeight * 0.55, depth * 0.7]} />
        </mesh>
      )}
      <object3D
        name={WOOD_CHAIR_SOCKETS.seatCenter}
        position={[0, seatHeight, 0]}
        userData={{ socketId: WOOD_CHAIR_SOCKETS.seatCenter, normal: '+Y' }}
      />

      {[0.63, 0.76, 0.9].map((heightRatio, index) => (
        <mesh
          key={heightRatio}
          name={`${id}:back-slat.${index + 1}`}
          material={materials.wood}
          position={[0, height * heightRatio, rearZ - depth * 0.02]}
          rotation={[backAngle, 0, 0]}
          castShadow
        >
          <boxGeometry
            args={[
              width * 0.75,
              index === 2 ? height * 0.075 : height * 0.045,
              postRadius * 0.62,
            ]}
          />
        </mesh>
      ))}
    </group>
  )
}
