import {
  FLOWER_POPULATION_QUALITIES,
  FLOWER_RENDER_QUALITY_PROFILES,
  ROSE_COLOR_PRESETS,
  SUNFLOWER_GROUND_Y,
  SunflowerAssembly,
  configureFlowerWindMaterial,
  createClassicRosePopulationPrototype,
  createFlowerWindUniforms,
  resolveSunflowerParameters,
  updateFlowerWindUniforms,
  type ClassicRosePopulationPrototype,
  type FlowerPopulationQuality,
  type FlowerRenderQuality,
  type FlowerWindUniforms,
  type RoseColorVariantId,
} from "@/entities/model";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DoubleSide,
  InstancedMesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material,
  type Group,
} from "three";
import {
  createCottageGardenPlantPopulation,
  type CottageGardenPlantOccurrence,
} from "../model/gardenPlantingDistribution";
import {
  COTTAGE_GARDEN_FLOWER_LOD,
  resolveGardenFlowerQuality,
} from "../model/gardenFlowerLod";
import type { CottageGardenTuning } from "../model/gardenTuning";
import { sampleCottageFlowerGardenTerrainHeight } from "../model/gardenTerrain";
import {
  configureCottageGardenRoseBloomMaterial,
  createCottageGardenRoseBloomUniforms,
  type CottageGardenRoseBloomUniforms,
} from "../model/gardenRoseBloom";
import type { CottageGardenRomanticSignal } from "../model/gardenRomanticExperience";

type RoseOrganSlot = "petal" | "leaf" | "structure";
type GardenRoseMaterial =
  | MeshLambertMaterial
  | MeshPhysicalMaterial
  | MeshStandardMaterial;
interface DisposableGardenResource {
  dispose(): void;
}

/**
 * React StrictMode 会在开发环境紧接着演练一次 effect 清理与重建。
 * 延后到微任务再判定真实卸载，避免仍在渲染的 GPU 资源被误释放。
 */
function useStrictModeSafeResourceDisposal(
  resources: readonly DisposableGardenResource[],
) {
  const lifetime = useMemo(
    () => ({ activeEffects: 0, disposed: false, resources }),
    [resources],
  );
  useEffect(() => {
    lifetime.activeEffects += 1;
    return () => {
      lifetime.activeEffects -= 1;
      queueMicrotask(() => {
        if (lifetime.activeEffects !== 0 || lifetime.disposed) return;
        lifetime.disposed = true;
        lifetime.resources.forEach((resource) => resource.dispose());
      });
    };
  }, [lifetime]);
}

function createGardenRoseMaterial({
  quality,
  organSlot,
  colorVariantId,
  sourceHeightMeters,
  windUniforms,
  bloomUniforms,
}: {
  quality: FlowerPopulationQuality;
  organSlot: RoseOrganSlot;
  colorVariantId?: RoseColorVariantId;
  sourceHeightMeters: number;
  windUniforms: FlowerWindUniforms;
  bloomUniforms: CottageGardenRoseBloomUniforms;
}) {
  const profile = FLOWER_RENDER_QUALITY_PROFILES[quality];
  const preset = colorVariantId
    ? ROSE_COLOR_PRESETS.find(({ id }) => id === colorVariantId)
    : undefined;
  // 花瓣用模型库亮部色乘以几何内置的层叠明暗，既恢复花心深度与瓣尖受光，
  // 又不把六张独立器官贴图重新带回大规模动态 LOD 路径。
  const commonOptions = {
    color:
      organSlot === "petal" && preset ? preset.palette[0] : "#ffffff",
    vertexColors: true,
    side: DoubleSide,
  };
  const standardOptions = {
    ...commonOptions,
    roughness: organSlot === "petal" ? 0.68 : 0.8,
    metalness: 0,
  };
  const material: GardenRoseMaterial =
    quality === "low"
      ? new MeshLambertMaterial(commonOptions)
      : profile.material === "physical"
      ? new MeshPhysicalMaterial({
          ...standardOptions,
          clearcoat: 0.004,
          clearcoatRoughness: 0.98,
          sheen: organSlot === "petal" ? 0.16 : 0.12,
          sheenRoughness: 0.9,
          sheenColor:
            organSlot === "petal" && preset
              ? preset.palette[1]
              : "#bdd48f",
        })
      : new MeshStandardMaterial(standardOptions);
  material.name = `material.model.classic-rose.population.${quality}.${organSlot}.${colorVariantId ?? "shared"}`;
  material.userData = {
    modelId: "classic-rose",
    source: "model-library-blueprint",
    quality,
    organSlot,
    colorVariantId,
  };
  configureFlowerWindMaterial(material, {
    uniforms: windUniforms,
    sourceHeightMeters,
    wholePlantAmplitude: 0.026,
    petalAmplitude: organSlot === "petal" ? 0.008 : 0,
  });
  if (organSlot === "petal") {
    configureCottageGardenRoseBloomMaterial(
      material,
      bloomUniforms,
      sourceHeightMeters,
    );
  }
  return material;
}

