import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import {
  createCottageLoveseatSofaTextures,
  disposeCottageLoveseatSofaTextures,
} from '../lib/loveseatSofaTextures'
import {
  DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE,
  DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS,
  resolveCottageLoveseatSofaDimensions,
  type CottageLoveseatSofaDimensions,
} from '../model/loveseatSofa'

export interface CottageLoveseatSofaMaterials {
  readonly fabric: Material
  readonly piping: Material
  readonly wood: Material
  readonly pillowAccent: Material
  readonly pillowSecondary: Material
  readonly tuft: Material
}

export interface CottageLoveseatSofaGeometryProps
  extends CottageLoveseatSofaDimensions {
  readonly id: string
  readonly materials: CottageLoveseatSofaMaterials
  readonly quality: 'desktop' | 'mobile'
}

export interface CottageLoveseatSofaProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

interface RoundedPartProps {
  readonly name: string
  readonly args: [number, number, number]
  readonly position: [number, number, number]
  readonly material: Material
  readonly radius: number
  readonly rotation?: [number, number, number]
}

function RoundedPart({
  name,
  args,
  position,
  material,
  radius,
  rotation,
}: RoundedPartProps) {
  return (
    <RoundedBox
      name={name}
      args={args}
      position={position}
      rotation={rotation}
      radius={Math.min(radius, ...args.map((value) => value / 2.08))}
      smoothness={3}
      material={material}
      castShadow
      receiveShadow
    />
  )
}

/**
 * 花海小院双人沙发零件。
 * 局部原点在地面中心，+Y 向上，座位面向局部 +Z。
 */
export function CottageLoveseatSofaGeometry({
  id,
  materials,
  quality,
  width,
  depth,
  height,
}: CottageLoveseatSofaGeometryProps) {
  const dimensions = resolveCottageLoveseatSofaDimensions({
    width,
    depth,
    height,
  })
  const {
    armWidth,
    backThickness,
    baseHeight,
    innerWidth,
    legHeight,
    seatHeight,
    seatTop,
  } = dimensions
  const backBottom = legHeight + baseHeight * 0.48
  const backHeight = height - backBottom
  const backZ = -depth / 2 + backThickness / 2
  const seatDepth = depth - backThickness * 1.4 - 0.08
  const seatZ = depth / 2 - seatDepth / 2 - 0.05
  const cushionGap = Math.min(0.018, width * 0.009)
  const cushionWidth = (innerWidth - cushionGap) / 2
  const armCenterX = width / 2 - armWidth / 2
  const armHeight = seatTop + 0.13
  const cushionBackHeight = height - seatTop - 0.025
  const cushionBackWidth = cushionWidth - 0.015
  const cushionBackZ = backZ + backThickness * 0.55
  const footRadius = Math.min(0.065, armWidth * 0.34)
  const pillowSize = Math.min(0.32, innerWidth * 0.23)
  const backButtonSegments = quality === 'mobile' ? 10 : 16

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partFamily: 'cottage-loveseat-sofa',
        localFrame: { origin: 'floor-center', up: '+Y', forward: '+Z' },
        dimensions: { width, depth, height },
        materialSlots: Object.keys(materials),
        collider: {
          type: 'box',
          size: [width, height, depth],
          center: [0, height / 2, 0],
        },
      }}
    >
      <group name={`${id}:carcass`} userData={{ semanticPart: 'upholstered-carcass' }}>
        {[-1, 1].flatMap((xSide) =>
          [-1, 1].map((zSide) => (
            <mesh
              key={`${xSide}:${zSide}`}
              name={`${id}:foot:${xSide}:${zSide}`}
              position={[
                xSide * (width / 2 - armWidth * 0.55),
                legHeight / 2,
                zSide * (depth / 2 - footRadius * 1.5),
              ]}
              material={materials.wood}
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[
                  footRadius * 0.82,
                  footRadius,
                  legHeight,
                  quality === 'mobile' ? 10 : 18,
                ]}
              />
            </mesh>
          )),
        )}
        <RoundedPart
          name={`${id}:base`}
          args={[width - armWidth * 0.55, baseHeight, depth * 0.77]}
          position={[0, legHeight + baseHeight / 2, depth * 0.025]}
          material={materials.fabric}
          radius={0.055}
        />
        <RoundedPart
          name={`${id}:back-shell`}
          args={[width - armWidth * 0.28, backHeight, backThickness]}
          position={[0, backBottom + backHeight / 2, backZ]}
          material={materials.fabric}
          radius={0.075}
        />
        {[-1, 1].map((side) => (
          <RoundedPart
            key={side}
            name={`${id}:arm:${side}`}
            args={[armWidth, armHeight - legHeight, depth * 0.9]}
            position={[
              side * armCenterX,
              legHeight + (armHeight - legHeight) / 2,
              depth * 0.02,
            ]}
            material={materials.fabric}
            radius={0.09}
          />
        ))}
      </group>

      <group name={`${id}:cushions`} userData={{ semanticPart: 'soft-cushions' }}>
        {[-1, 1].map((side, index) => {
          const x = side * (cushionWidth + cushionGap) / 2
          return (
            <group key={side} name={`${id}:seat-cushion:${index + 1}`}>
              <RoundedPart
                name={`${id}:seat-cushion-body:${index + 1}`}
                args={[cushionWidth, seatHeight, seatDepth]}
                position={[
                  x,
                  legHeight + baseHeight + seatHeight / 2,
                  seatZ,
                ]}
                material={materials.fabric}
                radius={0.065}
              />
              <RoundedPart
                name={`${id}:seat-piping:${index + 1}`}
                args={[cushionWidth * 0.92, 0.012, seatDepth * 0.94]}
                position={[x, seatTop + 0.004, seatZ]}
                material={materials.piping}
                radius={0.005}
              />
              <RoundedPart
                name={`${id}:back-cushion:${index + 1}`}
                args={[cushionBackWidth, cushionBackHeight, 0.16]}
                position={[
                  x,
                  seatTop + cushionBackHeight / 2 - 0.005,
                  cushionBackZ,
                ]}
                rotation={[-0.08, 0, 0]}
                material={materials.fabric}
                radius={0.07}
              />
              <mesh
                name={`${id}:back-tuft:${index + 1}`}
                position={[
                  x,
                  seatTop + cushionBackHeight / 2 - 0.005,
                  cushionBackZ + 0.088,
                ]}
                material={materials.tuft}
              >
                <sphereGeometry args={[0.012, backButtonSegments, 8]} />
              </mesh>
            </group>
          )
        })}
      </group>

      <group name={`${id}:pillows`} userData={{ semanticPart: 'accent-pillows' }}>
        {[-1, 1].map((side, index) => (
          <RoundedPart
            key={side}
            name={`${id}:accent-pillow:${index + 1}`}
            args={[pillowSize, pillowSize, 0.105]}
            position={[
              side * innerWidth * 0.29,
              Math.min(
                seatTop + pillowSize * 0.42,
                height - pillowSize * 0.54,
              ),
              cushionBackZ + 0.13,
            ]}
            rotation={[-0.11, side * 0.08, -side * 0.13]}
            material={
              index === 0
                ? materials.pillowAccent
                : materials.pillowSecondary
            }
            radius={0.055}
          />
        ))}
      </group>

      <group name={`${id}:socket.floor`} />
      <group
        name={`${id}:socket.seat-center`}
        position={[0, seatTop + 0.015, seatZ]}
      />
      <group
        name={`${id}:socket.back-center`}
        position={[0, height * 0.7, -depth / 2]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  )
}

