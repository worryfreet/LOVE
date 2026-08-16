import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, InstancedMesh, Object3D } from 'three'
import type { Group } from 'three'
import type { ModelParameterValues } from '@/entities/model'
import {
  readFlowerBoolean,
  readFlowerColor,
  readFlowerNumber,
  resolveEditableFlowerSettings,
} from '@/entities/model/model/flowerParameterUtils'
import { ORCHID_PARAMETERS } from '@/entities/model/model/flowers/orchidParameters'
import {
  BroadLeaf,
  CurvedStem,
  Petal,
  StemBetween,
} from '../core/FlowerPrimitives'
import { useFlowerSurfaceTextures } from '../core/flowerSurfaceTextures'
import { PETAL_MORPHOLOGIES } from '../core/petalMorphologies'
import type { RibbonGeometryOptions } from '../core/types'
import {
  createOrchidBloomPlacements,
  type OrchidBloomPlacement,
} from '../core/layout'

const STEM_BASE_Y = -0.58
const ignoreFlowerRaycast = () => undefined

function OrchidBarkBatch({ count = 24 }: { count?: number }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = index * Math.PI * (3 - Math.sqrt(5))
      const radius = 0.08 + Math.sqrt((index + 0.5) / count) * 0.23
      dummy.position.set(
        Math.cos(angle) * radius,
        -0.12 + (index % 4) * 0.035,
        Math.sin(angle) * radius,
      )
      dummy.rotation.set(index * 0.37, angle, index * 0.19)
      dummy.scale.set(0.055 + (index % 3) * 0.012, 0.026, 0.038)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [count])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} raycast={ignoreFlowerRaycast}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#765031" roughness={0.96} />
    </instancedMesh>
  )
}

