import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector2,
} from 'three'
import type { RibbonTextureSet } from './types'

export interface DeformablePetalShape {
  length: number
  widths: readonly [number, number, number, number, number, number]
  curl: number
  curlBias: number
  cup: number
  sideCurl: number
  wave: number
  waveCount: number
  asymmetry: number
  noise: number
}

export interface DeformablePetalMaterialProps {
  shape: DeformablePetalShape
  textures?: RibbonTextureSet
  baseColor: string
  tipColor: string
  centerColor: string
  roughness?: number
  transmission?: number
  normalStrength?: number
  bloom?: number
  windAmplitude?: number
  windSpeed?: number
  windHeading?: number
  opacity?: number
}

const vertexShader = /* glsl */ `
attribute float aU;
attribute float aSeed;
attribute float aTilt;
attribute float aCurlScale;
attribute float aCupScale;

uniform float uTime;
uniform float uBloom;
uniform float uTransition;
uniform float uLength;
uniform vec2 uWidths0;
uniform vec2 uWidths1;
uniform vec2 uWidths2;
uniform float uCurl;
uniform float uCurlBias;
uniform float uCup;
uniform float uSideCurl;
uniform float uWave;
uniform float uWaveCount;
uniform float uAsymmetry;
uniform float uNoise;
uniform float uWindAmplitude;
uniform float uWindSpeed;
uniform float uWindHeading;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
varying float vPetalProgress;
varying float vFacingSign;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
        mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
        mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float turbulence(vec3 p) {
  return valueNoise(p) * 0.65 + valueNoise(p * 2.3) * 0.35;
}

float cubic(float p0, float p1, float p2, float p3, float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  return 0.5 * (2.0 * p1 + (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3);
}

float widthAt(float v) {
  float scaled = clamp(v, 0.0, 0.999999) * 5.0;
  float localT = fract(scaled);
  float width;
  if (scaled < 1.0) {
    width = cubic(uWidths0.x, uWidths0.x, uWidths0.y, uWidths1.x, localT);
  } else if (scaled < 2.0) {
    width = cubic(uWidths0.x, uWidths0.y, uWidths1.x, uWidths1.y, localT);
  } else if (scaled < 3.0) {
    width = cubic(uWidths0.y, uWidths1.x, uWidths1.y, uWidths2.x, localT);
  } else if (scaled < 4.0) {
    width = cubic(uWidths1.x, uWidths1.y, uWidths2.x, uWidths2.y, localT);
  } else {
    width = cubic(uWidths1.y, uWidths2.x, uWidths2.y, uWidths2.y, localT);
  }
  width = max(0.0001, width);
  float cap = sqrt(max(0.0, 1.0 - pow(smoothstep(0.86, 1.0, v), 2.0)));
  return mix(width, max(0.0001, uWidths2.y * cap), smoothstep(0.86, 1.0, v));
}

float openness(float s) {
  float wavefront = clamp((uBloom * 1.9 - (1.0 - aU) * 0.75) / max(uTransition, 0.001), 0.0, 1.0);
  float local = clamp(wavefront * 1.35 - s * 0.35, 0.0, 1.0);
  return local * local * (3.0 - 2.0 * local);
}

vec3 petalPosition(vec2 inputUv) {
  vec2 safeUv = clamp(inputUv, vec2(0.0), vec2(1.0));
  float across = safeUv.x * 2.0 - 1.0;
  float along = safeUv.y;
  const int integrationSteps = 24;
  float stepLength = along / float(integrationSteps);
  float angle = 0.0;
  vec2 centerline = vec2(0.0);
  for (int stepIndex = 0; stepIndex < integrationSteps; stepIndex++) {
    float s = (float(stepIndex) + 0.5) * stepLength;
    float density = uCurlBias * pow(max(s, 0.0001), max(0.05, uCurlBias - 1.0));
    float openedCurl = uCurl * aCurlScale;
    float closedCurl = abs(uCurl) * 1.2 + 0.72;
    float curl = mix(closedCurl, openedCurl, openness(s));
    angle += curl * density * stepLength;
    centerline += vec2(cos(angle), sin(angle)) * stepLength;
  }
  centerline *= uLength;

  float openAmount = openness(along);
  float halfWidth = widthAt(along) * (1.0 + uAsymmetry * across * openAmount);
  float x = across * halfWidth;
  float depth = -uCup * aCupScale * (1.0 - across * across) * halfWidth;
  depth += uWave * across * across * sin(along * uWaveCount * 6.2831853 + aSeed * 11.7 + across * 2.1);
  depth += uNoise * along * openAmount *
    (turbulence(vec3(across * 2.0 + aSeed, along * 5.0, aSeed * 3.7 + uTime * 0.12)) - 0.5) * 2.0;
  float sideAngle = uSideCurl * x * openAmount;
  vec2 rolled = mat2(cos(sideAngle), -sin(sideAngle), sin(sideAngle), cos(sideAngle)) * vec2(x, depth);
  vec3 normalDirection = vec3(0.0, -sin(angle), cos(angle));
  return vec3(rolled.x, centerline.x, centerline.y) + normalDirection * rolled.y;
}

void main() {
  vUv = uv;
  vPetalProgress = aU;
  vec3 localPosition = petalPosition(uv);
  vec3 tangentU;
  vec3 tangentV;
  if (uv.y > 0.996) {
    float sampleV = uv.y - 0.004;
    vec3 left = petalPosition(vec2(0.496, sampleV));
    vec3 right = petalPosition(vec2(0.504, sampleV));
    vec3 center = petalPosition(vec2(0.5, sampleV));
    tangentU = right - left;
    tangentV = localPosition - center;
  } else {
    float sampleU = uv.x > 0.996 ? -0.004 : 0.004;
    vec3 acrossSample = petalPosition(uv + vec2(sampleU, 0.0));
    vec3 alongSample = petalPosition(uv + vec2(0.0, 0.004));
    tangentU = sampleU > 0.0 ? acrossSample - localPosition : localPosition - acrossSample;
    tangentV = alongSample - localPosition;
  }
  vec3 localNormal = normalize(cross(tangentU, tangentV));

  float tiltAngle = -aTilt * openness(1.0);
  float tiltCos = cos(tiltAngle);
  float tiltSin = sin(tiltAngle);
  mat3 tiltMatrix = mat3(
    1.0, 0.0, 0.0,
    0.0, tiltCos, tiltSin,
    0.0, -tiltSin, tiltCos
  );
  localPosition = tiltMatrix * localPosition;
  localNormal = tiltMatrix * localNormal;

  vec4 world = vec4(localPosition, 1.0);
#ifdef USE_INSTANCING
  world = instanceMatrix * world;
  localNormal = normalize(mat3(instanceMatrix) * localNormal);
#endif
  world = modelMatrix * world;
  vec3 worldNormal = normalize(mat3(modelMatrix) * localNormal);

  vec3 windDirection = normalize(vec3(cos(uWindHeading), 0.0, sin(uWindHeading)));
  float phase = dot(world.xyz, windDirection) * 2.2 - uTime * uWindSpeed * 1.4;
  float gust = turbulence(vec3(uTime * uWindSpeed * 0.13, aSeed * 0.31, 0.0));
  float windWave = (turbulence(vec3(phase * 0.55, world.y * 1.3, aSeed * 0.7)) - 0.5) * 2.0;
  float wind = uWindAmplitude * uv.y * uv.y * (0.35 + 0.65 * gust) * windWave;
  world.xyz += windDirection * wind;
  world.y += wind * 0.35;

  vWorldPosition = world.xyz;
  vNormalW = worldNormal;
  vFacingSign = sign(dot(worldNormal, cameraPosition - world.xyz));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uColorMap;
uniform sampler2D uNormalMap;
uniform sampler2D uRoughnessMap;
uniform bool uHasColorMap;
uniform bool uHasNormalMap;
uniform bool uHasRoughnessMap;
uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uCenterColor;
uniform float uRoughness;
uniform float uTransmission;
uniform float uNormalStrength;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
varying float vPetalProgress;
varying float vFacingSign;

vec3 perturbNormal(vec3 normal, vec3 mapNormal) {
  vec3 positionDx = dFdx(vWorldPosition);
  vec3 positionDy = dFdy(vWorldPosition);
  vec2 uvDx = dFdx(vUv);
  vec2 uvDy = dFdy(vUv);
  vec3 tangent = normalize(positionDx * uvDy.y - positionDy * uvDx.y);
  vec3 bitangent = normalize(-positionDx * uvDy.x + positionDy * uvDx.x);
  mat3 tangentFrame = mat3(tangent, bitangent, normal);
  return normalize(tangentFrame * mapNormal);
}

void main() {
  float along = smoothstep(0.0, 1.0, vUv.y);
  vec3 color = mix(uBaseColor, uTipColor, along);
  color = mix(color, uCenterColor, pow(1.0 - abs(vUv.x * 2.0 - 1.0), 3.5) * 0.1);
  if (uHasColorMap) {
    vec3 mapColor = texture2D(uColorMap, vUv).rgb;
    color *= mix(vec3(1.0), mapColor * 1.35, 0.58);
  }

  vec3 normal = normalize(vNormalW) * (gl_FrontFacing ? 1.0 : -1.0);
  if (uHasNormalMap) {
    vec3 sampledNormal = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    sampledNormal.xy *= uNormalStrength;
    normal = perturbNormal(normal, normalize(sampledNormal));
  }

  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 key = normalize(vec3(0.36, 0.78, 0.54));
  vec3 fill = normalize(vec3(-0.82, 0.35, -0.31));
  float keyWrap = clamp((dot(normal, key) + 0.5) / 1.5, 0.0, 1.0);
  float fillWrap = clamp((dot(normal, fill) + 0.38) / 1.38, 0.0, 1.0);
  float rim = pow(1.0 - abs(dot(normal, viewDirection)), 2.2);
  float roughness = uRoughness;
  if (uHasRoughnessMap) roughness *= mix(0.72, 1.18, texture2D(uRoughnessMap, vUv).r);
  float wrapLight = 0.7 + 0.36 * pow(keyWrap, 0.76) + 0.16 * fillWrap + 0.09 * rim;
  float backLight = pow(max(dot(-normal, key), 0.0), 2.0) * uTransmission;
  vec3 halfVector = normalize(key + viewDirection);
  float highlight = pow(max(dot(normal, halfVector), 0.0), mix(48.0, 10.0, roughness)) * (1.0 - roughness) * 0.22;
  color = color * wrapLight + uTipColor * backLight * 0.48 + vec3(highlight);
  color = mix(color, vec3(1.0), rim * 0.055);
  if (!gl_FrontFacing || vFacingSign < 0.0) color *= 0.96;
  gl_FragColor = vec4(color, uOpacity);
}
`

