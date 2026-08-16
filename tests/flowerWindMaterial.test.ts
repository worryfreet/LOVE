import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MeshStandardMaterial, PlaneGeometry } from 'three'
import {
  FLOWER_PETAL_WIND_ATTRIBUTES,
  applyFlowerPetalWindAttributes,
  configureFlowerWindMaterial,
  createFlowerWindUniforms,
  updateFlowerWindUniforms,
} from '../src/entities/model'

describe('共享花卉风材质', () => {
  it('风场参数原位更新，不替换材质持有的 Uniform 引用', () => {
    const uniforms = createFlowerWindUniforms({
      directionDegrees: 0,
      strength: 0.5,
      speed: 0.8,
      gustStrength: 0.6,
    })
    const direction = uniforms.direction
    const time = uniforms.time
    updateFlowerWindUniforms(uniforms, {
      time: 3.25,
      directionDegrees: 90,
      strength: 2.1,
      speed: 1.7,
      gustStrength: 1.4,
    })
    assert.equal(uniforms.direction, direction)
    assert.equal(uniforms.time, time)
    assert.equal(uniforms.time.value, 3.25)
    assert.ok(Math.abs(uniforms.direction.value.x) < 1e-6)
    assert.ok(Math.abs(uniforms.direction.value.y - 1) < 1e-6)
    assert.equal(uniforms.strength.value, 2.1)
    assert.equal(uniforms.speed.value, 1.7)
    assert.equal(uniforms.gustStrength.value, 1.4)
  })

  it('花瓣顶点保留瓣根到瓣尖的柔性权重和稳定相位', () => {
    const geometry = applyFlowerPetalWindAttributes(
      new PlaneGeometry(1, 1, 2, 3),
      4.75,
    )
    try {
      const flex = geometry.getAttribute(FLOWER_PETAL_WIND_ATTRIBUTES.flex)
      const phase = geometry.getAttribute(FLOWER_PETAL_WIND_ATTRIBUTES.phase)
      assert.equal(flex.count, geometry.getAttribute('position').count)
      assert.equal(phase.count, flex.count)
      let minimumFlex = 1
      let maximumFlex = 0
      for (let index = 0; index < flex.count; index += 1) {
        minimumFlex = Math.min(minimumFlex, flex.getX(index))
        maximumFlex = Math.max(maximumFlex, flex.getX(index))
        assert.equal(phase.getX(index), 4.75)
      }
      assert.equal(minimumFlex, 0)
      assert.equal(maximumFlex, 1)
    } finally {
      geometry.dispose()
    }
  })

  it('同一 Shader 同时注入根部弯曲、单瓣颤动与共享风 Uniform', () => {
    const uniforms = createFlowerWindUniforms()
    const material = new MeshStandardMaterial()
    const restore = configureFlowerWindMaterial(material, {
      uniforms,
      sourceHeightMeters: 2.2,
      wholePlantAmplitude: 0.026,
      petalAmplitude: 0.008,
    })
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: [
        '#include <common>',
        'void main() {',
        '#include <beginnormal_vertex>',
        '#include <begin_vertex>',
        '}',
      ].join('\n'),
      fragmentShader: '',
    }
    material.onBeforeCompile(shader as never, {} as never)
    assert.equal(shader.uniforms.uFlowerWindTime, uniforms.time)
    assert.equal(shader.uniforms.uFlowerWindDirection, uniforms.direction)
    assert.match(shader.vertexShader, /#define FLOWER_WIND_WHOLE/)
    assert.match(shader.vertexShader, /#define FLOWER_WIND_PETAL/)
    assert.match(shader.vertexShader, /flowerBendWeight/)
    assert.match(shader.vertexShader, /flowerPetalFlutter/)
    assert.match(material.customProgramCacheKey(), /flower-wind-v1-whole-petal/)
    assert.equal(material.userData.flowerWind.updateMode, 'shared-uniform-only')
    restore()
    assert.equal(material.userData.flowerWind, undefined)
    material.dispose()
  })
})
