import { useMemo } from 'react'
import type {
  Group,
} from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerBoolean,
  readFlowerColor,
  readFlowerNumber,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { LILY_PARAMETERS } from '@/entities/model/model/flowers/lilyParameters'
import {
  CurvedStem,
  Leaf,
} from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import type { StudioPetalShape } from '../core/studioFlower'
import type {
  StudioFlowerPalette,
  StudioPetalPattern,
} from '../core/StudioPetalMaterial'
import { BLOOM_FRAME_PROFILES } from '../core/layout'
import {
  createWeightedStemLayout,
  sampleWeightedStemPoint,
} from '../core/weightedStem'
import type { WeightedStemLayout } from '../core/weightedStem'
import {
  createLilyTepalPlacements,
  LilyTepalBatch,
} from './LilyTepalBatch'
import { LilyReproductiveSystem } from './LilyReproductiveSystem'

const STEM_BASE_Y = -0.58

/**
 * 百合只冻结物种自己的方位和花喉深度；连续曲率及花头末端联动统一走
 * 单花头共享的受力弯茎模型。
 */
export function createLilyStemLayout(
  stemBaseY: number,
  stemLength: number,
  stemCurve: number,
  headStemBend: number,
): WeightedStemLayout {
  return createWeightedStemLayout({
    base: [0, stemBaseY, 0],
    length: stemLength,
    headBendDegrees: headStemBend,
    azimuthDegrees: BLOOM_FRAME_PROFILES.lily.azimuth,
    stemCurve,
    bendStart: 0.42,
    bloomAxis: [0, 0, 1],
    socketDepth: 0.085,
    sampleCount: 44,
  })
}

const LEAF_PLACEMENTS = [
  { progress: 0.28, side: -1, scale: 1.05, yaw: -0.08 },
  { progress: 0.31, side: 1, scale: 0.96, yaw: 0.16 },
  { progress: 0.48, side: -1, scale: 0.88, yaw: 0.18 },
  { progress: 0.51, side: 1, scale: 0.84, yaw: -0.12 },
  { progress: 0.67, side: -1, scale: 0.67, yaw: -0.16 },
  { progress: 0.7, side: 1, scale: 0.63, yaw: 0.12 },
] as const

