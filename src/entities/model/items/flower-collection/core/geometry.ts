import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Vector3,
} from 'three'
import type {
  RibbonGeometryOptions,
  RibbonTipStyle,
  TrumpetGeometryOptions,
} from './types'
import { PETAL_MORPHOLOGIES } from './petalMorphologies'

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(value: number) {
  const normalized = clamp01(value)
  return normalized * normalized * (3 - 2 * normalized)
}

function catmullRomScalar(
  previous: number,
  start: number,
  end: number,
  next: number,
  t: number,
) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    2 * start +
    (-previous + end) * t +
    (2 * previous - 5 * start + 4 * end - next) * t2 +
    (-previous + 3 * start - 3 * end + next) * t3
  )
}

/**
 * 以少量形态锚点采样花瓣轮廓。末端单独收成圆帽，避免直切纸片边。
 */
function sampleRibbonHalfWidth(
  t: number,
  length: number,
  width: number,
  baseWidth: number,
  tipWidth: number,
  minimumWidth: number,
  widthProfile: RibbonGeometryOptions['widthProfile'],
  tipStyle: RibbonTipStyle,
) {
  const profile = widthProfile ?? [0.12, 0.38, 0.9, 1, 0.72, 0.07]
  const handles = [
    Math.max(baseWidth, width * profile[0]),
    width * profile[1],
    width * profile[2],
    width * profile[3],
    width * profile[4],
    Math.max(tipWidth, width * profile[5]),
  ]
  const terminalWidth = handles.at(-1)!
  const capSpan = Math.max(
    0.07,
    Math.min(0.28, terminalWidth / Math.max(length, 0.0001) * 0.72),
  )
  const capStart = 1 - capSpan

  if (t >= capStart) {
    const capT = clamp01((t - capStart) / (1 - capStart))
    const roundedCap = tipStyle === 'rounded'
      ? Math.pow(Math.max(0, 1 - capT * capT), 1.45)
      : Math.sqrt(Math.max(0, 1 - capT * capT))
    const capBaseWidth = tipStyle === 'rounded'
      ? Math.max(terminalWidth, width * 0.82)
      : terminalWidth
    return minimumWidth + (capBaseWidth - minimumWidth) * roundedCap
  }

  const segmentPosition = t / capStart * (handles.length - 1)
  const segment = Math.min(handles.length - 2, Math.floor(segmentPosition))
  const localT = segmentPosition - segment
  return Math.max(
    minimumWidth,
    catmullRomScalar(
      handles[Math.max(0, segment - 1)],
      handles[segment],
      handles[segment + 1],
      handles[Math.min(handles.length - 1, segment + 2)],
      localT,
    ),
  )
}

function addQuad(
  indices: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  reverse = false,
) {
  if (reverse) {
    indices.push(a, c, b, b, c, d)
  } else {
    indices.push(a, b, c, b, d, c)
  }
}

function addWall(
  indices: number[],
  frontA: number,
  frontB: number,
  backA: number,
  backB: number,
  reverse = false,
) {
  addQuad(indices, frontA, frontB, backA, backB, reverse)
}

/**
 * 花瓣和叶片共用的连续曲面薄壳。根部沿 +Y 生长，正面朝 +Z。
 *
 * 宽度、纵向卷曲和横向杯深共同参与曲面求解；壳体最后才沿曲面法线
 * 偏移，因此侧视保持自然弧度，不会露出可见的“纸板厚边”。
 */
