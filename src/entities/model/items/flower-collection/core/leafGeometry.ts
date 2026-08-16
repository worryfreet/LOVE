import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Vector3,
} from 'three'

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(value: number) {
  const normalized = clamp01(value)
  return normalized * normalized * (3 - 2 * normalized)
}

function addQuad(
  indices: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  reverse = false,
) {
  if (reverse) indices.push(a, c, b, b, c, d)
  else indices.push(a, b, c, b, d, c)
}

interface OrganicLeafShellOptions {
  length: number
  width: number
  halfWidthAt: (progress: number) => number
  cup: number
  curl: number
  twist: number
  edgeWave: number
  edgeWaveCount: number
  midribFold: number
  veinRelief: number
  veinPairs: number
  roundedTip: number
  thickness: number
  baseColor: string
  tipColor: string
  veinColor: string
  lengthSegments: number
  widthSegments: number
  representation: string
}

/**
 * 由主脉中心线和横向叶肉剖面生成闭合薄壳。宏观叶脉参与曲面起伏，
 * 颜色与法线贴图只补微表面，侧视不再退化为平面挤出片。
 */
function createOrganicLeafShell({
  length,
  width,
  halfWidthAt,
  cup,
  curl,
  twist,
  edgeWave,
  edgeWaveCount,
  midribFold,
  veinRelief,
  veinPairs,
  roundedTip,
  thickness: requestedThickness,
  baseColor,
  tipColor,
  veinColor,
  lengthSegments: requestedLengthSegments,
  widthSegments: requestedWidthSegments,
  representation,
}: OrganicLeafShellOptions) {
  // 尊重画质档传入的细分预算；闭合薄壳在 6×4 网格下仍有
  // 独立正反面与完整封边，不应把所有 LOD 暗中抬高到 12×18。
  const lengthSegments = Math.max(6, Math.round(requestedLengthSegments))
  const widthSegments = Math.max(4, Math.round(requestedWidthSegments))
  const rowSize = widthSegments + 1
  const layerSize = (lengthSegments + 1) * rowSize
  const thickness = Math.max(
    length * 0.0012,
    Math.min(requestedThickness, length * 0.006, width * 0.025),
  )
  const surface: Vector3[] = []
  const surfaceNormals: Vector3[] = []
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const rootColor = new Color(baseColor)
  const endColor = new Color(tipColor)
  const ribColor = new Color(veinColor)
  const sampledColor = new Color()

  for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
    const t = lengthIndex / lengthSegments
    const halfWidth = Math.max(width * 0.012, halfWidthAt(t))
    const bladeEnvelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62)
    const centerlineDepth = curl * Math.pow(smoothstep(t), 1.55)
    const terminalBlend = smoothstep((t - 0.7) / 0.3)

    for (let widthIndex = 0; widthIndex <= widthSegments; widthIndex += 1) {
      const u = widthIndex / widthSegments * 2 - 1
      const absU = Math.abs(u)
      const localX = u * halfWidth
      const midrib = midribFold *
        Math.exp(-Math.pow(u / 0.075, 2)) *
        Math.pow(bladeEnvelope, 0.72)
      const lateralPhase = (t * veinPairs - absU * 0.52) * Math.PI * 2
      const lateralRidge = veinRelief * 0.34 *
        Math.pow(Math.max(0, Math.cos(lateralPhase)), 3) *
        Math.pow(absU, 0.62) *
        bladeEnvelope
      const laminaCorrugation = veinRelief * 0.025 *
        Math.sin(lateralPhase) *
        Math.pow(absU, 0.82) *
        bladeEnvelope
      const transverseCup = cup *
        (1 - Math.pow(absU, 1.62)) *
        Math.pow(bladeEnvelope, 0.78)
      const marginWave = edgeWave *
        Math.sin(t * edgeWaveCount * Math.PI * 2 + u * 0.72) *
        Math.pow(absU, 2.2) *
        bladeEnvelope
      const bladeDepth = transverseCup + midrib + lateralRidge +
        laminaCorrugation + marginWave
      const twistAngle = twist * Math.pow(t, 1.35)
      const rotatedX = localX * Math.cos(twistAngle) -
        bladeDepth * Math.sin(twistAngle)
      const rotatedDepth = localX * Math.sin(twistAngle) +
        bladeDepth * Math.cos(twistAngle)
      const ellipticalCap = 1 - Math.sqrt(Math.max(0, 1 - absU * absU))
      const tipRetreat = roundedTip * width * 0.42 *
        ellipticalCap * terminalBlend

      surface.push(new Vector3(
        rotatedX,
        length * t - tipRetreat,
        centerlineDepth + rotatedDepth,
      ))
    }
  }

  const across = new Vector3()
  const along = new Vector3()
  const normal = new Vector3()
  for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
    for (let widthIndex = 0; widthIndex <= widthSegments; widthIndex += 1) {
      const index = lengthIndex * rowSize + widthIndex
      const left = surface[lengthIndex * rowSize + Math.max(0, widthIndex - 1)]
      const right = surface[lengthIndex * rowSize + Math.min(widthSegments, widthIndex + 1)]
      const previous = surface[Math.max(0, lengthIndex - 1) * rowSize + widthIndex]
      const next = surface[Math.min(lengthSegments, lengthIndex + 1) * rowSize + widthIndex]
      across.subVectors(right, left)
      along.subVectors(next, previous)
      normal.crossVectors(across, along)
      surfaceNormals[index] = normal.lengthSq() < 1e-12
        ? new Vector3(0, 0, 1)
        : normal.clone().normalize()
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const side = layer === 0 ? 1 : -1
    for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
      const t = lengthIndex / lengthSegments
      const bladeEnvelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62)
      for (let widthIndex = 0; widthIndex <= widthSegments; widthIndex += 1) {
        const index = lengthIndex * rowSize + widthIndex
        const u = widthIndex / widthSegments * 2 - 1
        const absU = Math.abs(u)
        const point = surface[index].clone().addScaledVector(
          surfaceNormals[index],
          side * thickness * 0.5,
        )
        positions.push(point.x, point.y, point.z)
        normals.push(
          surfaceNormals[index].x * side,
          surfaceNormals[index].y * side,
          surfaceNormals[index].z * side,
        )
        const lateralPhase = (t * veinPairs - absU * 0.52) * Math.PI * 2
        const midribMask = Math.exp(-Math.pow(u / 0.055, 2))
        const lateralMask = Math.pow(Math.max(0, Math.cos(lateralPhase)), 9) *
          Math.pow(absU, 0.52) * bladeEnvelope
        sampledColor.lerpColors(rootColor, endColor, smoothstep(t))
        sampledColor.lerp(ribColor, Math.min(0.24, midribMask * 0.18 + lateralMask * 0.035))
        if (layer === 1) sampledColor.multiplyScalar(0.88)
        colors.push(sampledColor.r, sampledColor.g, sampledColor.b)
        uvs.push(widthIndex / widthSegments, t)
      }
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const offset = layer * layerSize
    for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex += 1) {
      for (let widthIndex = 0; widthIndex < widthSegments; widthIndex += 1) {
        const a = offset + lengthIndex * rowSize + widthIndex
        const b = a + 1
        const c = a + rowSize
        const d = c + 1
        addQuad(indices, a, b, c, d, layer === 1)
      }
    }
  }

  const back = layerSize
  for (let widthIndex = 0; widthIndex < widthSegments; widthIndex += 1) {
    addQuad(indices, widthIndex, widthIndex + 1, back + widthIndex, back + widthIndex + 1, true)
    const tip = lengthSegments * rowSize + widthIndex
    addQuad(indices, tip, tip + 1, back + tip, back + tip + 1)
  }
  for (let lengthIndex = 0; lengthIndex < lengthSegments; lengthIndex += 1) {
    const left = lengthIndex * rowSize
    const nextLeft = left + rowSize
    addQuad(indices, left, nextLeft, back + left, back + nextLeft)
    const right = left + widthSegments
    const nextRight = nextLeft + widthSegments
    addQuad(indices, right, nextRight, back + right, back + nextRight, true)
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
    representation,
    representationSignature: 'paired-normal-offset-organic-leaf-v3',
    lengthSegments,
    widthSegments,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    closed: true,
    thickness,
    curvature: 'midrib-centerline-with-lateral-vein-corrugation',
    uvLayout: 'petiole-v0-tip-v1',
  }
  return geometry
}

