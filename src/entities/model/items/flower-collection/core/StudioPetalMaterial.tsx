import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DataTexture,
  DoubleSide,
  HalfFloatType,
  LinearFilter,
  MeshPhysicalMaterial,
  RGBAFormat,
  UnsignedByteType,
} from 'three'
import {
  createStudioPetalRampData,
  STUDIO_PETAL_RAMP_RESOLUTION,
} from './studioFlower'
import type {
  StudioFlowerPalette,
  StudioPetalShape,
} from './studioFlower'
import {
  createStudioPetalPatternData,
  STUDIO_PETAL_PATTERN_RESOLUTION,
} from './studioPetalPattern'
import type { StudioPetalPattern } from './studioPetalPattern'
import type { RibbonTextureSet } from './types'

export type { StudioPetalPattern } from './studioPetalPattern'
export type { StudioFlowerPalette } from './studioFlower'

export interface StudioPetalMaterialProps {
  shape: StudioPetalShape
  palette: StudioFlowerPalette
  bloomMax: number
  transition: number
  windAmplitude: number
  windSpeed: number
  windHeading: number
  flat: boolean
  pattern?: StudioPetalPattern
  surfaceTextures?: RibbonTextureSet
  roughness: number
  sheen: number
  transmission: number
  textureNormalStrength: number
  materialRef?: { current: MeshPhysicalMaterial | null }
}

