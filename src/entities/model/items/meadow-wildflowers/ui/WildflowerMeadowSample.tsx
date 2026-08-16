import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import type {
  ModelCommand,
  ModelSceneProps,
} from '@/entities/model/model/modelTypes'
import {
  createMeadowGrassClumpGeometry,
  createMeadowSoilGeometry,
  createMeadowTurfGeometry,
  createWildflowerGeometry,
} from '../model/geometry'
import {
  createMeadowGrassLayout,
  createWildflowerMeadowLayout,
  resolveWildflowerBreezeSway,
  WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT,
  WILDFLOWER_SPECIES_IDS,
  type MeadowGrassPlacement,
  type WildflowerPlacement,
  type WildflowerSpeciesId,
} from '../model/spec'

function writeGrassMatrices(
  mesh: InstancedMesh,
  placements: readonly MeadowGrassPlacement[],
) {
  const clump = new Object3D()
  placements.forEach((placement, index) => {
    clump.position.set(placement.x, 0.0015, placement.z)
    clump.rotation.set(placement.lean, placement.rotation, -placement.lean * 0.7)
    clump.scale.set(
      placement.widthScale,
      placement.heightScale,
      placement.widthScale,
    )
    clump.updateMatrix()
    mesh.setMatrixAt(index, clump.matrix)
  })
  mesh.count = placements.length
  mesh.instanceMatrix.needsUpdate = true
}

function MeadowGrassInstances({
  placements,
}: {
  placements: readonly MeadowGrassPlacement[]
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createMeadowGrassClumpGeometry(), [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        side: DoubleSide,
        roughness: 0.92,
        metalness: 0,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    writeGrassMatrices(mesh, placements)
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [placements])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, placements.length]}
      name="wildflower-meadow-sample.short-dense-grass"
      receiveShadow
      frustumCulled
      userData={{
        semanticRole: 'short-dense-grass-field',
        instanceCount: placements.length,
        bladeCountPerClump: geometry.userData.bladeCount,
      }}
    />
  )
}

function writePlacementMatrices(
  mesh: InstancedMesh,
  placements: readonly WildflowerPlacement[],
  sway = 0,
) {
  const plant = new Object3D()
  placements.forEach((placement, index) => {
    const localSway = sway * (0.72 + (index % 7) * 0.045)
    plant.position.set(placement.x, 0.004, placement.z)
    plant.rotation.set(localSway * 0.28, placement.rotation, localSway)
    plant.scale.setScalar(placement.scale)
    plant.updateMatrix()
    mesh.setMatrixAt(index, plant.matrix)
  })
  mesh.count = placements.length
  mesh.instanceMatrix.needsUpdate = true
}

function WildflowerInstances({
  species,
  placements,
  command,
  reducedMotion,
}: {
  species: WildflowerSpeciesId
  placements: readonly WildflowerPlacement[]
  command?: ModelCommand | null
  reducedMotion: boolean
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const breezeElapsed = useRef(Number.POSITIVE_INFINITY)
  const geometry = useMemo(() => createWildflowerGeometry(species), [species])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        side: DoubleSide,
        roughness: 0.78,
        metalness: 0,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    writePlacementMatrices(mesh, placements)
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
  }, [placements])

  useEffect(() => {
    if (reducedMotion) {
      breezeElapsed.current = Number.POSITIVE_INFINITY
      if (meshRef.current) {
        writePlacementMatrices(meshRef.current, placements)
      }
    } else if (command?.name === 'breeze') {
      breezeElapsed.current = 0
    }
  }, [command?.name, command?.nonce, placements, reducedMotion])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || breezeElapsed.current > 2.8) return
    breezeElapsed.current += delta
    const progress = Math.min(1, breezeElapsed.current / 2.8)
    const sway = resolveWildflowerBreezeSway(progress, 0.045)
    writePlacementMatrices(mesh, placements, sway)
    if (progress === 1) writePlacementMatrices(mesh, placements)
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, placements.length]}
      name={`meadow.${species}.instances`}
      castShadow
      receiveShadow
      frustumCulled
      userData={{
        species,
        semanticRole: 'meadow-flower-batch',
        instanceCount: placements.length,
      }}
    />
  )
}

export function WildflowerMeadowSample({
  command,
  reducedMotion = false,
}: ModelSceneProps) {
  const layout = useMemo(() => createWildflowerMeadowLayout(), [])
  const grassLayout = useMemo(() => createMeadowGrassLayout(), [])
  const turfGeometry = useMemo(() => createMeadowTurfGeometry(), [])
  const soilGeometry = useMemo(() => createMeadowSoilGeometry(), [])
  const placementsBySpecies = useMemo(
    () =>
      Object.fromEntries(
        WILDFLOWER_SPECIES_IDS.map((species) => [
          species,
          layout.filter((placement) => placement.species === species),
        ]),
      ) as Record<WildflowerSpeciesId, WildflowerPlacement[]>,
    [layout],
  )

  return (
    <group
      name="wildflower-meadow-sample.1m-square"
      userData={{
        width: 1,
        depth: 1,
        unit: 'meter',
        plantCount: layout.length,
        grassClumpCount: WILDFLOWER_MEADOW_GRASS_CLUMP_COUNT,
      }}
    >
      <mesh
        name="wildflower-meadow-sample.soil-base"
        geometry={soilGeometry}
        receiveShadow
      >
        <meshStandardMaterial color="#4a3928" roughness={0.98} />
      </mesh>
      <mesh
        name="wildflower-meadow-sample.root-gap-underlay"
        geometry={turfGeometry}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>
      <MeadowGrassInstances placements={grassLayout} />
      {WILDFLOWER_SPECIES_IDS.map((species) => (
        <WildflowerInstances
          key={species}
          species={species}
          placements={placementsBySpecies[species]}
          command={command}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  )
}