function GardenRoseOrganBatch({
  quality,
  organSlot,
  prototype,
  occurrences,
  capacity,
  colorVariantId,
  windUniforms,
  bloomUniforms,
}: {
  quality: FlowerPopulationQuality;
  organSlot: RoseOrganSlot;
  prototype: ClassicRosePopulationPrototype;
  occurrences: readonly CottageGardenPlantOccurrence[];
  capacity: number;
  colorVariantId?: RoseColorVariantId;
  windUniforms: FlowerWindUniforms;
  bloomUniforms: CottageGardenRoseBloomUniforms;
}) {
  const source =
    organSlot === "petal"
      ? prototype.petalGeometry
      : organSlot === "leaf"
        ? prototype.leafGeometry
        : prototype.structureGeometry;
  const meshRef = useRef<InstancedMesh>(null);
  const material = useMemo(
    () =>
      createGardenRoseMaterial({
        quality,
        organSlot,
        colorVariantId,
        sourceHeightMeters: prototype.sourceHeightMeters,
        windUniforms,
        bloomUniforms,
      }),
    [
      colorVariantId,
      organSlot,
      prototype.sourceHeightMeters,
      quality,
      windUniforms,
      bloomUniforms,
    ],
  );

  const ownedMaterial = useMemo(() => [material], [material]);
  useStrictModeSafeResourceDisposal(ownedMaterial);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new Object3D();
    occurrences.forEach((occurrence, index) => {
      const scale =
        (occurrence.heightMeters /
          Math.max(prototype.sourceHeightMeters, 0.001)) *
        occurrence.scale;
      transform.position.set(
        occurrence.root[0],
        sampleCottageFlowerGardenTerrainHeight(
          occurrence.root[0],
          occurrence.root[1],
        ) + 0.008,
        occurrence.root[1],
      );
      transform.rotation.set(0, occurrence.yaw, 0);
      transform.scale.setScalar(scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.count = occurrences.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [occurrences, prototype.sourceHeightMeters]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[source, material, Math.max(1, capacity)]}
      name={`garden.planting.classic-rose.${quality}.${organSlot}.${colorVariantId ?? "shared"}`}
      material={material as Material}
      frustumCulled
      castShadow={false}
      receiveShadow={quality !== "low"}
      dispose={null}
      userData={{
        semanticRole: "editable-garden-plant-batch",
        speciesId: "classic-rose",
        quality,
        organSlot,
        colorVariantId,
        source: "model-library-blueprint",
        blueprintFingerprint: prototype.blueprintFingerprint,
        instanceCount: occurrences.length,
        updateMode: "configuration-or-lod-instance-repartition-only",
        instanceUploadBytesPerFrame: 0,
        windUpdateMode: "shared-uniform-only",
      }}
    />
  );
}

function GardenRoseQualityBatch({
  quality,
  prototype,
  occurrences,
  capacity,
  windUniforms,
  bloomUniforms,
}: {
  quality: FlowerPopulationQuality;
  prototype: ClassicRosePopulationPrototype;
  occurrences: readonly CottageGardenPlantOccurrence[];
  capacity: number;
  windUniforms: FlowerWindUniforms;
  bloomUniforms: CottageGardenRoseBloomUniforms;
}) {
  const petalsByColor = useMemo(
    () =>
      ROSE_COLOR_PRESETS.map(({ id }) => ({
        colorVariantId: id,
        occurrences: occurrences.filter(
          (occurrence) => occurrence.roseColorVariantId === id,
        ),
      })).filter((batch) => batch.occurrences.length > 0),
    [occurrences],
  );
  return (
    <group name={`garden.planting.classic-rose.${quality}`}>
      <GardenRoseOrganBatch
        quality={quality}
        organSlot="leaf"
        prototype={prototype}
        occurrences={occurrences}
        capacity={capacity}
        windUniforms={windUniforms}
        bloomUniforms={bloomUniforms}
      />
      <GardenRoseOrganBatch
        quality={quality}
        organSlot="structure"
        prototype={prototype}
        occurrences={occurrences}
        capacity={capacity}
        windUniforms={windUniforms}
        bloomUniforms={bloomUniforms}
      />
      {petalsByColor.map(({ colorVariantId, occurrences: colorOccurrences }) => (
        <GardenRoseOrganBatch
          key={colorVariantId}
          quality={quality}
          organSlot="petal"
          prototype={prototype}
          occurrences={colorOccurrences}
          capacity={capacity}
          colorVariantId={colorVariantId}
          windUniforms={windUniforms}
          bloomUniforms={bloomUniforms}
        />
      ))}
    </group>
  );
}

function GardenSunflowerPlant({
  occurrence,
  quality,
  registerPlant,
  windUniforms,
}: {
  occurrence: CottageGardenPlantOccurrence;
  quality: FlowerRenderQuality;
  registerPlant: (id: string, plant: Group | null) => void;
  windUniforms: FlowerWindUniforms;
}) {
  const bloomRef = useRef<Group>(null);
  const parameters = useMemo(
    () =>
      resolveSunflowerParameters({
        renderQuality: quality,
        // 花头、叶片、花盘和材质保持模型库配置，只按场景目标株高换算茎长。
        stemLength: occurrence.heightMeters / Math.max(occurrence.scale, 0.001),
      }),
    [occurrence.heightMeters, occurrence.scale, quality],
  );
  const terrainY = useMemo(
    () =>
      sampleCottageFlowerGardenTerrainHeight(
        occurrence.root[0],
        occurrence.root[1],
      ),
    [occurrence.root],
  );

  return (
    <group
      ref={(plant) => registerPlant(occurrence.id, plant)}
      name={`garden.planting.sunflower.${occurrence.id}`}
      position={[occurrence.root[0], terrainY + 0.008, occurrence.root[1]]}
      rotation={[0, occurrence.yaw, 0]}
      userData={{
        semanticRole: "editable-garden-plant",
        speciesId: "sunflower",
        quality,
        source: "model-library-prototype",
        occurrenceId: occurrence.id,
        stemHeightMeters: occurrence.heightMeters,
      }}
    >
      <group
        position={[0, -SUNFLOWER_GROUND_Y * occurrence.scale, 0]}
        scale={occurrence.scale}
      >
        <SunflowerAssembly
          bloomRef={bloomRef}
          parameters={parameters}
          windUniforms={windUniforms}
        />
      </group>
    </group>
  );
}

function GardenSunflowerQualityBatch({
  quality,
  occurrences,
  registerPlant,
  windUniforms,
}: {
  quality: FlowerRenderQuality;
  occurrences: readonly CottageGardenPlantOccurrence[];
  registerPlant: (id: string, plant: Group | null) => void;
  windUniforms: FlowerWindUniforms;
}) {
  return (
    <group name={`garden.planting.sunflower.${quality}`}>
      {occurrences.map((occurrence) => (
        <GardenSunflowerPlant
          key={occurrence.id}
          occurrence={occurrence}
          quality={quality}
          registerPlant={registerPlant}
          windUniforms={windUniforms}
        />
      ))}
    </group>
  );
}

export function CottageGardenPlanting({
  tuning,
  romanticSignal,
}: {
  tuning: CottageGardenTuning;
  romanticSignal?: CottageGardenRomanticSignal;
}) {
  const population = useMemo(
    () => createCottageGardenPlantPopulation(tuning.garden),
    [tuning.garden],
  );
  const roseOccurrences = useMemo(
    () => population.bySpecies.get("classic-rose") ?? [],
    [population],
  );
  const sunflowerOccurrences = useMemo(
    () => population.bySpecies.get("sunflower") ?? [],
    [population],
  );
  const prototypes = useMemo(
    () =>
      new Map(
        FLOWER_POPULATION_QUALITIES.map((quality) => [
          quality,
          createClassicRosePopulationPrototype(quality),
        ]),
      ),
    [],
  );
  const ownedPopulationResources = useMemo(
    () => [...prototypes.values()],
    [prototypes],
  );
  useStrictModeSafeResourceDisposal(ownedPopulationResources);

  const { camera, size } = useThree();
  const initialQualityById = useMemo(() => {
    const verticalFovDegrees =
      "isPerspectiveCamera" in camera && camera.isPerspectiveCamera
        ? camera.fov
        : 50;
    return new Map(
      roseOccurrences.map((occurrence) => {
        const terrainY = sampleCottageFlowerGardenTerrainHeight(
          occurrence.root[0],
          occurrence.root[1],
        );
        const distanceMeters = camera.position.distanceTo(
          new Vector3(
            occurrence.root[0],
            terrainY + occurrence.heightMeters * 0.5,
            occurrence.root[1],
          ),
        );
        return [
          occurrence.id,
          resolveGardenFlowerQuality("low", {
            distanceMeters,
            sourceHeightMeters: occurrence.heightMeters,
            verticalFovDegrees,
            viewportHeightPixels: size.height,
          }),
        ] as const;
      }),
    );
  }, [camera, roseOccurrences, size.height]);
  const [qualityById, setQualityById] = useState(initialQualityById);
  const qualityByIdRef = useRef(qualityById);
  const lastLodUpdateRef = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    qualityByIdRef.current = initialQualityById;
    setQualityById(initialQualityById);
  }, [initialQualityById]);
  const qualityGroups = useMemo(
    () =>
      FLOWER_POPULATION_QUALITIES.map((quality) => ({
        quality,
        occurrences: roseOccurrences.filter(
          (occurrence) =>
            (qualityById.get(occurrence.id) ?? "low") === quality,
        ),
      })),
    [qualityById, roseOccurrences],
  );
  const sunflowerPlantsRef = useRef(new Map<string, Group>());
  const registerSunflowerPlant = useCallback((id: string, plant: Group | null) => {
    if (plant) sunflowerPlantsRef.current.set(id, plant);
    else sunflowerPlantsRef.current.delete(id);
  }, []);
  const runtimeRef = useRef<FlowerWindUniforms>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = createFlowerWindUniforms({
      directionDegrees: tuning.grass.windDirectionDegrees,
      strength: tuning.grass.windStrength,
      speed: tuning.grass.windSpeed,
      gustStrength: tuning.grass.gustStrength,
    });
  }
  const runtime = runtimeRef.current;
  const bloomRuntimeRef = useRef<CottageGardenRoseBloomUniforms>(null);
  if (!bloomRuntimeRef.current) {
    bloomRuntimeRef.current = createCottageGardenRoseBloomUniforms();
  }
  const bloomRuntime = bloomRuntimeRef.current;

  useEffect(() => {
    updateFlowerWindUniforms(runtime, {
      directionDegrees: tuning.grass.windDirectionDegrees,
      strength: tuning.grass.windStrength,
      speed: tuning.grass.windSpeed,
      gustStrength: tuning.grass.gustStrength,
    });
  }, [runtime, tuning.grass]);

  useFrame(({ clock }) => {
    updateFlowerWindUniforms(runtime, { time: clock.elapsedTime });
    const romanticFrame = romanticSignal?.getFrameSnapshot();
    bloomRuntime.timeSeconds.value = romanticFrame?.timeSeconds ?? 0;
    bloomRuntime.active.value = romanticFrame?.roseStoryActive ? 1 : 0;
    const wind = 0.018 * runtime.strength.value;
    sunflowerOccurrences.forEach((occurrence) => {
      const plant = sunflowerPlantsRef.current.get(occurrence.id);
      if (!plant) return;
      const gust =
        Math.sin(clock.elapsedTime * runtime.speed.value + occurrence.phase) *
          0.72 +
        Math.sin(
          clock.elapsedTime * runtime.speed.value * 0.41 +
            occurrence.phase * 1.7,
        ) *
          0.28 *
          runtime.gustStrength.value;
      plant.rotation.z = gust * wind;
      plant.rotation.x = gust * wind * 0.42;
    });
    if (
      clock.elapsedTime - lastLodUpdateRef.current <
      COTTAGE_GARDEN_FLOWER_LOD.updateIntervalSeconds
    ) {
      return;
    }
    lastLodUpdateRef.current = clock.elapsedTime;
    const verticalFovDegrees =
      "isPerspectiveCamera" in camera && camera.isPerspectiveCamera
        ? camera.fov
        : 50;
    const next = new Map(qualityByIdRef.current);
    let changed = false;
    roseOccurrences.forEach((occurrence) => {
      const terrainY = sampleCottageFlowerGardenTerrainHeight(
        occurrence.root[0],
        occurrence.root[1],
      );
      const distanceMeters = camera.position.distanceTo(
        new Vector3(
          occurrence.root[0],
          terrainY + occurrence.heightMeters * 0.5,
          occurrence.root[1],
        ),
      );
      const previous = next.get(occurrence.id) ?? "low";
      const quality = resolveGardenFlowerQuality(previous, {
        distanceMeters,
        sourceHeightMeters: occurrence.heightMeters,
        verticalFovDegrees,
        viewportHeightPixels: size.height,
      });
      if (quality !== previous) {
        next.set(occurrence.id, quality);
        changed = true;
      }
    });
    if (changed) {
      qualityByIdRef.current = next;
      setQualityById(next);
    }
  });

  return (
    <group
      name="garden.editable-planting"
      userData={{
        semanticRole: "editable-art-directed-garden",
        bedCount: population.bedCount,
        plantCount: population.totalCount,
        speciesCount: population.bySpecies.size,
        distribution: "deterministic-halton-clustered",
        qualityPolicy: "projected-size-with-hysteresis",
        source: "model-library-blueprint",
      }}
    >
      {qualityGroups.map(({ quality, occurrences }) => {
        const prototype = prototypes.get(quality);
        return occurrences.length > 0 && prototype ? (
          <GardenRoseQualityBatch
            key={quality}
            quality={quality}
            prototype={prototype}
            occurrences={occurrences}
            capacity={roseOccurrences.length}
            windUniforms={runtime}
            bloomUniforms={bloomRuntime}
          />
        ) : null;
      })}
      {sunflowerOccurrences.length > 0 && (
        <GardenSunflowerQualityBatch
          quality="low"
          occurrences={sunflowerOccurrences}
          registerPlant={registerSunflowerPlant}
          windUniforms={runtime}
        />
      )}
    </group>
  );
}
