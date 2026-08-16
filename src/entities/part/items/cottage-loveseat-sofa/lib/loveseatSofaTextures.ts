import {
  DataTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export interface CottageLoveseatSofaTextures {
  readonly linen: DataTexture
  readonly wood: DataTexture
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
      data.set([value, value, value, 255], offset)
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

/** 为沙发布面和木脚生成确定性微表面纹理。 */
export function createCottageLoveseatSofaTextures(): CottageLoveseatSofaTextures {
  return {
    linen: textureFromLuminance(
      64,
      (x, y) => {
        const warp = x % 4 === 0 ? 0.065 : -0.012
        const weft = y % 4 === 0 ? 0.052 : -0.008
        const diagonal = Math.sin((x + y) * 0.8) * 0.012
        return 0.885 + warp + weft + diagonal
      },
      [8, 8],
    ),
    wood: textureFromLuminance(
      96,
      (x, y) =>
        0.84 +
        Math.sin((x + Math.sin(y * 0.14) * 6) * 0.24) * 0.075,
      [2, 4],
    ),
  }
}

export function disposeCottageLoveseatSofaTextures(
  textures: CottageLoveseatSofaTextures,
) {
  textures.linen.dispose()
  textures.wood.dispose()
}

