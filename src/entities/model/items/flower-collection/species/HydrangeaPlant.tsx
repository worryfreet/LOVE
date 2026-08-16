import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
  Vector2,
} from 'three'
import type { ModelParameterValues } from '../../../model/modelParameterTypes'
import {
  resolveHydrangeaFloretPetalTransform,
  type HydrangeaFloretArrangementSettings,
} from '../../../model/hydrangeaFloretTransforms'
import {
  resolveHydrangeaPetalSettings,
  type HydrangeaPetalSettings,
} from '../../../model/hydrangeaPetalParameters'
import {
  resolveHydrangeaRenderQualityProfile,
  type HydrangeaRenderQualityProfile,
} from '../../../model/hydrangeaRenderQuality'
import type { Group, Vector3Tuple } from 'three'
import { createHydrangeaSepalGeometry } from '../core/geometry'
import {
  useHydrangeaSurfaceTextures,
  type HydrangeaSurfaceTextures,
} from '../core/hydrangeaTextures'
import { CurvedStem, Leaf } from '../core/FlowerPrimitives'
import {
  createHydrangeaCymeLayout,
  resolveHydrangeaFloretScaleCaps,
} from '../core/layout'
import type {
  HydrangeaBranchSegment,
  HydrangeaCymeLayout,
} from '../core/layout'

interface HydrangeaAssemblyProps {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}

const DEFAULT_PETAL_OPEN_ANGLE = 5.3 * Math.PI / 180
const HYDRANGEA_BLOOM_POSITION = new Vector3(0, 0.55, 0.02)
const PETAL_NORMAL_SCALE = new Vector2(0.1, 0.1)
const ignoreFlowerRaycast = () => undefined
function branchColor(
  segment: HydrangeaBranchSegment,
  settings: HydrangeaPetalSettings,
) {
  if (segment.level === 0) return settings.branches.mainColor
  if (segment.level <= 2) return settings.branches.secondaryColor
  return settings.branches.terminalColor
}

function HydrangeaBranchInstances({
  segments,
  settings,
  qualityProfile,
}: {
  segments: HydrangeaBranchSegment[]
  settings: HydrangeaPetalSettings
  qualityProfile: HydrangeaRenderQualityProfile
}) {
  const mesh = useRef<InstancedMesh>(null)
  const instanceColors = useMemo(
    () => new InstancedBufferAttribute(
      new Float32Array(segments.length * 3).fill(1),
      3,
    ),
    [segments.length],
  )

  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    const axisY = new Vector3(0, 1, 0)
    const direction = new Vector3()
    const midpoint = new Vector3()
    const color = new Color()

    segments.forEach((segment, index) => {
      direction.copy(segment.end).sub(segment.start)
      const length = direction.length()
      midpoint.copy(segment.start).add(segment.end).multiplyScalar(0.5)
      dummy.position.copy(midpoint)
      dummy.quaternion.setFromUnitVectors(axisY, direction.normalize())
      dummy.scale.set(
        segment.radius * settings.branches.thickness,
        length,
        segment.radius * settings.branches.thickness,
      )
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
      mesh.current?.setColorAt(
        index,
        color.set(branchColor(segment, settings)),
      )
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true
    }
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [segments, settings])

  if (segments.length === 0) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, segments.length]}
      instanceColor={instanceColors}
      name="flower.hydrangea.cyme.branch-system"
      castShadow
      receiveShadow={false}
      raycast={ignoreFlowerRaycast}
    >
      <cylinderGeometry
        args={[1, 1, 1, qualityProfile.branchRadialSegments]}
      />
      <meshStandardMaterial
        vertexColors
        roughness={0.84}
        emissive={settings.branches.secondaryColor}
        emissiveIntensity={0.22}
      />
    </instancedMesh>
  )
}

interface HydrangeaFloretSource {
  layout: HydrangeaCymeLayout
  scaleMultiplier: number
}

