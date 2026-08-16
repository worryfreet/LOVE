import { Color, MeshStandardMaterial, Vector2, type Texture } from 'three'

export interface GardenSurfaceMaterialOptions {
  color: string
  roughness: number
  grainScale?: number
  grainStrength?: number
  mottlingStrength?: number
  grainAxis?: 'x' | 'y' | 'z'
  vertexColors?: boolean
  emissive?: string
  emissiveIntensity?: number
  map?: Texture
  bumpMap?: Texture
  bumpScale?: number
  normalMap?: Texture
  normalScale?: Vector2
  roughnessMap?: Texture
}

/** 只增加稳定的世界空间细节，不创建纹理请求或额外渲染通道。 */
export function createGardenSurfaceMaterial({
  color,
  roughness,
  grainScale = 5.5,
  grainStrength = 0.1,
  mottlingStrength = 0.07,
  grainAxis = 'x',
  vertexColors = true,
  emissive = '#000000',
  emissiveIntensity = 0,
  map,
  bumpMap,
  bumpScale = 0.025,
  normalMap,
  normalScale = new Vector2(1, 1),
  roughnessMap,
}: GardenSurfaceMaterialOptions) {
  const grainExpression =
    grainAxis === 'y'
      ? 'vGardenLocalPosition.y * 2.2 + vGardenLocalPosition.x * 0.08'
      : grainAxis === 'z'
        ? 'vGardenLocalPosition.z * 2.2 + vGardenLocalPosition.y * 0.08'
        : 'vGardenLocalPosition.x * 2.2 + vGardenLocalPosition.y * 0.08'
  const material = new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness: 0,
    vertexColors,
    emissive: new Color(emissive),
    emissiveIntensity,
    ...(map ? { map } : {}),
    ...(bumpMap ? { bumpMap, bumpScale } : {}),
    ...(normalMap ? { normalMap, normalScale } : {}),
    ...(roughnessMap ? { roughnessMap } : {}),
  })
  if (map && emissiveIntensity > 0) {
    material.emissiveMap = map
  }
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGardenWorldPosition;
varying vec3 vGardenLocalPosition;
varying float vGardenInstanceSeed;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vGardenWorldPosition = worldPosition.xyz;
vGardenLocalPosition = position;
#ifdef USE_INSTANCING
  vGardenInstanceSeed = fract(dot(instanceMatrix[3].xyz, vec3(0.1031, 0.11369, 0.13787)));
#else
  vGardenInstanceSeed = fract(dot(modelMatrix[3].xyz, vec3(0.1031, 0.11369, 0.13787)));
#endif`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGardenWorldPosition;
varying vec3 vGardenLocalPosition;
varying float vGardenInstanceSeed;

float gardenHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float gardenNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(gardenHash(cell), gardenHash(cell + vec2(1.0, 0.0)), local.x),
    mix(gardenHash(cell + vec2(0.0, 1.0)), gardenHash(cell + 1.0), local.x),
    local.y
  );
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float gardenFiber = ${grainExpression};
float gardenWarp = gardenNoise(vec2(gardenFiber * 2.7 + vGardenInstanceSeed * 9.0, vGardenLocalPosition.y * 3.2));
float gardenGrain = sin((gardenFiber + gardenWarp * 0.13) * ${grainScale.toFixed(3)} * 14.0 + vGardenInstanceSeed * 6.28318);
float gardenMottle = gardenNoise(vGardenWorldPosition.xz * 1.65 + vGardenWorldPosition.y * 0.43 + vGardenInstanceSeed * 17.0);
float gardenPore = pow(clamp(gardenMottle, 0.0, 1.0), 8.0);
diffuseColor.rgb *= 1.0 + gardenGrain * ${grainStrength.toFixed(3)} + (gardenMottle - 0.5) * ${mottlingStrength.toFixed(3)} - gardenPore * 0.035;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (gardenMottle - 0.5) * 0.16, 0.48, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
normal = normalize(normal + vec3(gardenGrain * 0.01, (gardenMottle - 0.5) * 0.016, -gardenGrain * 0.007));`,
      )
  }
  material.customProgramCacheKey = () =>
    `garden-surface-${color}-${roughness}-${grainScale}-${grainStrength}-${mottlingStrength}-${grainAxis}-${vertexColors}-${emissive}-${emissiveIntensity}-${map?.uuid ?? 'no-map'}-${bumpMap?.uuid ?? 'no-bump'}-${bumpScale}-${normalMap?.uuid ?? 'no-normal'}-${roughnessMap?.uuid ?? 'no-roughness'}`
  return material
}
