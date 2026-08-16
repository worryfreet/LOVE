import { useLayoutEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import type { Group, Vector3Tuple } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerNumber,
  readFlowerString,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { CLASSIC_ROSE_PARAMETERS } from '@/entities/model/model/flowers/classicRoseParameters'
import { ROSE_PARAMETERS } from '@/entities/model/model/flowers/roseParameters'
import {
  BroadLeaf,
  CurvedStem,
  Petal,
  StemBetween,
} from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import { PETAL_MORPHOLOGIES } from '../core/petalMorphologies'
import { resolveRoseColorPreset } from '../core/roseColorVariants'
import {
  CLASSIC_ROSE_GROUND_Y,
  createClassicRoseBlueprint,
  createRoseLeafSprigBlueprint,
  resolveRoseAttachmentProfile,
} from '../core/classicRoseBlueprint'
import { BLOOM_FRAME_PROFILES } from '../core/layout'
import {
  createWeightedStemLayout,
  sampleWeightedStemPoint,
} from '../core/weightedStem'
import type { WeightedStemLayout } from '../core/weightedStem'
import type { StudioPetalShape } from '../core/studioFlower'
import type {
  EditableFlowerSpeciesId,
  RibbonGeometryOptions,
} from '../core/types'
import {
  createRoseCrownLayout,
  RosePetalBatch,
} from './RosePetalBatch'

const STEM_BASE_Y = CLASSIC_ROSE_GROUND_Y
const ignoreFlowerRaycast = () => undefined

function ThornBatch({
  count,
  radius,
  stemLayout,
}: {
  count: number
  radius: number
  stemLayout: WeightedStemLayout
}) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    for (let index = 0; index < count; index += 1) {
      const progress = (index + 1) / (count + 1)
      const side = index % 2 === 0 ? 1 : -1
      const node = sampleWeightedStemPoint(stemLayout, progress * 0.82)
      dummy.position.set(node[0] + side * radius * 0.9, node[1], node[2])
      dummy.rotation.set(0, 0, side * -1.23)
      dummy.scale.setScalar(0.8 + (index % 3) * 0.08)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [count, radius, stemLayout])
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      raycast={ignoreFlowerRaycast}
      castShadow
    >
      <coneGeometry args={[0.035, 0.12, 6]} />
      <meshStandardMaterial color="#7B3927" roughness={0.85} />
    </instancedMesh>
  )
}

function RoseLeafSprig({
  species,
  index,
  position,
  direction,
  settings,
  textures,
}: {
  species: 'rose' | 'classic-rose'
  index: number
  position: Vector3Tuple
  direction: 1 | -1
  settings: ReturnType<typeof resolveEditableFlowerSettings>
  textures: ReturnType<typeof useFlowerSurfaceTextures>
}) {
  const sprig = createRoseLeafSprigBlueprint(
    index as 1 | 2,
    position,
    direction,
  )
  const leafProps = {
    length: settings.leaf.length * 0.82,
    width: settings.leaf.width * 0.9,
    baseColor: settings.leaf.baseColor,
    tipColor: settings.leaf.tipColor,
    veinColor: settings.leaf.veinColor,
    cup: settings.leaf.cup,
    curl: settings.leaf.curl,
    twist: sprig.leafTwist,
    edgeWave: settings.leaf.wave,
    serration: settings.leaf.serration,
    serrationCount: 18,
    heartLobes: 0.04,
    midribFold: settings.leaf.length * 0.011,
    veinRelief: settings.leaf.length * 0.0028,
    veinPairs: 8,
    thickness: settings.leaf.length * 0.0045,
    lengthSegments: settings.quality.leafLengthSegments,
    widthSegments: settings.quality.leafWidthSegments,
    surfaceTextures: textures.leaf,
    textureNormalStrength: 0.2,
    surfaceQuality: settings.quality,
    roughness: 0.8,
  }
  return (
    <group position={position} name={`flower.${species}.foliage.${index}`}>
      <StemBetween
        name={`flower.${species}.foliage.${index}.rachis`}
        start={[0, 0, 0]}
        end={sprig.branchEnd}
        radius={0.014}
        color={settings.stem.color}
        radialSegments={settings.quality.stemRadialSegments}
      />
      <BroadLeaf
        name={`flower.${species}.foliage.${index}.terminal`}
        position={sprig.leaves[0].position}
        direction={sprig.leaves[0].direction}
        surfaceNormal={sprig.leaves[0].surfaceNormal}
        scale={sprig.leaves[0].scale}
        {...leafProps}
      />
      <BroadLeaf
        name={`flower.${species}.foliage.${index}.upper`}
        position={sprig.leaves[1].position}
        direction={sprig.leaves[1].direction}
        surfaceNormal={sprig.leaves[1].surfaceNormal}
        scale={sprig.leaves[1].scale}
        {...leafProps}
      />
      <BroadLeaf
        name={`flower.${species}.foliage.${index}.lower`}
        position={sprig.leaves[2].position}
        direction={sprig.leaves[2].direction}
        surfaceNormal={sprig.leaves[2].surfaceNormal}
        scale={sprig.leaves[2].scale}
        {...leafProps}
      />
    </group>
  )
}

