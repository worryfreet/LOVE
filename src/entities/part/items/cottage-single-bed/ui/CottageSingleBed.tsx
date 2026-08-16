import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import {
  createCottageSingleBedTextures,
  disposeCottageSingleBedTextures,
} from '../lib/singleBedTextures'
import {
  DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE,
  DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS,
  resolveCottageSingleBedDimensions,
  type CottageSingleBedDimensions,
} from '../model/singleBed'

export interface CottageSingleBedMaterials {
  readonly wood: Material
  readonly woodInset: Material
  readonly bedding: Material
  readonly beddingEdge: Material
  readonly throw: Material
  readonly pillowCream: Material
  readonly pillowAccent: Material
}

export interface CottageSingleBedGeometryProps
  extends CottageSingleBedDimensions {
  readonly id: string
  readonly materials: CottageSingleBedMaterials
  readonly quality: 'desktop' | 'mobile'
}

export interface CottageSingleBedProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

interface SoftBoxProps {
  readonly name: string
  readonly position: [number, number, number]
  readonly args: [number, number, number]
  readonly material: Material
  readonly radius: number
  readonly rotation?: [number, number, number]
}

function SoftBox({
  name,
  position,
  args,
  material,
  radius,
  rotation,
}: SoftBoxProps) {
  return (
    <RoundedBox
      name={name}
      args={args}
      position={position}
      rotation={rotation}
      radius={Math.min(radius, ...args.map((value) => value / 2.1))}
      smoothness={3}
      material={material}
      castShadow
      receiveShadow
    />
  )
}

/**
 * 花海小院木床零件，可覆盖单人床到紧凑双人床尺寸。
 * 局部原点在地面中心，床头位于 -Z，床尾与正面位于 +Z。
 */
