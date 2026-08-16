import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import {
  CatmullRomCurve3,
  DoubleSide,
  InstancedMesh,
  Material,
  Object3D,
  Quaternion,
  TubeGeometry,
  Vector3,
  Vector2,
} from 'three'
import type { EulerOrder, Vector3Tuple } from 'three'
import {
  createBroadLeafGeometry,
  createLeafGeometry,
  createPetalGeometry,
} from './geometry'
import {
  configureFlowerWindMaterial,
  type FlowerWindUniforms,
} from './flowerWindMaterial'
import { createLeafOrientationQuaternion } from './leafOrientation'
import { createDandelionLigulePoints } from './layout'
import type {
  FlowerSurfaceQuality,
  RibbonGeometryOptions,
  RibbonTextureSet,
} from './types'

export interface PetalMaterialProps {
  roughness?: number
  sheen?: number
  transmission?: number
  sheenColor?: string
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  flatShading?: boolean
  surfaceTextures?: RibbonTextureSet
  textureNormalStrength?: number
  surfaceQuality?: FlowerSurfaceQuality
  castShadow?: boolean
  receiveShadow?: boolean
  windUniforms?: FlowerWindUniforms
  windPetalAmplitude?: number
}

const DEFAULT_SURFACE_QUALITY: FlowerSurfaceQuality = {
  material: 'physical',
  colorMap: true,
  normalMap: true,
  roughnessMap: true,
  petalShadows: true,
  detailShadows: true,
}

export function RibbonSurfaceMaterial({
  roughness = 0.68,
  sheen = 0.4,
  transmission = 0,
  sheenColor = '#fff0f3',
  emissive = '#000000',
  emissiveIntensity = 0,
  opacity = 1,
  flatShading = false,
  surfaceTextures,
  textureNormalStrength = 0.18,
  surfaceQuality = DEFAULT_SURFACE_QUALITY,
  windUniforms,
  windPetalAmplitude = 0,
}: PetalMaterialProps) {
  const windMaterialRef = useRef<Material | null>(null)
  const registerWindMaterial = useCallback((material: Material | null) => {
    windMaterialRef.current = material
  }, [])
  const normalScale = useMemo(
    () => new Vector2(textureNormalStrength, textureNormalStrength),
    [textureNormalStrength],
  )
  const maps = {
    map: surfaceQuality.colorMap ? surfaceTextures?.colorMap : undefined,
    normalMap: surfaceQuality.normalMap ? surfaceTextures?.normalMap : undefined,
    roughnessMap: surfaceQuality.roughnessMap
      ? surfaceTextures?.roughnessMap
      : undefined,
  }
  const softLightIntensity = emissiveIntensity > 0
    ? emissiveIntensity
    : Math.min(0.045, 0.014 + transmission * 0.2)
  const softLightColor = emissive === '#000000' ? sheenColor : emissive
  useLayoutEffect(() => {
    const material = windMaterialRef.current
    if (!material || !windUniforms || windPetalAmplitude <= 0) return
    return configureFlowerWindMaterial(material, {
      uniforms: windUniforms,
      petalAmplitude: windPetalAmplitude,
    })
  }, [surfaceQuality.material, windPetalAmplitude, windUniforms])
  if (surfaceQuality.material === 'physical') {
    return (
      <meshPhysicalMaterial
        ref={registerWindMaterial}
        vertexColors
        side={DoubleSide}
        flatShading={flatShading}
        roughness={roughness}
        metalness={0}
        clearcoat={0.004}
        clearcoatRoughness={0.98}
        sheen={sheen}
        sheenRoughness={0.8}
        sheenColor={sheenColor}
        transmission={transmission}
        thickness={0.006}
        ior={1.34}
        attenuationColor={sheenColor}
        attenuationDistance={0.42}
        transparent={opacity < 0.999}
        opacity={opacity}
        depthWrite={opacity >= 0.999}
        emissive={softLightColor}
        emissiveIntensity={softLightIntensity}
        normalScale={normalScale}
        {...maps}
      />
    )
  }
  return (
    <meshStandardMaterial
      ref={registerWindMaterial}
      vertexColors
      side={DoubleSide}
      flatShading={flatShading}
      roughness={roughness}
      metalness={0}
      emissive={softLightColor}
      emissiveIntensity={softLightIntensity}
      transparent={opacity < 0.999}
      opacity={opacity}
      depthWrite={opacity >= 0.999}
      normalScale={normalScale}
      {...maps}
    />
  )
}

const ignoreFlowerRaycast = () => undefined

