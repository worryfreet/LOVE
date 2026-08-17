import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import {
  createCottageLowCabinetTextures,
  disposeCottageLowCabinetTextures,
} from '../../cottage-low-cabinet/lib/lowCabinetTextures'
import {
  createCottageBookcaseBookLayout,
  DEFAULT_COTTAGE_BOOKCASE_APPEARANCE,
  DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS,
  resolveCottageBookcaseDimensions,
  type CottageBookcaseDimensions,
} from '../model/bookcase'

export interface CottageBookcaseMaterials {
  readonly wood: Material
  readonly woodShadow: Material
  readonly back: Material
  readonly bookCovers: readonly Material[]
}

export interface CottageBookcaseGeometryProps extends CottageBookcaseDimensions {
  readonly id: string
  readonly materials: CottageBookcaseMaterials
  readonly quality: 'desktop' | 'mobile'
}

export interface CottageBookcaseProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

/** 暖木开放书柜；局部原点在地面中心，开放正面朝向 +Z。 */
export function CottageBookcaseGeometry({
  id,
  materials,
  quality,
  width,
  depth,
  height,
  shelfCount,
}: CottageBookcaseGeometryProps) {
  const dimensions = resolveCottageBookcaseDimensions({
    width,
    depth,
    height,
    shelfCount,
  })
  const books = createCottageBookcaseBookLayout(dimensions)
  const {
    backThickness,
    compartmentHeight,
    crownThickness,
    innerBottom,
    panelThickness,
    plinthHeight,
    shelfThickness,
  } = dimensions
  const radius = quality === 'mobile' ? 0.009 : 0.014
  const internalShelfYs = Array.from(
    { length: shelfCount - 1 },
    (_, index) =>
      innerBottom +
      (index + 1) * compartmentHeight +
      index * shelfThickness +
      shelfThickness / 2,
  )

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        partFamily: 'cottage-bookcase',
        localFrame: { origin: 'floor-center', up: '+Y', forward: '+Z' },
        dimensions: { width, depth, height, shelfCount },
        materialSlots: ['wood', 'woodShadow', 'back', 'bookCovers'],
        collider: {
          type: 'box',
          size: [width, height, depth],
          center: [0, height / 2, 0],
        },
      }}
    >
      <group name={`${id}:carcass`} userData={{ semanticPart: 'bookcase-carcass' }}>
        <mesh
          name={`${id}:back`}
          position={[0, height / 2, -depth / 2 + backThickness / 2]}
          material={materials.back}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width - panelThickness, height, backThickness]} />
        </mesh>
        {[-1, 1].map((side) => (
          <RoundedBox
            key={side}
            name={`${id}:side:${side}`}
            args={[panelThickness, height - crownThickness, depth]}
            position={[
              side * (width / 2 - panelThickness / 2),
              (height - crownThickness) / 2,
              0,
            ]}
            radius={radius}
            smoothness={2}
            material={materials.wood}
            castShadow
            receiveShadow
          />
        ))}
        <RoundedBox
          name={`${id}:plinth`}
          args={[width, plinthHeight, depth + 0.026]}
          position={[0, plinthHeight / 2, 0.008]}
          radius={radius}
          smoothness={2}
          material={materials.woodShadow}
          castShadow
          receiveShadow
        />
        <RoundedBox
          name={`${id}:bottom-shelf`}
          args={[width - panelThickness, shelfThickness, depth]}
          position={[0, innerBottom - shelfThickness / 2, 0]}
          radius={radius * 0.7}
          smoothness={2}
          material={materials.wood}
          castShadow
          receiveShadow
        />
        {internalShelfYs.map((shelfY, index) => (
          <RoundedBox
            key={shelfY}
            name={`${id}:shelf:${index + 2}`}
            args={[width - panelThickness, shelfThickness, depth]}
            position={[0, shelfY, 0]}
            radius={radius * 0.7}
            smoothness={2}
            material={materials.wood}
            castShadow
            receiveShadow
          />
        ))}
        <RoundedBox
          name={`${id}:crown`}
          args={[width + 0.045, crownThickness, depth + 0.045]}
          position={[0, height - crownThickness / 2, 0.012]}
          radius={radius}
          smoothness={2}
          material={materials.wood}
          castShadow
          receiveShadow
        />
      </group>

      <group name={`${id}:books`} userData={{ semanticPart: 'shelf-books' }}>
        {books.map((book) => (
          <group
            key={book.id}
            name={`${id}:${book.id}`}
            position={book.position}
            rotation={[0, 0, book.rotationZ]}
            userData={{ semanticPart: 'book', shelfIndex: book.shelfIndex }}
          >
            <RoundedBox
              name={`${id}:${book.id}:cover`}
              args={[book.width, book.height, book.depth]}
              position={[0, book.height / 2, 0]}
              radius={Math.min(0.008, book.width * 0.12)}
              smoothness={quality === 'mobile' ? 1 : 2}
              material={
                materials.bookCovers[
                  book.materialIndex % materials.bookCovers.length
                ]
              }
              castShadow
              receiveShadow
            />
          </group>
        ))}
      </group>

      <group name={`${id}:socket.floor`} />
      <group name={`${id}:socket.top-center`} position={[0, height, 0]} />
      <group
        name={`${id}:socket.front-center`}
        position={[0, height / 2, depth / 2]}
      />
    </group>
  )
}

