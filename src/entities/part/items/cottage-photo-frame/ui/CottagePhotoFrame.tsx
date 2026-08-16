import { useEffect, useMemo, useState } from 'react'
import {
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  TextureLoader,
  type Material,
  type Texture,
} from 'three'
import { cottageDefaultMemoryPhotoUrl } from '../lib/photoFrameAssets'
import {
  resolveCottagePhotoFrameSpec,
  type CottagePhotoFrameMount,
  type CottagePhotoFrameSpec,
} from '../lib/photoFrame'
import {
  configurePhotoTexture,
  createPhotoSurfaceGeometry,
  loadSharedPhotoTexture,
} from '../lib/photoTexture'
import type { PartParameterValues } from '../../../model/partTypes'

export interface CottagePhotoFrameTextureStatus {
  readonly sourceUrl: string | null
  readonly usedFallback: boolean
  readonly failed: boolean
}

export interface CottagePhotoFrameDirectProps {
  readonly id: string
  readonly mount: CottagePhotoFrameMount
  /** 相框整体宽度，单位：米。 */
  readonly width: number
  /** 相框整体高度，单位：米。 */
  readonly height: number
  readonly frameColor: string
  readonly imageUrl?: string
  /** 卡纸边宽，单位：米。 */
  readonly matWidth: number
  readonly quality?: 'desktop' | 'mobile'
  readonly onTextureStatusChange?: (
    status: CottagePhotoFrameTextureStatus,
  ) => void
}

export interface CottagePhotoFrameParameterProps {
  readonly id?: string
  /** 尺寸类目录参数统一使用毫米，imageUrl 可由室内编辑器动态附加。 */
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly onTextureStatusChange?: (
    status: CottagePhotoFrameTextureStatus,
  ) => void
}

export type CottagePhotoFrameProps =
  | CottagePhotoFrameDirectProps
  | CottagePhotoFrameParameterProps

export interface CottagePhotoFrameMaterialSlots {
  readonly frame: MeshStandardMaterial
  readonly mat: MeshStandardMaterial
  readonly backing: MeshStandardMaterial
  readonly glass: MeshStandardMaterial
  readonly hardware: MeshStandardMaterial
  readonly photo: MeshBasicMaterial
}

export const COTTAGE_PHOTO_FRAME_MATERIAL_SLOT_IDS = [
  'frame',
  'mat',
  'backing',
  'glass',
  'hardware',
  'photo',
] as const

