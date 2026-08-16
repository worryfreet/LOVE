import {
  BufferGeometry,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE,
  WILDFLOWER_MEADOW_SIZE,
  WILDFLOWER_SPECS,
  type WildflowerLeafProfile,
  type WildflowerPetalProfile,
  type WildflowerSpeciesId,
} from './spec'

function colorize(geometry: BufferGeometry, colorValue: string) {
  const geometryColor = new Color(colorValue)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index += 1) {
    colors[index * 3] = geometryColor.r
    colors[index * 3 + 1] = geometryColor.g
    colors[index * 3 + 2] = geometryColor.b
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.deleteAttribute('uv')
  return geometry
}

function createPetalShape(
  profile: WildflowerPetalProfile,
  length: number,
  width: number,
) {
  const shape = new Shape()
  shape.moveTo(0, 0)
  if (profile === 'rounded') {
    shape.bezierCurveTo(
      -width * 0.48,
      length * 0.18,
      -width * 0.58,
      length * 0.72,
      0,
      length,
    )
    shape.bezierCurveTo(
      width * 0.58,
      length * 0.72,
      width * 0.48,
      length * 0.18,
      0,
      0,
    )
  } else if (profile === 'notched') {
    shape.bezierCurveTo(
      -width * 0.55,
      length * 0.2,
      -width * 0.62,
      length * 0.72,
      -width * 0.26,
      length,
    )
    shape.quadraticCurveTo(0, length * 0.86, width * 0.26, length)
    shape.bezierCurveTo(
      width * 0.62,
      length * 0.72,
      width * 0.55,
      length * 0.2,
      0,
      0,
    )
  } else {
    shape.lineTo(-width * 0.22, length * 0.44)
    shape.lineTo(-width * 0.62, length * 0.82)
    shape.lineTo(-width * 0.48, length)
    shape.lineTo(-width * 0.12, length * 0.82)
    shape.lineTo(0, length * 1.06)
    shape.lineTo(width * 0.12, length * 0.82)
    shape.lineTo(width * 0.48, length)
    shape.lineTo(width * 0.62, length * 0.82)
    shape.lineTo(width * 0.22, length * 0.44)
    shape.lineTo(0, 0)
  }
  return shape
}

function createLeafShape(
  profile: WildflowerLeafProfile,
  length: number,
  width: number,
) {
  const shape = new Shape()
  shape.moveTo(0, 0)
  if (profile === 'thread') {
    shape.quadraticCurveTo(-width * 0.42, length * 0.54, 0, length)
    shape.quadraticCurveTo(width * 0.42, length * 0.54, 0, 0)
  } else if (profile === 'spoon') {
    shape.bezierCurveTo(
      -width * 0.18,
      length * 0.16,
      -width * 0.62,
      length * 0.62,
      0,
      length,
    )
    shape.bezierCurveTo(
      width * 0.62,
      length * 0.62,
      width * 0.18,
      length * 0.16,
      0,
      0,
    )
  } else {
    shape.bezierCurveTo(
      -width * 0.44,
      length * 0.3,
      -width * 0.32,
      length * 0.72,
      0,
      length,
    )
    shape.bezierCurveTo(
      width * 0.32,
      length * 0.72,
      width * 0.44,
      length * 0.3,
      0,
      0,
    )
  }
  return shape
}

function transformedShape(
  shape: Shape,
  matrix: Matrix4,
  color: string,
  curveSegments = 4,
) {
  const geometry = new ShapeGeometry(shape, curveSegments)
  geometry.applyMatrix4(matrix)
  return colorize(geometry, color)
}

export type WildflowerGeometryDetail = 'specimen' | 'field'

function resolvePetalCurveSegments(
  profile: WildflowerPetalProfile,
  detail: WildflowerGeometryDetail,
) {
  if (detail === 'specimen') return 4

  // 圆润花瓣由两段贝塞尔曲线闭合；只采样 1 段会让根部、尖端和根部共线，整片花瓣退化为零面积。
  return profile === 'rounded' ? 2 : 1
}

