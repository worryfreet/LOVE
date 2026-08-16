import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  Vector2,
  type Texture,
} from "three";
import {
  COTTAGE_GARDEN_MEADOW_FIELD,
  COTTAGE_GARDEN_MEADOW_LOCAL_COVERAGE_FIELD,
} from "../model/gardenMeadowHabitat";
import {
  COTTAGE_GARDEN_FAR_MEADOW_PROFILE,
  COTTAGE_FLOWER_GARDEN_NATURE,
  createCottageGardenTerrainMeshData,
} from "../model/gardenTerrain";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import { useGardenGrassTextures } from "./gardenTextures";

interface TurfShaderUniforms {
  groundShadowColor: { value: Color };
  groundColor: { value: Color };
  grassTipColor: { value: Color };
  pathSurfaceColor: { value: Color };
  farMeadowTintColor: { value: Color };
  farMeadowTintStrength: { value: number };
  habitatMap: { value: Texture };
  localCoverageMap: { value: Texture };
  localCoverageMinimum: { value: number };
  localCoverageMaximum: { value: number };
  fieldMinimum: { value: number };
  fieldMaximum: { value: number };
  farFlowerStrength: { value: number };
  farFlowerDensity: { value: number };
  farFlowerScale: { value: number };
  farFlowerBlend: { value: Vector2 };
  aggregateFlowerBlend: { value: Vector2 };
  daisyPrimary: { value: Color };
  daisySecondary: { value: Color };
  daisyAccent: { value: Color };
  cosmosPrimary: { value: Color };
  cosmosSecondary: { value: Color };
  cosmosAccent: { value: Color };
  cornflowerPrimary: { value: Color };
  cornflowerSecondary: { value: Color };
  cornflowerAccent: { value: Color };
}

function createTerrainGeometry() {
  const data = createCottageGardenTerrainMeshData();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = "terrain.ground-mesh.geometry";
  return geometry;
}

