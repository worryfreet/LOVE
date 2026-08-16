export interface StudioLilyPetalPattern {
  kind: 'lily'
  spotVisible: boolean
  spotsPerPetal: number
  spotColor: string
  veinStrength: number
  throatLift: number
  tipReflex: number
}

export type StudioRosePatternStyle =
  | 'solid'
  | 'gradient'
  | 'bicolor'
  | 'tie-dye'

export interface StudioRosePetalPattern {
  kind: 'rose'
  style: StudioRosePatternStyle
  accentColor: string
  strength: number
}

export type StudioPetalPattern =
  | StudioLilyPetalPattern
  | StudioRosePetalPattern

const PATTERN_RESOLUTION = 256

function hash(value: number) {
  return Math.sin(value * 127.1) * 43758.5453123 % 1
}

function positiveHash(value: number) {
  const sampled = hash(value)
  return sampled < 0 ? sampled + 1 : sampled
}

/**
 * 生成百合花被的三通道遮罩：R 中央深粉带、G 斑点、B 纵脉。
 * 颜色仍由 Studio Shader 的五段调色板控制，避免把光照烘焙进贴图。
 */
export function createStudioPetalPatternData(
  pattern?: StudioPetalPattern,
  resolution = PATTERN_RESOLUTION,
) {
  const data = new Uint8Array(resolution * resolution * 4)
  if (pattern?.kind === 'rose') {
    const dyeBlots = Array.from({ length: 7 }, (_, index) => ({
      u: 0.12 + positiveHash(index * 7.3 + 2.1) * 0.76,
      v: 0.14 + positiveHash(index * 11.7 + 5.4) * 0.72,
      radiusU: 0.075 + positiveHash(index * 3.9 + 8.2) * 0.08,
      radiusV: 0.1 + positiveHash(index * 6.1 + 4.7) * 0.11,
    }))
    for (let y = 0; y < resolution; y += 1) {
      const v = y / (resolution - 1)
      for (let x = 0; x < resolution; x += 1) {
        const u = x / (resolution - 1)
        const edge = Math.min(1, Math.max(0, (Math.abs(u - 0.5) * 2 - 0.58) / 0.34))
        const upperEdge = edge * Math.min(1, Math.max(0, (v - 0.22) / 0.34))
        const broadGradient = Math.min(1, Math.max(0, (v - 0.18) / 0.72))
        let tieDye = 0
        for (const blot of dyeBlots) {
          const warpedU = u + Math.sin(v * 12.3 + blot.u * 7.1) * 0.025
          const warpedV = v + Math.sin(u * 10.7 + blot.v * 5.3) * 0.03
          const deltaU = (warpedU - blot.u) / blot.radiusU
          const deltaV = (warpedV - blot.v) / blot.radiusV
          const blotMask = Math.exp(-(deltaU * deltaU + deltaV * deltaV) * 1.65)
          tieDye = Math.max(tieDye, blotMask)
        }
        const microVein = Math.pow(
          0.5 + 0.5 * Math.cos((u - 0.5) * 15 * Math.PI),
          22,
        ) * (1 - edge * 0.4)
        let rimMask = 0
        let secondaryMask = 0
        if (pattern.style === 'gradient') secondaryMask = broadGradient
        if (pattern.style === 'bicolor') rimMask = upperEdge
        if (pattern.style === 'tie-dye') secondaryMask = tieDye
        const offset = (y * resolution + x) * 4
        data[offset] = Math.round(rimMask * pattern.strength * 255)
        data[offset + 1] = Math.round(secondaryMask * pattern.strength * 255)
        data[offset + 2] = Math.round(microVein * 0.22 * 255)
        data[offset + 3] = 255
      }
    }
    return data
  }

  const spotCount = pattern?.kind === 'lily' && pattern.spotVisible
    ? Math.max(0, Math.min(24, Math.round(pattern.spotsPerPetal)))
    : 0
  const spots = Array.from({ length: spotCount }, (_, index) => {
    const v = 0.12 + positiveHash(index * 8.3 + 1.7) * 0.46
    const spread = 0.08 + v * 0.34
    return {
      u: 0.5 + (positiveHash(index * 13.1 + 3.9) - 0.5) * spread * 2,
      v,
      radius: 0.006 + positiveHash(index * 5.7 + 9.1) * 0.0045,
    }
  })

  for (let y = 0; y < resolution; y += 1) {
    const v = y / (resolution - 1)
    for (let x = 0; x < resolution; x += 1) {
      const u = x / (resolution - 1)
      const centerDistance = Math.abs(u - 0.5) * 2
      const centerBand = Math.exp(-centerDistance * centerDistance * 5.2) *
        Math.min(1, Math.max(0, (v - 0.035) / 0.145)) *
        (1 - Math.min(1, Math.max(0, (v - 0.62) / 0.3)))
      const vein = Math.pow(
        0.5 + 0.5 * Math.cos((u - 0.5) * 12 * Math.PI),
        18,
      ) * Math.min(1, Math.max(0, (v - 0.04) / 0.16)) *
        (1 - Math.min(1, Math.max(0, (v - 0.8) / 0.2))) *
        (pattern?.kind === 'lily' ? pattern.veinStrength : 0)
      let spotMask = 0
      for (const spot of spots) {
        const deltaU = (u - spot.u) / spot.radius
        const deltaV = (v - spot.v) / (spot.radius * 1.45)
        spotMask = Math.max(
          spotMask,
          Math.exp(-(deltaU * deltaU + deltaV * deltaV) * 1.8),
        )
      }
      const offset = (y * resolution + x) * 4
      data[offset] = Math.round(centerBand * 255)
      data[offset + 1] = Math.round(spotMask * 255)
      data[offset + 2] = Math.round(vein * 255)
      data[offset + 3] = 255
    }
  }
  return data
}

export const STUDIO_PETAL_PATTERN_RESOLUTION = PATTERN_RESOLUTION