interface DandelionLiguleSpiralProps extends PetalMaterialProps {
  name: string
  options: RibbonGeometryOptions
  count: number
  radius: number
  innerDepth: number
  outerDepth: number
  innerScale: number
  outerScale: number
  innerTilt: number
  middleTilt?: number
  outerTilt: number
  seed: number
}

export function DandelionLiguleSpiral({
  name,
  options,
  count,
  radius,
  innerDepth,
  outerDepth,
  innerScale,
  outerScale,
  innerTilt,
  middleTilt,
  outerTilt,
  seed,
  roughness = 0.7,
  sheen = 0.28,
  transmission = 0.025,
  sheenColor = '#ffe164',
  surfaceTextures,
  textureNormalStrength,
  surfaceQuality = DEFAULT_SURFACE_QUALITY,
}: DandelionLiguleSpiralProps) {
  const geometry = useMemo(() => createPetalGeometry(options), [options])
  const mesh = useRef<InstancedMesh>(null)
  const points = useMemo(() => createDandelionLigulePoints({
    count,
    radius,
    innerDepth,
    outerDepth,
    innerScale,
    outerScale,
    innerTilt,
    middleTilt,
    outerTilt,
    seed,
  }), [
    count, innerDepth, innerScale, innerTilt, middleTilt, outerDepth,
    outerScale, outerTilt, radius, seed,
  ])

  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()
    const around = new Quaternion()
    const localTilt = new Quaternion()
    const localRoll = new Quaternion()
    const axisZ = new Vector3(0, 0, 1)
    const axisX = new Vector3(1, 0, 0)
    const axisY = new Vector3(0, 1, 0)
    points.forEach((point, index) => {
      around.setFromAxisAngle(axisZ, -point.angle + point.twist)
      localTilt.setFromAxisAngle(axisX, point.tilt)
      localRoll.setFromAxisAngle(axisY, point.roll)
      dummy.position.copy(point.position)
      dummy.quaternion.copy(around).multiply(localTilt).multiply(localRoll)
      dummy.scale.set(
        point.scale * (0.92 + point.progress * 0.08),
        point.scale,
        point.scale,
      )
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingBox()
    mesh.current.computeBoundingSphere()
  }, [points])

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, count]}
      name={name}
      castShadow={surfaceQuality.petalShadows}
      receiveShadow={surfaceQuality.petalShadows}
      raycast={ignoreFlowerRaycast}
    >
      <RibbonSurfaceMaterial
        roughness={roughness}
        sheen={sheen}
        transmission={transmission}
        sheenColor={sheenColor}
        surfaceTextures={surfaceTextures}
        textureNormalStrength={textureNormalStrength}
        surfaceQuality={surfaceQuality}
      />
    </instancedMesh>
  )
}

interface PetalProps extends PetalMaterialProps {
  name: string
  options: RibbonGeometryOptions
  position?: Vector3Tuple
  rotation?: Vector3Tuple
  rotationOrder?: EulerOrder
  scale?: number | Vector3Tuple
}

export function Petal({
  name,
  options,
  position,
  rotation,
  rotationOrder = 'XYZ',
  scale = 1,
  roughness = 0.68,
  sheen = 0.4,
  transmission = 0,
  sheenColor = '#fff1f4',
  emissive = '#000000',
  emissiveIntensity = 0,
  flatShading = false,
  surfaceTextures,
  textureNormalStrength,
  surfaceQuality = DEFAULT_SURFACE_QUALITY,
  castShadow = surfaceQuality.petalShadows,
  receiveShadow = surfaceQuality.petalShadows,
}: PetalProps) {
  const optionsKey = JSON.stringify(options)
  const geometry = useMemo(
    () => createPetalGeometry(options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsKey],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      name={name}
      geometry={geometry}
      position={position}
      rotation={rotation}
      rotation-order={rotationOrder}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <RibbonSurfaceMaterial
        roughness={roughness}
        sheen={sheen}
        transmission={transmission}
        sheenColor={sheenColor}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        flatShading={flatShading}
        surfaceTextures={surfaceTextures}
        textureNormalStrength={textureNormalStrength}
        surfaceQuality={surfaceQuality}
      />
    </mesh>
  )
}