function createTurfSurfaceMaterial(
  albedoMap: Texture,
  roughnessMap: Texture,
  uniforms: TurfShaderUniforms,
) {
  const { surface } = COTTAGE_FLOWER_GARDEN_NATURE;
  const material = new MeshStandardMaterial({
    color: COTTAGE_GARDEN_TUNING_DEFAULTS.palette.groundColor,
    map: albedoMap,
    roughness: 0.98,
    metalness: 0,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale: surface.normalStrength,
    emissive: "#193a1b",
    emissiveIntensity: 0.025,
  });
  material.name = "material.clipped-turf-surface";
  material.customProgramCacheKey = () =>
    "garden-clipped-turf-v12-path-soft-blend";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTurfGroundShadowColor = uniforms.groundShadowColor;
    shader.uniforms.uTurfGroundColor = uniforms.groundColor;
    shader.uniforms.uTurfGrassTipColor = uniforms.grassTipColor;
    shader.uniforms.uTurfPathSurfaceColor = uniforms.pathSurfaceColor;
    shader.uniforms.uTurfFarMeadowTintColor = uniforms.farMeadowTintColor;
    shader.uniforms.uTurfFarMeadowTintStrength = uniforms.farMeadowTintStrength;
    shader.uniforms.uTurfHabitatMap = uniforms.habitatMap;
    shader.uniforms.uTurfLocalCoverageMap = uniforms.localCoverageMap;
    shader.uniforms.uTurfLocalCoverageMinimum = uniforms.localCoverageMinimum;
    shader.uniforms.uTurfLocalCoverageMaximum = uniforms.localCoverageMaximum;
    shader.uniforms.uTurfFieldMinimum = uniforms.fieldMinimum;
    shader.uniforms.uTurfFieldMaximum = uniforms.fieldMaximum;
    shader.uniforms.uTurfFarFlowerStrength = uniforms.farFlowerStrength;
    shader.uniforms.uTurfFarFlowerDensity = uniforms.farFlowerDensity;
    shader.uniforms.uTurfFarFlowerScale = uniforms.farFlowerScale;
    shader.uniforms.uTurfFarFlowerBlend = uniforms.farFlowerBlend;
    shader.uniforms.uTurfAggregateFlowerBlend = uniforms.aggregateFlowerBlend;
    shader.uniforms.uTurfDaisyPrimary = uniforms.daisyPrimary;
    shader.uniforms.uTurfDaisySecondary = uniforms.daisySecondary;
    shader.uniforms.uTurfDaisyAccent = uniforms.daisyAccent;
    shader.uniforms.uTurfCosmosPrimary = uniforms.cosmosPrimary;
    shader.uniforms.uTurfCosmosSecondary = uniforms.cosmosSecondary;
    shader.uniforms.uTurfCosmosAccent = uniforms.cosmosAccent;
    shader.uniforms.uTurfCornflowerPrimary = uniforms.cornflowerPrimary;
    shader.uniforms.uTurfCornflowerSecondary = uniforms.cornflowerSecondary;
    shader.uniforms.uTurfCornflowerAccent = uniforms.cornflowerAccent;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vTurfWorldPosition;",
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvTurfWorldPosition = worldPosition.xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying vec3 vTurfWorldPosition;",
          "uniform vec3 uTurfGroundShadowColor;",
          "uniform vec3 uTurfGroundColor;",
          "uniform vec3 uTurfGrassTipColor;",
          "uniform vec3 uTurfPathSurfaceColor;",
          "uniform vec3 uTurfFarMeadowTintColor;",
          "uniform float uTurfFarMeadowTintStrength;",
          "uniform sampler2D uTurfHabitatMap;",
          "uniform sampler2D uTurfLocalCoverageMap;",
          "uniform float uTurfLocalCoverageMinimum;",
          "uniform float uTurfLocalCoverageMaximum;",
          "uniform float uTurfFieldMinimum;",
          "uniform float uTurfFieldMaximum;",
          "uniform float uTurfFarFlowerStrength;",
          "uniform float uTurfFarFlowerDensity;",
          "uniform float uTurfFarFlowerScale;",
          "uniform vec2 uTurfFarFlowerBlend;",
          "uniform vec2 uTurfAggregateFlowerBlend;",
          "uniform vec3 uTurfDaisyPrimary;",
          "uniform vec3 uTurfDaisySecondary;",
          "uniform vec3 uTurfDaisyAccent;",
          "uniform vec3 uTurfCosmosPrimary;",
          "uniform vec3 uTurfCosmosSecondary;",
          "uniform vec3 uTurfCosmosAccent;",
          "uniform vec3 uTurfCornflowerPrimary;",
          "uniform vec3 uTurfCornflowerSecondary;",
          "uniform vec3 uTurfCornflowerAccent;",
          "float turfHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }",
          "float turfNoise(vec2 p) {",
          "  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);",
          "  return mix(mix(turfHash(i), turfHash(i + vec2(1.0, 0.0)), f.x), mix(turfHash(i + vec2(0.0, 1.0)), turfHash(i + vec2(1.0)), f.x), f.y);",
          "}",
        ].join("\n"),
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          "float viewingDistance = distance(cameraPosition, vTurfWorldPosition);",
          "float fieldSpan = uTurfFieldMaximum - uTurfFieldMinimum;",
          "vec2 fieldUv = clamp((vTurfWorldPosition.xz - uTurfFieldMinimum) / fieldSpan, 0.0, 1.0);",
          "vec4 habitat = texture2D(uTurfHabitatMap, fieldUv);",
          "float localSpan = uTurfLocalCoverageMaximum - uTurfLocalCoverageMinimum;",
          "vec2 localUv = clamp((vTurfWorldPosition.xz - uTurfLocalCoverageMinimum) / localSpan, 0.0, 1.0);",
          "float insideLocal = step(uTurfLocalCoverageMinimum, vTurfWorldPosition.x) * step(vTurfWorldPosition.x, uTurfLocalCoverageMaximum) * step(uTurfLocalCoverageMinimum, vTurfWorldPosition.z) * step(vTurfWorldPosition.z, uTurfLocalCoverageMaximum);",
          "vec4 localSample = texture2D(uTurfLocalCoverageMap, localUv);",
          "habitat.r = mix(habitat.r, localSample.r, insideLocal);",
          "float courtyardMask = localSample.g * insideLocal;",
          "float outerCoverage = habitat.r * (1.0 - courtyardMask);",
          "float groundVariation = turfNoise(vTurfWorldPosition.xz * 0.07 + 37.2);",
          `vec2 macroCoordinates = vTurfWorldPosition.xz * ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.macroFrequency.toFixed(3)};`,
          "vec2 macroWarp = vec2(turfNoise(macroCoordinates * 0.73 + vec2(13.7, 41.3)), turfNoise(macroCoordinates * 0.61 + vec2(-27.1, 8.6))) - 0.5;",
          "float macroVariation = turfNoise(macroCoordinates + macroWarp * 1.35 + vec2(7.3, -19.2));",
          `float mesoVariation = turfNoise(vTurfWorldPosition.xz * ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.mesoFrequency.toFixed(3)} + macroWarp * 2.1 + vec2(-31.7, 22.4));`,
          "float meadowStructure = clamp(habitat.g * 0.52 + macroVariation * 0.32 + mesoVariation * 0.16, 0.0, 1.0);",
          "vec3 mappedTurf = diffuseColor.rgb;",
          "vec3 chromaticGround = mix(uTurfGroundShadowColor, uTurfGroundColor, mix(0.5, 0.84, groundVariation));",
          `vec3 groundBase = mix(chromaticGround, mappedTurf, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.albedoRetention.toFixed(2)});`,
          "float pathSurfaceBlend = localSample.a * insideLocal;",
          "float pathGrain = turfNoise(vTurfWorldPosition.xz * 0.46 + vec2(11.2, -7.8));",
          "vec3 pathSurface = uTurfPathSurfaceColor * mix(0.91, 1.055, pathGrain);",
          "groundBase = mix(groundBase, pathSurface, pathSurfaceBlend * 0.9);",
          "float canopyDistance = smoothstep(14.0, 76.0, viewingDistance);",
          "vec3 canopyHighlight = mix(uTurfGroundColor, uTurfGrassTipColor, 0.06 + meadowStructure * 0.08);",
          "float canopyTone = clamp(0.58 + meadowStructure * 0.22 + (macroVariation - 0.5) * 0.12, 0.5, 0.86);",
          "vec3 canopyGreen = mix(uTurfGroundShadowColor, canopyHighlight, canopyTone);",
          "float canopyStrength = outerCoverage * mix(0.24, 0.64, canopyDistance) * mix(0.72, 1.0, meadowStructure);",
          "diffuseColor.rgb = mix(groundBase, canopyGreen, canopyStrength);",
          "vec3 meadowBase = diffuseColor.rgb;",
          "vec3 daisyColor = mix(uTurfDaisyPrimary, uTurfDaisySecondary, 0.055);",
          "daisyColor = mix(daisyColor, uTurfDaisyAccent, 0.08);",
          "vec3 cosmosColor = mix(uTurfCosmosPrimary, uTurfCosmosSecondary, 0.24);",
          "cosmosColor = mix(cosmosColor, uTurfCosmosAccent, 0.1);",
          "vec3 cornflowerColor = mix(uTurfCornflowerPrimary, uTurfCornflowerSecondary, 0.24);",
          "cornflowerColor = mix(cornflowerColor, uTurfCornflowerAccent, 0.06);",
          "float speciesField = clamp(habitat.b + (mesoVariation - 0.5) * 0.18, 0.0, 1.0);",
          `float speciesWeightFloor = ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.speciesWeightFloor.toFixed(2)};`,
          "float daisyWeight = speciesWeightFloor + (1.0 - smoothstep(0.18, 0.66, speciesField)) * (1.0 - speciesWeightFloor);",
          "float cosmosWeight = speciesWeightFloor + (1.0 - smoothstep(0.12, 0.46, abs(speciesField - 0.5))) * (1.0 - speciesWeightFloor);",
          "float cornflowerWeight = speciesWeightFloor + smoothstep(0.34, 0.82, speciesField) * (1.0 - speciesWeightFloor);",
          "float speciesWeight = max(0.001, daisyWeight + cosmosWeight + cornflowerWeight);",
          "vec3 mixedFlowerColor = (daisyColor * daisyWeight + cosmosColor * cosmosWeight + cornflowerColor * cornflowerWeight) / speciesWeight;",
          "float meadowLuma = dot(meadowBase, vec3(0.2126, 0.7152, 0.0722));",
          "float flowerLuma = max(0.001, dot(mixedFlowerColor, vec3(0.2126, 0.7152, 0.0722)));",
          "mixedFlowerColor *= clamp(meadowLuma / flowerLuma, 0.78, 1.12);",
          `vec3 flowerAggregateColor = mix(meadowBase, mixedFlowerColor, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.speciesTintMix.toFixed(2)});`,
          "float representationBlend = smoothstep(uTurfFarFlowerBlend.x, uTurfFarFlowerBlend.y, viewingDistance);",
          "float aggregateBlend = smoothstep(uTurfAggregateFlowerBlend.x, uTurfAggregateFlowerBlend.y, viewingDistance);",
          "float densityScale = mix(0.86, 1.12, clamp((uTurfFarFlowerScale - 0.55) / 1.25, 0.0, 1.0));",
          "float flowerPatchField = meadowStructure * 0.74 + habitat.a * 0.26;",
          "float flowerMass = outerCoverage * smoothstep(0.32, 0.72, flowerPatchField * uTurfFarFlowerDensity * densityScale);",
          `float chromaRetention = mix(1.0, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.chromaRetentionAtHorizon.toFixed(2)}, smoothstep(${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.chromaFadeStartMeters.toFixed(1)}, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.chromaFadeEndMeters.toFixed(1)}, viewingDistance));`,
          "float aggregateStrength = mix(0.22, 0.42, aggregateBlend) * representationBlend * flowerMass * uTurfFarFlowerStrength * chromaRetention;",
          `diffuseColor.rgb = mix(diffuseColor.rgb, flowerAggregateColor, clamp(aggregateStrength, 0.0, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.maximumAggregateBlend.toFixed(2)}));`,
          `float distanceCompression = smoothstep(${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.contrastCompressionStartMeters.toFixed(1)}, ${COTTAGE_GARDEN_FAR_MEADOW_PROFILE.contrastCompressionEndMeters.toFixed(1)}, viewingDistance);`,
          "float farMeadowTintMix = distanceCompression * uTurfFarMeadowTintStrength;",
          "diffuseColor.rgb = mix(diffuseColor.rgb, uTurfFarMeadowTintColor, farMeadowTintMix);",
        ].join("\n"),
      );
  };
  return material;
}

