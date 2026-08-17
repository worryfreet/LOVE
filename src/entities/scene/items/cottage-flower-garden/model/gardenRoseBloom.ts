import type { IUniform, Material } from 'three'

export interface CottageGardenRoseBloomUniforms {
  timeSeconds: IUniform<number>
  active: IUniform<number>
}

export const COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS = 2.2
export const COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS = 2

export function createCottageGardenRoseBloomUniforms(): CottageGardenRoseBloomUniforms {
  return {
    timeSeconds: { value: 0 },
    active: { value: 0 },
  }
}

/** 根据慢速直行镜头轨迹反解“镜头位于花前 2 米”的剧情时刻。 */
export function resolveCottageGardenRoseBloomTriggerSeconds(rootZ: number) {
  const targetCameraZ = rootZ + COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS
  if (targetCameraZ >= 19.25) {
    return 13 + ((20.25 - targetCameraZ) / 1) * 1.5
  }
  return 14.5 + ((19.25 - targetCameraZ) / 27.05) * 16.5
}

export function resolveCottageGardenRoseBloomProgress(
  timeSeconds: number,
  _rootX: number,
  rootZ: number,
) {
  const raw =
    (timeSeconds - resolveCottageGardenRoseBloomTriggerSeconds(rootZ)) /
    COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS
  const progress = Math.min(1, Math.max(0, raw))
  return progress * progress * (3 - 2 * progress)
}

const roseBloomVertexPars = /* glsl */ `
  uniform float uRoseStoryTime;
  uniform float uRoseStoryActive;

  float roseBloomTrigger(float rootZ) {
    float targetCameraZ = rootZ + 2.0;
    if (targetCameraZ >= 19.25) {
      return 13.0 + ((20.25 - targetCameraZ) / 1.0) * 1.5;
    }
    return 14.5 + ((19.25 - targetCameraZ) / 27.05) * 16.5;
  }
`

const roseBloomBeginVertex = /* glsl */ `
#ifdef USE_INSTANCING
  vec2 roseRoot = instanceMatrix[3].xz;
  float roseTrigger = roseBloomTrigger(roseRoot.y);
  float roseProgress = smoothstep(0.0, 1.0, (uRoseStoryTime - roseTrigger) / 2.2);
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
    return `${previousCacheKey.call(this)}|cottage-rose-bloom-v2`
  }
  material.userData.roseBloom = {
    mode: 'instance-root-two-meter-wave',
    lookAheadMeters: COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS,
    durationSeconds: COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS,
  }
  material.needsUpdate = true
}