function useManagedPhotoTexture(
  requestedUrl: string | undefined,
  onStatusChange:
    | CottagePhotoFrameDirectProps['onTextureStatusChange']
    | CottagePhotoFrameParameterProps['onTextureStatusChange'],
) {
  const normalizedUrl = requestedUrl?.trim() ?? ''
  const [result, setResult] = useState<{
    texture: Texture | null
    owned: boolean
  }>({
    texture: null,
    owned: false,
  })

  useEffect(() => {
    let cancelled = false
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')
    const commitTexture = (
      texture: Texture,
      sourceUrl: string,
      usedFallback: boolean,
      owned: boolean,
    ) => {
      if (cancelled) {
        if (owned) texture.dispose()
        return
      }
      texture.userData.sourceUrl = sourceUrl
      texture.userData.usedFallback = usedFallback
      setResult({ texture, owned })
      onStatusChange?.({ sourceUrl, usedFallback, failed: false })
    }
    const loadFallback = (usedFallback: boolean) =>
      loadSharedPhotoTexture(loader, cottageDefaultMemoryPhotoUrl).then(
        (texture) =>
          commitTexture(
            texture,
            cottageDefaultMemoryPhotoUrl,
            usedFallback,
            false,
          ),
      )

    const request = normalizedUrl
      ? loader
          .loadAsync(normalizedUrl)
          .then((texture) =>
            commitTexture(texture, normalizedUrl, false, true),
          )
          .catch(() => loadFallback(true))
      : loadFallback(false)
    void request.catch(() => {
      if (!cancelled) {
        onStatusChange?.({
          sourceUrl: null,
          usedFallback: true,
          failed: true,
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [normalizedUrl, onStatusChange])

  useEffect(() => {
    if (!result.texture) return
    const image = result.texture.image as
      | { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
      | undefined
    configurePhotoTexture(
      result.texture,
      image?.naturalWidth ?? image?.width ?? 1,
      image?.naturalHeight ?? image?.height ?? 1,
    )
  }, [result.texture])

  useEffect(
    () => () => {
      if (result.owned && result.texture) result.texture.dispose()
    },
    [result],
  )

  return result.texture
}

function createMaterialSlots(
  frameColor: string,
): CottagePhotoFrameMaterialSlots {
  return {
    frame: new MeshStandardMaterial({
      color: frameColor,
      roughness: 0.68,
      metalness: 0.02,
    }),
    mat: new MeshStandardMaterial({
      color: '#eee1c9',
      roughness: 0.92,
      metalness: 0,
    }),
    backing: new MeshStandardMaterial({
      color: '#8d7358',
      roughness: 0.96,
      metalness: 0,
    }),
    glass: new MeshStandardMaterial({
      color: '#fffaf0',
      roughness: 0.24,
      metalness: 0.04,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: DoubleSide,
    }),
    hardware: new MeshStandardMaterial({
      color: '#6f542d',
      roughness: 0.4,
      metalness: 0.72,
    }),
    photo: new MeshBasicMaterial({ color: '#d8c4a5', toneMapped: false }),
  }
}

function disposeMaterialSlots(materials: CottagePhotoFrameMaterialSlots) {
  Object.values(materials).forEach((material) =>
    (material as Material).dispose(),
  )
}

interface PhotoFramePartModelProps {
  readonly id: string
  readonly spec: CottagePhotoFrameSpec
  readonly materials: CottagePhotoFrameMaterialSlots
  readonly photoTexture: Texture | null
  readonly quality: 'desktop' | 'mobile'
}

function PhotoSurfaceGeometry({
  texture,
  width,
  height,
}: {
  texture: Texture
  width: number
  height: number
}) {
  const geometry = useMemo(
    () => createPhotoSurfaceGeometry(texture, width, height),
    [height, texture, width],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return <primitive object={geometry} attach="geometry" />
}

function createRectangularRingShape(
  outerWidth: number,
  outerHeight: number,
  innerWidth: number,
  innerHeight: number,
) {
  const shape = new Shape()
  shape.moveTo(-outerWidth / 2, -outerHeight / 2)
  shape.lineTo(outerWidth / 2, -outerHeight / 2)
  shape.lineTo(outerWidth / 2, outerHeight / 2)
  shape.lineTo(-outerWidth / 2, outerHeight / 2)
  shape.closePath()
  const hole = new Path()
  hole.moveTo(-innerWidth / 2, -innerHeight / 2)
  hole.lineTo(-innerWidth / 2, innerHeight / 2)
  hole.lineTo(innerWidth / 2, innerHeight / 2)
  hole.lineTo(innerWidth / 2, -innerHeight / 2)
  hole.closePath()
  shape.holes.push(hole)
  return shape
}

/**
 * 中立相框物理叶；所有几何都以 +Y 为上、+Z 为正面。
 * 墙挂时局部原点在背板中心，桌放时局部原点在桌面接触平面。
 */
export function PhotoFramePartModel({
  id,
  spec,
  materials,
  photoTexture,
  quality,
}: PhotoFramePartModelProps) {
  const bodyCenterY = spec.mount === 'wall' ? 0 : spec.height / 2
  const frontZ = spec.frameDepth + 0.001
  const supportSegments = quality === 'mobile' ? 10 : 18
  const tableRearReach = Math.min(0.24, spec.height * 0.34)
  const hingeY = spec.height * 0.68
  const hingeZ = -0.006
  const footY = 0.012
  const footZ = -tableRearReach
  const standDeltaY = hingeY - footY
  const standDeltaZ = hingeZ - footZ
  const standLength = Math.hypot(standDeltaY, standDeltaZ)
  const standRotationX = Math.atan2(standDeltaZ, standDeltaY)
  const standWidth = Math.min(0.13, spec.width * 0.42)
  const frameShape = useMemo(
    () =>
      createRectangularRingShape(
        spec.width,
        spec.height,
        spec.innerWidth,
        spec.innerHeight,
      ),
    [spec.height, spec.innerHeight, spec.innerWidth, spec.width],
  )
  const matShape = useMemo(
    () =>
      createRectangularRingShape(
        spec.innerWidth,
        spec.innerHeight,
        spec.photoWidth,
        spec.photoHeight,
      ),
    [spec.innerHeight, spec.innerWidth, spec.photoHeight, spec.photoWidth],
  )

  return (
    <group
      name={id}
      userData={{
        componentId: id,
        componentType: 'cottage-photo-frame',
        mount: spec.mount,
        origin: spec.origin,
        forwardAxis: '+Z',
        upAxis: '+Y',
        localBounds: spec.localBounds,
        materialSlots: COTTAGE_PHOTO_FRAME_MATERIAL_SLOT_IDS,
        sockets: ['socket.mount', 'socket.photo-surface'],
      }}
    >
      <object3D name="socket.mount" />
      <object3D
        name="socket.photo-surface"
        position={[0, bodyCenterY, frontZ]}
      />

      <group name={`${id}:frame-body`} position={[0, bodyCenterY, 0]}>
        <mesh
          name={`${id}:backing`}
          position={[0, 0, spec.backingDepth / 2]}
          material={materials.backing}
          receiveShadow
        >
          <boxGeometry
            args={[spec.innerWidth, spec.innerHeight, spec.backingDepth]}
          />
        </mesh>

        <mesh
          name={`${id}:wood-frame`}
          material={materials.frame}
          castShadow
          receiveShadow
          userData={{ materialSlot: 'frame' }}
        >
          <extrudeGeometry
            args={[
              frameShape,
              { depth: spec.frameDepth, bevelEnabled: false, steps: 1 },
            ]}
          />
        </mesh>

        {spec.matWidth > 0 && (
          <mesh
            name={`${id}:mat`}
            position={[0, 0, frontZ]}
            material={materials.mat}
            userData={{ materialSlot: 'mat' }}
          >
            <shapeGeometry args={[matShape]} />
          </mesh>
        )}

        <mesh
          name={`${id}:photo`}
          position={[0, 0, frontZ + 0.0013]}
          material={materials.photo}
          userData={{ materialSlot: 'photo', replaceable: true }}
        >
          {photoTexture ? (
            <PhotoSurfaceGeometry
              texture={photoTexture}
              width={spec.photoWidth}
              height={spec.photoHeight}
            />
          ) : (
            <planeGeometry args={[spec.photoWidth, spec.photoHeight]} />
          )}
        </mesh>
      </group>

      {spec.mount === 'table' && (
        <group name={`${id}:table-support`}>
          <mesh
            name={`${id}:easel-stand`}
            position={[
              0,
              (hingeY + footY) * 0.5,
              (hingeZ + footZ) * 0.5,
            ]}
            rotation={[standRotationX, 0, 0]}
            material={materials.backing}
            castShadow
          >
            <boxGeometry args={[standWidth, standLength, 0.014]} />
          </mesh>
          <mesh
            name={`${id}:stand-hinge`}
            position={[0, hingeY, hingeZ]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.hardware}
          >
            <cylinderGeometry
              args={[0.008, 0.008, standWidth * 1.08, supportSegments]}
            />
          </mesh>
          <mesh
            name={`${id}:stand-foot`}
            position={[0, footY * 0.5, footZ]}
            material={materials.hardware}
          >
            <boxGeometry args={[standWidth * 1.08, footY, 0.022]} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function readMillimeters(
  value: PartParameterValues[string] | undefined,
  fallback: number,
) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed / 1000 : fallback / 1000
}

function resolvePhotoFrameProps(
  props: CottagePhotoFrameProps,
): CottagePhotoFrameDirectProps {
  if (!('parameters' in props)) return props
  const { parameters } = props
  const resolved: CottagePhotoFrameDirectProps = {
    id: props.id ?? 'part:cottage-photo-frame',
    mount: parameters.mount === 'table' ? 'table' : 'wall',
    width: readMillimeters(parameters.width, 320),
    height: readMillimeters(parameters.height, 400),
    frameColor:
      typeof parameters.frameColor === 'string'
        ? parameters.frameColor
        : '#a96f38',
    imageUrl:
      typeof parameters.imageUrl === 'string' && parameters.imageUrl.trim()
        ? parameters.imageUrl
        : undefined,
    matWidth: readMillimeters(parameters.matWidth, 32),
    quality: props.quality,
    onTextureStatusChange: props.onTextureStatusChange,
  }
  try {
    resolveCottagePhotoFrameSpec(resolved)
    return resolved
  } catch {
    return {
      ...resolved,
      width: 0.32,
      height: 0.4,
      matWidth: 0.032,
    }
  }
}

export function CottagePhotoFrame(props: CottagePhotoFrameProps) {
  const {
    id,
    mount,
    width,
    height,
    frameColor,
    imageUrl,
    matWidth,
    quality = 'desktop',
    onTextureStatusChange,
  } = resolvePhotoFrameProps(props)
  const spec = useMemo(
    () => resolveCottagePhotoFrameSpec({ mount, width, height, matWidth }),
    [height, matWidth, mount, width],
  )
  const texture = useManagedPhotoTexture(imageUrl, onTextureStatusChange)
  const materials = useMemo(
    () => createMaterialSlots(frameColor),
    [frameColor],
  )

  useEffect(() => {
    materials.photo.map = texture
    materials.photo.color.set(texture ? '#ffffff' : '#d8c4a5')
    materials.photo.needsUpdate = true
  }, [materials, texture])

  useEffect(
    () => () => {
      disposeMaterialSlots(materials)
    },
    [materials],
  )

  return (
    <PhotoFramePartModel
      id={id}
      spec={spec}
      materials={materials}
      photoTexture={texture}
      quality={quality}
    />
  )
}