export function CottageGardenTerrain({
  tuning,
  habitatMap,
  localCoverageMap,
}: {
  tuning: CottageGardenTuning;
  habitatMap: Texture;
  localCoverageMap: Texture;
}) {
  const grass = useGardenGrassTextures();
  const geometry = useMemo(() => createTerrainGeometry(), []);
  const uniforms = useMemo<TurfShaderUniforms>(() => {
    const defaults = COTTAGE_GARDEN_TUNING_DEFAULTS;
    return {
      groundShadowColor: { value: new Color(defaults.palette.grassShadowColor) },
      groundColor: { value: new Color(defaults.palette.groundColor) },
      grassTipColor: { value: new Color(defaults.palette.grassTipColor) },
      pathSurfaceColor: {
        value: new Color(defaults.palette.groundColor).lerp(
          new Color(defaults.palette.grassTipColor),
          0.1,
        ),
      },
      farMeadowTintColor: {
        value: new Color(defaults.terrain.farMeadowTintColor),
      },
      farMeadowTintStrength: {
        value: defaults.terrain.farMeadowTintStrength,
      },
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
      farFlowerStrength: { value: defaults.terrain.farFlowerStrength },
      farFlowerDensity: { value: defaults.terrain.farFlowerDensity },
      farFlowerScale: { value: defaults.terrain.farFlowerScale },
      farFlowerBlend: {
        value: new Vector2(
          defaults.distance.farFlowerBlendStartMeters,
          defaults.distance.farFlowerBlendEndMeters,
        ),
      },
      aggregateFlowerBlend: {
        value: new Vector2(
          defaults.distance.aggregateFlowerStartMeters,
          defaults.distance.aggregateFlowerEndMeters,
        ),
      },
      daisyPrimary: {
        value: new Color(defaults.flowers["wild-daisy"].primaryColor),
      },
      daisySecondary: {
        value: new Color(defaults.flowers["wild-daisy"].secondaryColor),
      },
      daisyAccent: {
        value: new Color(defaults.flowers["wild-daisy"].accentColor),
      },
      cosmosPrimary: {
        value: new Color(defaults.flowers["pink-cosmos"].primaryColor),
      },
      cosmosSecondary: {
        value: new Color(defaults.flowers["pink-cosmos"].secondaryColor),
      },
      cosmosAccent: {
        value: new Color(defaults.flowers["pink-cosmos"].accentColor),
      },
      cornflowerPrimary: {
        value: new Color(defaults.flowers["blue-cornflower"].primaryColor),
      },
      cornflowerSecondary: {
        value: new Color(defaults.flowers["blue-cornflower"].secondaryColor),
      },
      cornflowerAccent: {
        value: new Color(defaults.flowers["blue-cornflower"].accentColor),
      },
    };
  }, [habitatMap, localCoverageMap]);
  const material = useMemo(
    () => createTurfSurfaceMaterial(grass.albedo, grass.roughness, uniforms),
    [grass, uniforms],
  );

  useEffect(() => {
    uniforms.groundShadowColor.value.set(tuning.palette.grassShadowColor);
    uniforms.groundColor.value.set(tuning.palette.groundColor);
    uniforms.grassTipColor.value.set(tuning.palette.grassTipColor);
    uniforms.pathSurfaceColor.value
      .set(tuning.palette.groundColor)
      .lerp(new Color(tuning.palette.grassTipColor), 0.1);
    uniforms.farMeadowTintColor.value.set(tuning.terrain.farMeadowTintColor);
    uniforms.farMeadowTintStrength.value =
      tuning.terrain.farMeadowTintStrength;
    uniforms.farFlowerStrength.value = tuning.terrain.farFlowerStrength;
    uniforms.farFlowerDensity.value = tuning.terrain.farFlowerDensity;
    uniforms.farFlowerScale.value = tuning.terrain.farFlowerScale;
    uniforms.farFlowerBlend.value.set(
      tuning.distance.farFlowerBlendStartMeters,
      tuning.distance.farFlowerBlendEndMeters,
    );
    uniforms.aggregateFlowerBlend.value.set(
      tuning.distance.aggregateFlowerStartMeters,
      tuning.distance.aggregateFlowerEndMeters,
    );
    const daisy = tuning.flowers["wild-daisy"];
    const cosmos = tuning.flowers["pink-cosmos"];
    const cornflower = tuning.flowers["blue-cornflower"];
    uniforms.daisyPrimary.value.set(daisy.primaryColor);
    uniforms.daisySecondary.value.set(daisy.secondaryColor);
    uniforms.daisyAccent.value.set(daisy.accentColor);
    uniforms.cosmosPrimary.value.set(cosmos.primaryColor);
    uniforms.cosmosSecondary.value.set(cosmos.secondaryColor);
    uniforms.cosmosAccent.value.set(cosmos.accentColor);
    uniforms.cornflowerPrimary.value.set(cornflower.primaryColor);
    uniforms.cornflowerSecondary.value.set(cornflower.secondaryColor);
    uniforms.cornflowerAccent.value.set(cornflower.accentColor);
    material.color.set(tuning.palette.groundColor);
    material.roughness = tuning.terrain.roughness;
    material.bumpScale = tuning.terrain.bumpStrength;
  }, [material, tuning, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <group name="terrain.turf-system">
      <mesh
        name="terrain.ground-mesh"
        geometry={geometry}
        material={material}
        receiveShadow
        userData={{
          semanticId: "terrain.ground-mesh",
          widthMeters: COTTAGE_FLOWER_GARDEN_NATURE.terrain.width,
          lengthMeters: COTTAGE_FLOWER_GARDEN_NATURE.terrain.length,
          heightField: "field.elevation",
          habitatField: "field.cottage-meadow-habitat",
          farRepresentation: "mip-filtered-aggregate-color",
          turfRepresentation:
            COTTAGE_FLOWER_GARDEN_NATURE.turf.representation,
          individualBladeGeometry:
            COTTAGE_FLOWER_GARDEN_NATURE.turf.individualBladeGeometry,
        }}
      />
    </group>
  );
}