function StudioRoseAssembly({
  species,
  bloomRef,
  parameters,
}: {
  species: Extract<EditableFlowerSpeciesId, 'rose' | 'classic-rose'>
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const schema = species === 'classic-rose'
    ? CLASSIC_ROSE_PARAMETERS
    : ROSE_PARAMETERS
  const classicBlueprint = useMemo(
    () => species === 'classic-rose'
      ? createClassicRoseBlueprint(parameters)
      : null,
    [parameters, species],
  )
  const resolvedParameters = classicBlueprint?.parameters ?? parameters
  const settings = classicBlueprint?.settings ??
    resolveEditableFlowerSettings(schema, resolvedParameters)
  const textures = useFlowerSurfaceTextures(species)
  const readNumber = (id: string) =>
    readFlowerNumber(schema, resolvedParameters, id)
  const headStemBend = readNumber('headStemBend')
  const stemLayout = useMemo(
    () => classicBlueprint?.stemLayout ?? createWeightedStemLayout({
      base: [0, STEM_BASE_Y, 0],
      length: settings.stem.length,
      headBendDegrees: headStemBend,
      azimuthDegrees: BLOOM_FRAME_PROFILES[species].azimuth,
      stemCurve: settings.stem.curve,
      bendStart: 0.56,
      bloomAxis: [0, 1, 0],
      socketDepth: 0.1,
      sampleCount: 40,
    }),
    [
      classicBlueprint,
      headStemBend,
      settings.stem.curve,
      settings.stem.length,
      species,
    ],
  )
  const petalCount = Math.round(readNumber('petalCount'))
  const calyxCount = Math.round(readNumber('calyxCount'))
  const petalShape: StudioPetalShape = {
    length: settings.petal.length,
    stemWidth: (settings.petal.widthProfile?.[0] ?? 0.1) * settings.petal.width,
    stemEnd: 0.04,
    widths: [
      (settings.petal.widthProfile?.[1] ?? 0.53) * settings.petal.width,
      (settings.petal.widthProfile?.[2] ?? 0.93) * settings.petal.width,
      settings.petal.width,
      (settings.petal.widthProfile?.[4] ?? 0.67) * settings.petal.width,
      (settings.petal.widthProfile?.[5] ?? 0.067) * settings.petal.width,
    ],
    tipWidth: species === 'classic-rose' ? settings.petal.tipWidth : 0,
    tipArc: species === 'classic-rose' ? 0.065 : 0,
    curlClosed: species === 'classic-rose' ? 1.9 : 2.65,
    curlOpen: settings.petal.curl ?? -0.35,
    curlBias: settings.petal.curlBias ?? 2.3,
    propagation: 1.2,
    cup: settings.petal.cup ?? 0.4,
    sideCurl: settings.petal.sideCurl ?? 0.45,
    waveAmplitude: settings.petal.wave ?? 0.035,
    waveFrequency: settings.petal.waveCount ?? 11,
    asymmetry: settings.petal.asymmetry ?? 0.08,
    noiseAmplitude: 0.045,
    noiseFrequency: 5,
    shellGap: species === 'classic-rose' ? 0.08 : 0.04,
    wrapWidth: species === 'classic-rose' ? 0.18 : 0.08,
    wrapCup: 0.72,
  }
  const manualPetalPalette = [
    settings.petal.tipColor,
    settings.petal.mainColor,
    settings.petal.baseColor,
    settings.petal.veinColor,
    '#9B1F46',
  ] as const
  const colorPreset = species === 'classic-rose'
    ? classicBlueprint?.colorPreset ??
      resolveRoseColorPreset(
        readFlowerString(schema, resolvedParameters, 'colorVariant'),
      )
    : null
  const petalPalette = classicBlueprint?.palette ??
    colorPreset?.palette ?? manualPetalPalette
  const greenSepal: RibbonGeometryOptions = classicBlueprint?.sepal ?? {
    ...PETAL_MORPHOLOGIES.sunflowerRay,
    length: 0.36,
    width: 0.082,
    baseWidth: 0.02,
    tipWidth: 0.008,
    cup: -0.025,
    curl: 0.09,
    sideCurl: 0.012,
    wave: 0.006,
    thickness: 0.001,
    baseColor: '#315927',
    centerColor: '#4E742F',
    tipColor: '#6E8E3C',
    lengthSegments: settings.quality.petalLengthSegments,
    widthSegments: settings.quality.petalWidthSegments,
  }
  const goldenAngle = readNumber('goldenAngle')
  const layoutRadius = readNumber('layoutRadius')
  const attachment = classicBlueprint?.attachment ??
    resolveRoseAttachmentProfile(species, layoutRadius)
  const radiusBias = readNumber('radiusBias')
  const receptacleHeight = readNumber('receptacleHeight')
  const heightBias = readNumber('heightBias')
  const innerScale = readNumber('innerScale')
  const innerTilt = readNumber('innerTilt')
  const outerAngle = readNumber('outerAngle')
  const tiltBias = readNumber('tiltBias')
  const petalJitter = readNumber('petalJitter')
  const crownLayout = useMemo(
    () => classicBlueprint?.crownLayout ?? createRoseCrownLayout({
      count: petalCount,
      goldenAngle,
      radius: layoutRadius,
      radiusBias,
      height: receptacleHeight,
      heightBias,
      scaleInner: innerScale,
      tiltInner: innerTilt * Math.PI / 180,
      outAngle: outerAngle,
      tiltBias,
      jitter: petalJitter,
    }),
    [
      classicBlueprint,
      goldenAngle,
      heightBias,
      innerScale,
      innerTilt,
      layoutRadius,
      outerAngle,
      petalCount,
      petalJitter,
      radiusBias,
      receptacleHeight,
      tiltBias,
    ],
  )
  const bloomScale = readNumber('bloomScale')
  const firstLeafPosition = classicBlueprint?.leafSprigs[0].position ??
    sampleWeightedStemPoint(
      stemLayout,
      (settings.leaf.height - STEM_BASE_Y) / settings.stem.length,
    )
  const secondLeafPosition = classicBlueprint?.leafSprigs[1].position ?? (() => {
    const node = sampleWeightedStemPoint(
      stemLayout,
      (settings.leaf.height + 0.5 - STEM_BASE_Y) / settings.stem.length,
    )
    return [node[0], node[1], node[2] - 0.02] as Vector3Tuple
  })()

  return (
    <>
      {settings.stem.visible && (
        <CurvedStem
          name={`flower.${species}.stem`}
          points={stemLayout.stemPoints}
          radius={settings.stem.radius}
          color={settings.stem.color}
          tubularSegments={32}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      <ThornBatch
        count={Math.round(readNumber('thornCount'))}
        radius={settings.stem.radius}
        stemLayout={stemLayout}
      />
      {settings.leaf.visible && (
        <>
          <RoseLeafSprig
            species={species}
            index={1}
            position={firstLeafPosition}
            direction={1}
            settings={settings}
            textures={textures}
          />
          <RoseLeafSprig
            species={species}
            index={2}
            position={secondLeafPosition}
            direction={-1}
            settings={settings}
            textures={textures}
          />
        </>
      )}
      <group
        ref={bloomRef}
        position={[
          stemLayout.bloomPosition[0],
          stemLayout.bloomPosition[1],
          stemLayout.bloomPosition[2] + attachment.bloomDepth,
        ]}
        rotation={stemLayout.bloomRotation}
        name={`flower.${species}.bloom`}
      >
        <group scale={bloomScale}>
          <mesh
            name={`flower.${species}.receptacle`}
            position={[0, attachment.receptaclePositionY, 0]}
            scale={attachment.receptacleScale}
            castShadow={settings.quality.detailShadows}
          >
            <sphereGeometry args={[1, 24, 14]} />
            <meshStandardMaterial color="#55763B" roughness={0.84} />
          </mesh>
          {Array.from({ length: calyxCount }, (_, index) => {
            const angle = index / calyxCount * Math.PI * 2 + 0.16
            return (
              <group
                key={index}
                position={[
                  Math.sin(angle) * attachment.sepalRootRadius,
                  attachment.sepalRootY,
                  Math.cos(angle) * attachment.sepalRootRadius,
                ]}
                rotation={[0, angle, Math.PI * 0.68]}
              >
                <Petal
                  name={`flower.${species}.sepal.${index + 1}`}
                  options={greenSepal}
                  rotation={[0, (index % 2 ? 1 : -1) * 0.035, 0]}
                  scale={0.9 + (index % 3) * 0.035}
                  roughness={0.76}
                  surfaceTextures={textures.leaf}
                  textureNormalStrength={0.2}
                  surfaceQuality={settings.quality}
                />
              </group>
            )
          })}
          {settings.petal.visible && colorPreset && (
            <>
              {(['inner', 'transition', 'cup', 'guard'] as const).map((band) => (
                <RosePetalBatch
                  key={band}
                  name={`flower.${species}.petals.${band}.studio`}
                  placements={classicBlueprint!.crownBands[band].placements}
                  shape={classicBlueprint!.crownBands[band].shape}
                  palette={petalPalette}
                  pattern={colorPreset.pattern}
                  bloomMax={readNumber('bloomLimit')}
                  transition={readNumber('bloomTransition')}
                  windAmplitude={0.012}
                  windSpeed={1.35}
                  windHeading={35}
                  flat={settings.petal.flatShading}
                  lengthSegments={settings.quality.petalLengthSegments}
                  widthSegments={settings.quality.petalWidthSegments}
                  surfaceTextures={textures.petal}
                  roughness={settings.petal.roughness}
                  sheen={settings.petal.sheen}
                  transmission={settings.petal.transmission}
                  textureNormalStrength={settings.petal.textureNormalStrength}
                />
              ))}
            </>
          )}
          {settings.petal.visible && !colorPreset && (
            <RosePetalBatch
              name={`flower.${species}.petals.studio`}
              placements={crownLayout}
              shape={petalShape}
              palette={petalPalette}
              bloomMax={readNumber('bloomLimit')}
              transition={readNumber('bloomTransition')}
              windAmplitude={0.025}
              windSpeed={1.5}
              windHeading={35}
              flat={settings.petal.flatShading}
              lengthSegments={settings.quality.petalLengthSegments}
              widthSegments={settings.quality.petalWidthSegments}
              surfaceTextures={textures.petal}
              roughness={settings.petal.roughness}
              sheen={settings.petal.sheen}
              transmission={settings.petal.transmission}
              textureNormalStrength={settings.petal.textureNormalStrength}
            />
          )}
        </group>
      </group>
    </>
  )
}

export function RoseAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  return (
    <StudioRoseAssembly
      species="rose"
      bloomRef={bloomRef}
      parameters={parameters}
    />
  )
}

export function ClassicRoseAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  return (
    <StudioRoseAssembly
      species="classic-rose"
      bloomRef={bloomRef}
      parameters={parameters}
    />
  )
}
