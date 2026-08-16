import {
  DataTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export interface CottageLowCabinetTextures {
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

/** 为蜂蜜木柜体与软垫生成确定性可重复纹理。 */
export function createCottageLowCabinetTextures(): CottageLowCabinetTextures {
  return {
    wood: textureFromLuminance(
      128,
      (x, y) => {
        const broad = Math.sin((x + Math.sin(y * 0.09) * 9) * 0.19)
        const pore = Math.sin(x * 1.17 + y * 0.027) * 0.018
        return 0.84 + broad * 0.085 + pore
      },
      [2.8, 5.2],
    ),
    linen: textureFromLuminance(
      64,
      (x, y) =>
        0.89 +
        (x % 4 === 0 ? 0.062 : -0.012) +
        (y % 4 === 0 ? 0.05 : -0.009),
      [8, 8],
    ),
  }
}

export function disposeCottageLowCabinetTextures(
  textures: CottageLowCabinetTextures,
) {
  textures.wood.dispose()
  textures.linen.dispose()
}

