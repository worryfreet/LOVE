import { useEffect, useMemo } from 'react'
import type { Material } from 'three'
import {
  CANDLE_LOCAL_FRAME,
  CANDLE_MATERIAL_SLOTS,
  createCandleBodyGeometry,
  resolveCandleDimensions,
  type CandleDimensions,
  type CandleQuality,
} from '../model/candle'

export interface CandleMaterials {
  readonly wax: Material
  readonly wick: Material
  readonly flameCore: Material
  readonly flameGlow: Material
}

export interface CandlePartModelProps {
  readonly id: string
  readonly dimensions?: Partial<CandleDimensions>
  readonly materials: CandleMaterials
  readonly lit?: boolean
  readonly quality?: CandleQuality
}

export function CandlePartModel({
  id,
  dimensions,
  materials,
  lit = true,
  quality = 'desktop',
}: CandlePartModelProps) {
  const resolved = resolveCandleDimensions(dimensions)
  const { diameter, height } = resolved
  const bodyGeometry = useMemo(
    () => createCandleBodyGeometry({ diameter, height }, quality),
    [diameter, height, quality],
  )

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])

  const flameHeight = Math.max(diameter * 0.62, height * 0.13)
  const wickHeight = Math.max(0.012, diameter * 0.18)

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partId: 'cottage-candle',
        localFrame: CANDLE_LOCAL_FRAME,
        size: { width: diameter, depth: diameter, height },
        materialSlots: CANDLE_MATERIAL_SLOTS,
        collider: {
          type: 'cylinder',
          radius: diameter / 2,
          height,
          axis: '+Y',
        },
        lightingPolicy: '仅使用自发光材质，不创建逐支点光源',
      }}
    >
      <mesh
        name={`${id}:wax-body`}
        geometry={bodyGeometry}
        material={materials.wax}
        dispose={null}
        castShadow
        receiveShadow
      />
      <mesh
        name={`${id}:wax-drip`}
        material={materials.wax}
        position={[diameter * 0.46, height * 0.72, 0]}
        scale={[diameter * 0.12, height * 0.15, diameter * 0.1]}
        castShadow
      >
        <sphereGeometry args={[0.5, quality === 'desktop' ? 16 : 10, 12]} />
      </mesh>
      <mesh
        name={`${id}:wick`}
        material={materials.wick}
        position={[0, height + wickHeight / 2 - diameter * 0.025, 0]}
      >
        <cylinderGeometry
          args={[diameter * 0.025, diameter * 0.02, wickHeight, 8]}
        />
      </mesh>

      {lit && (
        <group
          name={`${id}:flame`}
          position={[0, height + wickHeight + flameHeight * 0.42, 0]}
          userData={{ state: 'lit', castsLight: false }}
        >
          <mesh
            name={`${id}:flame-glow`}
            material={materials.flameGlow}
            scale={[diameter * 0.18, flameHeight, diameter * 0.15]}
          >
            <sphereGeometry args={[0.5, quality === 'desktop' ? 16 : 10, 12]} />
          </mesh>
          <mesh
            name={`${id}:flame-core`}
            material={materials.flameCore}
            position={[0, -flameHeight * 0.13, diameter * 0.01]}
            scale={[diameter * 0.075, flameHeight * 0.58, diameter * 0.065]}
          >
            <sphereGeometry args={[0.5, quality === 'desktop' ? 14 : 8, 10]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