function OrchidBloom({
  index,
  placement,
  settings,
  parameters,
  textures,
}: {
  index: number
  placement: OrchidBloomPlacement
  settings: ReturnType<typeof resolveEditableFlowerSettings>
  parameters?: ModelParameterValues
  textures: ReturnType<typeof useFlowerSurfaceTextures>
}) {
  const readNumber = (id: string) => readFlowerNumber(ORCHID_PARAMETERS, parameters, id)
  const readColor = (id: string) => readFlowerColor(ORCHID_PARAMETERS, parameters, id)
  const wing: RibbonGeometryOptions = {
    ...settings.petal,
    ...PETAL_MORPHOLOGIES.orchidWing,
  }
  const sepal: RibbonGeometryOptions = {
    ...wing,
    ...PETAL_MORPHOLOGIES.orchidSepal,
    length: wing.length * 0.9,
    width: wing.width * 0.7,
    baseWidth: wing.baseWidth! * 0.9,
    tipWidth: wing.tipWidth! * 0.62,
  }
  const lip: RibbonGeometryOptions = {
    ...PETAL_MORPHOLOGIES.orchidLip,
    length: readNumber('lipLength'),
    width: readNumber('lipWidth'),
    baseWidth: readNumber('lipWidth') * 0.35,
    tipWidth: readNumber('lipWidth') * 0.24,
    cup: readNumber('lipCup'),
    curl: readNumber('lipCurl'),
    sideCurl: 0.05,
    wave: 0.026,
    waveCount: 3,
    asymmetry: 0.06,
    thickness: 0.001,
    baseColor: readColor('lipBaseColor'),
    centerColor: readColor('lipCoreColor'),
    tipColor: readColor('lipTipColor'),
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

  return (
    <group
      position={placement.position}
      rotation={placement.rotation}
      scale={placement.scale}
      name={`flower.orchid.bloom.${index}`}
    >
      {[0, Math.PI * 0.68, -Math.PI * 0.68].map((angle, petalIndex) => (
        <Petal
          key={`sepal-${petalIndex}`}
          name={`flower.orchid.bloom.${index}.sepal.${petalIndex + 1}`}
          options={sepal}
          position={[0, 0, -0.055 - petalIndex * 0.008]}
          rotation={[-0.12 + petalIndex * 0.025, 0, angle]}
          scale={readNumber('sepalScale') * (1 - petalIndex * 0.025)}
          {...material}
        />
      ))}
      {[-1, 1].map((side) => (
        <Petal
          key={`wing-${side}`}
          name={`flower.orchid.bloom.${index}.wing.${side < 0 ? 'left' : 'right'}`}
          options={{ ...wing, width: wing.width * 1.16 }}
          position={[side * 0.028, 0.006, 0.07]}
          rotation={[0.035, side * -0.045, side * -Math.PI / 2]}
          scale={readNumber('wingScale')}
          {...material}
        />
      ))}
      <Petal
        name={`flower.orchid.bloom.${index}.lip.middle-lobe`}
        options={lip}
        rotation={[0.22, 0, Math.PI]}
        position={[0, -0.035, 0.16]}
        scale={0.96}
        roughness={0.62}
        sheen={0.52}
        transmission={0.03}
        sheenColor={readColor('lipTipColor')}
        surfaceTextures={textures.petal}
        textureNormalStrength={0.16}
        surfaceQuality={settings.quality}
      />
      {[-1, 1].map((side) => (
        <Petal
          key={`lip-side-${side}`}
          name={`flower.orchid.bloom.${index}.lip.side-lobe.${side}`}
          options={{ ...lip, length: lip.length * 0.68, width: lip.width * 0.72 }}
          rotation={[0.32, side * 0.08, Math.PI + side * 0.62]}
          position={[side * 0.03, -0.024, 0.145]}
          scale={0.78}
          roughness={0.64}
          sheen={0.48}
          transmission={0.025}
          sheenColor={readColor('lipTipColor')}
          surfaceTextures={textures.petal}
          textureNormalStrength={0.12}
          surfaceQuality={settings.quality}
        />
      ))}
      <mesh position={[0, 0.065, 0.16]} rotation={[0.28, 0, 0]} scale={[0.032, 0.085, 0.032]}>
        <capsuleGeometry args={[1, 1.6, 5, 10]} />
        <meshStandardMaterial color="#F4E4EF" roughness={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.022, 0.105, 0.188]} scale={[0.014, 0.018, 0.012]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={readColor('lipCoreColor')} roughness={0.82} />
        </mesh>
      ))}
    </group>
  )
}