export function createRibbonGeometry(
  options: RibbonGeometryOptions,
): BufferGeometry {
  // 默认值仍保留高精度；显式低档允许最小闭合薄壳采样，供高密度花序 LOD 使用。
  const lengthSegments = Math.max(4, options.lengthSegments ?? 40)
  const widthSegments = Math.max(2, options.widthSegments ?? 18)
  const requestedThickness = options.thickness ?? options.length * 0.0014
  const thickness = Math.max(
    Math.min(0.00004, options.length * 0.0006),
    Math.min(
      requestedThickness,
      options.length * 0.0018,
      options.width * 0.01,
    ),
  )
  const rowSize = widthSegments + 1
  const layerSize = (lengthSegments + 1) * rowSize
  const surface: Vector3[] = []
  const surfaceNormals: Vector3[] = []
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const baseColor = new Color(options.baseColor)
  const tipColor = new Color(options.tipColor)
  const centerColor = new Color(options.centerColor ?? options.baseColor)
  const veinColor = options.veinColor ? new Color(options.veinColor) : null
  const sampledColor = new Color()

  const baseWidth = options.baseWidth ?? options.width * 0.12
  const tipWidth = options.tipWidth ?? options.width * 0.025
  const tipStyle = options.tipStyle ?? 'pointed'
  const minimumWidth = Math.max(options.width * 0.0035, thickness * 1.35)
  const curlAngle = Math.max(
    -1.35,
    Math.min(1.2, (options.curl ?? 0) / options.length * 2.8),
  )
  const centerline: Vector3[] = [new Vector3()]
  const centerlineNormals: Vector3[] = [new Vector3(0, 0, 1)]
  const centerlineTangents: Vector3[] = [new Vector3(0, 1, 0)]
  const segmentLength = options.length / lengthSegments
  const tipCurlStart = Math.max(
    0.35,
    Math.min(0.9, options.tipCurlStart ?? 0.68),
  )
  const tipCurlAngle = Math.max(
    -1.1,
    Math.min(
      1.1,
      (options.tipCurl ?? 0) / Math.max(options.length, 0.0001) * 3.2,
    ),
  )

  for (let yIndex = 1; yIndex <= lengthSegments; yIndex += 1) {
    const midpoint = (yIndex - 0.5) / lengthSegments
    const tipProgress = smoothstep(
      (midpoint - tipCurlStart) / (1 - tipCurlStart),
    )
    const localAngle =
      curlAngle * Math.pow(midpoint, options.curlBias ?? 1.72) +
      tipCurlAngle * tipProgress * tipProgress
    const previous = centerline[yIndex - 1]
    centerline.push(new Vector3(
      0,
      previous.y + Math.cos(localAngle) * segmentLength,
      previous.z + Math.sin(localAngle) * segmentLength,
    ))
    centerlineNormals.push(
      new Vector3(0, -Math.sin(localAngle), Math.cos(localAngle)),
    )
    centerlineTangents.push(
      new Vector3(0, Math.cos(localAngle), Math.sin(localAngle)),
    )
  }

  for (let yIndex = 0; yIndex <= lengthSegments; yIndex += 1) {
    const t = yIndex / lengthSegments
    const serration =
      1 +
      (options.serration ?? 0) *
        Math.sin(t * Math.PI * 2 * (options.serrationCount ?? 9)) *
        Math.pow(Math.sin(Math.PI * t), 0.72)
    const halfWidth = sampleRibbonHalfWidth(
      t,
      options.length,
      options.width,
      baseWidth,
      tipWidth,
      minimumWidth,
      options.widthProfile,
      tipStyle,
    )
    const center = centerline[yIndex]
    const centerNormal = centerlineNormals[yIndex]
    const centerTangent = centerlineTangents[yIndex]
    const cupRatio = Math.max(
      -1.25,
      Math.min(1.25, (options.cup ?? 0) / Math.max(options.width, 0.0001)),
    )
    const sideCurlAngle = Math.max(
      -0.82,
      Math.min(
        0.82,
        (options.sideCurl ?? 0) / Math.max(options.width, 0.0001) * 1.7,
      ),
    )

    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const u = xIndex / widthSegments * 2 - 1
      const edgeWeight = Math.pow(Math.abs(u), 1.72)
      const asymmetry = 1 + (options.asymmetry ?? 0) * u * t
      const edgeHalfWidth = halfWidth * (
        1 + (serration - 1) * edgeWeight
      )
      const localX = u * edgeHalfWidth * asymmetry
      const cupCenter = Math.max(0.18, Math.min(0.82, options.cupCenter ?? 0.5))
      const cupProgress = t <= cupCenter
        ? t / cupCenter
        : (1 - t) / (1 - cupCenter)
      const profileWeight = Math.pow(smoothstep(cupProgress), 0.72)
      const cupDepth =
        halfWidth * cupRatio * 0.76 *
        (1 - Math.pow(Math.abs(u), 2.15)) * profileWeight
      const keelDepth =
        halfWidth * (options.keel ?? 0) *
        Math.exp(-u * u * 11) * profileWeight
      const veinPhase = (
        t * Math.max(1, options.veinCount ?? 7) - Math.abs(u) * 0.52
      ) * Math.PI * 2
      const lateralVeinRelief = (options.veinRelief ?? 0) *
        Math.pow(Math.max(0, Math.cos(veinPhase)), 5) *
        Math.pow(Math.abs(u), 0.62) * profileWeight
      const edgeRoll = sideCurlAngle * u * profileWeight
      const wave =
        (options.wave ?? 0) *
        Math.sin(
          (t * (options.waveCount ?? 4.5) + u * 0.31) * Math.PI * 2,
        ) *
        edgeWeight * smoothstep(t)
      const microUndulation =
        (options.wave ?? 0) * 0.16 *
        Math.sin(t * 43.7 + u * 29.3 + Math.sin(t * 7.1) * 2.4) *
        edgeWeight * profileWeight
      const edgeFlare =
        halfWidth * (options.edgeFlare ?? 0) *
        edgeWeight * Math.pow(smoothstep(t), 1.35)
      const localDepth = cupDepth + keelDepth + lateralVeinRelief +
        edgeFlare + wave + microUndulation
      const sideCurledX =
        localX * Math.cos(edgeRoll) - localDepth * Math.sin(edgeRoll)
      const sideCurledDepth =
        localX * Math.sin(edgeRoll) + localDepth * Math.cos(edgeRoll)
      const twistAngle = Math.max(-0.72, Math.min(0.72, options.twist ?? 0)) *
        Math.pow(t, options.twistBias ?? 1.45)
      const rotatedX =
        sideCurledX * Math.cos(twistAngle) -
        sideCurledDepth * Math.sin(twistAngle)
      const rotatedDepth =
        sideCurledX * Math.sin(twistAngle) +
        sideCurledDepth * Math.cos(twistAngle)
      const terminalBlend = smoothstep((t - 0.72) / 0.28)
      const roundedRetreat = tipStyle === 'rounded'
        ? (options.tipRoundness ?? 0.75) *
          edgeHalfWidth * edgeWeight * terminalBlend
        : 0
      const toothWave = tipStyle === 'toothed'
        ? Math.pow(
            Math.max(
              0,
              Math.cos(u * Math.PI * Math.max(1, options.tipTeeth ?? 5)),
            ),
            6,
          ) * edgeHalfWidth * 0.19 * terminalBlend
        : 0
      const tipNotch = tipStyle === 'rounded'
        ? (options.tipNotch ?? 0) *
          Math.exp(-u * u * 22) *
          Math.pow(terminalBlend, 1.7)
        : 0
      const longitudinalOffset = toothWave - roundedRetreat - tipNotch

      surface.push(new Vector3(
        rotatedX,
        center.y +
          centerNormal.y * rotatedDepth +
          centerTangent.y * longitudinalOffset,
        center.z +
          centerNormal.z * rotatedDepth +
          centerTangent.z * longitudinalOffset,
      ))
    }
  }

  const widthTangent = new Vector3()
  const lengthTangent = new Vector3()
  const normal = new Vector3()
  for (let yIndex = 0; yIndex <= lengthSegments; yIndex += 1) {
    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const index = yIndex * rowSize + xIndex
      const left = surface[yIndex * rowSize + Math.max(0, xIndex - 1)]
      const right = surface[yIndex * rowSize + Math.min(widthSegments, xIndex + 1)]
      const previous = surface[Math.max(0, yIndex - 1) * rowSize + xIndex]
      const next = surface[Math.min(lengthSegments, yIndex + 1) * rowSize + xIndex]
      widthTangent.subVectors(right, left)
      lengthTangent.subVectors(next, previous)
      normal.crossVectors(widthTangent, lengthTangent)
      if (normal.lengthSq() < 1e-12) normal.copy(centerlineNormals[yIndex])
      else normal.normalize()
      surfaceNormals[index] = normal.clone()
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const side = layer === 0 ? 1 : -1
    for (let yIndex = 0; yIndex <= lengthSegments; yIndex += 1) {
      const t = yIndex / lengthSegments
      const colorCupCenter = Math.max(
        0.18,
        Math.min(0.82, options.cupCenter ?? 0.5),
      )
      const colorCupProgress = t <= colorCupCenter
        ? t / colorCupCenter
        : (1 - t) / (1 - colorCupCenter)
      const colorProfileWeight = Math.pow(
        smoothstep(colorCupProgress),
        0.72,
      )
      for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
        const index = yIndex * rowSize + xIndex
        const u = xIndex / widthSegments * 2 - 1
        const surfaceNormal = surfaceNormals[index]
        const point = surface[index].clone().addScaledVector(
          surfaceNormal,
          side * thickness * 0.5,
        )
        positions.push(point.x, point.y, point.z)
        normals.push(
          surfaceNormal.x * side,
          surfaceNormal.y * side,
          surfaceNormal.z * side,
        )
        sampledColor.lerpColors(baseColor, tipColor, smoothstep(t))
        sampledColor.lerp(centerColor, (1 - Math.abs(u)) * 0.12)
        if (veinColor && (options.veinStrength ?? 0) > 0) {
          const veinPhase = (
            t * Math.max(1, options.veinCount ?? 7) - Math.abs(u) * 0.52
          ) * Math.PI * 2
          const midrib = Math.exp(-Math.pow(u / 0.055, 2))
          const lateralVeins = Math.pow(
            Math.max(0, Math.cos(veinPhase)),
            9,
          ) * Math.pow(Math.abs(u), 0.52) * colorProfileWeight
          sampledColor.lerp(
            veinColor,
            Math.min(
              0.48,
              (midrib * 0.72 + lateralVeins * 0.46) *
                (options.veinStrength ?? 0),
            ),
          )
        }
        if (layer === 1) sampledColor.multiplyScalar(0.94)
        colors.push(sampledColor.r, sampledColor.g, sampledColor.b)
        uvs.push(xIndex / widthSegments, t)
      }
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const layerOffset = layer * layerSize
    for (let yIndex = 0; yIndex < lengthSegments; yIndex += 1) {
      for (let xIndex = 0; xIndex < widthSegments; xIndex += 1) {
        const a = layerOffset + yIndex * rowSize + xIndex
        const b = a + 1
        const c = a + rowSize
        const d = c + 1
        addQuad(indices, a, b, c, d, layer === 1)
      }
    }
  }

  const front = 0
  const back = layerSize
  for (let xIndex = 0; xIndex < widthSegments; xIndex += 1) {
    const rootA = xIndex
    const rootB = xIndex + 1
    addWall(
      indices,
      front + rootA,
      front + rootB,
      back + rootA,
      back + rootB,
      true,
    )
    const tipA = lengthSegments * rowSize + xIndex
    const tipB = tipA + 1
    addWall(
      indices,
      front + tipA,
      front + tipB,
      back + tipA,
      back + tipB,
    )
  }
  for (let yIndex = 0; yIndex < lengthSegments; yIndex += 1) {
    const leftA = yIndex * rowSize
    const leftB = leftA + rowSize
    addWall(
      indices,
      front + leftA,
      front + leftB,
      back + leftA,
      back + leftB,
    )
    const rightA = leftA + widthSegments
    const rightB = leftB + widthSegments
    addWall(
      indices,
      front + rightA,
      front + rightB,
      back + rightA,
      back + rightB,
      true,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.sampling = {
    lengthSegments,
    widthSegments,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    closed: true,
    thickness,
    thicknessRatio: thickness / options.length,
    profile: 'catmull-rom-rounded-cap',
    curvature: 'integrated-centerline-with-terminal-reflex',
    representationSignature: 'paired-normal-offset-ribbon-v2',
    uvLayout: 'base-v0-tip-v1',
  }
  return geometry
}

export function createPetalGeometry(
  options: RibbonGeometryOptions,
): BufferGeometry {
  return createRibbonGeometry(options)
}

export function createLeafGeometry(
  options: Omit<RibbonGeometryOptions, 'baseColor' | 'tipColor'> & {
    baseColor?: string
    tipColor?: string
  },
): BufferGeometry {
  return createRibbonGeometry({
    ...options,
    baseColor: options.baseColor ?? '#416f28',
    tipColor: options.tipColor ?? '#7ba446',
    centerColor: options.centerColor ?? '#31551f',
  })
}

/**
 * 牵牛花使用连续旋转双层壳，而不是五片相交的平面花瓣。
 */
export function createTrumpetGeometry(
  options: TrumpetGeometryOptions,
): BufferGeometry {
  const radialSegments = Math.max(20, options.radialSegments ?? 64)
  const depthSegments = Math.max(8, options.depthSegments ?? 20)
  const shellThickness = Math.max(
    0.0008,
    Math.min(
      options.thickness,
      options.depth * 0.0025,
      options.rimRadius * 0.003,
    ),
  )
  const rowSize = radialSegments
  const layerSize = (depthSegments + 1) * rowSize
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const throatColor = new Color(options.throatColor)
  const middleColor = new Color(options.middleColor ?? options.rimColor)
  const rimColor = new Color(options.rimColor)
  const veinColor = new Color(options.veinColor)
  const sampledColor = new Color()

  for (let layer = 0; layer < 2; layer += 1) {
    const inner = layer === 1
    for (let depthIndex = 0; depthIndex <= depthSegments; depthIndex += 1) {
      const t = depthIndex / depthSegments
      const flare = smoothstep(Math.pow(t, options.flarePower ?? 1.15))
      for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
        const angle = radialIndex / radialSegments * Math.PI * 2
        const lobeSignal = Math.cos(angle * 5)
        const seamSignal = Math.pow(Math.max(0, -lobeSignal), options.seamWidth ?? 12)
        const naturalUndulation =
          (options.radialUndulation ?? 0) * Math.pow(t, 4.6) *
          Math.sin(angle * (options.radialUndulationCount ?? 9) + 0.73)
        const asymmetricLobe =
          (options.asymmetry ?? 0) * Math.pow(t, 3.5) *
          (Math.sin(angle + 0.8) * 0.62 + Math.sin(angle * 2.1) * 0.38)
        const rimLobe =
          1 + options.rimWave * Math.pow(t, 4) * lobeSignal +
          naturalUndulation + asymmetricLobe
        const midRadius = options.midRadius ??
          options.throatRadius + (options.rimRadius - options.throatRadius) * 0.34
        const baseRadius = flare < 0.55
          ? options.throatRadius +
            (midRadius - options.throatRadius) * smoothstep(flare / 0.55)
          : midRadius +
            (options.rimRadius - midRadius) * smoothstep((flare - 0.55) / 0.45)
        const radius = Math.max(
          options.throatRadius * 0.45,
          baseRadius * rimLobe,
        )
        // 花口的五条合生缝比花瓣中央略向后折，形成从白喉延伸到花口的
        // 连续沟槽；缝间区域略前鼓，使正视圆润、侧视仍读得出五个瓣域。
        const lobeRelief = Math.max(0, lobeSignal) *
          options.depth * options.rimWave * 0.16 * Math.pow(t, 3.2)
        const z =
          -options.depth * (1 - t) +
          Math.sin(Math.PI * t) * options.depth * 0.04 +
          (options.rimCurl ?? 0) * Math.pow(t, 5) -
          (options.seamDepth ?? 0) * seamSignal * Math.pow(t, 2.15) +
          lobeRelief
        positions.push(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          z - (inner ? shellThickness : 0),
        )

        if (t < 0.4) {
          sampledColor.lerpColors(throatColor, middleColor, smoothstep(t / 0.4))
        } else {
          sampledColor.lerpColors(middleColor, rimColor, smoothstep((t - 0.4) / 0.6))
        }
        const vein = seamSignal * (0.78 - smoothstep((t - 0.18) / 0.82) * 0.36)
        sampledColor.lerp(veinColor, vein * 0.84)
        if (inner) sampledColor.multiplyScalar(0.92)
        colors.push(sampledColor.r, sampledColor.g, sampledColor.b)
        uvs.push(radialIndex / radialSegments, t)
      }
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const layerOffset = layer * layerSize
    for (let depthIndex = 0; depthIndex < depthSegments; depthIndex += 1) {
      for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
        const nextRadial = (radialIndex + 1) % radialSegments
        const a = layerOffset + depthIndex * rowSize + radialIndex
        const b = layerOffset + depthIndex * rowSize + nextRadial
        const c = layerOffset + (depthIndex + 1) * rowSize + radialIndex
        const d = layerOffset + (depthIndex + 1) * rowSize + nextRadial
        addQuad(indices, a, b, c, d, layer === 1)
      }
    }
  }

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadial = (radialIndex + 1) % radialSegments
    addWall(
      indices,
      radialIndex,
      nextRadial,
      layerSize + radialIndex,
      layerSize + nextRadial,
      true,
    )
    const rimOffset = depthSegments * rowSize
    addWall(
      indices,
      rimOffset + radialIndex,
      rimOffset + nextRadial,
      layerSize + rimOffset + radialIndex,
      layerSize + rimOffset + nextRadial,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData.sampling = {
    representation: 'continuous-trumpet-shell',
    representationSignature: 'five-lobe-seam-relief-trumpet-v2',
    radialSegments,
    depthSegments,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    closed: true,
    thickness: shellThickness,
    thicknessRatio: shellThickness / options.depth,
    uvLayout: 'circumference-u-throat-v0-rim-v1',
  }
  return geometry
}

export interface HydrangeaSepalGeometryOptions {
  length: number
  width: number
  baseWidth: number
  tipWidth: number
  widthProfile: readonly [number, number, number, number, number, number]
  cup: number
  curl: number
  curlFocus: number
  sideCurl: number
  wave: number
  waveCount: number
  asymmetry: number
  thickness: number
  tipRoundness: number
  tipNotch: number
  cupCenter: number
  keel: number
  veinStrength: number
  veinCount: number
  baseColor: string
  tipColor: string
  centerColor: string
  veinColor: string
  lengthSegments: number
  widthSegments: number
}

/**
 * 绣球装饰花的一枚花瓣状萼片。花瓣数量继续由实例层控制，单片几何只消费
 * 规范化后的轮廓与曲率参数，避免把整朵花烘焙成没有层次的平面片。
 */
export function createHydrangeaSepalGeometry(
  input: number | Partial<HydrangeaSepalGeometryOptions> = 0.145,
) {
  const requested = typeof input === 'number' ? { length: input } : input
  const length = requested.length ?? 0.145
  const geometry = createRibbonGeometry({
    ...PETAL_MORPHOLOGIES.hydrangeaSepal,
    length,
    width: requested.width ?? length * 0.55,
    baseWidth: requested.baseWidth ?? length * 0.105,
    tipWidth: requested.tipWidth ?? length * 0.18,
    widthProfile:
      requested.widthProfile ?? PETAL_MORPHOLOGIES.hydrangeaSepal.widthProfile,
    cup: requested.cup ?? length * 0.19,
    curl: requested.curl ?? length * 0.18,
    curlBias:
      requested.curlFocus ?? PETAL_MORPHOLOGIES.hydrangeaSepal.curlBias,
    sideCurl: requested.sideCurl ?? length * 0.07,
    wave: requested.wave ?? length * 0.018,
    waveCount: requested.waveCount ?? 2.1,
    asymmetry: requested.asymmetry ?? 0.034,
    thickness: requested.thickness ?? length * 0.0016,
    tipRoundness:
      requested.tipRoundness ?? PETAL_MORPHOLOGIES.hydrangeaSepal.tipRoundness,
    tipNotch: requested.tipNotch ?? 0,
    cupCenter:
      requested.cupCenter ?? PETAL_MORPHOLOGIES.hydrangeaSepal.cupCenter,
    keel: requested.keel ?? PETAL_MORPHOLOGIES.hydrangeaSepal.keel,
    veinStrength:
      requested.veinStrength ?? PETAL_MORPHOLOGIES.hydrangeaSepal.veinStrength,
    veinCount:
      requested.veinCount ?? PETAL_MORPHOLOGIES.hydrangeaSepal.veinCount,
    veinColor: requested.veinColor ?? PETAL_MORPHOLOGIES.hydrangeaSepal.veinColor,
    baseColor: requested.baseColor ?? '#f1f5ff',
    tipColor: requested.tipColor ?? '#dce6ff',
    centerColor: requested.centerColor ?? '#ffffff',
    lengthSegments: requested.lengthSegments ?? 16,
    widthSegments: requested.widthSegments ?? 10,
  })
  geometry.userData.sampling.organ = 'hydrangea-decorative-sepal'
  geometry.userData.sampling.representation = 'independent-curved-thin-shell'
  return geometry
}

export {
  createBroadLeafGeometry,
  createPeltateLeafGeometry,
  createPinnatifidLeafGeometry,
  createRoundLeafGeometry,
} from './leafGeometry'
export type {
  BroadLeafGeometryOptions,
  PeltateLeafGeometryOptions,
  PinnatifidLeafGeometryOptions,
} from './leafGeometry'