export function LilyAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const settings = resolveEditableFlowerSettings(LILY_PARAMETERS, parameters)
  const textures = useFlowerSurfaceTextures('lily')
  const readNumber = (id: string) => readFlowerNumber(LILY_PARAMETERS, parameters, id)
  const readColor = (id: string) => readFlowerColor(LILY_PARAMETERS, parameters, id)
  const profile = settings.petal.widthProfile
  const toWidths = (scale: number) => [
    (profile?.[1] ?? 0.52) * settings.petal.width * scale,
    (profile?.[2] ?? 0.88) * settings.petal.width * scale,
    settings.petal.width * scale,
    (profile?.[4] ?? 0.78) * settings.petal.width * scale,
    (profile?.[5] ?? 0.12) * settings.petal.width * scale,
  ] as const
  const createShape = (
    whorl: 'outer' | 'inner',
  ): StudioPetalShape => ({
    length: settings.petal.length * (whorl === 'inner' ? 0.97 : 1),
    stemWidth: (settings.petal.baseWidth ?? 0.04) *
      (whorl === 'inner' ? 0.92 : 1),
    stemEnd: 0.045,
    widths: toWidths(whorl === 'inner' ? 0.9 : 1),
    curlClosed: 1.55,
    curlOpen: (settings.petal.curl ?? -0.33) + readNumber(
      whorl === 'outer' ? 'outerCurlBoost' : 'innerCurlBoost',
    ),
    curlBias: settings.petal.curlBias ?? 2.8,
    propagation: 1.12,
    cup: (settings.petal.cup ?? 0.18) * (whorl === 'inner' ? 1.12 : 0.92),
    sideCurl: (settings.petal.sideCurl ?? 0.16) *
      (whorl === 'inner' ? 0.86 : 1),
    waveAmplitude: settings.petal.wave ?? 0.018,
    waveFrequency: settings.petal.waveCount ?? 5,
    asymmetry: (settings.petal.asymmetry ?? 0.035) *
      (whorl === 'inner' ? -1 : 1),
    noiseAmplitude: 0.012,
    noiseFrequency: 6,
    shellGap: 0.08,
    wrapWidth: 0.22,
    wrapCup: 0.32,
  })
  const outerShape = createShape('outer')
  const innerShape = createShape('inner')
  const outerTilt = readNumber('outerTilt')
  const innerTilt = readNumber('innerTilt')
  const outerPlacements = useMemo(() => createLilyTepalPlacements({
    whorl: 'outer',
    rootRadius: 0,
    depth: -0.004,
    baseTilt: outerTilt,
    openTilt: 11,
    jitter: 1.6,
  }), [outerTilt])
  const innerPlacements = useMemo(() => createLilyTepalPlacements({
    whorl: 'inner',
    rootRadius: 0,
    depth: 0.004,
    baseTilt: innerTilt,
    openTilt: 8,
    jitter: 1.3,
  }), [innerTilt])
  const palette: StudioFlowerPalette = [
    settings.petal.tipColor,
    '#F7C1D1',
    settings.petal.mainColor,
    settings.petal.baseColor,
    settings.petal.veinColor,
  ]
  const pattern: Omit<
    Extract<StudioPetalPattern, { kind: 'lily' }>,
    'throatLift' | 'tipReflex'
  > = {
    kind: 'lily',
    spotVisible: readFlowerBoolean(LILY_PARAMETERS, parameters, 'spotVisible'),
    spotsPerPetal: readNumber('spotCount') / 6,
    spotColor: readColor('spotColor'),
    veinStrength: settings.petal.veinStrength ?? 0.075,
  }
  const outerPattern: StudioPetalPattern = {
    ...pattern,
    throatLift: 0.2,
    tipReflex: 0.21,
  }
  const innerPattern: StudioPetalPattern = {
    ...pattern,
    throatLift: 0.24,
    tipReflex: 0.15,
  }
  const bloomScale = readNumber('bloomScale')
  const headStemBend = readNumber('headStemBend')
  const stemLayout = useMemo(() => createLilyStemLayout(
    STEM_BASE_Y,
    settings.stem.length,
    settings.stem.curve,
    headStemBend,
  ), [headStemBend, settings.stem.curve, settings.stem.length])

  return (
    <>
      {settings.stem.visible && (
        <CurvedStem
          name="flower.lily.stem"
          points={stemLayout.stemPoints}
          radius={settings.stem.radius}
          color={settings.stem.color}
          tubularSegments={52}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      {settings.leaf.visible && LEAF_PLACEMENTS.map((placement, index) => {
        const node = sampleWeightedStemPoint(stemLayout, placement.progress)
        return <Leaf
          key={index}
          name={`flower.lily.foliage.${index + 1}`}
          length={settings.leaf.length * placement.scale}
          width={settings.leaf.width * (0.92 + placement.scale * 0.08)}
          position={[
            node[0],
            node[1],
            node[2] + placement.side * 0.012,
          ]}
          direction={[
            placement.side * 0.88,
            0.34 + placement.progress * 0.12,
            placement.yaw * 1.8,
          ]}
          surfaceNormal={[
            [0.12, -0.18, 0.82, -0.72, 0.24, -0.26][index],
            0.24 + (index % 3) * 0.04,
            [0.98, -0.96, 0.48, 0.56, 0.94, -0.92][index],
          ]}
          cup={settings.leaf.cup}
          curl={settings.leaf.curl}
          sideCurl={settings.leaf.cup * 0.72}
          twist={placement.side * 0.085}
          tipCurl={settings.leaf.curl * 0.58}
          wave={settings.leaf.wave}
          serration={0}
          keel={0.1}
          veinRelief={settings.leaf.length * 0.0045}
          veinStrength={0.28}
          veinCount={7}
          thickness={settings.leaf.length * 0.0032}
          lengthSegments={settings.quality.leafLengthSegments}
          widthSegments={settings.quality.leafWidthSegments}
          baseColor={settings.leaf.baseColor}
          tipColor={settings.leaf.tipColor}
          veinColor={settings.leaf.veinColor}
          surfaceTextures={textures.leaf}
          textureNormalStrength={0.22}
          surfaceQuality={settings.quality}
          roughness={0.78}
        />
      })}
      <group
        ref={bloomRef}
        position={stemLayout.bloomPosition}
        rotation={stemLayout.bloomRotation}
        scale={bloomScale}
        name="flower.lily.bloom"
      >
        <mesh
          name="flower.lily.receptacle"
          position={[0, 0, -0.035]}
          scale={[0.082, 0.082, 0.14]}
          castShadow={settings.quality.detailShadows}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={settings.stem.color} roughness={0.82} />
        </mesh>
        <mesh
          name="flower.lily.throat-core"
          position={[0, 0, 0.025]}
          scale={[0.055, 0.055, 0.032]}
        >
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#D9C99F" roughness={0.82} />
        </mesh>
        {settings.petal.visible && (
          <group name="flower.lily.tepals.species-whorl">
            <LilyTepalBatch
              whorl="outer"
              shape={outerShape}
              placements={outerPlacements}
              palette={palette}
              pattern={outerPattern}
              bloomMax={0.9}
              transition={0.42}
            />
            <LilyTepalBatch
              whorl="inner"
              shape={innerShape}
              placements={innerPlacements}
              palette={palette}
              pattern={innerPattern}
              bloomMax={0.9}
              transition={0.42}
            />
          </group>
        )}
        <LilyReproductiveSystem
          length={readNumber('stamenLength')}
          antherSize={readNumber('antherSize')}
          filamentColor={readColor('filamentColor')}
          antherColor={readColor('antherColor')}
          stigmaColor={readColor('stigmaColor')}
          stemRadialSegments={settings.quality.stemRadialSegments}
          detailShadows={settings.quality.detailShadows}
        />
      </group>
    </>
  )
}
