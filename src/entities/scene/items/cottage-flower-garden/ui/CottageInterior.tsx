import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  Shape,
  Vector2,
} from 'three'
import {
  COTTAGE_INTERIOR_KIT,
  type CottageInteriorBox,
  type CottageInteriorMaterialKey,
} from '../model/cottageInterior'
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from '../model/gardenLayout'
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  resolveCottageWoodTone,
  type CottageGardenTuning,
} from '../model/gardenTuning'
import { useGardenMaterialTextures } from './gardenTextures'

const INTERIOR_MATERIALS: Record<
  CottageInteriorMaterialKey,
  {
    color: string
    emissive: string
    emissiveIntensity: number
    roughness: number
  }
> = {
  floor: {
    color: '#a87543',
    emissive: '#2b160d',
    emissiveIntensity: 0.018,
    roughness: 0.82,
  },
  wall: {
    color: '#d8c7aa',
    emissive: '#3b2a1d',
    emissiveIntensity: 0.025,
    roughness: 0.91,
  },
  ceiling: {
    color: '#c8ad88',
    emissive: '#2c1b10',
    emissiveIntensity: 0.018,
    roughness: 0.94,
  },
  beam: {
    color: '#5e381f',
    emissive: '#32180c',
    emissiveIntensity: 0.06,
    roughness: 0.9,
  },
  trim: {
    color: '#6b4025',
    emissive: '#381d10',
    emissiveIntensity: 0.06,
    roughness: 0.88,
  },
}

function InteriorMeshes({
  materialKey,
  occurrences,
  tuning,
  castShadow,
}: {
  materialKey: CottageInteriorMaterialKey
  occurrences: readonly CottageInteriorBox[]
  tuning: CottageGardenTuning
  castShadow: boolean
}) {
  const {
    wood,
    woodHorizontal,
    woodNormal,
    woodNormalHorizontal,
    woodRoughness,
  } = useGardenMaterialTextures()
  const style = INTERIOR_MATERIALS[materialKey]
  const tunedWood = resolveCottageWoodTone(
    tuning.structures.cottageWoodColor,
    materialKey === 'beam' || materialKey === 'trim' ? 'darkWood' : 'wall',
  )
  const baseColor = useMemo(
    () =>
      new Color(style.color)
        .lerp(new Color(tunedWood), materialKey === 'floor' ? 0.34 : 0.2),
    [materialKey, style.color, tunedWood],
  )
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const material = useMemo(() => {
    const tintBlend =
      materialKey === 'wall'
        ? 0.72
        : materialKey === 'ceiling'
          ? 0.58
          : materialKey === 'floor'
            ? 0.5
            : materialKey === 'trim'
              ? 0.5
              : 0.42
    const texturedColor = baseColor.clone().lerp(new Color('#fff4e6'), tintBlend)
    const surfaceMap =
      materialKey === 'wall'
        ? null
        : materialKey === 'ceiling'
          ? woodHorizontal
          : wood
    const surface = new MeshStandardMaterial({
      color: texturedColor,
      map: surfaceMap,
      side: DoubleSide,
      normalMap: materialKey === 'wall' ? woodNormalHorizontal : woodNormal,
      normalScale: new Vector2(
        materialKey === 'floor' ? 0.32 : 0.24,
        materialKey === 'floor' ? 0.32 : 0.24,
      ),
      roughnessMap: woodRoughness,
      emissive: new Color(style.emissive).lerp(baseColor, 0.12),
      emissiveMap: surfaceMap,
      emissiveIntensity: style.emissiveIntensity,
      roughness: style.roughness,
      metalness: 0,
    })
    surface.name = `cottage.interior.${materialKey}.material`
    return surface
  }, [
    baseColor,
    materialKey,
    style.emissive,
    style.emissiveIntensity,
    style.roughness,
    woodNormal,
    woodNormalHorizontal,
    woodRoughness,
    wood,
    woodHorizontal,
  ])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  if (occurrences.length === 0) return null
  return (
    <group
      name={`cottage.interior.${materialKey}`}
      userData={{
        semanticId: `cottage.interior.${materialKey}`,
        materialSlot: materialKey,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        units: 'meter',
      }}
    >
      {occurrences.map((occurrence) => (
        <mesh
          key={occurrence.id}
          name={occurrence.id}
          geometry={geometry}
          material={material}
          position={occurrence.position}
          rotation={occurrence.rotation}
          scale={occurrence.size}
          castShadow={castShadow && materialKey !== 'floor'}
          receiveShadow
          userData={{ semanticId: occurrence.id, materialSlot: materialKey }}
        />
      ))}
    </group>
  )
}