export interface BroadLeafGeometryOptions {
  length: number
  width: number
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
  baseColor?: string
  tipColor?: string
  veinColor?: string
}

export function createBroadLeafGeometry({
  length,
  width,
  cup = 0.05,
  curl = -0.03,
  twist = 0.055,
  edgeWave = length * 0.006,
  serration = 0.03,
  serrationCount = 11,
  heartLobes = 0.25,
  roundedTip = 0,
  midribFold = length * 0.014,
  veinRelief = length * 0.0035,
  veinPairs = 8,
  thickness = length * 0.0045,
  lengthSegments = 56,
  widthSegments = 16,
  baseColor = '#315D24',
  tipColor = '#7F9F42',
  veinColor = '#B2C66A',
}: BroadLeafGeometryOptions) {
  const safeRoundedTip = clamp01(roundedTip)
  const capStart = 0.8
  const halfWidthAt = (t: number) => {
    const body = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.58)
    const lowerLobe = 1 + heartLobes * Math.exp(-Math.pow((t - 0.16) / 0.13, 2))
    const teeth = 1 + serration * 0.42 *
      Math.sin(t * Math.PI * Math.max(1, serrationCount) * 2) *
      Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.5)
    if (safeRoundedTip <= 0 || t <= capStart) {
      return width * body * lowerLobe * teeth
    }
    const capT = (t - capStart) / (1 - capStart)
    const pointed = body * lowerLobe * teeth
    const rounded = width * (0.82 - capT * 0.04)
    return pointed + (rounded - pointed) * safeRoundedTip
  }

  const geometry = createOrganicLeafShell({
    length,
    width,
    halfWidthAt,
    cup,
    curl,
    twist,
    edgeWave,
    edgeWaveCount: Math.max(3, serrationCount * 0.5),
    midribFold,
    veinRelief,
    veinPairs,
    roundedTip: safeRoundedTip * 0.72,
    thickness,
    baseColor,
    tipColor,
    veinColor,
    lengthSegments,
    widthSegments,
    representation: 'closed-broad-organic-leaf-shell',
  })
  Object.assign(geometry.userData.sampling, {
    heartLobes,
    roundedTip: safeRoundedTip,
    serration,
  })
  return geometry
}

