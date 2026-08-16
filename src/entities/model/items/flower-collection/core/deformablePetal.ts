import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
} from 'three'

export interface DeformablePetalInstanceData {
  progress: number
  seed: number
  tilt: number
  curlScale?: number
  cupScale?: number
}

export type DeformablePetalTipStyle = 'pointed' | 'rounded'

/**
 * Flower Studio 使用只有 UV 的网格，在顶点着色器里求解最终花瓣曲面。
 * 尖端器官收成共享顶点；玫瑰圆头花瓣保留完整末行，避免退化成三角尖帽。
 */
export function createPetalUvGeometry(
  widthSegments = 24,
  lengthSegments = 64,
  tipStyle: DeformablePetalTipStyle = 'pointed',
) {
  const xSegments = Math.max(4, Math.round(widthSegments))
  const ySegments = Math.max(8, Math.round(lengthSegments))
  const indices: number[] = []
  const uvs: number[] = []
  const rowSize = xSegments + 1

  const rowCount = tipStyle === 'rounded' ? ySegments + 1 : ySegments
  for (let yIndex = 0; yIndex < rowCount; yIndex += 1) {
    const v = yIndex / ySegments
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      uvs.push(xIndex / xSegments, v)
    }
  }
  const connectedRowCount = tipStyle === 'rounded'
    ? ySegments
    : ySegments - 1
  for (let yIndex = 0; yIndex < connectedRowCount; yIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const a = yIndex * rowSize + xIndex
      const b = a + 1
      const c = a + rowSize
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  if (tipStyle === 'pointed') {
    const tipIndex = uvs.length / 2
    uvs.push(0.5, 1)
    const lastRow = (ySegments - 1) * rowSize
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      indices.push(lastRow + xIndex, tipIndex, lastRow + xIndex + 1)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(new Float32Array((uvs.length / 2) * 3), 3),
  )
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.userData.sampling = {
    widthSegments: xSegments,
    lengthSegments: ySegments,
    vertexCount: uvs.length / 2,
    triangleCount: indices.length / 3,
    profile: tipStyle === 'rounded'
      ? 'flower-studio-uv-rounded-tip'
      : 'flower-studio-uv-tip-cap',
    tipStyle,
    representationSignature: `deformable-petal-surface-v3-${tipStyle}`,
  }
  return geometry
}

/** 为实例花瓣写入逐瓣发育、随机、展开和形态差异。 */
export function attachDeformablePetalAttributes(
  geometry: BufferGeometry,
  instances: readonly DeformablePetalInstanceData[],
) {
  const progress = new Float32Array(instances.length)
  const seed = new Float32Array(instances.length)
  const tilt = new Float32Array(instances.length)
  const curlScale = new Float32Array(instances.length)
  const cupScale = new Float32Array(instances.length)

  instances.forEach((instance, index) => {
    progress[index] = instance.progress
    seed[index] = instance.seed
    tilt[index] = instance.tilt
    curlScale[index] = instance.curlScale ?? 1
    cupScale[index] = instance.cupScale ?? 1
  })
  geometry.setAttribute('aU', new InstancedBufferAttribute(progress, 1))
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1))
  geometry.setAttribute('aTilt', new InstancedBufferAttribute(tilt, 1))
  geometry.setAttribute('aCurlScale', new InstancedBufferAttribute(curlScale, 1))
  geometry.setAttribute('aCupScale', new InstancedBufferAttribute(cupScale, 1))
  return geometry
}
