import type { IUniform, Material } from 'three'

export interface CottageGardenRoseBloomUniforms {
  timeSeconds: IUniform<number>
  active: IUniform<number>
}

export const COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS = 3
export const COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS = 5

export function createCottageGardenRoseBloomUniforms(): CottageGardenRoseBloomUniforms {
  return {
    timeSeconds: { value: 0 },
    active: { value: 0 },
  }
}

/** 根据主路直行轨迹反解相机进入花株 XZ 平面五米范围的剧情时刻。 */
export function resolveCottageGardenRoseBloomTriggerSeconds(
  rootZ: number,
  rootX = 0,
) {
  const lateralDistance = Math.abs(rootX)
  if (lateralDistance > COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS) {
    return Number.POSITIVE_INFINITY
  }
  const forwardDistance = Math.sqrt(
    COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS ** 2 - lateralDistance ** 2,
  )
  const targetCameraZ = rootZ + forwardDistance
  if (targetCameraZ >= 19.25) {
    return Math.max(14, 14 + ((20.25 - targetCameraZ) / 1) * 3)
  }
  return Math.min(39, 17 + ((19.25 - targetCameraZ) / 27.05) * 22)
}

export function resolveCottageGardenRoseBloomProgress(
  timeSeconds: number,
  rootX: number,
  rootZ: number,
) {
  const raw =
    (timeSeconds - resolveCottageGardenRoseBloomTriggerSeconds(rootZ, rootX)) /
    COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS
  const progress = Math.min(1, Math.max(0, raw))
  return progress * progress * (3 - 2 * progress)
}

const roseBloomVertexPars = /* glsl */ `
  uniform float uRoseStoryTime;
  uniform float uRoseStoryActive;

  float roseBloomTrigger(float rootX, float rootZ) {
    float lateralDistance = abs(rootX);
    if (lateralDistance > 5.0) return 1000000.0;
    float forwardDistance = sqrt(max(0.0, 25.0 - lateralDistance * lateralDistance));
    float targetCameraZ = rootZ + forwardDistance;
    if (targetCameraZ >= 19.25) {
      return max(14.0, 14.0 + ((20.25 - targetCameraZ) / 1.0) * 3.0);
    }
    return min(39.0, 17.0 + ((19.25 - targetCameraZ) / 27.05) * 22.0);
  }
`

const roseBloomBeginVertex = /* glsl */ `
#ifdef USE_INSTANCING
  vec2 roseRoot = instanceMatrix[3].xz;
  float roseTrigger = roseBloomTrigger(roseRoot.x, roseRoot.y);
  float roseProgress = smoothstep(0.0, 1.0, (uRoseStoryTime - roseTrigger) / 3.0);
  roseProgress = mix(1.0, roseProgress, clamp(uRoseStoryActive, 0.0, 1.0));
  float roseCrownY = uRoseSourceHeight * 0.78;
  vec3 roseCrownOffset = transformed - vec3(0.0, roseCrownY, 0.0);
  roseCrownOffset.xz *= mix(0.24, 1.0, roseProgress);
  roseCrownOffset.y *= mix(0.7, 1.0, roseProgress);
  transformed = vec3(0.0, roseCrownY, 0.0) + roseCrownOffset;
#endif
`

export function configureCottageGardenRoseBloomMaterial(
  material: Material,
  uniforms: CottageGardenRoseBloomUniforms,
  sourceHeightMeters: number,
) {
  const previousCompile = material.onBeforeCompile
  const previousCacheKey = material.customProgramCacheKey
  const compiler: Material['onBeforeCompile'] = (shader) => {
    shader.uniforms.uRoseStoryTime = uniforms.timeSeconds
    shader.uniforms.uRoseStoryActive = uniforms.active
    shader.uniforms.uRoseSourceHeight = { value: sourceHeightMeters }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uRoseSourceHeight;\n${roseBloomVertexPars}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n${roseBloomBeginVertex}`,
      )
  }
  const nextCompile: Material['onBeforeCompile'] = function (
    this: Material,
    shader,
    renderer,
  ) {
    previousCompile.call(this, shader, renderer)
    compiler.call(this, shader, renderer)
  }
  material.onBeforeCompile = nextCompile
  material.customProgramCacheKey = function (this: Material) {
    return `${previousCacheKey.call(this)}|cottage-rose-bloom-v3`
  }
  material.userData.roseBloom = {
    mode: 'instance-root-five-meter-proximity-wave',
    lookAheadMeters: COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS,
    durationSeconds: COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS,
  }
  material.needsUpdate = true
}