function resolveCollisionGapRotations(
  layout: HydrangeaCymeLayout,
  bloomRadius: number,
) {
  const localZ = new Vector3(0, 0, 1)
  const base = new Quaternion()
  const neighborDirection = new Vector3()
  const phases: number[] = []

  layout.florets.forEach((floret, floretIndex) => {
    const nearbyEarlier = layout.florets
      .slice(0, floretIndex)
      .map((candidate, candidateIndex) => ({
        candidateIndex,
        distance: floret.position.distanceTo(candidate.position),
      }))
      .filter(({ distance }) => distance < bloomRadius * 0.43)
    const samePhaseConflicts = [0, 1].map((phase) =>
      nearbyEarlier.filter(({ candidateIndex }) =>
        phases[candidateIndex] === phase,
      ).length,
    )
    phases[floretIndex] = samePhaseConflicts[0] <= samePhaseConflicts[1]
      ? 0
      : 1
  })

  return layout.florets.map((floret, floretIndex) => {
    let nearestIndex = floretIndex === 0 ? 1 : 0
    let nearestDistance = Number.POSITIVE_INFINITY
    layout.florets.forEach((candidate, candidateIndex) => {
      if (candidateIndex === floretIndex) return
      const distance = floret.position.distanceToSquared(candidate.position)
      if (distance >= nearestDistance) return
      nearestDistance = distance
      nearestIndex = candidateIndex
    })
    neighborDirection
      .copy(layout.florets[nearestIndex].position)
      .sub(floret.position)
      .addScaledVector(
        floret.normal,
        -neighborDirection.dot(floret.normal),
      )
      .normalize()
    base.setFromUnitVectors(localZ, floret.normal).invert()
    neighborDirection.applyQuaternion(base)
    const neighborAngle = Math.atan2(
      neighborDirection.y,
      neighborDirection.x,
    )
    // 相邻小花交替使用“花瓣朝向”和“瓣间空隙朝向”，避免花瓣尖端迎头穿透。
    return neighborAngle - Math.PI * 0.75 + phases[floretIndex] * Math.PI * 0.25
  })
}

