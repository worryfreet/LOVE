import { useMemo } from 'react'
import type { Group } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerBoolean,
  readFlowerNumber,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { DANDELION_PARAMETERS } from '@/entities/model/model/flowers/dandelionParameters'
import {
  CurvedStem,
  DandelionLiguleSpiral,
} from '../core/FlowerPrimitives'
import { PinnatifidLeaf } from '../core/PinnatifidLeaf'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import { PETAL_MORPHOLOGIES } from '../core/petalMorphologies'
import type { RibbonGeometryOptions } from '../core/types'
import {
  BLOOM_FRAME_PROFILES,
  DANDELION_HEAD_DEPTHS,
} from '../core/layout'
import { createWeightedStemLayout } from '../core/weightedStem'
import {
  SunflowerOrganBatch,
  createSunflowerOrganPlacements,
} from './SunflowerHeadBatches'

const STEM_BASE_Y = -0.58

export function DandelionAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const settings = resolveEditableFlowerSettings(DANDELION_PARAMETERS, parameters)
  const textures = useFlowerSurfaceTextures('dandelion')
  const readNumber = (id: string) => readFlowerNumber(DANDELION_PARAMETERS, parameters, id)
  const headStemBend = readNumber('headStemBend')
  const stemLayout = useMemo(() => createWeightedStemLayout({
    base: [0, STEM_BASE_Y, 0],
    length: settings.stem.length,
    headBendDegrees: headStemBend,
    azimuthDegrees: BLOOM_FRAME_PROFILES.dandelion.azimuth,
    stemCurve: settings.stem.curve,
    bendStart: 0.46,
    bloomAxis: [0, 0, 1],
    socketDepth: 0.08,
    sampleCount: 38,
  }), [headStemBend, settings.stem.curve, settings.stem.length])
  const rootRadius = readNumber('rootRadius')
  const petal: RibbonGeometryOptions = {
    ...settings.petal,
    ...PETAL_MORPHOLOGIES.dandelionLigule,
  }
  const bract: RibbonGeometryOptions = {
    ...PETAL_MORPHOLOGIES.sunflowerRay,
    length: readNumber('calyxLength'),
    width: 0.055,
    baseWidth: 0.018,
    tipWidth: 0.005,
    cup: -0.015,
    curl: 0.055,
    sideCurl: 0.006,
    wave: 0.003,
    waveCount: 3,
    asymmetry: 0.02,
    thickness: 0.0008,
    baseColor: '#315322',
    centerColor: '#557730',
    tipColor: '#789246',
    lengthSegments: settings.quality.petalLengthSegments,
    widthSegments: settings.quality.petalWidthSegments,
  }
  const material = {
    roughness: settings.petal.roughness,
    sheen: settings.petal.sheen,
    transmission: settings.petal.transmission,
    sheenColor: settings.petal.tipColor,
    flatShading: settings.petal.flatShading,
    surfaceTextures: textures.petal,
    textureNormalStrength: settings.petal.textureNormalStrength,
    surfaceQuality: settings.quality,
  }
  const innerBracts = createSunflowerOrganPlacements({
    count: Math.round(readNumber('calyxCount')),
    radius: rootRadius * 0.9,
    depth: DANDELION_HEAD_DEPTHS.involucre,
    tilt: -0.18,
    scale: 0.92,
    phase: 0.08,
    seed: 1810,
    radiusJitter: 0.025,
    depthJitter: 0.018,
    tint: ['#315322', '#789246'],
  })
  const outerBracts = createSunflowerOrganPlacements({
    count: Math.max(10, Math.round(readNumber('calyxCount') * 0.68)),
    radius: rootRadius,
    depth: DANDELION_HEAD_DEPTHS.involucre - 0.035,
    tilt: -0.36,
    scale: 0.96,
    phase: Math.PI / 11,
    seed: 1809,
    radiusJitter: 0.04,
    depthJitter: 0.022,
    tint: ['#29481E', '#66833B'],
  })

  return (
    <>
      {readFlowerBoolean(DANDELION_PARAMETERS, parameters, 'rootVisible') && (
        <group name="flower.dandelion.root-neck">
          <mesh position={[0, STEM_BASE_Y - 0.03, 0]} scale={[0.15, 0.1, 0.13]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#5E552D" roughness={0.96} />
          </mesh>
          {Array.from({ length: 5 }, (_, index) => {
            const angle = index / 5 * Math.PI * 2
            return (
              <CurvedStem
                key={index}
                name={`flower.dandelion.root.${index + 1}`}
                points={[
                  [0, STEM_BASE_Y - 0.04, 0],
                  [Math.cos(angle) * 0.12, STEM_BASE_Y - 0.25, Math.sin(angle) * 0.12],
                  [Math.cos(angle) * 0.18, STEM_BASE_Y - 0.48, Math.sin(angle) * 0.18],
                ]}
                radius={0.012}
                color="#765E32"
                tubularSegments={10}
                radialSegments={6}
              />
            )
          })}
        </group>
      )}
      {settings.stem.visible && (
        <CurvedStem
          name="flower.dandelion.scape"
          points={stemLayout.stemPoints}
          radius={settings.stem.radius}
          color={settings.stem.color}
          tubularSegments={30}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      {settings.leaf.visible && (
        <group name="flower.dandelion.rosette">
          {Array.from({ length: 13 }, (_, index) => {
            const angle = index / 13 * Math.PI * 2
            const scale = 0.84 + (index % 5) * 0.085
            const pitch = index % 5 === 0
              ? -1.06 - (index % 3) * 0.04
              : -1.39 + (index % 3) * 0.035
            const radialX = Math.sin(angle)
            const radialZ = Math.cos(angle)
            const roll = index % 2 === 0 ? -0.24 : 0.24
            return (
              <PinnatifidLeaf
                key={index}
                name={`flower.dandelion.foliage.${index + 1}`}
                length={settings.leaf.length * (0.82 + (index % 5) * 0.055)}
                width={settings.leaf.width * 0.78 * (0.88 + (index % 4) * 0.045)}
                position={[Math.sin(angle) * 0.035, settings.leaf.height, Math.cos(angle) * 0.035]}
                direction={[
                  radialX,
                  0.08 + Math.cos(pitch) * 0.16,
                  radialZ,
                ]}
                surfaceNormal={[
                  -radialX * 0.12 + radialZ * roll,
                  0.94,
                  -radialZ * 0.12 - radialX * roll,
                ]}
                scale={scale}
                lobePairs={6 + (index % 3)}
                notchDepth={0.44 + (index % 4) * 0.025}
                cup={settings.leaf.cup}
                curl={settings.leaf.curl}
                twist={(index % 3 - 1) * 0.055}
                thickness={settings.leaf.length * 0.004}
                lengthSegments={Math.max(48, settings.quality.leafLengthSegments * 2)}
                widthSegments={Math.max(10, settings.quality.leafWidthSegments)}
                baseColor={settings.leaf.baseColor}
                tipColor={settings.leaf.tipColor}
                veinColor={settings.leaf.veinColor}
                surfaceTextures={textures.leaf}
                textureNormalStrength={0.28}
                surfaceQuality={settings.quality}
              />
            )
          })}
        </group>
      )}
      <group
        ref={bloomRef}
        position={stemLayout.bloomPosition}
        rotation={stemLayout.bloomRotation}
        scale={readNumber('headScale')}
        name="flower.dandelion.bloom"
      >
        <SunflowerOrganBatch
          name="flower.dandelion.involucre"
          options={bract}
          placements={innerBracts}
          textures={textures.leaf}
          quality={settings.quality}
          roughness={0.8}
          sheenColor="#789246"
          textureNormalStrength={0.2}
        />
        <SunflowerOrganBatch
          name="flower.dandelion.involucre.outer"
          options={{
            ...bract,
            length: bract.length * 1.12,
            width: bract.width * 0.86,
            curl: (bract.curl ?? 0) * 1.18,
          }}
          placements={outerBracts}
          textures={textures.leaf}
          quality={settings.quality}
          roughness={0.82}
          sheenColor="#66833B"
          textureNormalStrength={0.2}
        />
        {settings.petal.visible && (
          <DandelionLiguleSpiral
            name="flower.dandelion.ligules.continuous-phyllotaxis"
            options={petal}
            count={Math.round(
              readNumber('outerCount') +
              readNumber('middleCount') +
              readNumber('innerCount'),
            )}
            radius={rootRadius}
            innerDepth={DANDELION_HEAD_DEPTHS.inner + 0.13}
            outerDepth={DANDELION_HEAD_DEPTHS.outer - 0.025}
            innerScale={0.23}
            outerScale={1.04}
            innerTilt={readNumber('innerTilt') * Math.PI / 180 + 0.2}
            middleTilt={readNumber('middleTilt') * Math.PI / 180}
            outerTilt={readNumber('outerTilt') * Math.PI / 180}
            seed={1811}
            {...material}
          />
        )}
      </group>
    </>
  )
}
