import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  InstancedMesh,
  Object3D,
} from 'three'
import type { Group } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerColor,
  readFlowerNumber,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { SUNFLOWER_PARAMETERS } from '@/entities/model/model/flowers/sunflowerParameters'
import {
  BLOOM_FRAME_PROFILES,
  createGoldenDiscPoints,
} from '../core/layout'
import {
  createWeightedStemLayout,
  sampleWeightedStemPoint,
} from '../core/weightedStem'
import { PETAL_MORPHOLOGIES } from '../core/petalMorphologies'
import {
  BroadLeaf,
  CurvedStem,
} from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import type { RibbonGeometryOptions } from '../core/types'
import type { FlowerWindUniforms } from '../core/flowerWindMaterial'
import {
  createSunflowerOrganPlacements,
  SunflowerOrganBatch,
} from './SunflowerHeadBatches'

/** 向日葵装配的模型空间根部标高，外部场景据此贴合可见地形。 */
export const SUNFLOWER_GROUND_Y = -0.58
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const ignoreFlowerRaycast = () => undefined

function GoldenDiscBatch({
  count,
  radius,
  dome,
  innerColor,
  outerColor,
  detailShadows,
}: {
  count: number
  radius: number
  dome: number
  innerColor: string
  outerColor: string
  detailShadows: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  const points = useMemo(
    () => createGoldenDiscPoints(count, radius, dome, 1713),
    [count, dome, radius],
  )
  const instanceColors = useMemo(
    () => new Float32Array(count * 3).fill(1),
    [count],
  )

  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    const inner = new Color(innerColor)
    const outer = new Color(outerColor)
    const pollen = new Color('#D18A24')
    const color = new Color()
    points.forEach((point, index) => {
      const normalizedRadius = Math.hypot(
        point.position.x,
        point.position.y,
      ) / Math.max(radius, 0.0001)
      dummy.position.copy(point.position)
      dummy.position.z += 0.095
      dummy.rotation.set(Math.PI / 2, 0, point.rotation)
      dummy.scale.set(
        0.015 * point.scale,
        0.034 * point.scale,
        0.015 * point.scale,
      )
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
      if (normalizedRadius < 0.26) {
        color.lerpColors(inner, pollen, normalizedRadius / 0.26)
      } else {
        color.lerpColors(pollen, outer, (normalizedRadius - 0.26) / 0.74)
      }
      color.offsetHSL(0, 0, (index % 7 - 3) * 0.006)
      mesh.current?.setColorAt(index, color)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [innerColor, outerColor, points, radius])

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      castShadow={detailShadows}
      raycast={ignoreFlowerRaycast}
    >
      <coneGeometry args={[1, 1.65, 7, 1]} />
      <instancedBufferAttribute attach="instanceColor" args={[instanceColors, 3]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.84}
        emissive="#7A390A"
        emissiveIntensity={0.18}
      />
    </instancedMesh>
  )
}

export function SunflowerAssembly({
  bloomRef,
  parameters,
  windUniforms,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
  windUniforms?: FlowerWindUniforms
}) {
  const settings = resolveEditableFlowerSettings(
    SUNFLOWER_PARAMETERS,
    parameters,
  )
  const textures = useFlowerSurfaceTextures('sunflower')
  const readNumber = (id: string) =>
    readFlowerNumber(SUNFLOWER_PARAMETERS, parameters, id)
  const readColor = (id: string) =>
    readFlowerColor(SUNFLOWER_PARAMETERS, parameters, id)
  const bloomY = SUNFLOWER_GROUND_Y + settings.stem.length
  const outerCount = Math.round(readNumber('outerRayCount'))
  const innerCount = Math.round(readNumber('innerRayCount'))
  const bractCount = Math.round(readNumber('bractCount'))
  const rootRadius = readNumber('rayRootRadius')
  const layerDepth = readNumber('rayLayerDepth')
  const discRadius = readNumber('discRadius')
  const headScale = readNumber('headScale')
  const headStemBend = readNumber('headStemBend') + readNumber('headTilt')
  const lowDetail = settings.quality.quality === 'low'
  const leafProgresses = lowDetail
    ? [0.18, 0.52, 0.78]
    : [0.12, 0.3, 0.49, 0.67, 0.82]
  const stemLayout = useMemo(() => createWeightedStemLayout({
    base: [0, SUNFLOWER_GROUND_Y, 0],
    length: settings.stem.length,
    headBendDegrees: headStemBend,
    azimuthDegrees: BLOOM_FRAME_PROFILES.sunflower.azimuth,
    stemCurve: settings.stem.curve,
    bendStart: 0.5,
    bloomAxis: [0, 0, 1],
    socketDepth: 0.16,
    sampleCount: 42,
  }), [headStemBend, settings.stem.curve, settings.stem.length])
  const middleCount = Math.max(22, Math.round((outerCount + innerCount) * 0.38))
  const rayBaseRadius = Math.max(rootRadius, discRadius * 1.04)
  const petal: RibbonGeometryOptions = {
    ...settings.petal,
    ...PETAL_MORPHOLOGIES.sunflowerRay,
  }
  const bract: RibbonGeometryOptions = {
    ...PETAL_MORPHOLOGIES.sunflowerRay,
    length: readNumber('bractLength'),
    width: settings.petal.width * 0.82,
    baseWidth: settings.petal.baseWidth,
    tipWidth: settings.petal.tipWidth,
    cup: -0.045,
    curl: 0.09,
    sideCurl: 0.018,
    wave: 0.006,
    waveCount: 3,
    asymmetry: 0.03,
    thickness: 0.001,
    baseColor: '#294B20',
    centerColor: '#45672C',
    tipColor: '#718C43',
    lengthSegments: settings.quality.petalLengthSegments,
    widthSegments: settings.quality.petalWidthSegments,
  }
  const petalMaterial = {
    roughness: settings.petal.roughness,
    sheen: settings.petal.sheen,
    transmission: settings.petal.transmission,
    sheenColor: settings.petal.tipColor,
    flatShading: settings.petal.flatShading,
    surfaceTextures: textures.petal,
    textureNormalStrength: settings.petal.textureNormalStrength,
    surfaceQuality: settings.quality,
  }
  const outerRays = useMemo(() => createSunflowerOrganPlacements({
    count: outerCount,
    radius: rayBaseRadius * 1.03,
    depth: -0.055,
    tilt: -0.12,
    scale: 1.05,
    phase: 0.04,
    seed: 1711,
    tint: ['#E28A00', '#FFBF16'],
  }), [outerCount, rayBaseRadius])
  const middleRays = useMemo(() => createSunflowerOrganPlacements({
    count: middleCount,
    radius: rayBaseRadius * 1.015,
    depth: layerDepth * 1.25,
    tilt: 0.19,
    scale: 0.86,
    phase: GOLDEN_ANGLE * 2,
    seed: 1714,
    tint: ['#C96B00', '#F7AA08'],
  }), [layerDepth, middleCount, rayBaseRadius])
  const innerRays = useMemo(() => createSunflowerOrganPlacements({
    count: innerCount,
    radius: rayBaseRadius,
    depth: layerDepth * 2.15,
    tilt: 0.3,
    scale: 0.82,
    phase: GOLDEN_ANGLE,
    seed: 1712,
    tint: ['#B85A00', '#E99200'],
  }), [innerCount, layerDepth, rayBaseRadius])
  const outerBracts = useMemo(() => createSunflowerOrganPlacements({
    count: bractCount,
    radius: rootRadius * 0.92,
    depth: -0.12,
    tilt: -0.55,
    scale: 1.06,
    phase: 0.12,
    seed: 1710,
    depthJitter: 0.035,
    tiltJitter: 0.1,
    tint: ['#29481E', '#597A33'],
  }), [bractCount, rootRadius])
  const innerBracts = useMemo(() => createSunflowerOrganPlacements({
    count: Math.max(12, Math.round(bractCount * 0.72)),
    radius: rootRadius * 0.76,
    depth: -0.08,
    tilt: -0.34,
    scale: 0.82,
    phase: GOLDEN_ANGLE,
    seed: 1709,
    tint: ['#355327', '#688443'],
  }), [bractCount, rootRadius])

  return (
    <>
      {settings.stem.visible && (
        <CurvedStem
          name="flower.sunflower.stem"
          points={stemLayout.stemPoints}
          radius={settings.stem.radius}
          color={settings.stem.color}
          tubularSegments={lowDetail ? 18 : 36}
          radialSegments={settings.quality.stemRadialSegments}
          castShadow={settings.quality.detailShadows}
        />
      )}
      {settings.leaf.visible && leafProgresses.map((progress, index) => {
        const angle = index * GOLDEN_ANGLE + 0.42
        const y = settings.leaf.height +
          progress * (bloomY - settings.leaf.height - 0.34)
        const scale = 1.08 - index * 0.08
        const node = sampleWeightedStemPoint(
          stemLayout,
          (y - SUNFLOWER_GROUND_Y) / settings.stem.length,
        )
        const petioleLength = 0.36 + (index % 3) * 0.045
        const petioleEnd: [number, number, number] = [
          node[0] + Math.cos(angle) * petioleLength,
          node[1] + 0.035,
          node[2] + Math.sin(angle) * petioleLength,
        ]
        const radialX = Math.cos(angle)
        const radialZ = Math.sin(angle)
        const tangentX = -radialZ
        const tangentZ = radialX
        const roll = (index % 2 === 0 ? -1 : 1) * (0.2 + index * 0.025)
        const lift = [0.24, 0.32, 0.27, 0.18, 0.12][index]
        return (
          <group key={index}>
            <CurvedStem
              name={`flower.sunflower.petiole.${index + 1}`}
              points={[
                node,
                [
                  node[0] + Math.cos(angle) * petioleLength * 0.5,
                  node[1] + 0.02,
                  node[2] + Math.sin(angle) * petioleLength * 0.46,
                ],
                petioleEnd,
              ]}
              radius={settings.stem.radius * 0.24}
              color={settings.stem.color}
              tubularSegments={lowDetail ? 6 : 12}
              radialSegments={settings.quality.stemRadialSegments}
              castShadow={settings.quality.detailShadows}
            />
            <BroadLeaf
              name={`flower.sunflower.foliage.${index + 1}`}
              length={settings.leaf.length}
              width={settings.leaf.width}
              position={petioleEnd}
              direction={[radialX, lift, radialZ]}
              surfaceNormal={[
                tangentX * (0.82 + Math.abs(roll)),
                0.34 + index * 0.025,
                tangentZ * (0.82 + Math.abs(roll)),
              ]}
              scale={scale}
              cup={settings.leaf.cup}
              curl={settings.leaf.curl}
              twist={roll * 0.18}
              edgeWave={settings.leaf.wave * 1.15}
              serration={settings.leaf.serration}
              serrationCount={20}
              heartLobes={0.64}
              midribFold={settings.leaf.length * 0.012}
              veinRelief={settings.leaf.length * 0.003}
              veinPairs={9}
              thickness={settings.leaf.length * 0.006}
              lengthSegments={settings.quality.leafLengthSegments}
              widthSegments={settings.quality.leafWidthSegments}
              baseColor={settings.leaf.baseColor}
              tipColor={settings.leaf.tipColor}
              veinColor={settings.leaf.veinColor}
              surfaceTextures={textures.leaf}
              textureNormalStrength={0.2}
              surfaceQuality={settings.quality}
              roughness={0.82}
            />
          </group>
        )
      })}

      <group
        ref={bloomRef}
        position={stemLayout.bloomPosition}
        rotation={stemLayout.bloomRotation}
        scale={headScale}
        name="flower.sunflower.bloom"
      >
        <mesh
          name="flower.sunflower.receptacle"
          position={[0, 0, -0.17]}
          scale={[rootRadius * 1.14, rootRadius * 1.14, rootRadius * 0.78]}
          castShadow={settings.quality.detailShadows}
        >
          <sphereGeometry args={[1, lowDetail ? 12 : 28, lowDetail ? 8 : 16]} />
          <meshStandardMaterial color="#426127" roughness={0.88} />
        </mesh>
        <SunflowerOrganBatch
          name="flower.sunflower.bracts.outer"
          options={bract}
          placements={outerBracts}
          textures={textures.leaf}
          quality={settings.quality}
          roughness={0.76}
          sheenColor="#789246"
          emissive="#355B28"
          emissiveIntensity={0.055}
          textureNormalStrength={0.2}
          windUniforms={windUniforms}
        />
        {!lowDetail && (
          <SunflowerOrganBatch
            name="flower.sunflower.bracts.inner"
            options={{
              ...bract,
              length: bract.length * 0.72,
              width: bract.width * 0.88,
              curl: bract.curl! * 0.72,
            }}
            placements={innerBracts}
            textures={textures.leaf}
            quality={settings.quality}
            roughness={0.78}
            sheenColor="#789246"
            emissive="#3D642E"
            emissiveIntensity={0.05}
            textureNormalStrength={0.18}
            windUniforms={windUniforms}
          />
        )}
        {settings.petal.visible && (
          <>
            <SunflowerOrganBatch
              name="flower.sunflower.ray.outer"
              options={petal}
              placements={outerRays}
              textures={textures.petal}
              quality={settings.quality}
              roughness={petalMaterial.roughness}
              sheen={petalMaterial.sheen}
              transmission={petalMaterial.transmission}
              sheenColor={settings.petal.tipColor}
              textureNormalStrength={petalMaterial.textureNormalStrength}
              windUniforms={windUniforms}
            />
            {!lowDetail && (
              <SunflowerOrganBatch
                name="flower.sunflower.ray.middle"
                options={{
                  ...petal,
                  length: petal.length * 0.78,
                  width: petal.width * 0.84,
                }}
                placements={middleRays}
                textures={textures.petal}
                quality={settings.quality}
                roughness={petalMaterial.roughness}
                sheen={petalMaterial.sheen}
                transmission={petalMaterial.transmission}
                sheenColor={settings.petal.tipColor}
                textureNormalStrength={petalMaterial.textureNormalStrength}
                windUniforms={windUniforms}
              />
            )}
            <SunflowerOrganBatch
              name="flower.sunflower.ray.inner"
              options={{ ...petal, length: petal.length * 0.88, width: petal.width * 0.9 }}
              placements={innerRays}
              textures={textures.petal}
              quality={settings.quality}
              roughness={petalMaterial.roughness}
              sheen={petalMaterial.sheen}
              transmission={petalMaterial.transmission}
              sheenColor={settings.petal.tipColor}
              textureNormalStrength={petalMaterial.textureNormalStrength}
              windUniforms={windUniforms}
            />
          </>
        )}
        <mesh
          position={[0, 0, 0.025]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow={settings.quality.detailShadows}
        >
          <cylinderGeometry
            args={[discRadius * 0.995, discRadius, 0.035, lowDetail ? 20 : 64]}
          />
          <meshStandardMaterial
            color={readColor('discOuterColor')}
            roughness={0.94}
            emissive="#5B2C08"
            emissiveIntensity={0.08}
          />
        </mesh>
        <GoldenDiscBatch
          count={Math.min(
            Math.round(readNumber('discFloretCount')),
            lowDetail ? 180 : Number.POSITIVE_INFINITY,
          )}
          radius={discRadius}
          dome={readNumber('discDome')}
          innerColor={readColor('discInnerColor')}
          outerColor={readColor('discOuterColor')}
          detailShadows={settings.quality.detailShadows}
        />
      </group>
    </>
  )
}