export function OrchidAssembly({
  bloomRef,
  parameters,
}: {
  bloomRef: React.RefObject<Group | null>
  parameters?: ModelParameterValues
}) {
  const settings = resolveEditableFlowerSettings(ORCHID_PARAMETERS, parameters)
  const textures = useFlowerSurfaceTextures('orchid')
  const readNumber = (id: string) => readFlowerNumber(ORCHID_PARAMETERS, parameters, id)
  const readColor = (id: string) => readFlowerColor(ORCHID_PARAMETERS, parameters, id)
  const bloomCount = Math.round(readNumber('bloomCount'))
  const archWidth = readNumber('archWidth')
  const archHeight = readNumber('archHeight')
  const archDroop = readNumber('archDroop')
  const bloomScale = readNumber('bloomScale')
  const bloomSpacing = readNumber('bloomSpacing')
  const placements = useMemo(() => createOrchidBloomPlacements({
    count: bloomCount,
    width: archWidth,
    height: archHeight,
    droop: archDroop,
    spacing: bloomSpacing,
    scale: bloomScale,
  }), [
    archDroop,
    archHeight,
    archWidth,
    bloomScale,
    bloomSpacing,
    bloomCount,
  ])
  const flowerBaseY = STEM_BASE_Y + settings.stem.length * 0.64

  return (
    <>
      {readFlowerBoolean(ORCHID_PARAMETERS, parameters, 'potVisible') && (
        <>
          <mesh position={[0, -0.38, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.48, 0.39, 0.62, 32, 1, true]} />
            <meshPhysicalMaterial
              color="#DCEBE4"
              transparent
              opacity={readNumber('potOpacity')}
              roughness={0.18}
              transmission={0.24}
              side={DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.1, 0]} receiveShadow>
            <cylinderGeometry args={[0.42, 0.37, 0.08, 32]} />
            <meshStandardMaterial color="#6F593D" roughness={1} />
          </mesh>
          <OrchidBarkBatch />
        </>
      )}
      {readFlowerBoolean(ORCHID_PARAMETERS, parameters, 'rootVisible') && (
        <group name="flower.orchid.visible-roots">
          {Array.from({ length: 8 }, (_, index) => {
            const angle = index / 8 * Math.PI * 2 + (index % 3) * 0.11
            return (
              <CurvedStem
                key={index}
                name={`flower.orchid.root.${index + 1}`}
                points={[
                  [Math.cos(angle) * 0.26, -0.55, Math.sin(angle) * 0.2],
                  [Math.cos(angle + 0.5) * 0.32, -0.31, Math.sin(angle + 0.5) * 0.24],
                  [Math.cos(angle + 0.8) * 0.12, -0.08, Math.sin(angle + 0.8) * 0.1],
                ]}
                radius={0.016 + (index % 3) * 0.002}
                color={index % 2 ? '#BAC09B' : '#9EAA7D'}
                tubularSegments={14}
                radialSegments={settings.quality.stemRadialSegments}
              />
            )
          })}
        </group>
      )}
      {settings.leaf.visible && [-2.48, -1.38, -0.36, 0.62, 1.72].map((angle, index) => {
        const radialX = Math.cos(angle)
        const radialZ = Math.sin(angle)
        const roll = (index % 2 === 0 ? -1 : 1) * (0.22 + index * 0.025)
        return (
          <BroadLeaf
            key={index}
            name={`flower.orchid.foliage.${index + 1}`}
            length={settings.leaf.length * (1 - index * 0.045)}
            width={settings.leaf.width * 1.38}
            position={[
              Math.cos(angle) * 0.045,
              settings.leaf.height + (index % 2) * 0.035,
              Math.sin(angle) * 0.045,
            ]}
            direction={[
              radialX,
              [0.52, 0.34, 0.46, 0.27, 0.4][index],
              radialZ,
            ]}
            surfaceNormal={[
              -radialZ * (0.82 + Math.abs(roll)),
              0.38 + (index % 2) * 0.08,
              radialX * (0.82 + Math.abs(roll)),
            ]}
            cup={-settings.leaf.cup * 0.14}
            curl={settings.leaf.curl}
            twist={roll * 0.22}
            edgeWave={settings.leaf.wave * 0.4}
            serration={0}
            heartLobes={-0.34}
            roundedTip={0.96}
            midribFold={-settings.leaf.length * 0.006}
            veinRelief={settings.leaf.length * 0.0018}
            veinPairs={7}
            thickness={settings.leaf.length * 0.007}
            lengthSegments={settings.quality.leafLengthSegments}
            widthSegments={settings.quality.leafWidthSegments}
            baseColor={settings.leaf.baseColor}
            tipColor={settings.leaf.tipColor}
            veinColor={settings.leaf.veinColor}
            surfaceTextures={textures.leaf}
            textureNormalStrength={0.24}
            surfaceQuality={settings.quality}
            roughness={0.68}
          />
        )
      })}
      {settings.stem.visible && (
        <CurvedStem
          name="flower.orchid.inflorescence"
          points={[
            [0, -0.18, 0],
            [settings.stem.curve * 0.08, flowerBaseY * 0.42, 0],
            ...placements.map(({ socketPosition }) => [
              socketPosition[0],
              flowerBaseY + socketPosition[1],
              socketPosition[2],
            ] as [number, number, number]),
          ]}
          radius={settings.stem.radius}
          color={settings.stem.color}
          tubularSegments={56}
          radialSegments={settings.quality.stemRadialSegments}
        />
      )}
      <CurvedStem
        name="flower.orchid.support-stake"
        points={[[0.11, -0.2, -0.08], [0.1, 0.72, -0.08], [0.06, 1.42, -0.08]]}
        radius={0.012}
        color="#65462E"
        tubularSegments={18}
        radialSegments={8}
      />
      {[0.62, 1.12].map((height, index) => (
        <StemBetween
          key={height}
          name={`flower.orchid.support-clip.${index + 1}`}
          start={[0.025 - index * 0.012, height, -0.005]}
          end={[0.1, height, -0.08]}
          radius={0.008}
          color="#30352B"
          radialSegments={7}
        />
      ))}
      <group
        ref={bloomRef}
        position={[0, flowerBaseY, 0]}
        name="flower.orchid.bloom"
      >
        {settings.petal.visible && placements.map((placement, index) => {
          const middle: [number, number, number] = [
            placement.socketPosition[0],
            placement.socketPosition[1] + 0.015,
            (placement.socketPosition[2] + placement.position[2]) * 0.5,
          ]
          return (
            <group key={index}>
              <CurvedStem
                name={`flower.orchid.bloom.${index + 1}.pedicel`}
                points={[placement.socketPosition, middle, placement.position]}
                radius={0.012}
                color="#6B793B"
                tubularSegments={10}
                radialSegments={settings.quality.stemRadialSegments}
              />
              <OrchidBloom
                index={index + 1}
                placement={placement}
                settings={settings}
                parameters={parameters}
                textures={textures}
              />
            </group>
          )
        })}
        {Math.round(readNumber('budCount')) > 0 &&
          Array.from({ length: Math.round(readNumber('budCount')) }, (_, index) => {
            const previous: [number, number, number] = index === 0
              ? [archWidth, archHeight * 0.28 - archDroop * 0.5, 0]
              : [
                  archWidth * (1.05 + (index - 1) * 0.12),
                  archHeight * 0.18 - archDroop * (0.45 + (index - 1) * 0.11),
                  Math.sin(index - 1) * 0.06,
                ]
            const position: [number, number, number] = [
              archWidth * (1.05 + index * 0.12),
              archHeight * 0.18 - archDroop * (0.45 + index * 0.11),
              Math.sin(index) * 0.06,
            ]
            const budSize = readNumber('budSize') * (1 - index * 0.13)
            return (
              <group key={index}>
                <CurvedStem
                  name={`flower.orchid.bud-pedicel.${index + 1}`}
                  points={[
                    previous,
                    [
                      (previous[0] + position[0]) * 0.5,
                      (previous[1] + position[1]) * 0.5 + 0.018,
                      (previous[2] + position[2]) * 0.5,
                    ],
                    position,
                  ]}
                  radius={Math.max(0.006, settings.stem.radius * 0.34)}
                  color={settings.stem.color}
                  tubularSegments={8}
                  radialSegments={settings.quality.stemRadialSegments}
                />
                <group
                  position={position}
                  rotation={[0.12, 0, 0.5 + index * 0.08]}
                >
                  <mesh scale={[budSize * 0.78, budSize * 1.22, budSize * 0.72]} castShadow={settings.quality.detailShadows}>
                    <sphereGeometry args={[1, 12, 8]} />
                    <meshPhysicalMaterial color="#D79AC9" roughness={0.62} sheen={0.4} sheenColor="#F9DCEE" />
                  </mesh>
                  <mesh position={[0, -budSize * 0.9, 0]} scale={[0.05, 0.08, 0.05]}>
                    <coneGeometry args={[1, 1, 6]} />
                    <meshStandardMaterial color={readColor('stemColor')} roughness={0.8} />
                  </mesh>
                </group>
              </group>
            )
          })}
      </group>
    </>
  )
}