export function DeformablePetalMaterial({
  shape,
  textures,
  baseColor,
  tipColor,
  centerColor,
  roughness = 0.68,
  transmission = 0.08,
  normalStrength = 0.18,
  bloom = 1,
  windAmplitude = 0.006,
  windSpeed = 1.2,
  windHeading = 0.6,
  opacity = 1,
}: DeformablePetalMaterialProps) {
  /* 材质对象只在挂载时建立；参数由下方 effect 原位同步，避免拖动时重建 Shader。 */
  /* eslint-disable react-hooks/exhaustive-deps */
  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: opacity < 0.999,
    depthWrite: opacity >= 0.999,
    uniforms: {
      uTime: { value: 0 },
      uBloom: { value: bloom },
      uTransition: { value: 0.3 },
      uLength: { value: shape.length },
      uWidths0: { value: new Vector2(shape.widths[0], shape.widths[1]) },
      uWidths1: { value: new Vector2(shape.widths[2], shape.widths[3]) },
      uWidths2: { value: new Vector2(shape.widths[4], shape.widths[5]) },
      uCurl: { value: shape.curl },
      uCurlBias: { value: shape.curlBias },
      uCup: { value: shape.cup },
      uSideCurl: { value: shape.sideCurl },
      uWave: { value: shape.wave },
      uWaveCount: { value: shape.waveCount },
      uAsymmetry: { value: shape.asymmetry },
      uNoise: { value: shape.noise },
      uWindAmplitude: { value: windAmplitude },
      uWindSpeed: { value: windSpeed },
      uWindHeading: { value: windHeading },
      uColorMap: { value: textures?.colorMap ?? null },
      uNormalMap: { value: textures?.normalMap ?? null },
      uRoughnessMap: { value: textures?.roughnessMap ?? null },
      uHasColorMap: { value: Boolean(textures?.colorMap) },
      uHasNormalMap: { value: Boolean(textures?.normalMap) },
      uHasRoughnessMap: { value: Boolean(textures?.roughnessMap) },
      uBaseColor: { value: new Color(baseColor) },
      uTipColor: { value: new Color(tipColor) },
      uCenterColor: { value: new Color(centerColor) },
      uRoughness: { value: roughness },
      uTransmission: { value: transmission },
      uNormalStrength: { value: normalStrength },
      uOpacity: { value: opacity },
    },
  }), [])
  /* eslint-enable react-hooks/exhaustive-deps */
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    const uniforms = material.uniforms
    uniforms.uBloom.value = bloom
    uniforms.uLength.value = shape.length
    uniforms.uWidths0.value.set(shape.widths[0], shape.widths[1])
    uniforms.uWidths1.value.set(shape.widths[2], shape.widths[3])
    uniforms.uWidths2.value.set(shape.widths[4], shape.widths[5])
    uniforms.uCurl.value = shape.curl
    uniforms.uCurlBias.value = shape.curlBias
    uniforms.uCup.value = shape.cup
    uniforms.uSideCurl.value = shape.sideCurl
    uniforms.uWave.value = shape.wave
    uniforms.uWaveCount.value = shape.waveCount
    uniforms.uAsymmetry.value = shape.asymmetry
    uniforms.uNoise.value = shape.noise
    uniforms.uWindAmplitude.value = windAmplitude
    uniforms.uWindSpeed.value = windSpeed
    uniforms.uWindHeading.value = windHeading
    uniforms.uColorMap.value = textures?.colorMap ?? null
    uniforms.uNormalMap.value = textures?.normalMap ?? null
    uniforms.uRoughnessMap.value = textures?.roughnessMap ?? null
    uniforms.uHasColorMap.value = Boolean(textures?.colorMap)
    uniforms.uHasNormalMap.value = Boolean(textures?.normalMap)
    uniforms.uHasRoughnessMap.value = Boolean(textures?.roughnessMap)
    uniforms.uBaseColor.value.set(baseColor)
    uniforms.uTipColor.value.set(tipColor)
    uniforms.uCenterColor.value.set(centerColor)
    uniforms.uRoughness.value = roughness
    uniforms.uTransmission.value = transmission
    uniforms.uNormalStrength.value = normalStrength
    uniforms.uOpacity.value = opacity
    material.transparent = opacity < 0.999
    material.depthWrite = opacity >= 0.999
    material.needsUpdate = true
  }, [
    baseColor, bloom, centerColor, material, normalStrength, opacity, roughness,
    shape, textures, tipColor, transmission, windAmplitude, windHeading,
    windSpeed,
  ])

  return <primitive object={material} attach="material" />
}