export interface PinnatifidLeafGeometryOptions {
  length: number
  width: number
  lobePairs?: number
  notchDepth?: number
  cup?: number
  curl?: number
  twist?: number
  thickness?: number
  lengthSegments?: number
  widthSegments?: number
  baseColor?: string
  tipColor?: string
  veinColor?: string
}

export function createPinnatifidLeafGeometry({
  length,
  width,
  lobePairs = 7,
  notchDepth = 0.48,
  cup = 0.026,
  curl = -0.025,
  twist = 0.06,
  thickness = length * 0.0038,
  lengthSegments = 64,
  widthSegments = 12,
  baseColor = '#294C1D',
  tipColor = '#688B3E',
  veinColor = '#A4B76D',
}: PinnatifidLeafGeometryOptions) {
  const pairs = Math.max(5, Math.min(9, Math.round(lobePairs)))
  const depth = Math.max(0.32, Math.min(0.62, notchDepth))
  const effectiveDepth = Math.min(0.84, depth * 1.55)
  const halfWidthAt = (t: number) => {
    const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.52)
    const shifted = Math.max(0, Math.min(0.9999, (t - 0.035) / 0.91))
    const local = (shifted * pairs) % 1
    const lobe = local < 0.34
      ? local / 0.34
      : (1 - local) / 0.66
    const angularLobe = Math.pow(Math.max(0, lobe), 0.48)
    const widthFactor = 1 - effectiveDepth + effectiveDepth * angularLobe
    return width * envelope * widthFactor
  }
  const geometry = createOrganicLeafShell({
    length,
    width,
    halfWidthAt,
    cup,
    curl,
    twist,
    edgeWave: length * 0.0035,
    edgeWaveCount: pairs,
    midribFold: length * 0.021,
    veinRelief: length * 0.006,
    veinPairs: pairs,
    roundedTip: 0,
    thickness,
    baseColor,
    tipColor,
    veinColor,
    lengthSegments,
    widthSegments,
    representation: 'closed-pinnatifid-organic-leaf-shell',
  })
  Object.assign(geometry.userData.sampling, {
    lobePairs: pairs,
    notchDepth: depth,
    effectiveNotchDepth: effectiveDepth,
  })
  return geometry
}