const vertexPars = /* glsl */ `
attribute float aU;
attribute float aSeed;
attribute float aTilt;
uniform sampler2D uRamps;
uniform float uBloom, uTransition, uCurlClosed, uCurlOpen, uPropagation;
uniform float uLength, uCup, uSideCurl, uWaveAmp, uWaveFreq, uAsym;
uniform float uTipArc, uTipNotch;
uniform float uTime, uNoiseAmp, uNoiseFreq, uWindAmp, uWindSpeed, uWindHeading;
uniform float uShellGap, uWrapWidth, uWrapCup;
uniform float uPatternMode, uLilyThroatLift, uLilyTipReflex;
varying float vStudioU;

float studioHash3(vec3 point) {
  point = fract(point * 0.3183099 + vec3(0.1, 0.2, 0.3));
  point *= 17.0;
  return fract(
    point.x * point.y * point.z * (point.x + point.y + point.z)
  );
}

float studioNoise(vec3 point) {
  vec3 cell = floor(point), local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(
      mix(studioHash3(cell), studioHash3(cell + vec3(1,0,0)), local.x),
      mix(studioHash3(cell + vec3(0,1,0)), studioHash3(cell + vec3(1,1,0)), local.x),
      local.y
    ),
    mix(
      mix(studioHash3(cell + vec3(0,0,1)), studioHash3(cell + vec3(1,0,1)), local.x),
      mix(studioHash3(cell + vec3(0,1,1)), studioHash3(cell + vec3(1,1,1)), local.x),
      local.y
    ),
    local.z
  );
}

float studioTurbulence(vec3 point) {
  return studioNoise(point) * 0.65 + studioNoise(point * 2.3) * 0.35;
}

float studioOpenness(float progress, float bloomLocal) {
  float value = clamp(
    bloomLocal * (1.0 + uPropagation) - progress * uPropagation,
    0.0,
    1.0
  );
  return value * value * (3.0 - 2.0 * value);
}

float studioBloomLocal() {
  float map = 1.0 - aU;
  float front = mix(-uTransition, 1.0, uBloom);
  float mask = clamp(
    (map - front) / max(uTransition, 0.0001),
    0.0,
    1.0
  );
  return 1.0 - mask;
}

vec3 studioPetalSurface(vec2 uvIn, float bloomLocal, float seed) {
  vec2 uvSafe = clamp(uvIn, vec2(0.0), vec2(1.0));
  float u = uvSafe.x * 2.0 - 1.0;
  float v = uvSafe.y;
  const int integrationSteps = 24;
  float stepSize = v / float(integrationSteps);
  float angle = 0.0;
  vec2 centerline = vec2(0.0);
  for (int index = 0; index < integrationSteps; index++) {
    float progress = (float(index) + 0.5) * stepSize;
    float density = texture2D(uRamps, vec2(progress, 0.5)).g;
    float curl = mix(
      uCurlClosed,
      uCurlOpen,
      studioOpenness(progress, bloomLocal)
    );
    angle += curl * density * stepSize;
    centerline += vec2(cos(angle), sin(angle)) * stepSize;
  }
  centerline *= uLength;
  float relax = 0.15 + 0.85 * bloomLocal;
  float wrap = 1.0 - bloomLocal;
  float width = texture2D(uRamps, vec2(v, 0.5)).r *
    (1.0 + uAsym * u * relax) * (1.0 + uWrapWidth * wrap);
  float detailFade = smoothstep(0.0, 0.035, width);
  float x = u * width;
  if (uPatternMode > 0.5 && uPatternMode < 1.5) {
    float outlineFade = smoothstep(0.08, 0.35, v) *
      (1.0 - smoothstep(0.92, 1.0, v));
    x += u * uWaveAmp * 0.58 * outlineFade *
      sin(v * uWaveFreq * 2.4 + seed * 2.1);
  }
  float lateralDepth = -uCup * (1.0 + uWrapCup * wrap) *
    (1.0 - u * u) * width;
  lateralDepth += detailFade * uWaveAmp * relax * u * u *
    sin(v * uWaveFreq + seed * 17.0 + u * 2.3 + seed);
  lateralDepth += detailFade * 0.01 * relax *
    sin(seed * 7.0 + v * 5.0) * v;
  lateralDepth += detailFade * uNoiseAmp * v * bloomLocal *
    (studioTurbulence(vec3(
      u * 2.0 + seed,
      v * uNoiseFreq,
      seed * 3.7
    )) - 0.5) * 2.0;
  float sideAngle = uSideCurl * x * relax;
  vec2 side = mat2(
    cos(sideAngle), -sin(sideAngle),
    sin(sideAngle), cos(sideAngle)
  ) * vec2(x, lateralDepth);
  vec3 surfaceNormal = vec3(0.0, -sin(angle), cos(angle));
  vec3 result = vec3(side.x, centerline.x, centerline.y) +
    surfaceNormal * side.y;
  float distal = smoothstep(0.78, 1.0, v);
  result.y -= uTipArc * u * u * distal;
  result.y -= uTipNotch * exp(-pow(abs(u) / 0.2, 2.0)) * distal;
  if (uPatternMode > 0.5 && uPatternMode < 1.5) {
    float throat = smoothstep(0.015, 0.38, v);
    float reflex = smoothstep(0.5, 1.0, v);
    result.z += uLilyThroatLift * throat;
    result.z -= uLilyTipReflex * reflex * reflex;
  }
  return result;
}

vec3 studioDeformedPetal(vec2 uvIn) {
  float bloomLocal = studioBloomLocal();
  vec3 result = studioPetalSurface(uvIn, bloomLocal, aSeed);
  result *= 1.0 + uShellGap * aU * (1.0 - bloomLocal);
  float tiltAngle = -aTilt * bloomLocal;
  float cosine = cos(tiltAngle), sine = sin(tiltAngle);
  result = mat3(
    1.0, 0.0, 0.0,
    0.0, cosine, sine,
    0.0, -sine, cosine
  ) * result;
  vec3 windDirection = vec3(cos(uWindHeading), 0.0, sin(uWindHeading));
  float phase = dot(result, windDirection) * 0.85 - uTime * uWindSpeed;
  float coherentSway = sin(phase) * 0.72 +
    sin(phase * 0.47 + 1.8) * 0.28;
  float petalPhase = sin(phase * 0.82 + aSeed * 0.18) * 0.16;
  float amplitude = uWindAmp * bloomLocal * pow(uvIn.y, 1.7) *
    (0.42 + aU * 0.58);
  result += windDirection * amplitude * (coherentSway + petalPhase);
  result.y += amplitude * 0.12 * sin(phase * 0.63 + 0.9);
  return result;
}
`

