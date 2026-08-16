import {
  DataTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export interface CottageSingleBedTextures {
  readonly wood: DataTexture
  readonly linen: DataTexture
}

function textureFromLuminance(
  size: number,
  sampler: (x: number, y: number) => number,
  repeat: [number, number],
) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4
      const value = Math.round(Math.min(1, Math.max(0, sampler(x, y))) * 255)
      data[offset] = value
      data[offset + 1] = value
      data[offset + 2] = value
      data[offset + 3] = 255
    }
  }
  const texture = new DataTexture(data, size, size)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(...repeat)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** 生成不依赖外部文件的确定性木纹和亚麻纹理。 */
export function createCottageSingleBedTextures(): CottageSingleBedTextures {
  return {
    wood: textureFromLuminance(
      128,
      (x, y) => {
        const knot = Math.sin((x + Math.sin(y * 0.12) * 8) * 0.22)
        const fine = Math.sin(x * 0.91 + y * 0.035) * 0.025
        return 0.84 + knot * 0.075 + fine
      },
      [2.4, 5.6],
    ),
    linen: textureFromLuminance(
      64,
      (x, y) => {
        const warp = x % 4 === 0 ? 0.06 : -0.012
        const weft = y % 4 === 0 ? 0.05 : -0.01
        return 0.89 + warp + weft
      },
      [7, 7],
    ),
  }
}

export function disposeCottageSingleBedTextures(
  textures: CottageSingleBedTextures,
) {
  textures.wood.dispose()
  textures.linen.dispose()
}