function HydrangeaFlorets({
  sources,
  settings,
  surfaceTextures,
  qualityProfile,
}: {
  sources: readonly HydrangeaFloretSource[]
  settings: HydrangeaPetalSettings
  surfaceTextures: HydrangeaSurfaceTextures
  qualityProfile: HydrangeaRenderQualityProfile
}) {
  const geometryOptions = useMemo(
    () => ({
      length: settings.length,
      width: settings.width,
      baseWidth: settings.baseWidth,
      tipWidth: settings.tipWidth,
      widthProfile: settings.widthProfile,
      cup: settings.cup,
      curl: settings.curl,
      curlFocus: settings.curlFocus,
      sideCurl: settings.sideCurl,
      wave: settings.wave,
      waveCount: settings.waveCount,
      asymmetry: settings.asymmetry,
      thickness: settings.thickness,
      tipRoundness: settings.tipRoundness,
      tipNotch: settings.tipNotch,
      cupCenter: settings.cupCenter,
      keel: settings.keel,
      veinStrength: settings.veinStrength,
      veinCount: settings.veinCount,
      baseColor: settings.baseColor,
      tipColor: settings.tipColor,
      centerColor: settings.centerColor,
      veinColor: settings.veinColor,
      lengthSegments: qualityProfile.lengthSegments,
      widthSegments: qualityProfile.widthSegments,
    }),
    [
      settings.asymmetry,
      settings.baseColor,
      settings.baseWidth,
      settings.centerColor,
      settings.cup,
      settings.cupCenter,
      settings.curl,
      settings.curlFocus,
      settings.keel,
      settings.length,
      settings.sideCurl,
      settings.thickness,
      settings.tipColor,
      settings.tipNotch,
      settings.tipRoundness,
      settings.tipWidth,
      settings.veinColor,
      settings.veinCount,
      settings.veinStrength,
      settings.wave,
      settings.waveCount,
      settings.width,
      settings.widthProfile,
      qualityProfile.lengthSegments,
      qualityProfile.widthSegments,
    ],
  )
  const sepalGeometry = useMemo(
    () => createHydrangeaSepalGeometry(geometryOptions),
    [geometryOptions],
  )
  const petals = useRef<InstancedMesh>(null)
  const centers = useRef<InstancedMesh>(null)
  const palettes = useMemo(
    () => settings.palette.map((value) => new Color(value)),
    [settings.palette],
  )
  const renderedPetalCount = settings.visible ? settings.count : 0
  const totalFlorets = useMemo(
    () => sources.reduce(
      (total, source) => total + source.layout.florets.length,
      0,
    ),
    [sources],
  )
  const totalPetals = totalFlorets * renderedPetalCount
  const preparedSources = useMemo(
    () => sources.map((source) => ({
      ...source,
      collisionScaleCaps: resolveHydrangeaFloretScaleCaps(
        source.layout.florets,
        settings.length,
        settings.width,
      ),
      collisionGapRotations: resolveCollisionGapRotations(
        source.layout,
        settings.bloomRadius,
      ),
    })),
    [sources, settings.bloomRadius, settings.length, settings.width],
  )
  const arrangementSettings = useMemo<HydrangeaFloretArrangementSettings>(
    () => ({
      openAngle: settings.openAngle,
      rotationOffset: settings.rotationOffset,
      variation: settings.variation,
      floret: settings.floret,
    }),
    [
      settings.floret,
      settings.openAngle,
      settings.rotationOffset,
      settings.variation,
    ],
  )

  useEffect(() => () => sepalGeometry.dispose(), [sepalGeometry])

  useLayoutEffect(() => {
    if (
      (totalPetals > 0 && !petals.current) ||
      (settings.center.visible && !centers.current)
    ) return

    const localZ = new Vector3(0, 0, 1)
    const localX = new Vector3(1, 0, 0)
    const base = new Quaternion()
    const spin = new Quaternion()
    const tilt = new Quaternion()
    const dummy = new Object3D()
    const centerDummy = new Object3D()
    const rootOffset = new Vector3()
    let petalInstanceIndex = 0
    let centerInstanceIndex = 0

    preparedSources.forEach((source) => {
      source.layout.florets.forEach((floret, floretIndex) => {
        base.setFromUnitVectors(localZ, floret.normal)
        for (let lobe = 0; lobe < renderedPetalCount; lobe += 1) {
          const sourceLobe = lobe % 4
          const transform = resolveHydrangeaFloretPetalTransform(
            arrangementSettings,
            {
              lobeIndex: lobe,
              petalCount: renderedPetalCount,
              phase: source.collisionGapRotations[floretIndex],
              naturalTiltOffset:
                floret.lobeTilts[sourceLobe] - DEFAULT_PETAL_OPEN_ANGLE,
              naturalScaleOffset: floret.lobeScales[sourceLobe] - 1,
            },
          )
          spin.setFromAxisAngle(localZ, transform.angle)
          tilt.setFromAxisAngle(localX, transform.tilt)
          rootOffset
            .set(transform.rootOffset[0], transform.rootOffset[1], 0)
            .applyQuaternion(base)
          dummy.position.copy(floret.position)
            .add(rootOffset)
            .addScaledVector(floret.normal, transform.normalOffset)
          dummy.quaternion.copy(base).multiply(spin).multiply(tilt)
          const naturalScale =
            floret.scale * source.scaleMultiplier * transform.scale
          const scale = Math.min(
            naturalScale,
            source.collisionScaleCaps[floretIndex],
          )
          dummy.scale.set(scale * 0.96, scale, scale)
          dummy.updateMatrix()
          petals.current?.setMatrixAt(petalInstanceIndex, dummy.matrix)
          petalInstanceIndex += 1
        }

        if (settings.center.visible) {
          centerDummy.position.copy(floret.position)
            .addScaledVector(floret.normal, 0.012)
          centerDummy.scale.setScalar(
            settings.center.size * Math.min(
              floret.scale * source.scaleMultiplier * settings.floret.scale,
              source.collisionScaleCaps[floretIndex],
            ),
          )
          centerDummy.updateMatrix()
          centers.current?.setMatrixAt(centerInstanceIndex, centerDummy.matrix)
          centerInstanceIndex += 1
        }
      })
    })

    if (petals.current) {
      petals.current.instanceMatrix.needsUpdate = true
      petals.current.computeBoundingBox()
      petals.current.computeBoundingSphere()
    }
    if (centers.current) {
      centers.current.instanceMatrix.needsUpdate = true
      centers.current.computeBoundingBox()
      centers.current.computeBoundingSphere()
    }
  }, [
    arrangementSettings,
    preparedSources,
    renderedPetalCount,
    settings.center.size,
    settings.center.visible,
    settings.floret.scale,
    totalPetals,
  ])

  useLayoutEffect(() => {
    if (!petals.current) return
    const color = new Color()
    let petalInstanceIndex = 0
    preparedSources.forEach((source) => {
      source.layout.florets.forEach((floret, floretIndex) => {
        for (let lobe = 0; lobe < renderedPetalCount; lobe += 1) {
          color.copy(
            palettes[
              (floretIndex * 5 + floret.clusterIndex * 3) % palettes.length
            ],
          )
          color.offsetHSL(
            Math.sin(floretIndex * 0.79) * 0.008 * settings.variation,
            Math.cos(floretIndex * 0.43) * 0.016 * settings.variation,
            (
              Math.sin(floretIndex * 0.61) * 0.026 +
              (lobe - (renderedPetalCount - 1) / 2) * 0.003
            ) * settings.variation,
          )
          petals.current?.setColorAt(petalInstanceIndex, color)
          petalInstanceIndex += 1
        }
      })
    })
    if (petals.current.instanceColor) {
      petals.current.instanceColor.needsUpdate = true
    }
  }, [palettes, preparedSources, renderedPetalCount, settings.variation])

  const softLightIntensity = Math.min(
    0.12,
    settings.material.sheen * 0.035 + settings.material.transmission * 0.5,
  )

  return (
    <group name="flower.hydrangea.decorative-florets">
      {totalPetals > 0 && (
        <instancedMesh
          ref={petals}
          args={[sepalGeometry, undefined, totalPetals]}
          name="flower.hydrangea.florets.all-sepals"
          castShadow={qualityProfile.petalShadows}
          receiveShadow={qualityProfile.petalShadows}
          raycast={ignoreFlowerRaycast}
        >
          {qualityProfile.material === 'physical' ? (
            <meshPhysicalMaterial
              vertexColors
              flatShading={settings.flatShading}
              side={DoubleSide}
              roughness={settings.material.roughness}
              metalness={0}
              clearcoat={0.004}
              clearcoatRoughness={0.98}
              sheen={settings.material.sheen}
              sheenRoughness={0.84}
              sheenColor={settings.palette[3]}
              transmission={settings.material.transmission}
              thickness={0.006}
              ior={1.34}
              map={surfaceTextures.petal.colorMap}
              normalMap={surfaceTextures.petal.normalMap}
              normalScale={PETAL_NORMAL_SCALE}
              roughnessMap={surfaceTextures.petal.roughnessMap}
            />
          ) : (
            <meshStandardMaterial
              vertexColors
              flatShading={settings.flatShading}
              side={DoubleSide}
              roughness={settings.material.roughness}
              metalness={0}
              emissive={settings.palette[3]}
              emissiveIntensity={softLightIntensity}
              map={surfaceTextures.petal.colorMap}
              normalMap={qualityProfile.useNormalMap
                ? surfaceTextures.petal.normalMap
                : null}
              normalScale={PETAL_NORMAL_SCALE}
              roughnessMap={qualityProfile.useRoughnessMap
                ? surfaceTextures.petal.roughnessMap
                : null}
            />
          )}
        </instancedMesh>
      )}
      {settings.center.visible && (
        <instancedMesh
          ref={centers}
          args={[undefined, undefined, totalFlorets]}
          name="flower.hydrangea.florets.true-flower-centers"
          raycast={ignoreFlowerRaycast}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={settings.center.color} roughness={0.88} />
        </instancedMesh>
      )}
    </group>
  )
}