function NorthGableLining({ castShadow }: { castShadow: boolean }) {
  const { minX, maxX, minZ, eaveHeight, ridgeHeight } =
    COTTAGE_INTERIOR_KIT.measurements
  const { woodNormalHorizontal, woodRoughness } =
    useGardenMaterialTextures()
  const shape = useMemo(() => {
    const gable = new Shape()
    gable.moveTo(minX, eaveHeight)
    gable.lineTo(maxX, eaveHeight)
    gable.lineTo(0, ridgeHeight - 0.1)
    gable.closePath()
    return gable
  }, [eaveHeight, maxX, minX, ridgeHeight])

  return (
    <mesh
      name="cottage.interior.wall.north-gable"
      position={[0, 0, minZ - 0.012]}
      castShadow={castShadow}
      receiveShadow
      userData={{
        semanticId: 'cottage.interior.wall.north-gable',
        materialSlot: 'wall',
        units: 'meter',
      }}
    >
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color="#f6dfc0"
        side={DoubleSide}
        normalMap={woodNormalHorizontal}
        normalScale={new Vector2(0.24, 0.24)}
        roughnessMap={woodRoughness}
        emissive="#3b2a1d"
        emissiveIntensity={0.025}
        roughness={0.92}
      />
    </mesh>
  )
}

function CottageInteriorStoryDetails() {
  const { floorTop, eaveHeight, minZ } = COTTAGE_INTERIOR_KIT.measurements
  const { wood } = useGardenMaterialTextures()
  return (
    <group
      name="cottage.interior.story-details"
      userData={{
        semanticId: 'cottage.interior.story-details',
        narrative:
          'memory-table-hearth-reading-library-houseplant',
      }}
    >
      <group
        name="cottage.interior.memory-wall-wainscot"
        userData={{ semanticId: 'zone.cottage-memory-wall.wainscot' }}
      >
        <mesh
          position={[0, floorTop + 0.46, minZ + 0.042]}
          receiveShadow
        >
          <boxGeometry args={[7.22, 0.86, 0.055]} />
          <meshStandardMaterial
            color="#986441"
            roughness={0.9}
            emissive="#4b2918"
            emissiveIntensity={0.05}
          />
        </mesh>
        {Array.from({ length: 12 }, (_, index) => (
          <mesh
            key={index}
            position={[-3.31 + index * 0.602, floorTop + 0.46, minZ + 0.076]}
            castShadow
          >
            <boxGeometry args={[0.038, 0.82, 0.035]} />
            <meshStandardMaterial color="#72462d" roughness={0.88} />
          </mesh>
        ))}
        <mesh
          position={[0, floorTop + 0.91, minZ + 0.083]}
          castShadow
        >
          <boxGeometry args={[7.34, 0.07, 0.12]} />
          <meshStandardMaterial color="#6f4329" map={wood} roughness={0.86} />
        </mesh>
      </group>
      <mesh
        name="cottage.interior.sleeping-rug"
        position={[2.38, floorTop + 0.014, -1.22]}
        scale={[1.42, 1, 0.82]}
        receiveShadow
      >
        <cylinderGeometry args={[0.72, 0.72, 0.022, 56]} />
        <meshStandardMaterial color="#9d6f67" roughness={0.98} />
      </mesh>
      <group
        name="cottage.interior.reading-lamp"
        position={[-3.12, floorTop, 0.05]}
        userData={{ semanticId: 'zone.cottage-living.reading-lamp' }}
      >
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.19, 0.05, 24]} />
          <meshStandardMaterial color="#4b3529" metalness={0.28} roughness={0.66} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, 1.42, 12]} />
          <meshStandardMaterial color="#4b3529" metalness={0.32} roughness={0.62} />
        </mesh>
        <mesh position={[0, 1.43, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.29, 0.28, 28, 1, true]} />
          <meshStandardMaterial
            color="#d9b98f"
            roughness={0.78}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, 1.38, 0]}>
          <sphereGeometry args={[0.05, 16, 10]} />
          <meshStandardMaterial
            color="#fff1ce"
            emissive="#ff9f52"
            emissiveIntensity={1.6}
            roughness={0.42}
          />
        </mesh>
        <pointLight
          position={[0, 1.35, 0.04]}
          color="#ffc27c"
          intensity={0.72}
          distance={2.8}
          decay={2}
          castShadow={false}
        />
      </group>
      <group
        name="cottage.interior.houseplant"
        position={[3.12, floorTop, 0.28]}
        userData={{ semanticId: 'zone.cottage-sleeping-nook.houseplant' }}
      >
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.19, 0.15, 0.36, 18]} />
          <meshStandardMaterial color="#9a6542" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.375, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 18]} />
          <meshStandardMaterial color="#4a3123" roughness={0.98} />
        </mesh>
        {[
          [-0.16, 0.58, 0.03, -0.62, '#496f42'],
          [0.15, 0.68, -0.05, 0.58, '#5d824b'],
          [-0.08, 0.8, -0.11, -0.3, '#6f9158'],
          [0.12, 0.91, 0.06, 0.34, '#4f7845'],
          [0, 1.02, -0.02, 0.05, '#78995d'],
        ].map(([x, y, z, rotationZ, color], index) => (
          <mesh
            key={index}
            position={[x as number, y as number, z as number]}
            rotation={[0.2, index * 0.78, rotationZ as number]}
            scale={[1.7, 0.42, 0.82]}
            castShadow
          >
            <sphereGeometry args={[0.13, 14, 9]} />
            <meshStandardMaterial color={color as string} roughness={0.9} />
          </mesh>
        ))}
      </group>
      <mesh
        name="cottage.interior.living-rug"
        position={[-1.75, floorTop + 0.018, 0.28]}
        scale={[1.45, 1, 0.92]}
        receiveShadow
      >
        <cylinderGeometry args={[0.92, 0.92, 0.026, 64]} />
        <meshStandardMaterial
          color="#b66f68"
          roughness={0.98}
          emissive="#2a1413"
          emissiveIntensity={0.02}
        />
      </mesh>
      <mesh
        name="cottage.interior.living-rug-border"
        position={[-1.75, floorTop + 0.034, 0.28]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1.34, 0.82, 1]}
      >
        <torusGeometry args={[0.68, 0.025, 10, 64]} />
        <meshStandardMaterial color="#e0b89b" roughness={0.96} />
      </mesh>
      <group
        name="cottage.interior.pendant"
        position={[0.25, eaveHeight - 0.1, 0.15]}
        userData={{ semanticId: 'cottage.interior.pendant' }}
      >
        <mesh position={[0, -0.23, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.46, 8]} />
          <meshStandardMaterial color="#332a24" roughness={0.78} />
        </mesh>
        <mesh position={[0, -0.5, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.24, 0.22, 28, 1, true]} />
          <meshStandardMaterial
            color="#d8b684"
            roughness={0.72}
            metalness={0.08}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <sphereGeometry args={[0.065, 18, 12]} />
          <meshStandardMaterial
            color="#fff0c8"
            emissive="#ffad62"
            emissiveIntensity={1.8}
            roughness={0.42}
          />
        </mesh>
      </group>
    </group>
  )
}