function meterParameter(value: unknown, fallback: number) {
  const numeric = Number(value ?? fallback * 1_000)
  if (!Number.isFinite(numeric)) return fallback
  return numeric > 10 ? numeric / 1_000 : numeric
}

export function CottageBookcase({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-bookcase',
}: CottageBookcaseProps) {
  const width = meterParameter(
    parameters.width,
    DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS.width,
  )
  const depth = meterParameter(
    parameters.depth,
    DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS.depth,
  )
  const height = meterParameter(
    parameters.height,
    DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS.height,
  )
  const shelfCount = Math.round(
    Number(parameters.shelfCount ?? DEFAULT_COTTAGE_BOOKCASE_DIMENSIONS.shelfCount),
  )
  const woodColor = String(
    parameters.woodColor ?? DEFAULT_COTTAGE_BOOKCASE_APPEARANCE.woodColor,
  )
  const backColor = String(
    parameters.backColor ?? DEFAULT_COTTAGE_BOOKCASE_APPEARANCE.backColor,
  )
  const textures = useMemo(() => createCottageLowCabinetTextures(), [])
  const materials = useMemo<CottageBookcaseMaterials>(() => {
    const bookColors = [
      '#8C4D45', '#345D63', '#B47A3B', '#6B5B79',
      '#6E7749', '#C0A06A', '#7D3F35',
    ]
    return {
      wood: new MeshStandardMaterial({
        color: woodColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.01,
        roughness: 0.6,
      }),
      woodShadow: new MeshStandardMaterial({
        color: '#673A20',
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.008,
        roughness: 0.7,
      }),
      back: new MeshStandardMaterial({
        color: backColor,
        map: textures.wood,
        bumpMap: textures.wood,
        bumpScale: 0.006,
        roughness: 0.78,
      }),
      bookCovers: bookColors.map(
        (color) => new MeshStandardMaterial({ color, roughness: 0.82 }),
      ),
    }
  }, [backColor, textures, woodColor])

  useEffect(
    () => () => {
      materials.wood.dispose()
      materials.woodShadow.dispose()
      materials.back.dispose()
      materials.bookCovers.forEach((material) => material.dispose())
    },
    [materials],
  )
  useEffect(
    () => () => disposeCottageLowCabinetTextures(textures),
    [textures],
  )

  return (
    <CottageBookcaseGeometry
      id={id}
      materials={materials}
      quality={quality}
      width={width}
      depth={depth}
      height={height}
      shelfCount={shelfCount}
    />
  )
}
