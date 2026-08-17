import type { IUniform, Material } from 'three'

export interface CottageGardenRoseBloomUniforms {
  timeSeconds: IUniform<number>
  active: IUniform<number>
}

export const COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS = 2.2
export const COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS = 2.7

export function createCottageGardenRoseBloomUniforms(): CottageGardenRoseBloomUniforms {
  return {
    timeSeconds: { value: 0 },
    active: { value: 0 },
  }
}

/** 根据主路镜头轨迹反解“镜头位于花前约 2.7 米”的剧情时刻。 */
export function resolveCottageGardenRoseBloomTriggerSeconds(rootZ: number) {
  const targetCameraZ = rootZ + COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS
  if (targetCameraZ >= 16.2) {
    return 13 + ((20.25 - targetCameraZ) / 4.05) * 3
  }
  if (targetCameraZ >= 7.2) {
    return 16 + ((16.2 - targetCameraZ) / 9) * 3.5
  }
  return 19.5 + ((7.2 - targetCameraZ) / 15) * 3.5
}

export function resolveCottageGardenRoseBloomProgress(
  timeSeconds: number,
  rootX: number,
  rootZ: number,
) {
  const stagger = Math.sin(rootX * 12.9898 + rootZ * 78.233) * 0.22
  const raw =
    (timeSeconds - resolveCottageGardenRoseBloomTriggerSeconds(rootZ) - stagger) /
    COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS
  const progress = Math.min(1, Math.max(0, raw))
  return progress * progress * (3 - 2 * progress)
}

const roseBloomVertexPars = /* glsl */ `
  uniform float uRoseStoryTime;
  uniform float uRoseStoryActive;

  float roseBloomTrigger(float rootZ) {
    float targetCameraZ = rootZ + 2.7;
    if (targetCameraZ >= 16.2) {
      return 13.0 + ((20.25 - targetCameraZ) / 4.05) * 3.0;
    }
    if (targetCameraZ >= 7.2) {
      return 16.0 + ((16.2 - targetCameraZ) / 9.0) * 3.5;
    }
    return 19.5 + ((7.2 - targetCameraZ) / 15.0) * 3.5;
  }

  float roseBloomHash(vec2 point) {
    return sin(dot(point, vec2(12.9898, 78.233))) * 0.22;
  }
`

const roseBloomBeginVertex = /* glsl */ `
#ifdef USE_INSTANCING
  vec2 roseRoot = instanceMatrix[3].xz;
  float roseTrigger = roseBloomTrigger(roseRoot.y) + roseBloomHash(roseRoot);
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
    return `${previousCacheKey.call(this)}|cottage-rose-bloom-v1`
  }
  material.userData.roseBloom = {
    mode: 'instance-root-look-ahead-wave',
    lookAheadMeters: COTTAGE_GARDEN_ROSE_LOOK_AHEAD_METERS,
    durationSeconds: COTTAGE_GARDEN_ROSE_BLOOM_DURATION_SECONDS,
  }
  material.needsUpdate = true
}
