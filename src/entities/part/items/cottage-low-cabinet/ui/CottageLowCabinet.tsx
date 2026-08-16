import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import {
  createCottageLowCabinetTextures,
  disposeCottageLowCabinetTextures,
} from '../lib/lowCabinetTextures'
import {
  DEFAULT_COTTAGE_LOW_CABINET_APPEARANCE,
  DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS,
  isCottageLowCabinetVariant,
  resolveCottageLowCabinetDimensions,
  type CottageLowCabinetDimensions,
  type CottageLowCabinetVariant,
} from '../model/lowCabinet'

export interface CottageLowCabinetMaterials {
  readonly wood: Material
  readonly woodInset: Material
  readonly woodShadow: Material
  readonly hardware: Material
  readonly cushion: Material
  readonly piping: Material
}

export interface CottageLowCabinetGeometryProps
  extends CottageLowCabinetDimensions {
  readonly id: string
  readonly materials: CottageLowCabinetMaterials
  readonly quality: 'desktop' | 'mobile'
  readonly variant: CottageLowCabinetVariant
}

export interface CottageLowCabinetProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

interface FramedDoorProps {
  readonly id: string
  readonly centerX: number
  readonly centerY: number
  readonly width: number
  readonly height: number
  readonly z: number
  readonly frameWidth: number
  readonly panelDepth: number
  readonly handleSide: -1 | 1
  readonly materials: CottageLowCabinetMaterials
  readonly segments: number
}

function FramedDoor({
  id,
  centerX,
  centerY,
  width,
  height,
  z,
  frameWidth,
  panelDepth,
  handleSide,
  materials,
  segments,
}: FramedDoorProps) {
  const insetWidth = width - frameWidth * 2
  const insetHeight = height - frameWidth * 2
  const handleX = centerX + handleSide * (width / 2 - frameWidth * 0.72)

  return (
    <group name={id} userData={{ semanticPart: 'hinged-door' }}>
      <mesh
        name={`${id}:panel`}
        position={[centerX, centerY, z]}
        material={materials.woodInset}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[insetWidth, insetHeight, panelDepth]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`v:${side}`}
          name={`${id}:vertical-frame:${side}`}
          position={[
            centerX + side * (width / 2 - frameWidth / 2),
            centerY,
            z + panelDepth * 0.26,
          ]}
          material={materials.wood}
          castShadow
        >
          <boxGeometry args={[frameWidth, height, panelDepth * 1.2]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`h:${side}`}
          name={`${id}:horizontal-frame:${side}`}
          position={[
            centerX,
            centerY + side * (height / 2 - frameWidth / 2),
            z + panelDepth * 0.26,
          ]}
          material={materials.wood}
          castShadow
        >
          <boxGeometry
            args={[width - frameWidth * 2, frameWidth, panelDepth * 1.2]}
          />
        </mesh>
      ))}
      <mesh
        name={`${id}:ring-handle`}
        position={[handleX, centerY, z + panelDepth * 0.9]}
        material={materials.hardware}
        castShadow
      >
        <torusGeometry
          args={[frameWidth * 0.19, frameWidth * 0.045, 6, segments]}
        />
      </mesh>
      <mesh
        name={`${id}:handle-mount`}
        position={[
          handleX,
          centerY + frameWidth * 0.18,
          z + panelDepth * 0.67,
        ]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.hardware}
      >
        <cylinderGeometry
          args={[
            frameWidth * 0.095,
            frameWidth * 0.095,
            panelDepth * 0.65,
            segments,
          ]}
        />
      </mesh>
    </group>
  )
}

/**
 * 花海小院长矮柜／储物长凳零件。
 * 局部原点在地面中心，+Y 向上，门板与抽屉朝向 +Z。
 */