interface LeafProps {
  name: string
  length: number
  width: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
  direction?: Vector3Tuple
  surfaceNormal?: Vector3Tuple
  scale?: number | Vector3Tuple
  baseColor?: string
  tipColor?: string
  veinColor?: string
  cup?: number
  curl?: number
  sideCurl?: number
  twist?: number
  tipCurl?: number
  wave?: number
  serration?: number
  serrationCount?: number
  asymmetry?: number
  keel?: number
  veinRelief?: number
  veinStrength?: number
  veinCount?: number
  thickness?: number
  lengthSegments?: number
  widthSegments?: number
  surfaceTextures?: RibbonTextureSet
  textureNormalStrength?: number
  surfaceQuality?: FlowerSurfaceQuality
  roughness?: number
  flatShading?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
}

export function Leaf({
  name,
  length,
  width,
  position,
  rotation,
  direction,
  surfaceNormal,
  scale = 1,
  baseColor = '#315d24',
  tipColor = '#7f9f42',
  veinColor = '#b2c66a',
  cup = 0.045,
  curl = -0.035,
  sideCurl = cup * 0.48,
  twist = 0.045,
  tipCurl = curl * 0.45,
  wave = 0.015,
  serration = 0.04,
  serrationCount = 10,
  asymmetry = 0.04,
  keel = 0.075,
  veinRelief = length * 0.006,
  veinStrength = 0.34,
  veinCount = 8,
  thickness = 0.014,
  lengthSegments = 48,
  widthSegments = 18,
  surfaceTextures,
  textureNormalStrength = 0.22,
  surfaceQuality = DEFAULT_SURFACE_QUALITY,
  roughness = 0.76,
  flatShading = false,
  castShadow = surfaceQuality.petalShadows,
  receiveShadow = surfaceQuality.petalShadows,
}: LeafProps) {
  const orientation = useMemo(
    () => direction && surfaceNormal
      ? createLeafOrientationQuaternion(direction, surfaceNormal)
      : undefined,
    [direction, surfaceNormal],
  )
  const normalScale = useMemo(
    () => new Vector2(textureNormalStrength, textureNormalStrength),
    [textureNormalStrength],
  )
  const options = useMemo(
    () => ({
      length,
      width,
      baseWidth: width * 0.13,
      tipWidth: width * 0.015,
      cup,
      curl,
      sideCurl,
      twist,
      tipCurl,
      wave,
      waveCount: 4.8,
      asymmetry,
      serration,
      serrationCount,
      thickness,
      keel,
      veinRelief,
      veinColor,
      veinStrength,
      veinCount,
      baseColor,
      tipColor,
      centerColor: veinColor,
      lengthSegments,
      widthSegments,
    }),
    [
      asymmetry,
      baseColor,
      cup,
      curl,
      keel,
      length,
      lengthSegments,
      serration,
      serrationCount,
      sideCurl,
      thickness,
      tipCurl,
      tipColor,
      twist,
      veinCount,
      veinColor,
      veinRelief,
      veinStrength,
      wave,
      width,
      widthSegments,
    ],
  )
  const geometry = useMemo(() => createLeafGeometry(options), [options])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group
      name={name}
      position={position}
      rotation={orientation ? undefined : rotation}
      quaternion={orientation}
      scale={scale}
    >
      <mesh
        geometry={geometry}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        {surfaceQuality.material === 'physical' ? (
          <meshPhysicalMaterial
            vertexColors
            side={DoubleSide}
            flatShading={flatShading}
            roughness={roughness}
            metalness={0}
            clearcoat={0.012}
            clearcoatRoughness={0.94}
            sheen={0.2}
            sheenRoughness={0.84}
            sheenColor="#bdd48f"
            map={surfaceQuality.colorMap ? surfaceTextures?.colorMap : undefined}
            normalMap={surfaceQuality.normalMap ? surfaceTextures?.normalMap : undefined}
            normalScale={normalScale}
            roughnessMap={surfaceQuality.roughnessMap ? surfaceTextures?.roughnessMap : undefined}
          />
        ) : (
          <meshStandardMaterial
            vertexColors
            side={DoubleSide}
            flatShading={flatShading}
            roughness={roughness}
            metalness={0}
            map={surfaceQuality.colorMap ? surfaceTextures?.colorMap : undefined}
            normalMap={surfaceQuality.normalMap ? surfaceTextures?.normalMap : undefined}
            normalScale={normalScale}
            roughnessMap={surfaceQuality.roughnessMap ? surfaceTextures?.roughnessMap : undefined}
          />
        )}
      </mesh>
    </group>
  )
}

