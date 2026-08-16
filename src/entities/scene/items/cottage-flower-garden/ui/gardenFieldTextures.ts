import {
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RedFormat,
  RGBAFormat,
  UnsignedByteType,
} from "three";
import {
  COTTAGE_GARDEN_MEADOW_FIELD,
  COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD,
  sampleCottageGardenBedDomain,
  sampleCottageGardenMeadowCoverage,
  sampleCottageGardenMeadowDomain,
  sampleCottageGardenMeadowHabitat,
  sampleCottageGardenPathSurfaceBlend,
} from "../model/gardenMeadowHabitat";
import { COTTAGE_GARDEN_GRASS_TERRAIN_MAP } from "../model/gardenMeadowGrass";
import { sampleCottageFlowerGardenTerrainHeight } from "../model/gardenTerrain";

function configureFieldTexture(texture: DataTexture) {
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * RGBA = 覆盖率 / 密度 / 物种带 / 高度变化。
 * mip 链让远景自动聚合，不再用高频解析花朵图案硬撑锐度。
 */
export function createCottageGardenMeadowHabitatTexture() {
  const { minimumMeters, maximumMeters, textureResolution } =
    COTTAGE_GARDEN_MEADOW_FIELD;
  const data = new Uint8Array(textureResolution * textureResolution * 4);
  const span = maximumMeters - minimumMeters;
  for (let row = 0; row < textureResolution; row += 1) {
    const z = minimumMeters + (row / (textureResolution - 1)) * span;
    for (let column = 0; column < textureResolution; column += 1) {
      const x = minimumMeters + (column / (textureResolution - 1)) * span;
      const sample = sampleCottageGardenMeadowHabitat(x, z);
      const offset = (row * textureResolution + column) * 4;
      data[offset] = Math.round(sample.coverage * 255);
      data[offset + 1] = Math.round(sample.density * 255);
      data[offset + 2] = Math.round(sample.species * 255);
      data[offset + 3] = Math.round(sample.heightVariation * 255);
    }
  }
  const texture = configureFieldTexture(
    new DataTexture(
      data,
      textureResolution,
      textureResolution,
      RGBAFormat,
      UnsignedByteType,
    ),
  );
  texture.name = "field.cottage-meadow-habitat";
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * 局部高分辨率语义图：R=coverage，G=courtyard domain，B=art-directed bed，
 * A=道路接缝绿软权重。四个通道都来自权威解析场。
 */
export function createCottageGardenMeadowLocalCoverageTexture(
  pathClearanceMeters = 0.12,
  bedEdgeFeatherMeters = 0.42,
  pathSurfaceBlendFeatherMeters = 0.38,
  pathSurfaceEdgeWarpMeters = 0.14,
) {
  const { minimumMeters, maximumMeters, textureResolution } =
    COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD;
  const data = new Uint8Array(textureResolution * textureResolution * 4);
  const span = maximumMeters - minimumMeters;
  for (let row = 0; row < textureResolution; row += 1) {
    const z = minimumMeters + (row / (textureResolution - 1)) * span;
    for (let column = 0; column < textureResolution; column += 1) {
      const x = minimumMeters + (column / (textureResolution - 1)) * span;
      const offset = (row * textureResolution + column) * 4;
      const domain = sampleCottageGardenMeadowDomain(x, z);
      data[offset] = Math.round(
        sampleCottageGardenMeadowCoverage(x, z, pathClearanceMeters) * 255,
      );
      data[offset + 1] = Math.round(domain.courtyard * 255);
      data[offset + 2] = Math.round(
        sampleCottageGardenBedDomain(x, z, bedEdgeFeatherMeters) * 255,
      );
      data[offset + 3] = Math.round(
        sampleCottageGardenPathSurfaceBlend(
          x,
          z,
          pathSurfaceBlendFeatherMeters,
          pathSurfaceEdgeWarpMeters,
        ) * 255,
      );
    }
  }
  const texture = configureFieldTexture(
    new DataTexture(
      data,
      textureResolution,
      textureResolution,
      RGBAFormat,
      UnsignedByteType,
    ),
  );
  texture.name = "field.cottage-meadow-local-coverage";
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** 地形位移只在顶点阶段读取，保留线性基础层即可。 */
export function createCottageGardenTerrainHeightTexture() {
  const { minimumMeters, maximumMeters, resolution } =
    COTTAGE_GARDEN_GRASS_TERRAIN_MAP;
  const data = new Float32Array(resolution * resolution);
  const span = maximumMeters - minimumMeters;
  for (let row = 0; row < resolution; row += 1) {
    const z = minimumMeters + (row / (resolution - 1)) * span;
    for (let column = 0; column < resolution; column += 1) {
      const x = minimumMeters + (column / (resolution - 1)) * span;
      data[row * resolution + column] =
        sampleCottageFlowerGardenTerrainHeight(x, z);
    }
  }
  const texture = configureFieldTexture(
    new DataTexture(data, resolution, resolution, RedFormat, FloatType),
  );
  texture.name = "field.cottage-terrain-height";
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
