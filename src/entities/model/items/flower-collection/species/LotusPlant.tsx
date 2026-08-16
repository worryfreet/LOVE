import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { Group } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerColor,
  readFlowerNumber,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { LOTUS_PARAMETERS } from '@/entities/model/model/flowers/lotusParameters'
import { CurvedStem } from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import { PeltateLeaf } from '../core/PeltateLeaf'
import { PETAL_MORPHOLOGIES } from '../core/petalMorphologies'
import type { RibbonGeometryOptions } from '../core/types'
import {
  BLOOM_FRAME_PROFILES,
  createLotusPetalPlacements,
} from '../core/layout'
import { createWeightedStemLayout } from '../core/weightedStem'
import { LotusPetalBatch } from '../core/LotusPetalBatch'

const STEM_BASE_Y = -0.58

function LotusStamens({
  count,
  radius,
  length,
  color,
  radialSegments,
}: {
  count: number
  radius: number
  length: number
  color: string
  radialSegments: number
}) {
  const filaments = useRef<InstancedMesh>(null)
  const anthers = useRef<InstancedMesh>(null)
  const placements = useMemo(() => Array.from({ length: count }, (_, index) => {
    const layer = index % 3
    const angle = index * Math.PI * (3 - Math.sqrt(5)) + layer * 0.045
    const baseRadius = radius * (0.88 + layer * 0.18)
    const base = new Vector3(Math.sin(angle) * baseRadius, Math.cos(angle) * baseRadius, 0.36)
    const tip = new Vector3(
      Math.sin(angle) * (baseRadius + length * 0.28),
      Math.cos(angle) * (baseRadius + length * 0.28),
      0.36 + length * (1.12 - layer * 0.07 + Math.sin(index * 1.37) * 0.045),
    )
    return { base, tip, angle }
  }), [count, length, radius])

  useLayoutEffect(() => {
    if (!filaments.current || !anthers.current) return
    const dummy = new Object3D()
    const up = new Vector3(0, 1, 0)
    placements.forEach(({ base, tip, angle }, index) => {
      const direction = tip.clone().sub(base)
      dummy.position.copy(base).add(tip).multiplyScalar(0.5)
      dummy.quaternion.copy(new Quaternion().setFromUnitVectors(up, direction.clone().normalize()))
      dummy.scale.set(1, direction.length(), 1)
      dummy.updateMatrix()
      filaments.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.copy(tip)
      dummy.rotation.set(0.2, angle, angle)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      anthers.current?.setMatrixAt(index, dummy.matrix)
    })
    filaments.current.instanceMatrix.needsUpdate = true
    anthers.current.instanceMatrix.needsUpdate = true
  }, [placements])

  return (
    <group name="flower.lotus.stamens">
      <instancedMesh ref={filaments} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.006, 0.008, 1, radialSegments]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </instancedMesh>
      <instancedMesh ref={anthers} args={[undefined, undefined, count]} castShadow>
        <capsuleGeometry args={[0.012, 0.034, 3, 6]} />
        <meshStandardMaterial color="#F6C62E" roughness={0.68} />
      </instancedMesh>
    </group>
  )
}