export interface PeltateLeafGeometryOptions {
  radius: number
  cup: number
  curl: number
  wave: number
  baseColor: string
  tipColor: string
  veinColor: string
  radialSegments: number
  ringSegments: number
  thickness?: number
  veinCount?: number
  veinRelief?: number
}

/** 盾状叶由中心凹点向外辐射，正反面沿曲面法线偏移并在叶缘闭合。 */
export function createPeltateLeafGeometry({
  radius,
  cup,
  curl,
  wave,
  baseColor,
  tipColor,
  veinColor,
  radialSegments: requestedRadialSegments,
  ringSegments: requestedRingSegments,
  thickness: requestedThickness = radius * 0.006,
  veinCount = 14,
  veinRelief = radius * 0.012,
}: PeltateLeafGeometryOptions) {
  const radialSegments = Math.max(24, Math.round(requestedRadialSegments))
  const ringSegments = Math.max(6, Math.round(requestedRingSegments))
  const thickness = Math.max(
    radius * 0.002,
    Math.min(requestedThickness, radius * 0.01),
  )
  const layerSize = 1 + radialSegments * ringSegments
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const centerColor = new Color(baseColor)
  const edgeColor = new Color(tipColor)
  const ribColor = new Color(veinColor)
  const sampledColor = new Color()
  const surface: Vector3[] = []
  const surfaceNormals: Vector3[] = []

  const sampleSurface = (t: number, angle: number) => {
    const edgeRipple = Math.sin(angle * 14 + 0.35) * wave * t * t
    const localRadius = radius * t * (1 + edgeRipple)
    const radialBowl = -cup * Math.pow(1 - t, 2.2) + cup * 0.24 * t * t
    const directionalCurl = curl * Math.cos(angle - 0.45) * t * t
    const broadWave = wave * radius *
      Math.sin(angle * 5 + t * 4.2) * Math.pow(t, 1.65)
    const spokeRidge = veinRelief *
      Math.pow(Math.max(0, Math.cos(angle * veinCount * 0.5)), 7) *
      Math.sin(Math.PI * t)
    return new Vector3(
      Math.cos(angle) * localRadius,
      Math.sin(angle) * localRadius,
      radialBowl + directionalCurl + broadWave + spokeRidge,
    )
  }

  surface.push(sampleSurface(0, 0))
  surfaceNormals.push(new Vector3(0, 0, 1))
  for (let ring = 1; ring <= ringSegments; ring += 1) {
    const t = ring / ringSegments
    for (let spoke = 0; spoke < radialSegments; spoke += 1) {
      const angle = spoke / radialSegments * Math.PI * 2
      const point = sampleSurface(t, angle)
      const radialBefore = sampleSurface(Math.max(0, t - 0.002), angle)
      const radialAfter = sampleSurface(Math.min(1, t + 0.002), angle)
      const angularBefore = sampleSurface(t, angle - 0.002)
      const angularAfter = sampleSurface(t, angle + 0.002)
      const radialTangent = radialAfter.sub(radialBefore)
      const angularTangent = angularAfter.sub(angularBefore)
      const normal = radialTangent.cross(angularTangent).normalize()
      surface.push(point)
      surfaceNormals.push(normal.lengthSq() < 1e-12 ? new Vector3(0, 0, 1) : normal)
    }
  }

  for (let layer = 0; layer < 2; layer += 1) {
    const side = layer === 0 ? 1 : -1
    surface.forEach((point, index) => {
      const normal = surfaceNormals[index]
      const offset = point.clone().addScaledVector(normal, side * thickness * 0.5)
      positions.push(offset.x, offset.y, offset.z)
      normals.push(normal.x * side, normal.y * side, normal.z * side)
      const t = index === 0 ? 0 : Math.floor((index - 1) / radialSegments + 1) / ringSegments
      const spoke = index === 0 ? 0 : (index - 1) % radialSegments
      const angle = spoke / radialSegments * Math.PI * 2
      const spokeMask = Math.pow(
        Math.max(0, Math.cos(angle * veinCount * 0.5)),
        10,
      ) * Math.sin(Math.PI * t)
      sampledColor.lerpColors(centerColor, edgeColor, smoothstep(t))
      sampledColor.lerp(ribColor, Math.min(0.32, spokeMask * 0.22 + (1 - t) * 0.08))
      if (layer === 1) sampledColor.multiplyScalar(0.87)
      colors.push(sampledColor.r, sampledColor.g, sampledColor.b)
      uvs.push(point.x / radius * 0.5 + 0.5, point.y / radius * 0.5 + 0.5)
    })
  }

  const vertexAt = (layer: number, ring: number, spoke: number) => {
    const offset = layer * layerSize
    if (ring === 0) return offset
    const normalizedSpoke = (spoke + radialSegments) % radialSegments
    return offset + 1 + (ring - 1) * radialSegments + normalizedSpoke
  }
  for (let layer = 0; layer < 2; layer += 1) {
    const center = vertexAt(layer, 0, 0)
    for (let spoke = 0; spoke < radialSegments; spoke += 1) {
      const current = vertexAt(layer, 1, spoke)
      const next = vertexAt(layer, 1, spoke + 1)
      if (layer === 0) indices.push(center, current, next)
      else indices.push(center, next, current)
    }
    for (let ring = 1; ring < ringSegments; ring += 1) {
      for (let spoke = 0; spoke < radialSegments; spoke += 1) {
        const a = vertexAt(layer, ring, spoke)
        const b = vertexAt(layer, ring, spoke + 1)
        const c = vertexAt(layer, ring + 1, spoke)
        const d = vertexAt(layer, ring + 1, spoke + 1)
        if (layer === 0) indices.push(a, c, b, b, c, d)
        else indices.push(a, b, c, b, d, c)
      }
    }
  }
  for (let spoke = 0; spoke < radialSegments; spoke += 1) {
    const frontCurrent = vertexAt(0, ringSegments, spoke)
    const frontNext = vertexAt(0, ringSegments, spoke + 1)
    const backCurrent = vertexAt(1, ringSegments, spoke)
    const backNext = vertexAt(1, ringSegments, spoke + 1)
    indices.push(
      frontNext, frontCurrent, backCurrent,
      frontNext, backCurrent, backNext,
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
    representation: 'closed-peltate-radial-leaf-shell',
    representationSignature: 'paired-normal-offset-radial-leaf-v3',
    radialSegments,
    ringSegments,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    closed: true,
    thickness,
    curvature: 'central-socket-bowl-with-radial-vein-relief',
    uvLayout: 'centered-planar',
  }
  return geometry
}

export function createRoundLeafGeometry(radius = 0.7, edgeWaves = 14) {
  const geometry = createPeltateLeafGeometry({
    radius,
    cup: radius * 0.12,
    curl: -radius * 0.035,
    wave: 0.025,
    baseColor: '#365F37',
    tipColor: '#6F8F56',
    veinColor: '#A7BC79',
    radialSegments: Math.max(32, edgeWaves * 4),
    ringSegments: 12,
    veinCount: edgeWaves,
  })
  geometry.userData.sampling.edgeWaves = edgeWaves
  return geometry
}
