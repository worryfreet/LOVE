import {
  ClampToEdgeWrapping,
  LinearFilter,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { resolveCoverUvTransform } from './photoFrame'

export interface PhotoTextureLoader {
  loadAsync(url: string): Promise<Texture>
}

const sharedPhotoTexturePromises = new Map<string, Promise<Texture>>()

/** 默认照片按 URL 共享同一加载结果与 Texture，避免每个相框重复占用显存。 */
export function loadSharedPhotoTexture(
  loader: PhotoTextureLoader,
  url: string,
) {
  const cached = sharedPhotoTexturePromises.get(url)
  if (cached) return cached
  const promise = loader.loadAsync(url).catch((error: unknown) => {
    sharedPhotoTexturePromises.delete(url)
    throw error
  })
  sharedPhotoTexturePromises.set(url, promise)
  return promise
}

/** 把 cover 裁切固化到相片平面的 UV，允许不同画幅复用同一 GPU 纹理。 */
export function createPhotoSurfaceGeometry(
  texture: Texture,
  targetWidth: number,
  targetHeight: number,
) {
  const image = texture.image as
    | {
        width?: number
        height?: number
        naturalWidth?: number
        naturalHeight?: number
      }
    | undefined
  const imageWidth = image?.naturalWidth ?? image?.width ?? 1
  const imageHeight = image?.naturalHeight ?? image?.height ?? 1
  const transform = resolveCoverUvTransform(
    imageWidth,
    imageHeight,
    targetWidth,
    targetHeight,
  )
  const geometry = new PlaneGeometry(targetWidth, targetHeight)
  const uv = geometry.attributes.uv
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      transform.offset[0] + uv.getX(index) * transform.repeat[0],
      transform.offset[1] + uv.getY(index) * transform.repeat[1],
    )
  }
  uv.needsUpdate = true
  return geometry
}

export interface LoadedPhotoTexture {
  readonly texture: Texture
  readonly sourceUrl: string
  readonly usedFallback: boolean
}

function markTextureSource(
  texture: Texture,
  sourceUrl: string,
  usedFallback: boolean,
) {
  texture.userData.sourceUrl = sourceUrl
  texture.userData.usedFallback = usedFallback
}

/** 请求图片失败时只回退一次本地默认图，避免异常冒泡摧毁整个场景。 */
export async function loadPhotoTextureWithFallback(
  loader: PhotoTextureLoader,
  requestedUrl: string,
  fallbackUrl: string,
): Promise<LoadedPhotoTexture> {
  const normalizedRequest = requestedUrl.trim() || fallbackUrl
  try {
    const texture = await loader.loadAsync(normalizedRequest)
    markTextureSource(texture, normalizedRequest, false)
    return { texture, sourceUrl: normalizedRequest, usedFallback: false }
  } catch (requestError) {
    if (normalizedRequest === fallbackUrl) throw requestError
    const texture = await loader.loadAsync(fallbackUrl)
    markTextureSource(texture, fallbackUrl, true)
    return { texture, sourceUrl: fallbackUrl, usedFallback: true }
  }
}

/** 设置照片颜色空间及居中 cover 裁切；纹理由调用方持有和释放。 */
export function configurePhotoTexture(
  texture: Texture,
  targetWidth: number,
  targetHeight: number,
) {
  const image = texture.image as
    | {
        width?: number
        height?: number
        naturalWidth?: number
        naturalHeight?: number
      }
    | undefined
  const imageWidth = image?.naturalWidth ?? image?.width ?? 1
  const imageHeight = image?.naturalHeight ?? image?.height ?? 1
  const transform = resolveCoverUvTransform(
    imageWidth,
    imageHeight,
    targetWidth,
    targetHeight,
  )

  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.repeat.set(...transform.repeat)
  texture.offset.set(...transform.offset)
  texture.needsUpdate = true
}