function meterParameter(value: unknown, fallback: number) {
  const numeric = Number(value ?? fallback * 1000)
  if (!Number.isFinite(numeric)) return fallback
  return numeric > 10 ? numeric / 1000 : numeric
}

/** 资源自管理的公共零件入口，供零件库与小院场景直接复用。 */
export function CottageLoveseatSofa({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-loveseat-sofa',
}: CottageLoveseatSofaProps) {
  const width = meterParameter(
    parameters.width,
    DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS.width,
  )
  const depth = meterParameter(
    parameters.depth,
    DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS.depth,
  )
  const height = meterParameter(
    parameters.height,
    DEFAULT_COTTAGE_LOVESEAT_SOFA_DIMENSIONS.height,
  )
  const fabricColor = String(
    parameters.fabricColor ??
      DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE.fabricColor,
  )
  const pillowColor = String(
    parameters.pillowColor ??
      DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE.pillowColor,
  )
  const secondaryPillowColor = String(
    parameters.secondaryPillowColor ??
      DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE.secondaryPillowColor,
  )
  const woodColor = String(
    parameters.woodColor ??
      DEFAULT_COTTAGE_LOVESEAT_SOFA_APPEARANCE.woodColor,
  )
  const textures = useMemo(() => createCottageLoveseatSofaTextures(), [])
  const materials = useMemo<CottageLoveseatSofaMaterials>(
    () => ({
      fabric: new MeshStandardMaterial({
        color: fabricColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.011,
        roughness: 0.96,
        metalness: 0,
      }),
      piping: new MeshStandardMaterial({
        color: '#d8c5a9',
        map: textures.linen,
        roughness: 0.9,
      }),
      wood: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.008,
        roughness: 0.58,
      }),
      pillowAccent: new MeshStandardMaterial({
        color: pillowColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.012,
        roughness: 0.97,
      }),
      pillowSecondary: new MeshStandardMaterial({
        color: secondaryPillowColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.012,
        roughness: 0.97,
      }),
      tuft: new MeshStandardMaterial({
        color: '#c7b393',
        map: textures.linen,
        roughness: 0.88,
      }),
    }),
    [fabricColor, pillowColor, secondaryPillowColor, textures, woodColor],
  )

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose())
    },
    [materials],
  )
  useEffect(
    () => () => disposeCottageLoveseatSofaTextures(textures),
    [textures],
  )

  return (
    <CottageLoveseatSofaGeometry
      id={id}
      materials={materials}
      quality={quality}
      width={width}
      depth={depth}
      height={height}
    />
  )
}