export function CottageLowCabinetGeometry({
  id,
  materials,
  quality,
  variant,
  width,
  depth,
  height,
}: CottageLowCabinetGeometryProps) {
  const dimensions = resolveCottageLowCabinetDimensions({
    width,
    depth,
    height,
  })
  const {
    cushionHeight,
    footHeight,
    frameWidth,
    frontBottom,
    frontHeight,
    panelThickness,
    topThickness,
  } = dimensions
  const segments = quality === 'mobile' ? 10 : 18
  const frontZ = depth / 2 + panelThickness * 0.18
  const frontCenterY = frontBottom + frontHeight / 2
  const usableWidth = width - frameWidth * 2.4
  const leftSectionWidth = usableWidth * 0.44
  const drawerSectionWidth = usableWidth * 0.3
  const rightSectionWidth = usableWidth - leftSectionWidth - drawerSectionWidth
  const leftStart = -usableWidth / 2
  const leftDoorGap = Math.min(0.012, width * 0.005)
  const leftDoorWidth = (leftSectionWidth - leftDoorGap) / 2
  const leftDoorCenters = [
    leftStart + leftDoorWidth / 2,
    leftStart + leftDoorWidth + leftDoorGap + leftDoorWidth / 2,
  ] as const
  const drawerCenterX = leftStart + leftSectionWidth + drawerSectionWidth / 2
  const rightCenterX =
    leftStart + leftSectionWidth + drawerSectionWidth + rightSectionWidth / 2
  const drawerGap = Math.min(0.012, frontHeight * 0.018)
  const drawerHeight = (frontHeight - drawerGap * 2) / 3
  const totalHeight =
    variant === 'cushioned-bench' ? height + cushionHeight : height
  const totalDepth = depth + panelThickness * 1.4

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partFamily: 'cottage-low-cabinet',
        variant,
        localFrame: { origin: 'floor-center', up: '+Y', forward: '+Z' },
        dimensions: { width, depth, height, totalDepth, totalHeight },
        materialSlots: Object.keys(materials),
        collider: {
          type: 'box',
          size: [width, totalHeight, totalDepth],
          center: [0, totalHeight / 2, panelThickness * 0.35],
        },
      }}
    >
      <group name={`${id}:carcass`} userData={{ semanticPart: 'cabinet-carcass' }}>
        {[-1, 1].flatMap((xSide) =>
          [-1, 1].map((zSide) => (
            <mesh
              key={`${xSide}:${zSide}`}
              name={`${id}:foot:${xSide}:${zSide}`}
              position={[
                xSide * (width / 2 - frameWidth * 1.2),
                footHeight / 2,
                zSide * (depth / 2 - frameWidth * 0.9),
              ]}
              material={materials.woodShadow}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[frameWidth * 1.25, footHeight, frameWidth * 1.2]}
              />
            </mesh>
          )),
        )}
        <RoundedBox
          name={`${id}:top`}
          args={[width, topThickness, depth]}
          position={[0, height - topThickness / 2, 0]}
          radius={topThickness * 0.14}
          smoothness={2}
          material={materials.wood}
          castShadow
          receiveShadow
        />
        <mesh
          name={`${id}:bottom-plinth`}
          position={[0, frontBottom - frameWidth * 0.38, 0]}
          material={materials.woodShadow}
          castShadow
        >
          <boxGeometry args={[width - frameWidth, frameWidth, depth * 0.96]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            name={`${id}:side-panel:${side}`}
            position={[
              side * (width / 2 - panelThickness / 2),
              frontCenterY,
              0,
            ]}
            material={materials.wood}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[panelThickness, frontHeight, depth]} />
          </mesh>
        ))}
        <mesh
          name={`${id}:back-panel`}
          position={[0, frontCenterY, -depth / 2 + panelThickness / 2]}
          material={materials.woodInset}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[width - panelThickness * 2, frontHeight, panelThickness]}
          />
        </mesh>
      </group>

      <group name={`${id}:front`} userData={{ semanticPart: 'storage-front' }}>
        <FramedDoor
          id={`${id}:door:left-1`}
          centerX={leftDoorCenters[0]}
          centerY={frontCenterY}
          width={leftDoorWidth}
          height={frontHeight}
          z={frontZ}
          frameWidth={frameWidth}
          panelDepth={panelThickness}
          handleSide={1}
          materials={materials}
          segments={segments}
        />
        <FramedDoor
          id={`${id}:door:left-2`}
          centerX={leftDoorCenters[1]}
          centerY={frontCenterY}
          width={leftDoorWidth}
          height={frontHeight}
          z={frontZ}
          frameWidth={frameWidth}
          panelDepth={panelThickness}
          handleSide={-1}
          materials={materials}
          segments={segments}
        />
        <FramedDoor
          id={`${id}:door:right`}
          centerX={rightCenterX}
          centerY={frontCenterY}
          width={rightSectionWidth}
          height={frontHeight}
          z={frontZ}
          frameWidth={frameWidth}
          panelDepth={panelThickness}
          handleSide={-1}
          materials={materials}
          segments={segments}
        />
        {Array.from({ length: 3 }, (_, index) => {
          const y =
            frontBottom +
            drawerHeight / 2 +
            index * (drawerHeight + drawerGap)
          return (
            <group
              key={index}
              name={`${id}:drawer:${index + 1}`}
              userData={{ semanticPart: 'drawer' }}
            >
              <mesh
                name={`${id}:drawer-face:${index + 1}`}
                position={[drawerCenterX, y, frontZ + panelThickness * 0.08]}
                material={materials.wood}
                castShadow
              >
                <boxGeometry
                  args={[
                    drawerSectionWidth - leftDoorGap,
                    drawerHeight,
                    panelThickness * 1.12,
                  ]}
                />
              </mesh>
              <mesh
                name={`${id}:drawer-handle:${index + 1}`}
                position={[
                  drawerCenterX,
                  y,
                  frontZ + panelThickness * 0.78,
                ]}
                material={materials.hardware}
                castShadow
              >
                <torusGeometry
                  args={[frameWidth * 0.2, frameWidth * 0.045, 6, segments]}
                />
              </mesh>
            </group>
          )
        })}
      </group>

      {variant === 'cushioned-bench' && (
        <group
          name={`${id}:bench-cushion`}
          userData={{ semanticPart: 'removable-seat-cushion' }}
        >
          <RoundedBox
            name={`${id}:bench-cushion-body`}
            args={[width - frameWidth * 1.25, cushionHeight, depth - 0.045]}
            position={[0, height + cushionHeight / 2, 0.006]}
            radius={cushionHeight * 0.31}
            smoothness={3}
            material={materials.cushion}
            castShadow
            receiveShadow
          />
          <RoundedBox
            name={`${id}:bench-cushion-piping`}
            args={[
              width - frameWidth * 1.52,
              0.012,
              depth - 0.075,
            ]}
            position={[0, height + cushionHeight + 0.002, 0.006]}
            radius={0.005}
            smoothness={2}
            material={materials.piping}
          />
        </group>
      )}

      <group name={`${id}:socket.floor`} />
      <group
        name={`${id}:socket.top-center`}
        position={[0, totalHeight, 0]}
      />
      <group
        name={`${id}:socket.front-center`}
        position={[0, height / 2, depth / 2]}
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
export function CottageLowCabinet({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-low-cabinet',
}: CottageLowCabinetProps) {
  const width = meterParameter(
    parameters.width,
    DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS.width,
  )
  const depth = meterParameter(
    parameters.depth,
    DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS.depth,
  )
  const height = meterParameter(
    parameters.height,
    DEFAULT_COTTAGE_LOW_CABINET_DIMENSIONS.height,
  )
  const rawVariant = String(parameters.variant ?? 'cabinet')
  const variant: CottageLowCabinetVariant = isCottageLowCabinetVariant(
    rawVariant,
  )
    ? rawVariant
    : 'cabinet'
  const woodColor = String(
    parameters.woodColor ?? DEFAULT_COTTAGE_LOW_CABINET_APPEARANCE.woodColor,
  )
  const cushionColor = String(
    parameters.cushionColor ??
      DEFAULT_COTTAGE_LOW_CABINET_APPEARANCE.cushionColor,
  )
  const pipingColor = String(
    parameters.pipingColor ??
      DEFAULT_COTTAGE_LOW_CABINET_APPEARANCE.pipingColor,
  )
  const textures = useMemo(() => createCottageLowCabinetTextures(), [])
  const materials = useMemo<CottageLowCabinetMaterials>(
    () => ({
      wood: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.012,
        roughness: 0.58,
        metalness: 0.01,
      }),
      woodInset: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.009,
        roughness: 0.72,
      }),
      woodShadow: new MeshStandardMaterial({
        color: '#74451f',
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.008,
        roughness: 0.68,
      }),
      hardware: new MeshStandardMaterial({
        color: '#8e6a2e',
        roughness: 0.34,
        metalness: 0.78,
      }),
      cushion: new MeshStandardMaterial({
        color: cushionColor,
        map: textures.linen,
        bumpMap: textures.linen,
        bumpScale: 0.011,
        roughness: 0.96,
      }),
      piping: new MeshStandardMaterial({
        color: pipingColor,
        map: textures.linen,
        roughness: 0.93,
      }),
    }),
    [cushionColor, pipingColor, textures, woodColor],
  )

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose())
    },
    [materials],
  )
  useEffect(
    () => () => disposeCottageLowCabinetTextures(textures),
    [textures],
  )

  return (
    <CottageLowCabinetGeometry
      id={id}
      materials={materials}
      quality={quality}
      variant={variant}
      width={width}
      depth={depth}
      height={height}
    />
  )
}