export function CottageInterior({
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
  cutaway = false,
}: {
  tuning?: CottageGardenTuning
  cutaway?: boolean
}) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const groups = useMemo(
    () =>
      COTTAGE_INTERIOR_KIT.boxes.reduce(
        (result, occurrence) => {
          result[occurrence.material].push(occurrence)
          return result
        },
        {
          floor: [],
          wall: [],
          ceiling: [],
          beam: [],
          trim: [],
        } as Record<CottageInteriorMaterialKey, CottageInteriorBox[]>,
      ),
    [],
  )

  return (
    <group
      name="module.cottage-interior"
      position={[cottage.centerX, 0, cottage.centerZ]}
      userData={{
        semanticId: 'module.cottage-interior',
        units: 'meter',
        measurements: COTTAGE_INTERIOR_KIT.measurements,
        materialSlots: COTTAGE_INTERIOR_KIT.materialSlots,
      }}
    >
      {(Object.keys(groups) as CottageInteriorMaterialKey[]).map((material) =>
        cutaway &&
        (material === 'ceiling' ||
          material === 'beam' ||
          material === 'trim') ? null : (
          <InteriorMeshes
            key={material}
            materialKey={material}
            occurrences={
              cutaway
                ? groups[material].filter(
                    (occurrence) =>
                      !occurrence.id.includes('.east-') &&
                      !occurrence.id.includes('.west-'),
                  )
                : groups[material]
            }
            tuning={tuning}
            castShadow={!cutaway}
          />
        ),
      )}
      <NorthGableLining castShadow={!cutaway} />
      <CottageInteriorStoryDetails />
      <pointLight
        name="cottage.interior.ambient-warmth"
        position={[0, 2.22, 0.15]}
        color="#ffc58b"
        intensity={2.4}
        distance={8.4}
        decay={2}
        castShadow={false}
        userData={{ semanticId: 'cottage.interior.ambient-warmth' }}
      />
    </group>
  )
}