export function CottageSingleBedGeometry({
  id,
  materials,
  quality,
  width,
  length,
  bedHeight,
}: CottageSingleBedGeometryProps) {
  const dimensions = resolveCottageSingleBedDimensions({
    width,
    length,
    bedHeight,
  })
  const {
    frameTop,
    headboardHeight,
    innerLength,
    innerWidth,
    mattressThickness,
    postSize,
    railThickness,
  } = dimensions
  const postX = width / 2 - postSize / 2
  const headZ = -length / 2 + postSize / 2
  const footZ = length / 2 - postSize / 2
  const railY = frameTop - railThickness / 2
  const headPanelBottom = frameTop + 0.04
  const slatCount = quality === 'mobile' ? 4 : 6
  const archSegments = quality === 'mobile' ? 7 : 10
  const archEndpointY = headboardHeight - postSize * 1.38
  const archRise = postSize * 0.72
  const archYAt = (x: number) =>
    archEndpointY +
    archRise * (1 - Math.pow(x / Math.max(innerWidth / 2, 0.001), 2))
  const mattressY = frameTop + mattressThickness / 2
  const duvetTop = bedHeight + 0.038
  const pillowZ = headZ + Math.min(0.34, length * 0.18)
  const pillowWidth = innerWidth * 0.45
  const throwDepth = Math.min(0.46, innerLength * 0.28)
  const throwZ = footZ - throwDepth * 0.58

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partFamily: 'cottage-single-bed',
        localFrame: { origin: 'floor-center', up: '+Y', forward: '+Z' },
        dimensions: { width, length, bedHeight, headboardHeight },
        materialSlots: Object.keys(materials),
        collider: {
          type: 'box',
          size: [width, headboardHeight, length],
          center: [0, headboardHeight / 2, 0],
        },
      }}
    >
      <group name={`${id}:frame`} userData={{ semanticPart: 'bed-frame' }}>
        {[-1, 1].flatMap((xSide) =>
          [-1, 1].map((zSide) => {
            const isHead = zSide < 0
            const postHeight = isHead
              ? headboardHeight
              : frameTop + postSize * 0.72
            const capRadius = postSize * 0.47
            const shaftHeight = postHeight - capRadius
            return (
              <group
                key={`${xSide}:${zSide}`}
                name={`${id}:post:${xSide}:${zSide}`}
                position={[
                  xSide * postX,
                  shaftHeight / 2,
                  zSide < 0 ? headZ : footZ,
                ]}
              >
                <RoundedBox
                  args={[postSize, shaftHeight, postSize]}
                  radius={postSize * 0.2}
                  smoothness={2}
                  material={materials.wood}
                  castShadow
                  receiveShadow
                />
                <mesh
                  name={`${id}:post-cap:${xSide}:${zSide}`}
                  position={[0, shaftHeight / 2, 0]}
                  material={materials.wood}
                  castShadow
                >
                  <sphereGeometry
                    args={[
                      capRadius,
                      quality === 'mobile' ? 10 : 18,
                      quality === 'mobile' ? 7 : 12,
                      0,
                      Math.PI * 2,
                      0,
                      Math.PI / 2,
                    ]}
                  />
                </mesh>
              </group>
            )
          }),
        )}

        {[-1, 1].map((xSide) => (
          <RoundedBox
            key={xSide}
            name={`${id}:side-rail:${xSide}`}
            args={[postSize * 0.7, railThickness, innerLength]}
            position={[xSide * postX, railY, 0]}
            radius={postSize * 0.1}
            smoothness={2}
            material={materials.wood}
            castShadow
            receiveShadow
          />
        ))}
        <RoundedBox
          name={`${id}:foot-rail`}
          args={[innerWidth, railThickness, postSize * 0.72]}
          position={[0, railY, footZ]}
          radius={postSize * 0.1}
          smoothness={2}
          material={materials.wood}
          castShadow
          receiveShadow
        />
        <RoundedBox
          name={`${id}:head-lower-rail`}
          args={[innerWidth, railThickness, postSize * 0.72]}
          position={[0, railY, headZ]}
          radius={postSize * 0.1}
          smoothness={2}
          material={materials.wood}
          castShadow
          receiveShadow
        />
        {Array.from({ length: archSegments }, (_, index) => {
          const xStart = -innerWidth / 2 + (innerWidth * index) / archSegments
          const xEnd =
            -innerWidth / 2 + (innerWidth * (index + 1)) / archSegments
          const yStart = archYAt(xStart)
          const yEnd = archYAt(xEnd)
          const segmentLength = Math.hypot(xEnd - xStart, yEnd - yStart)
          return (
            <RoundedBox
              key={index}
              name={`${id}:headboard-arch:${index + 1}`}
              args={[segmentLength + 0.006, postSize * 0.62, postSize * 0.76]}
              position={[
                (xStart + xEnd) / 2,
                (yStart + yEnd) / 2,
                headZ,
              ]}
              rotation={[0, 0, Math.atan2(yEnd - yStart, xEnd - xStart)]}
              radius={postSize * 0.18}
              smoothness={3}
              material={materials.wood}
              castShadow
            />
          )
        })}
        {Array.from({ length: slatCount }, (_, index) => {
          const spacing = innerWidth / slatCount
          const x = -innerWidth / 2 + spacing * (index + 0.5)
          const slatTop = archYAt(x) - postSize * 0.37
          const headPanelHeight = slatTop - headPanelBottom
          return (
            <RoundedBox
              key={index}
              name={`${id}:headboard-slat:${index + 1}`}
              args={[spacing * 0.78, headPanelHeight, postSize * 0.3]}
              position={[x, headPanelBottom + headPanelHeight / 2, headZ]}
              radius={postSize * 0.08}
              smoothness={2}
              material={materials.woodInset}
              castShadow
            />
          )
        })}
      </group>

      <group name={`${id}:bedding`} userData={{ semanticPart: 'bedding' }}>
        <SoftBox
          name={`${id}:mattress`}
          position={[0, mattressY, 0]}
          args={[innerWidth, mattressThickness, innerLength]}
          radius={0.055}
          material={materials.beddingEdge}
        />
        <SoftBox
          name={`${id}:duvet`}
          position={[0, duvetTop, 0.04]}
          args={[innerWidth * 0.97, 0.065, innerLength * 0.9]}
          radius={0.03}
          material={materials.bedding}
        />
        {[-1, 1].map((side, index) => (
          <SoftBox
            key={side}
            name={`${id}:pillow:${index + 1}`}
            position={[
              side * pillowWidth * 0.49,
              bedHeight + 0.13,
              pillowZ,
            ]}
            rotation={[-0.2, side * 0.06, side * 0.04]}
            args={[pillowWidth, 0.15, 0.38]}
            radius={0.055}
            material={
              index === 0 ? materials.pillowCream : materials.pillowAccent
            }
          />
        ))}
        <SoftBox
          name={`${id}:throw-top`}
          position={[0, duvetTop + 0.045, throwZ]}
          args={[innerWidth * 0.99, 0.045, throwDepth]}
          radius={0.022}
          material={materials.throw}
        />
        {[-1, 1].map((side) => (
          <SoftBox
            key={side}
            name={`${id}:throw-drape:${side}`}
            position={[
              side * (innerWidth / 2 + 0.006),
              bedHeight - 0.07,
              throwZ,
            ]}
            args={[0.045, 0.22, throwDepth * 0.94]}
            radius={0.017}
            material={materials.throw}
          />
        ))}
      </group>

      <group name={`${id}:socket.floor`} />
      <group
        name={`${id}:socket.head-center`}
        position={[0, bedHeight, -length / 2]}
        rotation={[0, Math.PI, 0]}
      />
      <group
        name={`${id}:socket.bedding-top`}
        position={[0, duvetTop + 0.04, 0]}
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
export function CottageSingleBed({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-single-bed',
}: CottageSingleBedProps) {
  const width = meterParameter(
    parameters.width,
    DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS.width,
  )
  const length = meterParameter(
    parameters.length,
    DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS.length,
  )
  const bedHeight = meterParameter(
    parameters.bedHeight,
    DEFAULT_COTTAGE_SINGLE_BED_DIMENSIONS.bedHeight,
  )
  const woodColor = String(
    parameters.woodColor ?? DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE.woodColor,
  )
  const beddingColor = String(
    parameters.beddingColor ??
      DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE.beddingColor,
  )
  const throwColor = String(
    parameters.throwColor ?? DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE.throwColor,
  )
  const accentPillowColor = String(
    parameters.accentPillowColor ??
      DEFAULT_COTTAGE_SINGLE_BED_APPEARANCE.accentPillowColor,
  )
  const textures = useMemo(() => createCottageSingleBedTextures(), [])
  const materials = useMemo<CottageSingleBedMaterials>(
    () => ({
      wood: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.012,
        roughness: 0.54,
        metalness: 0.02,
      }),
      woodInset: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.008,
        roughness: 0.7,
        metalness: 0.01,
      }),
      bedding: new MeshStandardMaterial({
        color: beddingColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.009,
        roughness: 0.95,
      }),
      beddingEdge: new MeshStandardMaterial({
        color: '#e8dcc7',
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.008,
        roughness: 0.9,
      }),
      throw: new MeshStandardMaterial({
        color: throwColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.012,
        roughness: 0.97,
      }),
      pillowCream: new MeshStandardMaterial({
        color: '#f5ead8',
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.01,
        roughness: 0.96,
      }),
      pillowAccent: new MeshStandardMaterial({
        color: accentPillowColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.01,
        roughness: 0.96,
      }),
    }),
    [accentPillowColor, beddingColor, textures, throwColor, woodColor],
  )

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose())
    },
    [materials],
  )
  useEffect(
    () => () => disposeCottageSingleBedTextures(textures),
    [textures],
  )

  return (
    <CottageSingleBedGeometry
      id={id}
      materials={materials}
      quality={quality}
      width={width}
      length={length}
      bedHeight={bedHeight}
    />
  )
}