interface BroadLeafProps {
  name: string
  length: number
  width: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
  direction?: Vector3Tuple
  surfaceNormal?: Vector3Tuple
  scale?: number | Vector3Tuple
  baseColor?: string
  tipColor?: string
  veinColor?: string
  cup?: number
  curl?: number
  twist?: number
  edgeWave?: number
  serration?: number
  serrationCount?: number
  heartLobes?: number
  roundedTip?: number
  midribFold?: number
  veinRelief?: number
  veinPairs?: number
  thickness?: number
  lengthSegments?: number
  widthSegments?: number
  surfaceTextures?: RibbonTextureSet
  textureNormalStrength?: number
  surfaceQuality?: FlowerSurfaceQuality
  roughness?: number
}

export function BroadLeaf({
  name,
  length,
  width,
  position,
  rotation,
  direction,
  surfaceNormal,
  scale = 1,
  baseColor = '#315D24',
  tipColor = '#7F9F42',
  veinColor = '#B2C66A',
  cup = 0.05,
  curl = -0.03,
  twist = 0.055,
  edgeWave,
  serration = 0.03,
  serrationCount = 11,
  heartLobes = 0.25,
  roundedTip = 0,
  midribFold,
  veinRelief,
  veinPairs = 8,
  thickness,
  lengthSegments,
  widthSegments,
  surfaceTextures,
  textureNormalStrength = 0.22,
  surfaceQuality = DEFAULT_SURFACE_QUALITY,
  roughness = 0.76,
}: BroadLeafProps) {
  const orientation = useMemo(
    () => direction && surfaceNormal
      ? createLeafOrientationQuaternion(direction, surfaceNormal)
      : undefined,
    [direction, surfaceNormal],
  )
  const options = useMemo(() => ({
    length,
    width,
    baseColor,
    tipColor,
    veinColor,
    cup,
    curl,
    twist,
    edgeWave,
    serration,
    serrationCount,
    heartLobes,
    roundedTip,
    midribFold,
    veinRelief,
    veinPairs,
    thickness,
    lengthSegments,
    widthSegments,
  }), [
    baseColor, cup, curl, edgeWave, heartLobes, length, lengthSegments,
    midribFold, roundedTip, serration, serrationCount, thickness, tipColor,
    twist, veinColor, veinPairs, veinRelief, width, widthSegments,
  ])
  const geometry = useMemo(() => createBroadLeafGeometry(options), [options])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      name={name}
      geometry={geometry}
      position={position}
      rotation={orientation ? undefined : rotation}
      quaternion={orientation}
      scale={scale}
      castShadow={surfaceQuality.petalShadows}
      receiveShadow={surfaceQuality.petalShadows}
    >
      <RibbonSurfaceMaterial
        roughness={roughness}
        sheen={0.2}
        sheenColor="#BDD48F"
        surfaceTextures={surfaceTextures}
        textureNormalStrength={textureNormalStrength}
        surfaceQuality={surfaceQuality}
      />
    </mesh>
  )
}

interface StemBetweenProps {
  name: string
  start: Vector3Tuple
  end: Vector3Tuple
  radius: number
  topRadius?: number
  color?: string
  radialSegments?: number
}

export function StemBetween({
  name,
  start,
  end,
  radius,
  topRadius,
  color = '#4b7c2f',
  radialSegments = 12,
}: StemBetweenProps) {
  const transform = useMemo(() => {
    const from = new Vector3(...start)
    const to = new Vector3(...end)
    const direction = to.clone().sub(from)
    const length = direction.length()
    const quaternion = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    )
    return {
      position: from.add(to).multiplyScalar(0.5),
      quaternion,
      length,
    }
  }, [end, start])

  return (
    <mesh
      name={name}
      position={transform.position}
      quaternion={transform.quaternion}
      castShadow
      receiveShadow
    >
      <cylinderGeometry
        args={[
          topRadius ?? radius * 0.78,
          radius,
          transform.length,
          radialSegments,
        ]}
      />
      <meshStandardMaterial color={color} roughness={0.83} />
    </mesh>
  )
}

interface CurvedStemProps {
  name: string
  points: readonly Vector3Tuple[]
  radius: number
  color?: string
  tubularSegments?: number
  radialSegments?: number
  castShadow?: boolean
  receiveShadow?: boolean
}

export function CurvedStem({
  name,
  points,
  radius,
  color = '#456f2b',
  tubularSegments = 40,
  radialSegments = 10,
  castShadow = true,
  receiveShadow = true,
}: CurvedStemProps) {
  const pointsKey = JSON.stringify(points)
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(
      points.map((point) => new Vector3(...point)),
      false,
      'centripetal',
    )
    return new TubeGeometry(
      curve,
      tubularSegments,
      radius,
      radialSegments,
      false,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, radialSegments, radius, tubularSegments])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      name={name}
      geometry={geometry}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  )
}