const beginNormal = /* glsl */ `
vec3 studioPosition = studioDeformedPetal(uv);
float studioDu = uv.x > 0.996 ? -0.004 : 0.004;
float studioDv = uv.y > 0.996 ? -0.004 : 0.004;
vec3 studioPositionU = studioDeformedPetal(uv + vec2(studioDu, 0.0));
vec3 studioPositionV = studioDeformedPetal(uv + vec2(0.0, studioDv));
vec3 studioTangentU = studioDu > 0.0
  ? studioPositionU - studioPosition
  : studioPosition - studioPositionU;
vec3 studioTangentV = studioDv > 0.0
  ? studioPositionV - studioPosition
  : studioPosition - studioPositionV;
vec3 objectNormal = normalize(cross(studioTangentU, studioTangentV));
`

const beginVertex = /* glsl */ `
vec3 transformed = studioPosition;
#ifdef USE_ALPHAHASH
  vPosition = studioPosition;
#endif
`

const fragmentPars = /* glsl */ `
uniform sampler2D uPatternMap, uSurfaceMap;
uniform float uPatternMode;
uniform vec3 uCol0, uCol1, uCol2, uCol3, uCol4, uSpotColor;
varying float vStudioU;

vec3 studioRampColor(float value) {
  if (value < 0.25) {
    return mix(uCol0, uCol1, smoothstep(0.0, 0.25, value));
  }
  if (value < 0.5) {
    return mix(uCol1, uCol2, smoothstep(0.25, 0.5, value));
  }
  if (value < 0.75) {
    return mix(uCol2, uCol3, smoothstep(0.5, 0.75, value));
  }
  return mix(uCol3, uCol4, smoothstep(0.75, 1.0, value));
}
`

const petalColorFragment = /* glsl */ `
float studioCloseness = (1.0 - vMapUv.y) * 0.7 +
  (1.0 - vStudioU) * 0.3;
vec3 studioColor = studioRampColor(studioCloseness);
vec3 studioPattern = texture2D(uPatternMap, vMapUv).rgb;
vec3 studioSurface = texture2D(uSurfaceMap, vMapUv).rgb;
if (uPatternMode > 0.5 && uPatternMode < 1.5) {
  vec3 lilyColor = mix(
    uCol3,
    uCol2,
    smoothstep(0.015, 0.27, vMapUv.y)
  );
  lilyColor = mix(
    lilyColor,
    uCol1,
    smoothstep(0.18, 0.58, vMapUv.y)
  );
  lilyColor = mix(
    lilyColor,
    uCol0,
    smoothstep(0.62, 1.0, vMapUv.y)
  );
  lilyColor = mix(lilyColor, uCol4, studioPattern.r * 0.46);
  lilyColor = mix(lilyColor, uCol4, studioPattern.b * 0.22);
  float spotMask = gl_FrontFacing ? 0.0 : studioPattern.g;
  studioColor = mix(lilyColor, uSpotColor, spotMask * 0.88);
} else if (uPatternMode > 1.5) {
  studioColor = mix(
    studioColor,
    uSpotColor,
    max(studioPattern.r, studioPattern.g)
  );
  studioColor = mix(studioColor, uCol0, studioPattern.b * 0.18);
  if (!gl_FrontFacing) studioColor = mix(studioColor, uCol3, 0.13);
}
studioColor *= mix(vec3(1.0), studioSurface, 0.22);
diffuseColor.rgb *= studioColor;
`

