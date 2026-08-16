import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { createMeadowGrassClumpGeometry } from "@/entities/model";
import { COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD } from "../model/gardenMeadowHabitat";
import {
  Box3,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import {
  COTTAGE_GARDEN_GRASS_LAYERS,
  COTTAGE_GARDEN_GRASS_TERRAIN_MAP,
  COTTAGE_GARDEN_MEADOW_GREEN_PALETTE,
  createCottageGardenGrassInstanceData,
  resolveCottageGardenGrassLayerInstanceCount,
  type CottageGardenGrassLayerSpec,
} from "../model/gardenMeadowGrass";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "../model/gardenLayout";

const GRASS_SOURCE_HEIGHT_METERS = 0.0505;
const GRASS_INSTANCE_CAPACITY_MULTIPLIER = 1.5;

interface GrassShaderUniforms {
  cameraXZ: { value: Vector2 };
  time: { value: number };
  terrainMap: { value: DataTexture };
  habitatMap: { value: DataTexture };
  localCoverageMap: { value: DataTexture };
  localCoverageMinimum: { value: number };
  localCoverageMaximum: { value: number };
  terrainMinimum: { value: number };
  terrainMaximum: { value: number };
  fieldSize: { value: number };
  cameraWrapped: { value: number };
  distanceFade: { value: number };
  courtyardLayer: { value: number };
  fadeIn: { value: Vector2 };
  fadeOut: { value: Vector2 };
  baseHeightRange: { value: Vector2 };
  targetHeightRange: { value: Vector2 };
  widthMultiplier: { value: number };
  windDirection: { value: Vector2 };
  windStrength: { value: number };
  windSpeed: { value: number };
  gustStrength: { value: number };
  pathClearance: { value: number };
  bedGrassDensity: { value: number };
}

function applyGrassPalette(
  geometry: BufferGeometry,
  layer: CottageGardenGrassLayerSpec,
  tuning: CottageGardenTuning,
) {
  const sourcePositions = geometry.getAttribute("position");
  const sourceColors = geometry.getAttribute("color");
  const palette = {
    shadow: new Color(tuning.palette.grassShadowColor),
    meadow: new Color(tuning.palette.grassColor),
    blade: new Color(tuning.palette.grassTipColor),
  };
  for (let index = 0; index < sourceColors.count; index += 1) {
    const heightProgress = Math.min(
      1,
      Math.max(0, sourcePositions.getY(index) / 0.0505),
    );
    const color =
      layer.id === "middle"
        ? palette.meadow
        : heightProgress < 0.28
          ? palette.shadow
          : heightProgress < 0.76
            ? palette.meadow
            : palette.blade;
    sourceColors.setXYZ(index, color.r, color.g, color.b);
  }
  sourceColors.needsUpdate = true;
}

function createGrassGeometry(
  layer: CottageGardenGrassLayerSpec,
  tuning: CottageGardenTuning,
) {
  const source = createMeadowGrassClumpGeometry("field");
  applyGrassPalette(source, layer, tuning);
  const capacityLayer: CottageGardenGrassLayerSpec = {
    ...layer,
    clumpsPerSquareMeter:
      layer.clumpsPerSquareMeter * GRASS_INSTANCE_CAPACITY_MULTIPLIER,
  };
  const instances = createCottageGardenGrassInstanceData(capacityLayer);
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
  geometry.instanceCount = resolveCottageGardenGrassLayerInstanceCount(layer);
  geometry.boundingBox = new Box3(
    new Vector3(-110, -16, -110),
    new Vector3(110, 16, 110),
  );
  geometry.boundingSphere = new Sphere(new Vector3(), 158);
  geometry.userData = {
    layerId: layer.id,
    instanceCount: geometry.instanceCount,
    capacity: instances.count,
    clumpsPerSquareMeter: layer.clumpsPerSquareMeter,
    bladeCountPerClump: 7,
    geometryDetail: "field",
    greenPalette: Object.values(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE),
  };
  return geometry;
}

function createGrassMaterial(
  layer: CottageGardenGrassLayerSpec,
  uniforms: GrassShaderUniforms,
) {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    side: DoubleSide,
    roughness: 0.92,
    metalness: 0,
    emissive: COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.shadow,
    emissiveIntensity: 0.035,
  });
  material.name = `material.meadow-grass-${layer.id}`;
  material.customProgramCacheKey = () =>
    `cottage-meadow-grass-domain-wrap-v5-fragment-path-clip-${layer.id}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMeadowCameraXZ = uniforms.cameraXZ;
    shader.uniforms.uMeadowTime = uniforms.time;
    shader.uniforms.uMeadowTerrainMap = uniforms.terrainMap;
    shader.uniforms.uMeadowHabitatMap = uniforms.habitatMap;
    shader.uniforms.uMeadowLocalCoverageMap = uniforms.localCoverageMap;
    shader.uniforms.uMeadowLocalCoverageMinimum = uniforms.localCoverageMinimum;
    shader.uniforms.uMeadowLocalCoverageMaximum = uniforms.localCoverageMaximum;
    shader.uniforms.uMeadowTerrainMinimum = uniforms.terrainMinimum;
    shader.uniforms.uMeadowTerrainMaximum = uniforms.terrainMaximum;
    shader.uniforms.uMeadowFieldSize = uniforms.fieldSize;
    shader.uniforms.uMeadowCameraWrapped = uniforms.cameraWrapped;
    shader.uniforms.uMeadowDistanceFade = uniforms.distanceFade;
    shader.uniforms.uMeadowCourtyardLayer = uniforms.courtyardLayer;
    shader.uniforms.uMeadowFadeIn = uniforms.fadeIn;
    shader.uniforms.uMeadowFadeOut = uniforms.fadeOut;
    shader.uniforms.uMeadowBaseHeightRange = uniforms.baseHeightRange;
    shader.uniforms.uMeadowTargetHeightRange = uniforms.targetHeightRange;
    shader.uniforms.uMeadowWidthMultiplier = uniforms.widthMultiplier;
    shader.uniforms.uMeadowWindDirection = uniforms.windDirection;
    shader.uniforms.uMeadowWindStrength = uniforms.windStrength;
    shader.uniforms.uMeadowWindSpeed = uniforms.windSpeed;
    shader.uniforms.uMeadowGustStrength = uniforms.gustStrength;
    shader.uniforms.uMeadowPathClearance = uniforms.pathClearance;
    shader.uniforms.uMeadowBedGrassDensity = uniforms.bedGrassDensity;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "attribute vec2 meadowRoot;",
          "attribute vec4 meadowShape;",
          "uniform vec2 uMeadowCameraXZ;",
          "uniform float uMeadowTime;",
          "uniform sampler2D uMeadowTerrainMap;",
          "uniform sampler2D uMeadowHabitatMap;",
          "uniform sampler2D uMeadowLocalCoverageMap;",
          "uniform float uMeadowLocalCoverageMinimum;",
          "uniform float uMeadowLocalCoverageMaximum;",
          "uniform float uMeadowTerrainMinimum;",
          "uniform float uMeadowTerrainMaximum;",
          "uniform float uMeadowFieldSize;",
          "uniform float uMeadowCameraWrapped;",
          "uniform float uMeadowDistanceFade;",
          "uniform float uMeadowCourtyardLayer;",
          "uniform vec2 uMeadowFadeIn;",
          "uniform vec2 uMeadowFadeOut;",
          "uniform vec2 uMeadowBaseHeightRange;",
          "uniform vec2 uMeadowTargetHeightRange;",
          "uniform float uMeadowWidthMultiplier;",
          "uniform vec2 uMeadowWindDirection;",
          "uniform float uMeadowWindStrength;",
          "uniform float uMeadowWindSpeed;",
          "uniform float uMeadowGustStrength;",
          "uniform float uMeadowPathClearance;",
          "uniform float uMeadowBedGrassDensity;",
          "varying vec2 vMeadowWorldRoot;",
          "float meadowSmooth(float a, float b, float value) {",
          "  if (abs(b - a) < 0.0001) return value >= b ? 1.0 : 0.0;",
          "  float p = clamp((value - a) / (b - a), 0.0, 1.0);",
          "  return p * p * (3.0 - 2.0 * p);",
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
          "float meadowTerrainSpan = uMeadowTerrainMaximum - uMeadowTerrainMinimum;",
          "vec2 meadowTerrainUv = clamp((meadowWorldRoot - uMeadowTerrainMinimum) / meadowTerrainSpan, 0.0, 1.0);",
          "vec4 meadowHabitat = texture2D(uMeadowHabitatMap, meadowTerrainUv);",
          "float meadowLocalSpan = uMeadowLocalCoverageMaximum - uMeadowLocalCoverageMinimum;",
          "vec2 meadowLocalUv = clamp((meadowWorldRoot - uMeadowLocalCoverageMinimum) / meadowLocalSpan, 0.0, 1.0);",
          "float meadowInsideLocal = step(uMeadowLocalCoverageMinimum, meadowWorldRoot.x) * step(meadowWorldRoot.x, uMeadowLocalCoverageMaximum) * step(uMeadowLocalCoverageMinimum, meadowWorldRoot.y) * step(meadowWorldRoot.y, uMeadowLocalCoverageMaximum);",
          "vec4 meadowLocalSample = texture2D(uMeadowLocalCoverageMap, meadowLocalUv);",
          "meadowHabitat.r = mix(meadowHabitat.r, meadowLocalSample.r, meadowInsideLocal);",
          "float meadowCourtyard = meadowLocalSample.g * meadowInsideLocal;",
          "float meadowGardenBed = meadowLocalSample.b * meadowInsideLocal;",
          "float meadowDomain = mix(1.0 - meadowCourtyard, meadowCourtyard, uMeadowCourtyardLayer);",
          `float meadowPathInsideX = 1.0 - step(${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.width / 2).toFixed(3)} + uMeadowPathClearance, abs(meadowWorldRoot.x - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerX.toFixed(3)}));`,
          `float meadowPathInsideZ = 1.0 - step(${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.length / 2).toFixed(3)} + uMeadowPathClearance, abs(meadowWorldRoot.y - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerZ.toFixed(3)}));`,
          "float meadowPathOutside = 1.0 - meadowPathInsideX * meadowPathInsideZ;",
          "float meadowBedDensity = mix(1.0, uMeadowBedGrassDensity, meadowGardenBed * uMeadowCourtyardLayer);",
          "float meadowProbability = meadowDistanceVisibility * meadowDomain * meadowHabitat.r * mix(0.72, 1.12, meadowHabitat.g) * meadowPathOutside * meadowBedDensity;",
          "float meadowRandom = fract(sin(meadowShape.w * 71.93 + meadowWorldRoot.x * 19.17 + meadowWorldRoot.y * 37.31) * 43758.5453);",
          "float meadowVisibility = smoothstep(meadowRandom - 0.16, meadowRandom + 0.16, meadowProbability);",
          "float meadowHardVisibility = step(0.001, meadowDistanceVisibility) * step(0.001, meadowDomain) * step(0.001, meadowHabitat.r) * meadowPathOutside;",
          "meadowVisibility *= meadowHardVisibility;",
          "float meadowProgress = clamp(position.y / 0.052, 0.0, 1.0);",
          "float meadowShapeHeightNoise = clamp((meadowShape.y - uMeadowBaseHeightRange.x) / max(0.0001, uMeadowBaseHeightRange.y - uMeadowBaseHeightRange.x), 0.0, 1.0);",
          "float meadowHeightNoise = mix(meadowShapeHeightNoise, meadowHabitat.a, 0.28);",
          "float meadowHeightScale = mix(uMeadowTargetHeightRange.x, uMeadowTargetHeightRange.y, meadowHeightNoise);",
          "meadowHeightScale = mix(meadowHeightScale, min(meadowHeightScale, 1.08), meadowGardenBed * uMeadowCourtyardLayer);",
          "transformed.xz *= meadowShape.z * uMeadowWidthMultiplier;",
          "transformed.y *= meadowHeightScale;",
          "transformed.xz = mat2(meadowCosine, -meadowSine, meadowSine, meadowCosine) * transformed.xz;",
          "float meadowGust = sin(uMeadowTime * (1.08 * uMeadowWindSpeed) + meadowShape.w + dot(meadowWorldRoot, vec2(0.18, 0.11))) * 0.64 + sin(uMeadowTime * (0.43 * uMeadowWindSpeed) + meadowShape.w * 1.7) * 0.36 * uMeadowGustStrength;",
          "vec2 meadowNaturalLean = vec2(cos(meadowShape.w), sin(meadowShape.w)) * 0.017;",
          "transformed.xz += (meadowNaturalLean + uMeadowWindDirection * meadowGust * 0.014 * uMeadowWindStrength) * meadowProgress * meadowProgress;",
          "transformed *= meadowVisibility;",
          "float meadowTerrainHeight = texture2D(uMeadowTerrainMap, meadowTerrainUv).r;",
          "transformed.xz += meadowWorldRoot;",
          "transformed.y += meadowTerrainHeight + 0.004;",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform float uMeadowPathClearance;",
          "varying vec2 vMeadowWorldRoot;",
        ].join("\n"),
      )
      .replace(
        "#include <clipping_planes_fragment>",
        [
          "#include <clipping_planes_fragment>",
          `if (abs(vMeadowWorldRoot.x - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerX.toFixed(3)}) <= ${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.width / 2).toFixed(3)} + uMeadowPathClearance && abs(vMeadowWorldRoot.y - ${COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.centerZ.toFixed(3)}) <= ${(COTTAGE_FLOWER_GARDEN_LAYOUT.mainPath.length / 2).toFixed(3)} + uMeadowPathClearance) discard;`,
        ].join("\n"),
      );
  };
  return material;
}

function MeadowGrassLayer({
  layer,
  terrainMap,
  habitatMap,
  localCoverageMap,
  tuning,
}: {
  layer: CottageGardenGrassLayerSpec;
  terrainMap: DataTexture;
  habitatMap: DataTexture;
  localCoverageMap: DataTexture;
  tuning: CottageGardenTuning;
}) {
  const meshRef = useRef<Mesh>(null);
  const uniforms = useMemo<GrassShaderUniforms>(
    () => ({
      cameraXZ: { value: new Vector2() },
      time: { value: 0 },
      terrainMap: { value: terrainMap },
      habitatMap: { value: habitatMap },
      localCoverageMap: { value: localCoverageMap },
      localCoverageMinimum: {
        value: COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.minimumMeters,
      },
      localCoverageMaximum: {
        value: COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD.maximumMeters,
      },
      terrainMinimum: {
        value: COTTAGE_GARDEN_GRASS_TERRAIN_MAP.minimumMeters,
      },
      terrainMaximum: {
        value: COTTAGE_GARDEN_GRASS_TERRAIN_MAP.maximumMeters,
      },
      fieldSize: { value: layer.fieldSizeMeters },
      cameraWrapped: { value: layer.cameraWrapped ? 1 : 0 },
      distanceFade: { value: layer.distanceFade ? 1 : 0 },
      courtyardLayer: { value: layer.domain === "courtyard" ? 1 : 0 },
      fadeIn: { value: new Vector2(...layer.fadeInMeters) },
      fadeOut: { value: new Vector2(...layer.fadeOutMeters) },
      baseHeightRange: { value: new Vector2(...layer.heightScale) },
      targetHeightRange: { value: new Vector2(...layer.heightScale) },
      widthMultiplier: { value: 1 },
      windDirection: { value: new Vector2(0.92, 0.39).normalize() },
      windStrength: { value: 1 },
      windSpeed: { value: 1 },
      gustStrength: { value: 1 },
      pathClearance: {
        value: COTTAGE_GARDEN_TUNING_DEFAULTS.garden.pathClearanceMeters,
      },
      bedGrassDensity: {
        value: COTTAGE_GARDEN_TUNING_DEFAULTS.garden.bedGrassDensity,
      },
    }),
    [habitatMap, layer, localCoverageMap, terrainMap],
  );
  const geometry = useMemo(
    () => createGrassGeometry(layer, COTTAGE_GARDEN_TUNING_DEFAULTS),
    [layer],
  );
  const material = useMemo(
    () => createGrassMaterial(layer, uniforms),
    [layer, uniforms],
  );

  useEffect(() => {
    const layerTuning = tuning.grass[layer.tuningLayer];
    uniforms.targetHeightRange.value.set(
      layerTuning.heightMinMeters / GRASS_SOURCE_HEIGHT_METERS,
      layerTuning.heightMaxMeters / GRASS_SOURCE_HEIGHT_METERS,
    );
    uniforms.widthMultiplier.value = layerTuning.widthMultiplier;
    const direction = (tuning.grass.windDirectionDegrees * Math.PI) / 180;
    uniforms.windDirection.value.set(Math.cos(direction), Math.sin(direction));
    uniforms.windStrength.value = tuning.grass.windStrength;
    uniforms.windSpeed.value = tuning.grass.windSpeed;
    uniforms.gustStrength.value = tuning.grass.gustStrength;
    uniforms.pathClearance.value = tuning.garden.pathClearanceMeters;
    uniforms.bedGrassDensity.value = tuning.garden.bedGrassDensity;
    const fadeOut =
      layer.id === "near"
        ? [
            tuning.distance.nearGrassFadeStartMeters,
            tuning.distance.nearGrassFadeEndMeters,
          ]
        : layer.id === "middle"
          ? [
              tuning.distance.middleGrassFadeStartMeters,
              tuning.distance.middleGrassFadeEndMeters,
            ]
          : layer.fadeOutMeters;
    uniforms.fadeOut.value.set(fadeOut[0], fadeOut[1]);
    const capacity = geometry.getAttribute("meadowRoot").count;
    geometry.instanceCount = Math.min(
      capacity,
      Math.round(
        resolveCottageGardenGrassLayerInstanceCount(layer) *
          layerTuning.density,
      ),
    );
    applyGrassPalette(geometry, layer, tuning);
    material.emissive.set(tuning.palette.grassShadowColor);
  }, [geometry, layer, material, tuning, uniforms]);

  useFrame(({ camera, clock }) => {
    uniforms.cameraXZ.value.set(camera.position.x, camera.position.z);
    uniforms.time.value = clock.elapsedTime;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      ref={meshRef}
      name={`meadow.${layer.domain}.grass-${layer.id}`}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      receiveShadow={layer.id !== "middle"}
      userData={{
        semanticRole:
          layer.domain === "courtyard"
            ? "courtyard-resident-grass"
            : "outer-lawn-camera-wrapped-grass",
        layerId: layer.id,
        domain: layer.domain,
        cameraWrapped: layer.cameraWrapped,
        instanceCount: geometry.instanceCount,
        clumpsPerSquareMeter: layer.clumpsPerSquareMeter,
        updateMode: "camera-uniform-only",
      }}
    />
  );
}

export function CottageGardenGpuGrass({
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
  return (
    <group name="meadow.gpu-grass-field">
      {COTTAGE_GARDEN_GRASS_LAYERS.map((layer) => (
        <MeadowGrassLayer
          key={layer.id}
          layer={layer}
          terrainMap={terrainMap}
          habitatMap={habitatMap}
          localCoverageMap={localCoverageMap}
          tuning={tuning}
        />
      ))}
    </group>
  );
}
