import { useEffect, useMemo } from 'react'
import { DoubleSide, Vector2 } from 'three'
import type { BufferGeometry, Group } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  resolveMorningGlorySettings,
} from '@/entities/model/model/flowers/morningGloryParameters'
import {
  BroadLeaf,
  CurvedStem,
} from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import { createTrumpetGeometry } from '../core/geometry'
import {
  resolveAttachedBloomOrigin,
  resolveBloomHeadRotation,
} from '../core/layout'

const STEM_BASE_Y = -0.58

function MorningGloryCorolla({
  geometry,
  settings,
  textures,
}: {
  geometry: BufferGeometry
  settings: ReturnType<typeof resolveMorningGlorySettings>
  textures: ReturnType<typeof useFlowerSurfaceTextures>
}) {
  const normalScale = useMemo(
    () => new Vector2(settings.corolla.normalStrength, settings.corolla.normalStrength),
    [settings.corolla.normalStrength],
  )
  const maps = {
    map: settings.quality.colorMap ? textures.petal.colorMap : undefined,
    normalMap: settings.quality.normalMap ? textures.petal.normalMap : undefined,
    roughnessMap: settings.quality.roughnessMap ? textures.petal.roughnessMap : undefined,
  }
  return (
    <mesh
      name="flower.morning-glory.corolla"
      geometry={geometry}
      castShadow={settings.quality.petalShadows}
      receiveShadow={settings.quality.petalShadows}
    >
      {settings.quality.material === 'physical' ? (
        <meshPhysicalMaterial
          vertexColors
          side={DoubleSide}
          flatShading={settings.corolla.flatShading}
          roughness={settings.corolla.roughness}
          sheen={settings.corolla.sheen}
          sheenColor={settings.corolla.rimColor}
          transmission={settings.corolla.transmission}
          thickness={0.004}
          normalScale={normalScale}
          {...maps}
        />
      ) : (
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          flatShading={settings.corolla.flatShading}
          roughness={settings.corolla.roughness}
          normalScale={normalScale}
          {...maps}
        />
      )}
    </mesh>
  )
}

