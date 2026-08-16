import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'

export interface EnvelopePaperTextures {
  readonly color: DataTexture
  readonly roughness: DataTexture
  readonly normal: DataTexture
}

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x + seed * 17, 374_761_393)
  value = Math.imul(value ^ Math.imul(y + seed * 29, 668_265_263), 1_274_126_177)
  return ((value ^ (value >>> 13)) >>> 0) / 4_294_967_295
}

/** 无 DOM、确定性的微纤维贴图，避免纸张在近景中呈现纯色塑料感。 */
export function createEnvelopePaperTextures(size = 96): EnvelopePaperTextures {
  const colorData = new Uint8Array(size * size * 4)
  const roughnessData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4
      const grain = hash(x, y, 11) - 0.5
      const longFiber = Math.sin((x * 0.31 + y * 0.07) * Math.PI) * 0.5
      const crossFiber = Math.sin((y * 0.43 - x * 0.035) * Math.PI) * 0.5
      const paperValue = Math.round(242 + grain * 12 + longFiber * 3)
      colorData.set([paperValue + 4, paperValue + 2, paperValue - 2, 255], offset)

      const roughness = Math.round(210 + grain * 22 + crossFiber * 8)
      roughnessData.set([roughness, roughness, roughness, 255], offset)

      const normalX = Math.round(128 + longFiber * 9 + grain * 5)
      const normalY = Math.round(128 + crossFiber * 9 - grain * 4)
      normalData.set([normalX, normalY, 252, 255], offset)
    }
  }

  const createTexture = (data: Uint8Array) => {
    const texture = new DataTexture(
      data,
      size,
      size,
      RGBAFormat,
      UnsignedByteType,
    )
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.repeat.set(3.5, 2.5)
    texture.needsUpdate = true
    return texture
  }

  const color = createTexture(colorData)
  color.colorSpace = SRGBColorSpace
  const roughness = createTexture(roughnessData)
  const normal = createTexture(normalData)
  return { color, roughness, normal }
}

export function disposeEnvelopePaperTextures(textures: EnvelopePaperTextures) {
  textures.color.dispose()
  textures.roughness.dispose()
  textures.normal.dispose()
}