export function createWildflowerGeometry(
  species: WildflowerSpeciesId,
  detail: WildflowerGeometryDetail = 'specimen',
) {
  const spec = WILDFLOWER_SPECS[species]
  const isFieldDetail = detail === 'field'
  const geometries: BufferGeometry[] = []
  const headTilt = new Matrix4()
    .makeTranslation(0, spec.height, 0)
    .multiply(new Matrix4().makeRotationX(0.3))
    .multiply(new Matrix4().makeTranslation(0, -spec.height, 0))
  const stem = new CylinderGeometry(
    spec.stemRadius * 0.82,
    spec.stemRadius,
    spec.height,
    isFieldDetail ? 3 : 6,
  )
  stem.translate(0, spec.height * 0.5, 0)
  geometries.push(colorize(stem, spec.stemColor))

  const petalShape = createPetalShape(
    spec.petalProfile,
    spec.petalLength,
    spec.petalWidth,
  )
  for (let index = 0; index < spec.petalCount; index += 1) {
    const angle = index / spec.petalCount * Math.PI * 2
    const tilt = 0.1 + (index % 3) * 0.025
    const petalMatrix = new Matrix4()
      .makeTranslation(0, spec.height, 0)
      .multiply(new Matrix4().makeRotationY(angle))
      .multiply(new Matrix4().makeTranslation(0, 0, -spec.headRadius * 0.32))
      .multiply(new Matrix4().makeRotationX(-Math.PI / 2 + tilt))
    const color = index % 3 === 0 ? spec.petalAccent : spec.petalColor
    const petal = transformedShape(
      petalShape,
      petalMatrix,
      color,
      resolvePetalCurveSegments(spec.petalProfile, detail),
    )
    petal.applyMatrix4(headTilt)
    geometries.push(petal)
  }

  const center = new SphereGeometry(1, isFieldDetail ? 6 : 10, isFieldDetail ? 3 : 5)
  center.scale(spec.headRadius, spec.headRadius * 0.34, spec.headRadius)
  center.translate(0, spec.height + spec.headRadius * 0.17, 0)
  center.applyMatrix4(headTilt)
  geometries.push(colorize(center, spec.centerColor))

  const leafLength =
    spec.leafProfile === 'spoon'
      ? 0.044
      : spec.leafProfile === 'thread'
        ? 0.046
        : 0.048
  const leafWidth =
    spec.leafProfile === 'thread'
      ? leafLength * 0.2
      : spec.leafProfile === 'spoon'
        ? leafLength * 0.28
        : leafLength * 0.2
  const leafShape = createLeafShape(spec.leafProfile, leafLength, leafWidth)
  for (let index = 0; index < spec.leafCount; index += 1) {
    const isBasal = spec.leafProfile === 'spoon'
    const baseHeight = isBasal
      ? 0.008 + (index % 2) * 0.004
      : spec.height * (0.16 + (index % 3) * 0.12)
    const azimuth = index / spec.leafCount * Math.PI * 2 + 0.38
    const slant = isBasal ? 1.08 : 0.66 + (index % 2) * 0.12
    const direction = index % 2 === 0 ? 1 : -1
    const leafMatrix = new Matrix4()
      .makeTranslation(0, baseHeight, 0)
      .multiply(new Matrix4().makeRotationY(azimuth))
      .multiply(new Matrix4().makeRotationZ(direction * slant))
    geometries.push(
      transformedShape(
        leafShape,
        leafMatrix,
        spec.leafColor,
        isFieldDetail ? 1 : 4,
      ),
    )
  }

  const merged = mergeGeometries(geometries, false)
  geometries.forEach((geometry) => geometry.dispose())
  if (!merged) throw new Error(`无法合并野花几何：${species}`)
  merged.computeVertexNormals()
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  merged.userData = {
    species,
    height: spec.height,
    petalCount: spec.petalCount,
    leafCount: spec.leafCount,
    petalProfile: spec.petalProfile,
    leafProfile: spec.leafProfile,
    detail,
  }
  return merged
}

export type MeadowGrassGeometryDetail = 'sample' | 'field'