function HydrangeaInflorescence({
  fillerLayout,
  layout,
  settings,
  surfaceTextures,
  qualityProfile,
}: {
  fillerLayout: HydrangeaCymeLayout
  layout: HydrangeaCymeLayout
  settings: HydrangeaPetalSettings
  surfaceTextures: HydrangeaSurfaceTextures
  qualityProfile: HydrangeaRenderQualityProfile
}) {
  const fillerPedicels = useMemo(() => {
    const sources = layout.branchSegments
      .filter((segment) => segment.level === 2)
      .map((segment) => segment.end)
    return fillerLayout.florets.map((floret, floretIndex) => {
      const source = sources.reduce((nearest, candidate) =>
        candidate.distanceToSquared(floret.position) <
        nearest.distanceToSquared(floret.position)
          ? candidate
          : nearest,
      )
      return {
        id: `filler-pedicel-${floretIndex}`,
        start: source,
        end: floret.position.clone().addScaledVector(floret.normal, -0.018),
        level: 4 as const,
        radius: settings.bloomRadius * 0.0038,
      }
    })
  }, [fillerLayout.florets, layout.branchSegments, settings.bloomRadius])
  const branchSegments = useMemo(
    () => [...layout.branchSegments, ...fillerPedicels],
    [fillerPedicels, layout.branchSegments],
  )
  const floretSources = useMemo<readonly HydrangeaFloretSource[]>(
    () => [
      { layout, scaleMultiplier: 1 },
      { layout: fillerLayout, scaleMultiplier: 0.72 },
    ],
    [fillerLayout, layout],
  )
  const shadowRadius = settings.bloomRadius + settings.length * 0.16
  return (
    <group name="flower.hydrangea.composite-cyme">
      {settings.branches.visible && (
        <HydrangeaBranchInstances
          segments={branchSegments}
          settings={settings}
          qualityProfile={qualityProfile}
        />
      )}
      <HydrangeaFlorets
        sources={floretSources}
        settings={settings}
        surfaceTextures={surfaceTextures}
        qualityProfile={qualityProfile}
      />
      {qualityProfile.shadowProxyDetail !== null && (
        <mesh
          name="flower.hydrangea.bloom-shadow-proxy"
          position={[0, settings.bloomRadius * 0.08, 0]}
          castShadow
          raycast={ignoreFlowerRaycast}
        >
          <icosahedronGeometry
            args={[shadowRadius, qualityProfile.shadowProxyDetail]}
          />
          <meshBasicMaterial
            colorWrite={false}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  )
}

export function HydrangeaAssembly({
  bloomRef,
  parameters,
}: HydrangeaAssemblyProps) {
  const surfaceTextures = useHydrangeaSurfaceTextures()
  const petalSettings = useMemo(
    () => resolveHydrangeaPetalSettings(parameters),
    [parameters],
  )
  const qualityProfile = useMemo(
    () => resolveHydrangeaRenderQualityProfile(parameters),
    [parameters],
  )
  const layout = useMemo(
    () => createHydrangeaCymeLayout({
      cymeCount: petalSettings.cymeCount,
      floretsPerCyme: 7,
      radius: petalSettings.bloomRadius,
      seed: 1770,
    }),
    [petalSettings.bloomRadius, petalSettings.cymeCount],
  )
  const fillerLayout = useMemo(
    () => createHydrangeaCymeLayout({
      cymeCount: Math.max(5, Math.round(petalSettings.cymeCount * 0.45)),
      floretsPerCyme: 7,
      radius: petalSettings.bloomRadius * 0.7,
      seed: 2771,
    }),
    [petalSettings.bloomRadius, petalSettings.cymeCount],
  )
  const branchRoot = useMemo(
    () => layout.branchSegments
      .find((segment) => segment.id === 'trunk')!
      .start.clone()
      .add(HYDRANGEA_BLOOM_POSITION),
    [layout.branchSegments],
  )
  const leafBaseY = branchRoot.y + petalSettings.leaf.height
  const leaves = [
    {
      p: [
        branchRoot.x,
        leafBaseY - 0.02,
        branchRoot.z + 0.07,
      ] as Vector3Tuple,
      d: [0.86, 0.27, 0.36] as Vector3Tuple,
      n: [-0.15, 0.5, 0.84] as Vector3Tuple,
      l: petalSettings.leaf.length * 1.0131,
      w: petalSettings.leaf.width * 1.0149,
    },
    {
      p: [
        branchRoot.x,
        leafBaseY + 0.02,
        branchRoot.z - 0.075,
      ] as Vector3Tuple,
      d: [-0.48, 0.2, -0.86] as Vector3Tuple,
      n: [0.86, 0.42, -0.36] as Vector3Tuple,
      l: petalSettings.leaf.length * 0.9869,
      w: petalSettings.leaf.width * 0.9851,
    },
  ]
  return (
    <>
      {petalSettings.stem.visible && (
        <CurvedStem
          name="flower.hydrangea.stem"
          points={[
            [
              branchRoot.x,
              branchRoot.y - petalSettings.stem.length,
              branchRoot.z,
            ],
            [
              branchRoot.x + petalSettings.stem.curve,
              branchRoot.y - petalSettings.stem.length * 0.72,
              branchRoot.z + 0.001,
            ],
            [
              branchRoot.x - petalSettings.stem.curve * 0.75,
              branchRoot.y - petalSettings.stem.length * 0.44,
              branchRoot.z,
            ],
            branchRoot.toArray(),
          ]}
          radius={petalSettings.stem.radius}
          color={petalSettings.stem.color}
          radialSegments={14}
          tubularSegments={42}
          receiveShadow={false}
        />
      )}
      {petalSettings.leaf.visible && leaves.map((leaf, index) => (
        <Leaf
          key={index}
          name={`flower.hydrangea.foliage.${index + 1}`}
          length={leaf.l}
          width={leaf.w}
          position={leaf.p}
          direction={leaf.d}
          surfaceNormal={leaf.n}
          serration={petalSettings.leaf.serration}
          serrationCount={petalSettings.leaf.serrationCount}
          cup={petalSettings.leaf.cup}
          curl={petalSettings.leaf.curl}
          sideCurl={petalSettings.leaf.cup * 0.58}
          twist={index === 0 ? 0.065 : -0.065}
          tipCurl={petalSettings.leaf.curl * 0.5}
          wave={petalSettings.leaf.wave}
          keel={0.13}
          veinRelief={leaf.l * 0.009}
          veinStrength={0.42}
          veinCount={9}
          baseColor={petalSettings.leaf.baseColor}
          tipColor={petalSettings.leaf.tipColor}
          veinColor={petalSettings.leaf.veinColor}
          lengthSegments={40}
          widthSegments={10}
          surfaceTextures={surfaceTextures.leaf}
          textureNormalStrength={0.22}
          roughness={0.8}
        />
      ))}
      <group
        ref={bloomRef}
        position={HYDRANGEA_BLOOM_POSITION.toArray()}
        name="flower.hydrangea.bloom"
      >
        <HydrangeaInflorescence
          fillerLayout={fillerLayout}
          layout={layout}
          settings={petalSettings}
          surfaceTextures={surfaceTextures}
          qualityProfile={qualityProfile}
        />
      </group>
    </>
  )
}