export function LotusAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const settings = resolveEditableFlowerSettings(LOTUS_PARAMETERS, parameters)
  const textures = useFlowerSurfaceTextures('lotus')
  const readNumber = (id: string) => readFlowerNumber(LOTUS_PARAMETERS, parameters, id)
  const readColor = (id: string) => readFlowerColor(LOTUS_PARAMETERS, parameters, id)
  const headStemBend = readNumber('headStemBend')
  const stemLayout = useMemo(() => createWeightedStemLayout({
    base: [0, STEM_BASE_Y, 0],
    length: settings.stem.length,
    headBendDegrees: headStemBend,
    azimuthDegrees: BLOOM_FRAME_PROFILES.lotus.azimuth,
    stemCurve: settings.stem.curve,
    bendStart: 0.5,
    bloomAxis: [0, 0, 1],
    socketDepth: 0.1,
    sampleCount: 40,
  }), [headStemBend, settings.stem.curve, settings.stem.length])
  const petal: RibbonGeometryOptions = {
    ...settings.petal,
    ...PETAL_MORPHOLOGIES.lotusPetal,
  }
  const innerPetal: RibbonGeometryOptions = {
    ...settings.petal,
    ...PETAL_MORPHOLOGIES.lotusInnerPetal,
    length: settings.petal.length * 0.84,
    width: settings.petal.width * 0.78,
    cup: (settings.petal.cup ?? 0.18) * 1.26,
    curl: (settings.petal.curl ?? 0) * 0.35,
  }
  const middlePetal: RibbonGeometryOptions = {
    ...petal,
    length: petal.length * 0.92,
    width: petal.width * 1.12,
    cup: (petal.cup ?? 0.18) * 1.14,
    curl: (petal.curl ?? 0) * 0.72,
  }
  const outerCount = Math.round(readNumber('outerCount'))
  const middleCount = Math.round(readNumber('middleCount'))
  const innerCount = Math.round(readNumber('innerCount'))
  const outerTilt = readNumber('outerTilt')
  const middleTilt = readNumber('middleTilt')
  const innerTilt = readNumber('innerTilt')
  const outerScale = readNumber('outerScale')
  const middleScale = readNumber('middleScale')
  const innerScale = readNumber('innerScale')
  const petalCount = outerCount + middleCount + innerCount
  const petalPlacements = useMemo(
    () => createLotusPetalPlacements(petalCount, 1800, {
      innerCount,
      middleCount,
      innerTilt,
      middleTilt,
      outerTilt,
      innerScale,
      middleScale,
      outerScale,
    }),
    [
      innerCount, innerScale, innerTilt, middleCount, middleScale, middleTilt,
      outerScale, outerTilt, petalCount,
    ],
  )
  const material = {
    roughness: settings.petal.roughness,
    sheen: settings.petal.sheen,
    transmission: settings.petal.transmission,
    sheenColor: settings.petal.tipColor,
    flatShading: settings.petal.flatShading,
    surfaceTextures: textures.petal,
    textureNormalStrength: settings.petal.textureNormalStrength,
    surfaceQuality: settings.quality,
    opacity: 1,
  }
  const bloomScale = readNumber('bloomScale')
  const receptacleSize = readNumber('receptacleSize')

  return (
    <>
      {settings.stem.visible && (
        <CurvedStem
          name="flower.lotus.stem"
          points={stemLayout.stemPoints}
          radius={settings.stem.radius}
          color={settings.stem.color}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      {settings.leaf.visible && (
        <group name="flower.lotus.foliage">
          <CurvedStem name="flower.lotus.leaf-stem.1" points={[[0, STEM_BASE_Y, 0], [-0.48, -0.12, -0.08], [-0.78, settings.leaf.height, -0.18]]} radius={settings.stem.radius * 0.54} color={settings.stem.color} radialSegments={settings.quality.stemRadialSegments} />
          <CurvedStem name="flower.lotus.leaf-stem.2" points={[[0, STEM_BASE_Y, 0], [0.5, 0.06, -0.06], [0.92, settings.leaf.height + 0.18, -0.22]]} radius={settings.stem.radius * 0.5} color={settings.stem.color} radialSegments={settings.quality.stemRadialSegments} />
          <PeltateLeaf
            name="flower.lotus.foliage.1"
            radius={settings.leaf.length * 0.72}
            position={[-0.78, settings.leaf.height, -0.18]}
            direction={[-0.86, 0.16, -0.42]}
            surfaceNormal={[0.16, 0.94, 0.3]}
            scale={[1, 0.83, 1]}
            cup={settings.leaf.cup}
            curl={settings.leaf.curl}
            wave={settings.leaf.wave}
            baseColor={settings.leaf.baseColor}
            tipColor={settings.leaf.tipColor}
            veinColor={settings.leaf.veinColor}
            radialSegments={Math.max(24, settings.quality.leafLengthSegments * 2)}
            ringSegments={settings.quality.leafWidthSegments}
            thickness={settings.leaf.length * 0.005}
            veinCount={14}
            veinRelief={settings.leaf.length * 0.009}
            surfaceTextures={textures.leaf}
            textureNormalStrength={0.26}
            surfaceQuality={settings.quality}
          />
          <PeltateLeaf
            name="flower.lotus.foliage.2"
            radius={settings.leaf.length * 0.62}
            position={[0.92, settings.leaf.height + 0.18, -0.22]}
            direction={[0.76, 0.25, -0.52]}
            surfaceNormal={[-0.3, 0.88, 0.38]}
            scale={[1, 0.88, 1]}
            cup={settings.leaf.cup * 0.8}
            curl={settings.leaf.curl * 1.2}
            wave={settings.leaf.wave}
            baseColor={settings.leaf.baseColor}
            tipColor={settings.leaf.tipColor}
            veinColor={settings.leaf.veinColor}
            radialSegments={Math.max(24, settings.quality.leafLengthSegments * 2)}
            ringSegments={settings.quality.leafWidthSegments}
            thickness={settings.leaf.length * 0.0045}
            veinCount={14}
            veinRelief={settings.leaf.length * 0.008}
            surfaceTextures={textures.leaf}
            textureNormalStrength={0.26}
            surfaceQuality={settings.quality}
          />
        </group>
      )}
      <group
        ref={bloomRef}
        position={stemLayout.bloomPosition}
        rotation={stemLayout.bloomRotation}
        scale={bloomScale}
        name="flower.lotus.bloom"
      >
        {settings.petal.visible && (
          <>
            <LotusPetalBatch
              name="flower.lotus.petals.outer"
              options={petal}
              placements={petalPlacements.filter(({ band }) => band === 'outer')}
              {...material}
            />
            <LotusPetalBatch
              name="flower.lotus.petals.middle"
              options={middlePetal}
              placements={petalPlacements.filter(({ band }) => band === 'middle')}
              {...material}
            />
            <LotusPetalBatch
              name="flower.lotus.petals.inner"
              options={innerPetal}
              placements={petalPlacements.filter(({ band }) => band === 'inner')}
              {...material}
            />
          </>
        )}
        <LotusStamens count={Math.round(readNumber('stamenCount'))} radius={receptacleSize * 1.06} length={readNumber('stamenLength')} color={readColor('stamenColor')} radialSegments={Math.min(8, settings.quality.stemRadialSegments)} />
        <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[
            receptacleSize * 0.74,
            receptacleSize * 0.52,
            receptacleSize * 0.46,
            28,
          ]} />
          <meshStandardMaterial color={readColor('receptacleColor')} roughness={0.76} />
        </mesh>
        {Array.from({ length: 13 }, (_, index) => {
          const progress = (index + 0.5) / 13
          const radius = Math.sqrt(progress) * receptacleSize * 0.48
          const angle = index * Math.PI * (3 - Math.sqrt(5))
          return (
            <mesh
              key={index}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.625,
              ]}
              scale={[0.012, 0.012, 0.008]}
            >
              <sphereGeometry args={[1, 8, 5]} />
              <meshStandardMaterial color="#718133" roughness={0.9} />
            </mesh>
          )
        })}
      </group>
    </>
  )
}