export function MorningGloryAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const settings = resolveMorningGlorySettings(parameters)
  const textures = useFlowerSurfaceTextures('morning-glory')
  const bloomY = STEM_BASE_Y + settings.vine.length
  const topX = settings.vine.curve
  const bloomRotation = resolveBloomHeadRotation(
    'morning-glory',
    settings.corolla.tilt * 180 / Math.PI,
  )
  const bloomAnchor: [number, number, number] = [
    topX,
    bloomY,
    -settings.corolla.depth * 0.52,
  ]
  const bloomPosition = resolveAttachedBloomOrigin(
    bloomAnchor,
    [0, 0, -settings.corolla.depth * 0.92],
    bloomRotation,
  )
  const geometry = useMemo(() => createTrumpetGeometry({
    depth: settings.corolla.depth,
    throatRadius: settings.corolla.throatRadius,
    midRadius: settings.corolla.midRadius,
    rimRadius: settings.corolla.rimRadius,
    rimWave: settings.corolla.rimWave,
    seamDepth: settings.corolla.depth * 0.038,
    seamWidth: 18,
    radialUndulation: 0.009,
    radialUndulationCount: 9,
    asymmetry: 0.018,
    flarePower: settings.corolla.flarePower,
    rimCurl: settings.corolla.rimCurl,
    thickness: settings.corolla.thickness,
    throatColor: settings.corolla.throatColor,
    middleColor: settings.corolla.middleColor,
    rimColor: settings.corolla.rimColor,
    veinColor: settings.corolla.veinColor,
    radialSegments: settings.quality.trumpetRadialSegments,
    depthSegments: settings.quality.trumpetDepthSegments,
  }), [settings.corolla, settings.quality])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <>
      {settings.vine.visible && (
        <CurvedStem
          name="flower.morning-glory.vine"
          points={[
            [0, STEM_BASE_Y, 0],
            [settings.vine.curve, STEM_BASE_Y + settings.vine.length * 0.28, settings.vine.twist],
            [-settings.vine.curve * 0.72, STEM_BASE_Y + settings.vine.length * 0.55, -settings.vine.twist * 0.75],
            [settings.vine.curve * 0.45, STEM_BASE_Y + settings.vine.length * 0.8, -settings.corolla.depth * 0.58],
            [topX, bloomY, -settings.corolla.depth * 0.52],
          ]}
          radius={settings.vine.radius}
          color={settings.vine.color}
          tubularSegments={48}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      {settings.leaf.visible && [0.08, 0.48, 0.82].map((progress, index) => {
        const direction = index === 1 ? -1 : 1
        const nodeY = STEM_BASE_Y + progress * settings.vine.length
        const nodeX = Math.sin(progress * Math.PI * 3) * settings.vine.curve * 0.65
        const nodeZ = Math.cos(progress * Math.PI * 3) * settings.vine.twist * 0.45
        const leafPosition: [number, number, number] = [
          nodeX + direction * (0.3 + index * 0.045),
          nodeY + (index === 1 ? -0.04 : 0.015),
          nodeZ + (index - 1) * 0.11,
        ]
        return (
          <group key={index}>
            <CurvedStem
              name={`flower.morning-glory.petiole.${index + 1}`}
              points={[
                [nodeX, nodeY, nodeZ],
                [nodeX + direction * 0.07, nodeY + 0.01, nodeZ],
                leafPosition,
              ]}
              radius={settings.vine.radius * 0.46}
              color={settings.vine.color}
              tubularSegments={10}
              radialSegments={settings.quality.stemRadialSegments}
            />
            <BroadLeaf
              name={`flower.morning-glory.foliage.${index + 1}`}
              length={settings.leaf.length * (1.12 - index * 0.07)}
              width={settings.leaf.width * 1.2}
              position={leafPosition}
              direction={[
                direction * 0.88,
                0.08 + index * 0.07,
                [-0.34, 0.38, -0.24][index],
              ]}
              surfaceNormal={[
                direction * (index === 1 ? -0.28 : 0.18),
                0.82,
                [0.58, -0.5, 0.64][index],
              ]}
              cup={settings.leaf.cup * 0.48}
              curl={settings.leaf.curl}
              twist={direction * (0.055 + index * 0.012)}
              edgeWave={settings.leaf.wave * 0.65}
              serration={settings.leaf.serration}
              serrationCount={8}
              heartLobes={1.45}
              midribFold={settings.leaf.length * 0.014}
              veinRelief={settings.leaf.length * 0.004}
              veinPairs={7}
              thickness={settings.leaf.length * 0.0055}
              lengthSegments={settings.quality.leafLengthSegments}
              widthSegments={settings.quality.leafWidthSegments}
              baseColor={settings.leaf.baseColor}
              tipColor={settings.leaf.tipColor}
              veinColor={settings.leaf.veinColor}
              surfaceTextures={textures.leaf}
              textureNormalStrength={0.18}
              surfaceQuality={settings.quality}
              roughness={0.8}
            />
          </group>
        )
      })}
      {settings.bud.visible && Array.from({ length: settings.bud.count }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        const node: [number, number, number] = index % 2 === 0
          ? [
              -settings.vine.curve * 0.72,
              STEM_BASE_Y + settings.vine.length * 0.55,
              -settings.vine.twist * 0.75,
            ]
          : [
              settings.vine.curve * 0.45,
              STEM_BASE_Y + settings.vine.length * 0.8,
              -settings.corolla.depth * 0.58,
            ]
        const end: [number, number, number] = [
          node[0] + side * (0.46 + index * 0.06),
          node[1] + 0.08 - index * 0.06,
          node[2] + 0.05 + index * 0.04,
        ]
        return (
          <group key={index}>
            <CurvedStem
              name={`flower.morning-glory.bud-stem.${index + 1}`}
              points={[
                node,
                [
                  (node[0] + end[0]) * 0.5,
                  (node[1] + end[1]) * 0.5 + 0.05,
                  (node[2] + end[2]) * 0.5,
                ],
                end,
              ]}
              radius={settings.vine.radius * 0.62}
              color={settings.vine.color}
              tubularSegments={12}
              radialSegments={settings.quality.stemRadialSegments}
            />
            <group
              position={end}
              rotation={[0.18, 0, side * -0.45]}
              name={`flower.morning-glory.bud.${index + 1}`}
            >
              <mesh scale={[settings.bud.size * 0.72, settings.bud.size * 1.34, settings.bud.size * 0.72]} castShadow={settings.quality.detailShadows}>
                <capsuleGeometry args={[0.55, 0.72, 7, 12]} />
                <meshPhysicalMaterial color={settings.bud.color} roughness={0.7} sheen={0.24} sheenColor="#A9A2F0" />
              </mesh>
              {Array.from({ length: 5 }, (_, sepalIndex) => {
                const angle = sepalIndex / 5 * Math.PI * 2
                return (
                  <mesh
                    key={sepalIndex}
                    position={[
                      Math.cos(angle) * settings.bud.size * 0.34,
                      -settings.bud.size * 0.82,
                      Math.sin(angle) * settings.bud.size * 0.34,
                    ]}
                    rotation={[0, angle, Math.PI - 0.22]}
                  >
                    <coneGeometry args={[settings.bud.size * 0.14, settings.bud.size * 0.92, 5]} />
                    <meshStandardMaterial color={settings.bud.calyxColor} roughness={0.82} />
                  </mesh>
                )
              })}
            </group>
          </group>
        )
      })}
      <group
        ref={bloomRef}
        position={bloomPosition}
        rotation={bloomRotation}
        name="flower.morning-glory.bloom"
      >
        <group name="flower.morning-glory.calyx">
          {Array.from({ length: 5 }, (_, index) => {
            const angle = index / 5 * Math.PI * 2
            const radius = settings.corolla.throatRadius * 0.92
            return (
              <mesh
                key={index}
                name={`flower.morning-glory.sepal.${index + 1}`}
                position={[
                  Math.cos(angle) * radius,
                  Math.sin(angle) * radius,
                  -settings.corolla.depth * 0.9,
                ]}
                rotation={[-Math.PI / 2, angle * 0.08, -angle]}
                scale={[1, 1 + (index % 2) * 0.08, 0.72]}
              >
                <coneGeometry args={[
                  settings.corolla.throatRadius * 0.58,
                  settings.corolla.depth * 0.26,
                  7,
                ]} />
                <meshStandardMaterial color={settings.bud.calyxColor} roughness={0.82} />
              </mesh>
            )
          })}
        </group>
        {settings.corolla.visible && (
          <MorningGloryCorolla geometry={geometry} settings={settings} textures={textures} />
        )}
        <group name="flower.morning-glory.reproductive-organs">
          {Array.from({ length: 5 }, (_, index) => {
            const angle = index / 5 * Math.PI * 2
            const radius = settings.corolla.throatRadius * 0.42
            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * radius,
                  Math.sin(angle) * radius,
                  -settings.corolla.depth * (0.56 - index * 0.012),
                ]}
                rotation={[Math.PI / 2, 0, angle]}
              >
                <cylinderGeometry args={[0.005, 0.004, settings.corolla.depth * 0.27, 6]} />
                <meshStandardMaterial color="#F6E7C6" roughness={0.78} />
              </mesh>
            )
          })}
          <mesh
            position={[0, 0, -settings.corolla.depth * 0.48]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.006, 0.0045, settings.corolla.depth * 0.34, 7]} />
            <meshStandardMaterial color="#FFF7DF" roughness={0.76} />
          </mesh>
        </group>
      </group>
    </>
  )
}