function createRampTexture(shape: StudioPetalShape) {
  const texture = new DataTexture(
    createStudioPetalRampData(shape),
    STUDIO_PETAL_RAMP_RESOLUTION,
    1,
    RGBAFormat,
    HalfFloatType,
  )
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function createPatternTexture(pattern?: StudioPetalPattern) {
  const texture = new DataTexture(
    createStudioPetalPatternData(pattern),
    STUDIO_PETAL_PATTERN_RESOLUTION,
    STUDIO_PETAL_PATTERN_RESOLUTION,
    RGBAFormat,
    UnsignedByteType,
  )
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function createFallbackTexture(
  rgba: readonly [number, number, number, number],
) {
  const texture = new DataTexture(
    new Uint8Array(rgba),
    1,
    1,
    RGBAFormat,
    UnsignedByteType,
  )
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

export function StudioPetalMaterial({
  shape,
  palette,
  bloomMax,
  transition,
  windAmplitude,
  windSpeed,
  windHeading,
  flat,
  pattern,
  surfaceTextures,
  roughness,
  sheen,
  transmission,
  textureNormalStrength,
  materialRef,
}: StudioPetalMaterialProps) {
  /* 材质、纹理与自定义 Uniform 保持挂载期单例，参数在 effect 中原位同步。 */
  /* eslint-disable react-hooks/exhaustive-deps */
  const rampTexture = useMemo(() => createRampTexture(shape), [])
  const patternTexture = useMemo(() => createPatternTexture(pattern), [])
  const fallbackTextures = useMemo(() => ({
    color: createFallbackTexture([255, 255, 255, 255]),
    normal: createFallbackTexture([128, 128, 255, 255]),
    roughness: createFallbackTexture([255, 255, 255, 255]),
  }), [])
  const uniforms = useMemo(() => ({
    uRamps: { value: rampTexture },
    uBloom: { value: bloomMax },
    uTransition: { value: transition },
    uCurlClosed: { value: shape.curlClosed },
    uCurlOpen: { value: shape.curlOpen },
    uPropagation: { value: shape.propagation },
    uLength: { value: shape.length },
    uCup: { value: shape.cup },
    uSideCurl: { value: shape.sideCurl },
    uWaveAmp: { value: shape.waveAmplitude },
    uWaveFreq: { value: shape.waveFrequency },
    uAsym: { value: shape.asymmetry },
    uTipArc: { value: shape.tipArc ?? 0 },
    uTipNotch: { value: shape.tipNotch ?? 0 },
    uTime: { value: 0 },
    uNoiseAmp: { value: shape.noiseAmplitude },
    uNoiseFreq: { value: shape.noiseFrequency },
    uWindAmp: { value: windAmplitude },
    uWindSpeed: { value: windSpeed },
    uWindHeading: { value: windHeading * Math.PI / 180 },
    uShellGap: { value: shape.shellGap },
    uWrapWidth: { value: shape.wrapWidth },
    uWrapCup: { value: shape.wrapCup },
    uPatternMap: { value: patternTexture },
    uSurfaceMap: {
      value: surfaceTextures?.colorMap ?? fallbackTextures.color,
    },
    uPatternMode: {
      value: pattern?.kind === 'lily'
        ? 1
        : pattern?.kind === 'rose'
          ? 2
          : 0,
    },
    uLilyThroatLift: {
      value: pattern?.kind === 'lily' ? pattern.throatLift : 0,
    },
    uLilyTipReflex: {
      value: pattern?.kind === 'lily' ? pattern.tipReflex : 0,
    },
    uSpotColor: {
      value: new Color(
        pattern?.kind === 'lily'
          ? pattern.spotColor
          : pattern?.accentColor ?? '#000000',
      ),
    },
    uCol0: { value: new Color(palette[0]) },
    uCol1: { value: new Color(palette[1]) },
    uCol2: { value: new Color(palette[2]) },
    uCol3: { value: new Color(palette[3]) },
    uCol4: { value: new Color(palette[4]) },
  }), [])
  const material = useMemo(() => {
    const created = new MeshPhysicalMaterial({
      color: '#ffffff',
      map: fallbackTextures.color,
      normalMap: surfaceTextures?.normalMap ?? fallbackTextures.normal,
      roughnessMap:
        surfaceTextures?.roughnessMap ?? fallbackTextures.roughness,
      roughness,
      metalness: 0,
      side: DoubleSide,
      flatShading: flat,
      sheen: Math.min(0.22, Math.max(0, sheen * 0.3)),
      sheenRoughness: 0.92,
      sheenColor: palette[1],
      clearcoat: 0,
      specularIntensity: 0.28,
    })
    created.normalScale.setScalar(textureNormalStrength)
    created.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertexPars}`)
        .replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\nvStudioU = aU;',
        )
        .replace('#include <beginnormal_vertex>', beginNormal)
        .replace('#include <begin_vertex>', beginVertex)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${fragmentPars}`)
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n${petalColorFragment}`,
        )
    }
    created.customProgramCacheKey = () => 'studio-petal-physical-v3'
    created.userData.flowerStudioBloom = true
    created.userData.flowerStudioUniforms = uniforms
    return created
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */
  material.userData.flowerStudioBloomMax = bloomMax
  if (materialRef) materialRef.current = material

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  useEffect(() => () => {
    if (materialRef?.current === material) materialRef.current = null
    rampTexture.dispose()
    patternTexture.dispose()
    fallbackTextures.color.dispose()
    fallbackTextures.normal.dispose()
    fallbackTextures.roughness.dispose()
    material.dispose()
  }, [fallbackTextures, material, materialRef, patternTexture, rampTexture])

  useEffect(() => {
    const nextRamp = createStudioPetalRampData(shape)
    const currentRamp = rampTexture.image.data as Uint16Array
    currentRamp.set(nextRamp)
    rampTexture.needsUpdate = true
    const nextPattern = createStudioPetalPatternData(pattern)
    const currentPattern = patternTexture.image.data as Uint8Array
    currentPattern.set(nextPattern)
    patternTexture.needsUpdate = true
    uniforms.uTransition.value = transition
    uniforms.uCurlClosed.value = shape.curlClosed
    uniforms.uCurlOpen.value = shape.curlOpen
    uniforms.uPropagation.value = shape.propagation
    uniforms.uLength.value = shape.length
    uniforms.uCup.value = shape.cup
    uniforms.uSideCurl.value = shape.sideCurl
    uniforms.uWaveAmp.value = shape.waveAmplitude
    uniforms.uWaveFreq.value = shape.waveFrequency
    uniforms.uAsym.value = shape.asymmetry
    uniforms.uTipArc.value = shape.tipArc ?? 0
    uniforms.uTipNotch.value = shape.tipNotch ?? 0
    uniforms.uNoiseAmp.value = shape.noiseAmplitude
    uniforms.uNoiseFreq.value = shape.noiseFrequency
    uniforms.uWindAmp.value = windAmplitude
    uniforms.uWindSpeed.value = windSpeed
    uniforms.uWindHeading.value = windHeading * Math.PI / 180
    uniforms.uShellGap.value = shape.shellGap
    uniforms.uWrapWidth.value = shape.wrapWidth
    uniforms.uWrapCup.value = shape.wrapCup
    uniforms.uPatternMode.value = pattern?.kind === 'lily'
      ? 1
      : pattern?.kind === 'rose'
        ? 2
        : 0
    uniforms.uSurfaceMap.value =
      surfaceTextures?.colorMap ?? fallbackTextures.color
    uniforms.uLilyThroatLift.value = pattern?.kind === 'lily'
      ? pattern.throatLift
      : 0
    uniforms.uLilyTipReflex.value = pattern?.kind === 'lily'
      ? pattern.tipReflex
      : 0
    uniforms.uSpotColor.value.set(
      pattern?.kind === 'lily'
        ? pattern.spotColor
        : pattern?.accentColor ?? '#000000',
    )
    uniforms.uCol0.value.set(palette[0])
    uniforms.uCol1.value.set(palette[1])
    uniforms.uCol2.value.set(palette[2])
    uniforms.uCol3.value.set(palette[3])
    uniforms.uCol4.value.set(palette[4])

    const nextNormalMap = surfaceTextures?.normalMap ?? fallbackTextures.normal
    const nextRoughnessMap =
      surfaceTextures?.roughnessMap ?? fallbackTextures.roughness
    const requiresRecompile =
      material.flatShading !== flat ||
      material.normalMap !== nextNormalMap ||
      material.roughnessMap !== nextRoughnessMap
    material.flatShading = flat
    material.map = fallbackTextures.color
    material.normalMap = nextNormalMap
    material.roughnessMap = nextRoughnessMap
    material.normalScale.setScalar(textureNormalStrength)
    material.roughness = roughness
    material.sheen = Math.min(0.22, Math.max(0, sheen * 0.3))
    material.sheenColor.set(palette[1])
    material.emissive.set(palette[2]).multiplyScalar(transmission * 0.035)
    material.userData.flowerStudioBloomMax = bloomMax
    if (requiresRecompile) material.needsUpdate = true
  }, [
    bloomMax,
    fallbackTextures,
    flat,
    material,
    palette,
    pattern,
    patternTexture,
    rampTexture,
    roughness,
    shape,
    sheen,
    surfaceTextures,
    textureNormalStrength,
    transmission,
    transition,
    uniforms,
    windAmplitude,
    windHeading,
    windSpeed,
  ])

  return <primitive object={material} attach="material" />
}
