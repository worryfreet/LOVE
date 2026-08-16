import {
  BufferGeometry,
  Float32BufferAttribute,
  Material,
  Vector2,
} from 'three'

export const FLOWER_PETAL_WIND_ATTRIBUTES = {
  flex: 'flowerWindFlex',
  phase: 'flowerWindPhase',
} as const

export interface FlowerWindUniforms {
  readonly time: { value: number }
  readonly direction: { value: Vector2 }
  readonly strength: { value: number }
  readonly speed: { value: number }
  readonly gustStrength: { value: number }
}

export interface FlowerWindUniformValues {
  time?: number
  directionDegrees?: number
  strength?: number
  speed?: number
  gustStrength?: number
}

export interface FlowerWindMaterialOptions {
  uniforms: FlowerWindUniforms
  /** 模型根点到最高器官的高度；只有整株弯曲需要。 */
  sourceHeightMeters?: number
  /** 最高点相对株高的横向位移比例。 */
  wholePlantAmplitude?: number
  /** 单瓣瓣尖沿自身法线方向的位移，单位为模型空间米。 */
  petalAmplitude?: number
}

export function createFlowerWindUniforms({
  time = 0,
  directionDegrees = 22,
  strength = 1,
  speed = 1,
  gustStrength = 1,
}: FlowerWindUniformValues = {}): FlowerWindUniforms {
  const radians = directionDegrees * Math.PI / 180
  return {
    time: { value: time },
    direction: {
      value: new Vector2(Math.cos(radians), Math.sin(radians)).normalize(),
    },
    strength: { value: strength },
    speed: { value: speed },
    gustStrength: { value: gustStrength },
  }
}

/** 原位更新共享 Uniform，避免调风或逐帧推进时重建材质。 */
export function updateFlowerWindUniforms(
  uniforms: FlowerWindUniforms,
  values: FlowerWindUniformValues,
) {
  if (values.time !== undefined) uniforms.time.value = values.time
  if (values.directionDegrees !== undefined) {
    const radians = values.directionDegrees * Math.PI / 180
    uniforms.direction.value
      .set(Math.cos(radians), Math.sin(radians))
      .normalize()
  }
  if (values.strength !== undefined) uniforms.strength.value = values.strength
  if (values.speed !== undefined) uniforms.speed.value = values.speed
  if (values.gustStrength !== undefined) {
    uniforms.gustStrength.value = values.gustStrength
  }
}

/**
 * 为一块花瓣曲面写入“瓣根到瓣尖”的柔性权重和稳定花瓣相位。
 * 合并人口几何后属性仍随顶点保留，因此每瓣无需独立 Draw Call。
 */
export function applyFlowerPetalWindAttributes(
  geometry: BufferGeometry,
  phase = 0,
) {
  const position = geometry.getAttribute('position')
  if (!position) throw new Error('花瓣风动几何缺少 position 属性')
  const uv = geometry.getAttribute('uv')
  const flex = new Float32Array(position.count)
  const phases = new Float32Array(position.count)
  for (let index = 0; index < position.count; index += 1) {
    flex[index] = uv ? Math.min(Math.max(uv.getY(index), 0), 1) : 0
    phases[index] = phase
  }
  geometry.setAttribute(
    FLOWER_PETAL_WIND_ATTRIBUTES.flex,
    new Float32BufferAttribute(flex, 1),
  )
  geometry.setAttribute(
    FLOWER_PETAL_WIND_ATTRIBUTES.phase,
    new Float32BufferAttribute(phases, 1),
  )
  return geometry
}

const flowerWindVertexPars = /* glsl */ `
uniform float uFlowerWindTime;
uniform vec2 uFlowerWindDirection;
uniform float uFlowerWindStrength;
uniform float uFlowerWindSpeed;
uniform float uFlowerWindGustStrength;
uniform float uFlowerWindSourceHeight;
uniform float uFlowerWindWholeAmplitude;
uniform float uFlowerWindPetalAmplitude;
#ifdef FLOWER_WIND_PETAL
attribute float flowerWindFlex;
attribute float flowerWindPhase;
#endif

float flowerWindHash(float value) {
  return fract(sin(value * 91.3458 + 17.137) * 47453.5453);
}
`