export function createMeadowGrassClumpGeometry(
  detail: MeadowGrassGeometryDetail = 'sample',
) {
  const bladeCount = 7
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const rootColor = new Color('#3f742d')
  const midColor = new Color('#6a9a3d')
  const tipColor = new Color('#9abd59')
  const rowColors = [rootColor, midColor, tipColor]

  for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
    const angle =
      (bladeIndex / bladeCount) * Math.PI * 2 + (bladeIndex % 3) * 0.19
    const directionX = Math.sin(angle)
    const directionZ = Math.cos(angle)
    const rightX = directionZ
    const rightZ = -directionX
    const radialOffset = bladeIndex === 0 ? 0 : 0.0035 + (bladeIndex % 3) * 0.0014
    const rootX = directionX * radialOffset
    const rootZ = directionZ * radialOffset
    const [minimumHeight, maximumHeight] =
      WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE
    const height =
      minimumHeight +
      (bladeIndex % 4) * ((maximumHeight - minimumHeight) / 3)
    const width = 0.0037 + (bladeIndex % 3) * 0.00055
    const bend = 0.0045 + (bladeIndex % 2) * 0.0024
    const centers = [
      [rootX, 0, rootZ],
      [rootX + directionX * bend * 0.32, height * 0.54, rootZ + directionZ * bend * 0.32],
      [rootX + directionX * bend, height, rootZ + directionZ * bend],
    ] as const
    if (detail === 'field') {
      const vertexOffset = positions.length / 3
      const bladeTone = 0.91 + (bladeIndex % 4) * 0.025
      for (const side of [-1, 1]) {
        positions.push(
          centers[0][0] + rightX * width * 0.5 * side,
          centers[0][1],
          centers[0][2] + rightZ * width * 0.5 * side,
        )
        colors.push(
          Math.min(1, rootColor.r * bladeTone),
          Math.min(1, rootColor.g * bladeTone),
          Math.min(1, rootColor.b * bladeTone),
        )
      }
      positions.push(centers[2][0], centers[2][1], centers[2][2])
      colors.push(
        Math.min(1, tipColor.r * bladeTone),
        Math.min(1, tipColor.g * bladeTone),
        Math.min(1, tipColor.b * bladeTone),
      )
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1)
      continue
    }
    const halfWidths = [width * 0.5, width * 0.31, width * 0.035]
    const vertexOffset = positions.length / 3

    centers.forEach((center, rowIndex) => {
      const halfWidth = halfWidths[rowIndex]
      for (const side of [-1, 1]) {
        positions.push(
          center[0] + rightX * halfWidth * side,
          center[1],
          center[2] + rightZ * halfWidth * side,
        )
        const bladeTone = 0.91 + (bladeIndex % 4) * 0.025
        const color = rowColors[rowIndex]
        colors.push(
          Math.min(1, color.r * bladeTone),
          Math.min(1, color.g * bladeTone),
          Math.min(1, color.b * bladeTone),
        )
      }
    })

    indices.push(
      vertexOffset,
      vertexOffset + 2,
      vertexOffset + 1,
      vertexOffset + 1,
      vertexOffset + 2,
      vertexOffset + 3,
      vertexOffset + 2,
      vertexOffset + 4,
      vertexOffset + 3,
      vertexOffset + 3,
      vertexOffset + 4,
      vertexOffset + 5,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.userData = {
    semanticRole: 'short-dense-grass-clump',
    bladeCount,
    nominalHeight: WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE[1],
    bladeHeightRange: [...WILDFLOWER_MEADOW_GRASS_BLADE_HEIGHT_RANGE],
    detail,
  }
  return geometry
}

export function createMeadowTurfGeometry() {
  const geometry = new PlaneGeometry(
    WILDFLOWER_MEADOW_SIZE,
    WILDFLOWER_MEADOW_SIZE,
    16,
    16,
  )
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const dark = new Color('#31592c')
  const light = new Color('#557840')
  const color = new Color()
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const z = positions.getZ(index)
    const variation =
      0.48 +
      Math.sin(x * 23 + z * 11) * 0.07 +
      Math.sin(z * 37 - x * 7) * 0.05
    positions.setY(index, 0.001 + Math.sin(x * 16) * Math.cos(z * 18) * 0.0005)
    color.copy(dark).lerp(light, variation)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.userData = {
    width: WILDFLOWER_MEADOW_SIZE,
    depth: WILDFLOWER_MEADOW_SIZE,
    surface: 'root-gap-underlay',
    visuallyDominant: false,
  }
  return geometry
}

export function createMeadowSoilGeometry() {
  const geometry = new BoxGeometry(
    WILDFLOWER_MEADOW_SIZE,
    0.035,
    WILDFLOWER_MEADOW_SIZE,
  )
  geometry.translate(0, -0.0175, 0)
  return geometry
}
