import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  WILDFLOWER_SPECS,
  WILDFLOWER_SPECIES_IDS,
  type WildflowerSpeciesId,
} from "@/entities/model";
import {
  Box3,
  Color,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MeshStandardMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import {
  COTTAGE_GARDEN_MEADOW_FIELD,
  COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD,
} from "../model/gardenMeadowHabitat";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "../model/gardenLayout";
import { COTTAGE_GARDEN_MEADOW_GREEN_PALETTE } from "../model/gardenMeadowGrass";
import {
  COTTAGE_GARDEN_FLOWER_LAYERS,
  COTTAGE_GARDEN_WILDFLOWER_MEADOW,
  createCottageGardenFlowerInstanceData,
  resolveCottageGardenFlowerLayerInstanceCount,
  type CottageGardenFlowerLayerSpec,
} from "../model/gardenWildflowerMeadow";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import {
  createCottageGardenMiddleFlowerClusterGeometry,
  createCottageGardenNearFlowerGeometry,
} from "./gardenFlowerGeometry";
import { CottageGardenGpuGrass } from "./GardenMeadowGrass";

interface MeadowRuntimeUniforms {
  cameraXZ: { value: Vector2 };
  time: { value: number };
}

interface FlowerShaderUniforms extends MeadowRuntimeUniforms {
  terrainMap: { value: DataTexture };
  habitatMap: { value: DataTexture };
  localCoverageMap: { value: DataTexture };
  localCoverageMinimum: { value: number };
  localCoverageMaximum: { value: number };
  fieldMinimum: { value: number };
  fieldMaximum: { value: number };
  fieldSize: { value: number };
  cameraWrapped: { value: number };
  distanceFade: { value: number };
  courtyardLayer: { value: number };
  fadeIn: { value: Vector2 };
  fadeOut: { value: Vector2 };
  sourceHeight: { value: number };
  targetHeightRange: { value: Vector2 };
  widthMultiplier: { value: number };
  density: { value: number };
  primaryColor: { value: Color };
  secondaryColor: { value: Color };
  accentColor: { value: Color };
  windDirection: { value: Vector2 };
  windStrength: { value: number };
  windSpeed: { value: number };
  gustStrength: { value: number };
  pathClearance: { value: number };
}

function resolveSpeciesAffinityShader(species: WildflowerSpeciesId) {
  if (species === "wild-daisy") {
    return "mix(0.34, 1.0, 1.0 - smoothstep(0.3, 0.7, meadowHabitat.b))";
  }
  if (species === "pink-cosmos") {
    return "0.34 + 0.66 * (1.0 - smoothstep(0.2, 0.52, abs(meadowHabitat.b - 0.5)))";
  }
  return "mix(0.34, 1.0, smoothstep(0.3, 0.7, meadowHabitat.b))";
}

function createFlowerGeometry(
  layer: CottageGardenFlowerLayerSpec,
  species: WildflowerSpeciesId,
) {
  const source =
    layer.geometryDetail === "individual"
      ? createCottageGardenNearFlowerGeometry(species)
      : createCottageGardenMiddleFlowerClusterGeometry(species);
  const instances = createCottageGardenFlowerInstanceData(layer, species);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(source.index?.clone() ?? null);
  for (const name of Object.keys(source.attributes)) {
    geometry.setAttribute(name, source.getAttribute(name).clone());
  }
  source.dispose();
  geometry.setAttribute(
    "meadowRoot",
    new InstancedBufferAttribute(instances.roots, 2),
  );
  geometry.setAttribute(
    "meadowShape",
    new InstancedBufferAttribute(instances.shapes, 4),
  );
  geometry.instanceCount = instances.count;
  geometry.boundingBox = new Box3(
    new Vector3(-110, -18, -110),
    new Vector3(110, 18, 110),
  );
  geometry.boundingSphere = new Sphere(new Vector3(), 158);
  geometry.userData = {
    layerId: layer.id,
    species,
    geometryDetail: layer.geometryDetail,
    instanceCount: instances.count,
    attributeBytesPerInstance: 24,
    matrixBytesPerInstance: 0,
  };
  return geometry;
}

function createFlowerMaterial(
  layer: CottageGardenFlowerLayerSpec,
  species: WildflowerSpeciesId,
  uniforms: FlowerShaderUniforms,
) {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    side: DoubleSide,
    roughness: layer.geometryDetail === "individual" ? 0.88 : 0.94,
    metalness: 0,
    emissive:
      layer.id === "far-silhouette"
        ? COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.meadow
        : COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.shadow,
    emissiveIntensity:
      layer.geometryDetail === "individual"
        ? 0.015
        : layer.id === "far-silhouette"
          ? 0.01
          : 0.052,
  });
  material.name = `material.meadow-flower-${layer.id}-${species}`;
  material.customProgramCacheKey = () =>
    `cottage-meadow-flower-domain-wrap-v8-fragment-path-clip-${layer.id}-${species}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMeadowCameraXZ = uniforms.cameraXZ;
    shader.uniforms.uMeadowTime = uniforms.time;
    shader.uniforms.uMeadowTerrainMap = uniforms.terrainMap;
    shader.uniforms.uMeadowHabitatMap = uniforms.habitatMap;
    shader.uniforms.uMeadowLocalCoverageMap = uniforms.localCoverageMap;
    shader.uniforms.uMeadowLocalCoverageMinimum = uniforms.localCoverageMinimum;
    shader.uniforms.uMeadowLocalCoverageMaximum = uniforms.localCoverageMaximum;
    shader.uniforms.uMeadowFieldMinimum = uniforms.fieldMinimum;
    shader.uniforms.uMeadowFieldMaximum = uniforms.fieldMaximum;
    shader.uniforms.uMeadowFieldSize = uniforms.fieldSize;
    shader.uniforms.uMeadowCameraWrapped = uniforms.cameraWrapped;
    shader.uniforms.uMeadowDistanceFade = uniforms.distanceFade;
    shader.uniforms.uMeadowCourtyardLayer = uniforms.courtyardLayer;
    shader.uniforms.uMeadowFadeIn = uniforms.fadeIn;
    shader.uniforms.uMeadowFadeOut = uniforms.fadeOut;
    shader.uniforms.uMeadowSourceHeight = uniforms.sourceHeight;
    shader.uniforms.uMeadowTargetHeightRange = uniforms.targetHeightRange;
    shader.uniforms.uMeadowWidthMultiplier = uniforms.widthMultiplier;
    shader.uniforms.uMeadowDensity = uniforms.density;
    shader.uniforms.uMeadowFlowerPrimary = uniforms.primaryColor;
    shader.uniforms.uMeadowFlowerSecondary = uniforms.secondaryColor;
    shader.uniforms.uMeadowFlowerAccent = uniforms.accentColor;
    shader.uniforms.uMeadowWindDirection = uniforms.windDirection;
    shader.uniforms.uMeadowWindStrength = uniforms.windStrength;
    shader.uniforms.uMeadowWindSpeed = uniforms.windSpeed;
    shader.uniforms.uMeadowGustStrength = uniforms.gustStrength;
    shader.uniforms.uMeadowPathClearance = uniforms.pathClearance;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "attribute vec2 meadowRoot;",
          "attribute vec4 meadowShape;",
          "attribute float meadowPetalMask;",
          "uniform vec2 uMeadowCameraXZ;",
          "uniform float uMeadowTime;",
          "uniform sampler2D uMeadowTerrainMap;",
          "uniform sampler2D uMeadowHabitatMap;",
          "uniform sampler2D uMeadowLocalCoverageMap;",
          "uniform float uMeadowLocalCoverageMinimum;",
          "uniform float uMeadowLocalCoverageMaximum;",
          "uniform float uMeadowFieldMinimum;",
          "uniform float uMeadowFieldMaximum;",
          "uniform float uMeadowFieldSize;",
          "uniform float uMeadowCameraWrapped;",
          "uniform float uMeadowDistanceFade;",
          "uniform float uMeadowCourtyardLayer;",
          "uniform vec2 uMeadowFadeIn;",
          "uniform vec2 uMeadowFadeOut;",
          "uniform float uMeadowSourceHeight;",
          "uniform vec2 uMeadowTargetHeightRange;",
          "uniform float uMeadowWidthMultiplier;",
          "uniform float uMeadowDensity;",
          "uniform vec3 uMeadowFlowerPrimary;",
          "uniform vec3 uMeadowFlowerSecondary;",
          "uniform vec3 uMeadowFlowerAccent;",
          "uniform vec2 uMeadowWindDirection;",
          "uniform float uMeadowWindStrength;",
          "uniform float uMeadowWindSpeed;",
          "uniform float uMeadowGustStrength;",
          "uniform float uMeadowPathClearance;",
          "varying float vMeadowPetalMask;",
          "varying vec3 vMeadowFlowerTint;",
          "varying float vMeadowViewingDistance;",
          "varying vec2 vMeadowWorldRoot;",
          "float meadowSmooth(float a, float b, float value) {",
          "  if (abs(b - a) < 0.0001) return value >= b ? 1.0 : 0.0;",
          "  float p = clamp((value - a) / (b - a), 0.0, 1.0);",
          "  return p * p * (3.0 - 2.0 * p);",
          "}",
          "float meadowHash(vec2 point, float phase) {",
          "  return fract(sin(dot(floor(point * 4.0), vec2(17.371, 43.117)) + phase * 7.13) * 43758.5453);",
          "}",
        ].join("\n"),
      )
      .replace(
        "#include <beginnormal_vertex>",
        [
          "#include <beginnormal_vertex>",
          "float meadowCosine = cos(meadowShape.x);",
          "float meadowSine = sin(meadowShape.x);",
          "objectNormal.xz = mat2(meadowCosine, -meadowSine, meadowSine, meadowCosine) * objectNormal.xz;",
        ].join("\n"),
      )
      .replace(
        "#include <begin_vertex>",
        [
          "vec3 transformed = vec3(position);",
          "vec2 meadowWrappedRoot = meadowRoot + floor((uMeadowCameraXZ - meadowRoot) / uMeadowFieldSize + 0.5) * uMeadowFieldSize;",
          "vec2 meadowWorldRoot = mix(meadowRoot, meadowWrappedRoot, uMeadowCameraWrapped);",
          "vMeadowWorldRoot = meadowWorldRoot;",
          "float meadowDistance = distance(meadowWorldRoot, uMeadowCameraXZ);",
          "float meadowInnerFade = meadowSmooth(uMeadowFadeIn.x, uMeadowFadeIn.y, meadowDistance);",
          "float meadowOuterFade = 1.0 - meadowSmooth(uMeadowFadeOut.x, uMeadowFadeOut.y, meadowDistance);",
          "float meadowDistanceVisibility = mix(1.0, meadowInnerFade * meadowOuterFade, uMeadowDistanceFade);",
          "float meadowFieldSpan = uMeadowFieldMaximum - uMeadowFieldMinimum;",
          "vec2 meadowFieldUv = clamp((meadowWorldRoot - uMeadowFieldMinimum) / meadowFieldSpan, 0.0, 1.0);",
          "vec4 meadowHabitat = texture2D(uMeadowHabitatMap, meadowFieldUv);",
          "float meadowLocalSpan = uMeadowLocalCoverageMaximum - uMeadowLocalCoverageMinimum;",
          "vec2 meadowLocalUv = clamp((meadowWorldRoot - uMeadowLocalCoverageMinimum) / meadowLocalSpan, 0.0, 1.0);",
          "float meadowInsideLocal = step(uMeadowLocalCoverageMinimum, meadowWorldRoot.x) * step(meadowWorldRoot.x, uMeadowLocalCoverageMaximum) * step(uMeadowLocalCoverageMinimum, meadowWorldRoot.y) * step(meadowWorldRoot.y, uMeadowLocalCoverageMaximum);",
          "vec4 meadowLocalSample = texture2D(uMeadowLocalCoverageMap, meadowLocalUv);",
          "meadowHabitat.r = mix(meadowHabitat.r, meadowLocalSample.r, meadowInsideLocal);",
          "float meadowCourtyard = meadowLocalSample.g * meadowInsideLocal;",
          "float meadowGardenBed = meadowLocalSample.b * meadowInsideLocal;",
          "float meadowDomain = mix(1.0 - meadowCourtyard, meadowCourtyard, uMeadowCourtyardLayer);",
          `float meadowSpeciesAffinity = ${resolveSpeciesAffinityShader(species)};`,
          `float meadowPathInsideX = 1.0 - step(${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.width / 2).toFixed(3)} + uMeadowPathClearance, abs(meadowWorldRoot.x - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerX.toFixed(3)}));`,
          `float meadowPathInsideZ = 1.0 - step(${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.length / 2).toFixed(3)} + uMeadowPathClearance, abs(meadowWorldRoot.y - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerZ.toFixed(3)}));`,
          "float meadowPathOutside = 1.0 - meadowPathInsideX * meadowPathInsideZ;",
          "float meadowBedSuppression = mix(1.0, 0.035, meadowGardenBed * uMeadowCourtyardLayer);",
          "float meadowProbability = clamp(meadowDistanceVisibility * meadowDomain * meadowHabitat.r * mix(0.62, 1.12, meadowHabitat.g) * meadowSpeciesAffinity * uMeadowDensity * meadowPathOutside * meadowBedSuppression, 0.0, 1.0);",
          "float meadowRandom = meadowHash(meadowWorldRoot, meadowShape.w);",
          "float meadowVisibility = smoothstep(meadowRandom - 0.14, meadowRandom + 0.14, meadowProbability);",
          "float meadowHardVisibility = step(0.001, meadowDistanceVisibility) * step(0.001, meadowDomain) * step(0.001, meadowHabitat.r) * meadowPathOutside;",
          "meadowVisibility *= meadowHardVisibility;",
          "float meadowHeightNoise = mix(meadowShape.y, meadowHabitat.a, 0.36);",
          "float meadowTargetHeight = mix(uMeadowTargetHeightRange.x, uMeadowTargetHeightRange.y, meadowHeightNoise);",
          "float meadowHeightScale = meadowTargetHeight / max(uMeadowSourceHeight, 0.001);",
          "float meadowWidthScale = meadowHeightScale * uMeadowWidthMultiplier * mix(0.84, 1.16, meadowShape.z);",
          "float meadowProgress = clamp(position.y / max(uMeadowSourceHeight, 0.001), 0.0, 1.0);",
          "transformed.xz *= meadowWidthScale;",
          "transformed.y *= meadowHeightScale;",
          "transformed.xz = mat2(meadowCosine, -meadowSine, meadowSine, meadowCosine) * transformed.xz;",
          "float meadowGust = sin(uMeadowTime * uMeadowWindSpeed + meadowShape.w + dot(meadowWorldRoot, vec2(0.11, 0.17))) * 0.72 + sin(uMeadowTime * uMeadowWindSpeed * 0.43 + meadowShape.w * 1.7) * 0.28 * uMeadowGustStrength;",
          "transformed.xz += uMeadowWindDirection * meadowGust * 0.026 * uMeadowWindStrength * meadowProgress * meadowProgress;",
          "transformed *= meadowVisibility;",
          "float meadowTerrainHeight = texture2D(uMeadowTerrainMap, meadowFieldUv).r;",
          "transformed.xz += meadowWorldRoot;",
          `transformed.y += meadowTerrainHeight + ${COTTAGE_GARDEN_WILDFLOWER_MEADOW.rootOffsetMeters.toFixed(3)};`,
          "float meadowTintHash = meadowHash(meadowWorldRoot + 17.0, meadowShape.w);",
          "vMeadowFlowerTint = mix(uMeadowFlowerPrimary, uMeadowFlowerSecondary, step(0.62, meadowTintHash));",
          "vMeadowFlowerTint = mix(vMeadowFlowerTint, uMeadowFlowerAccent, step(0.86, meadowTintHash));",
          "vMeadowPetalMask = meadowPetalMask;",
          "vMeadowViewingDistance = meadowDistance;",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying float vMeadowPetalMask;",
          "varying vec3 vMeadowFlowerTint;",
          "varying float vMeadowViewingDistance;",
          "varying vec2 vMeadowWorldRoot;",
          "uniform float uMeadowPathClearance;",
        ].join("\n"),
      )
      .replace(
        "#include <clipping_planes_fragment>",
        [
          "#include <clipping_planes_fragment>",
          `if (abs(vMeadowWorldRoot.x - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerX.toFixed(3)}) <= ${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.width / 2).toFixed(3)} + uMeadowPathClearance && abs(vMeadowWorldRoot.y - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerZ.toFixed(3)}) <= ${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.length / 2).toFixed(3)} + uMeadowPathClearance) discard;`,
        ].join("\n"),
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          "diffuseColor.rgb = mix(diffuseColor.rgb, vMeadowFlowerTint, vMeadowPetalMask);",
          "float meadowLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));",
          `float meadowDistanceCompression = smoothstep(${layer.id === "far-silhouette" ? "50.0, 110.0" : "42.0, 82.0"}, vMeadowViewingDistance);`,
          `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(meadowLuma) * vec3(0.94, 1.04, 0.91), meadowDistanceCompression * ${layer.id === "far-silhouette" ? "0.58" : "0.18"});`,
        ].join("\n"),
      );
  };
  return material;
}

function GardenFlowerLayer({
  layer,
  species,
  terrainMap,
  habitatMap,
  localCoverageMap,
  runtime,
  tuning,
}: {
  layer: CottageGardenFlowerLayerSpec;
  species: WildflowerSpeciesId;
  terrainMap: DataTexture;
  habitatMap: DataTexture;
  localCoverageMap: DataTexture;
  runtime: MeadowRuntimeUniforms;
  tuning: CottageGardenTuning;
}) {
  const geometry = useMemo(
    () => createFlowerGeometry(layer, species),
    [layer, species],
  );
  const uniforms = useMemo<FlowerShaderUniforms>(() => {
    const flower = COTTAGE_GARDEN_TUNING_DEFAULTS.flowers[species];
    return {
      ...runtime,
      terrainMap: { value: terrainMap },
      habitatMap: { value: habitatMap },
      localCoverageMap: { value: localCoverageMap },
      localCoverageMinimum: {
        value: COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.minimumMeters,
      },
      localCoverageMaximum: {
        value: COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.maximumMeters,
      },
      fieldMinimum: { value: COTTAGE_GARDEN_MEADOW_FIELD.minimumMeters },
      fieldMaximum: { value: COTTAGE_GARDEN_MEADOW_FIELD.maximumMeters },
      fieldSize: { value: layer.fieldSizeMeters },
      cameraWrapped: { value: layer.cameraWrapped ? 1 : 0 },
      distanceFade: { value: layer.distanceFade ? 1 : 0 },
      courtyardLayer: { value: layer.domain === "courtyard" ? 1 : 0 },
      fadeIn: { value: new Vector2(...layer.fadeInMeters) },
      fadeOut: { value: new Vector2(...layer.fadeOutMeters) },
      sourceHeight: { value: WILDFLOWER_SPECS[species].height },
      targetHeightRange: {
        value: new Vector2(flower.heightMinMeters, flower.heightMaxMeters),
      },
      widthMultiplier: { value: flower.widthMultiplier },
      density: { value: flower.density },
      primaryColor: { value: new Color(flower.primaryColor) },
      secondaryColor: { value: new Color(flower.secondaryColor) },
      accentColor: { value: new Color(flower.accentColor) },
      windDirection: { value: new Vector2(0.92, 0.39).normalize() },
      windStrength: { value: 1 },
      windSpeed: { value: 1 },
      gustStrength: { value: 1 },
      pathClearance: {
        value: COTTAGE_GARDEN_TUNING_DEFAULTS.garden.pathClearanceMeters,
      },
    };
  }, [habitatMap, layer, localCoverageMap, runtime, species, terrainMap]);
  const material = useMemo(
    () => createFlowerMaterial(layer, species, uniforms),
    [layer, species, uniforms],
  );

  useEffect(() => {
    const flower = tuning.flowers[species];
    const distanceScale = layer.id === "far-silhouette" ? 0.72 : 1;
    uniforms.targetHeightRange.value.set(
      flower.heightMinMeters * distanceScale,
      flower.heightMaxMeters * distanceScale,
    );
    uniforms.widthMultiplier.value =
      flower.widthMultiplier * (layer.id === "far-silhouette" ? 0.8 : 1);
    uniforms.density.value = flower.density;
    uniforms.primaryColor.value.set(flower.primaryColor);
    uniforms.secondaryColor.value.set(flower.secondaryColor);
    uniforms.accentColor.value.set(flower.accentColor);
    const direction = (tuning.grass.windDirectionDegrees * Math.PI) / 180;
    uniforms.windDirection.value.set(Math.cos(direction), Math.sin(direction));
    uniforms.windStrength.value = tuning.grass.windStrength;
    uniforms.windSpeed.value = tuning.grass.windSpeed;
    uniforms.gustStrength.value = tuning.grass.gustStrength;
    uniforms.pathClearance.value = tuning.garden.pathClearanceMeters;
    if (layer.id === "near") {
      const end = Math.min(
        layer.fieldSizeMeters / 2 - 2,
        tuning.distance.flowerActiveRadiusMeters,
      );
      uniforms.fadeOut.value.set(Math.max(10, end - 14), end);
    } else if (layer.id === "middle") {
      const nearLayer = COTTAGE_GARDEN_FLOWER_LAYERS.find(
        (candidate) => candidate.id === "near",
      );
      if (!nearLayer) return;
      const nearEnd = Math.min(
        nearLayer.fieldSizeMeters / 2 - 2,
        tuning.distance.flowerActiveRadiusMeters,
      );
      uniforms.fadeIn.value.set(Math.max(10, nearEnd - 14), nearEnd);
      uniforms.fadeOut.value.set(
        tuning.distance.farFlowerBlendStartMeters,
        tuning.distance.farFlowerBlendEndMeters,
      );
    } else if (layer.id === "far-silhouette") {
      uniforms.fadeIn.value.set(
        tuning.distance.farFlowerBlendStartMeters + 8,
        tuning.distance.farFlowerBlendEndMeters,
      );
      uniforms.fadeOut.value.set(
        tuning.distance.farFlowerBlendEndMeters + 6,
        tuning.distance.farFlowerBlendEndMeters + 20,
      );
    }
  }, [layer, species, tuning, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      name={`meadow.${layer.domain}.${layer.id}.${species}`}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      receiveShadow={layer.geometryDetail === "individual"}
      userData={{
        semanticRole:
          layer.domain === "courtyard"
            ? "courtyard-resident-wildflower-batch"
            : "outer-lawn-wildflower-batch",
        species,
        layerId: layer.id,
        domain: layer.domain,
        cameraWrapped: layer.cameraWrapped,
        geometryDetail: layer.geometryDetail,
        instanceCount: geometry.instanceCount,
        updateMode: COTTAGE_GARDEN_WILDFLOWER_MEADOW.updateMode,
        instanceUploadBytesPerFrame:
          COTTAGE_GARDEN_WILDFLOWER_MEADOW.instanceUploadBytesPerFrame,
      }}
    />
  );
}

export function CottageGardenWildflowerMeadow({
  tuning,
  terrainMap,
  habitatMap,
  localCoverageMap,
}: {
  tuning: CottageGardenTuning;
  terrainMap: DataTexture;
  habitatMap: DataTexture;
  localCoverageMap: DataTexture;
}) {
  const runtime = useMemo<MeadowRuntimeUniforms>(
    () => ({
      cameraXZ: { value: new Vector2() },
      time: { value: 0 },
    }),
    [],
  );
  const totalFlowerInstances = useMemo(
    () =>
      COTTAGE_GARDEN_FLOWER_LAYERS.reduce(
        (total, layer) =>
          total +
          resolveCottageGardenFlowerLayerInstanceCount(layer) *
            WILDFLOWER_SPECIES_IDS.length,
        0,
      ),
    [],
  );

  useFrame(({ camera, clock }) => {
    runtime.cameraXZ.value.set(camera.position.x, camera.position.z);
    runtime.time.value = clock.elapsedTime;
  });

  return (
    <group
      name={COTTAGE_GARDEN_WILDFLOWER_MEADOW.lodObjectName}
      userData={{
        semanticRole: "cottage-courtyard-and-outer-wildflower-system",
        flowerCount: totalFlowerInstances,
        coverage: COTTAGE_GARDEN_WILDFLOWER_MEADOW.coverage,
        updateMode: COTTAGE_GARDEN_WILDFLOWER_MEADOW.updateMode,
        instanceUploadBytesPerFrame:
          COTTAGE_GARDEN_WILDFLOWER_MEADOW.instanceUploadBytesPerFrame,
        geometryBatchCount:
          COTTAGE_GARDEN_WILDFLOWER_MEADOW.geometryBatches.grass +
          COTTAGE_GARDEN_WILDFLOWER_MEADOW.geometryBatches.flowers,
      }}
    >
      <CottageGardenGpuGrass
        tuning={tuning}
        terrainMap={terrainMap}
        habitatMap={habitatMap}
        localCoverageMap={localCoverageMap}
      />
      {COTTAGE_GARDEN_FLOWER_LAYERS.flatMap((layer) =>
        WILDFLOWER_SPECIES_IDS.map((species) => (
          <GardenFlowerLayer
            key={`${layer.id}-${species}`}
            layer={layer}
            species={species}
            terrainMap={terrainMap}
            habitatMap={habitatMap}
            localCoverageMap={localCoverageMap}
            runtime={runtime}
            tuning={tuning}
          />
        )),
      )}
    </group>
  );
}