const flowerWindBeginVertex = /* glsl */ `
vec2 flowerDirection = normalize(uFlowerWindDirection + vec2(0.0001, 0.0));
float flowerInstancePhase = 0.0;
vec2 flowerInstanceRoot = vec2(0.0);
#ifdef USE_INSTANCING
  flowerInstanceRoot = instanceMatrix[3].xz;
  flowerInstancePhase = flowerWindHash(
    instanceMatrix[3].x * 0.173 +
    instanceMatrix[3].y * 0.271 +
    instanceMatrix[3].z * 0.317 +
    instanceMatrix[0].x * 0.137 +
    instanceMatrix[1].y * 0.193
  );
#endif
float flowerClock = uFlowerWindTime * max(uFlowerWindSpeed, 0.01);
float flowerFieldPhase = flowerClock * 0.68 +
  flowerInstancePhase * 6.2831853 +
  dot(flowerInstanceRoot, flowerDirection) * 0.12;
float flowerGustEnvelope = 0.5 + 0.5 * sin(
  flowerClock * 0.19 + flowerInstancePhase * 11.7 + 1.4
);
float flowerSway = sin(flowerFieldPhase) * 0.72 +
  sin(flowerFieldPhase * 0.43 + 1.8) * 0.28;
float flowerWindAmount = clamp(uFlowerWindStrength, 0.0, 3.0);

#ifdef FLOWER_WIND_WHOLE
  float flowerHeight = clamp(
    position.y / max(uFlowerWindSourceHeight, 0.001),
    0.0,
    1.0
  );
  float flowerBendWeight = flowerHeight * flowerHeight *
    (3.0 - 2.0 * flowerHeight);
  float flowerBend = flowerSway * flowerWindAmount *
    (0.72 + flowerGustEnvelope * uFlowerWindGustStrength * 0.28);
  vec2 flowerBendOffset = flowerDirection * flowerBend *
    uFlowerWindWholeAmplitude * uFlowerWindSourceHeight * flowerBendWeight;
  transformed.xz += flowerBendOffset;
  transformed.y -= length(flowerBendOffset) * flowerHeight * 0.055;
#endif

#ifdef FLOWER_WIND_PETAL
  float flowerPetalWeight = pow(clamp(flowerWindFlex, 0.0, 1.0), 1.75);
  float flowerPetalClock = flowerClock * 2.15 +
    flowerWindPhase * 0.83 + flowerInstancePhase * 12.7;
  float flowerPetalFlutter = sin(flowerPetalClock) +
    sin(flowerPetalClock * 1.91 + 1.1) * 0.34;
  float flowerPetalAmount = uFlowerWindPetalAmplitude * flowerWindAmount *
    (0.58 + flowerGustEnvelope * uFlowerWindGustStrength * 0.42) *
    flowerPetalWeight;
  transformed += objectNormal * flowerPetalFlutter * flowerPetalAmount;
  transformed.xz += flowerDirection * flowerSway * flowerPetalAmount * 0.24;
#endif
`

function createFlowerWindShaderCompiler(options: FlowerWindMaterialOptions) {
  const wholePlant = (options.wholePlantAmplitude ?? 0) > 0
  const petal = (options.petalAmplitude ?? 0) > 0
  const compiler: Material['onBeforeCompile'] = (shader) => {
    shader.uniforms.uFlowerWindTime = options.uniforms.time
    shader.uniforms.uFlowerWindDirection = options.uniforms.direction
    shader.uniforms.uFlowerWindStrength = options.uniforms.strength
    shader.uniforms.uFlowerWindSpeed = options.uniforms.speed
    shader.uniforms.uFlowerWindGustStrength = options.uniforms.gustStrength
    shader.uniforms.uFlowerWindSourceHeight = {
      value: options.sourceHeightMeters ?? 1,
    }
    shader.uniforms.uFlowerWindWholeAmplitude = {
      value: options.wholePlantAmplitude ?? 0,
    }
    shader.uniforms.uFlowerWindPetalAmplitude = {
      value: options.petalAmplitude ?? 0,
    }
    const defines = [
      wholePlant ? '#define FLOWER_WIND_WHOLE' : '',
      petal ? '#define FLOWER_WIND_PETAL' : '',
    ].filter(Boolean).join('\n')
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\n${defines}\n${flowerWindVertexPars}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n${flowerWindBeginVertex}`,
      )
  }
  return compiler
}

/**
 * 将风动注入既有受光材质，并保留它原有的 Shader 扩展。
 * 返回的清理函数只恢复 Hook；材质和 Uniform 的生命周期仍归调用方所有。
 */
export function configureFlowerWindMaterial(
  material: Material,
  options: FlowerWindMaterialOptions,
) {
  const previousCompile = material.onBeforeCompile
  const previousCacheKey = material.customProgramCacheKey
  const compiler = createFlowerWindShaderCompiler(options)
  const modeKey = [
    (options.wholePlantAmplitude ?? 0) > 0 ? 'whole' : 'fixed',
    (options.petalAmplitude ?? 0) > 0 ? 'petal' : 'organ',
  ].join('-')
  const nextCompile: Material['onBeforeCompile'] = function (
    this: Material,
    shader,
    renderer,
  ) {
    previousCompile.call(this, shader, renderer)
    compiler.call(this, shader, renderer)
  }
  const nextCacheKey = function (this: Material) {
    return `${previousCacheKey.call(this)}|flower-wind-v1-${modeKey}`
  }
  material.onBeforeCompile = nextCompile
  material.customProgramCacheKey = nextCacheKey
  material.userData.flowerWind = {
    mode: modeKey,
    updateMode: 'shared-uniform-only',
    sourceHeightMeters: options.sourceHeightMeters ?? 0,
    wholePlantAmplitude: options.wholePlantAmplitude ?? 0,
    petalAmplitude: options.petalAmplitude ?? 0,
  }
  material.needsUpdate = true

  return () => {
    if (material.onBeforeCompile !== nextCompile) return
    material.onBeforeCompile = previousCompile
    material.customProgramCacheKey = previousCacheKey
    delete material.userData.flowerWind
    material.needsUpdate = true
  }
}
