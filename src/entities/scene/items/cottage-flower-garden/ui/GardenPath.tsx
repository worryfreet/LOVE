import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  StaticDrawUsage,
  type Texture,
  Vector3,
} from "three";
import {
  COTTAGE_GARDEN_FIELDSTONE_PATH,
  type GardenFieldstoneOccurrence,
} from "../model/gardenPath";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "../model/gardenLayout";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import { sampleCottageFlowerGardenTerrainHeight } from "../model/gardenTerrain";
import { useGardenFlagstoneTexture } from "./gardenTextures";

const FIELDSTONE_SHADER_KEY = "cottage-textured-fieldstone-v4-raised";

function createFieldstoneGeometry(variant: number) {
  const radialSegments = 20;
  const positions: number[] = [];
  const indices: number[] = [];
  const ringCount = 3;
  // 三层超椭圆环从侧壁过渡到拱顶，第一人称近看能读出凸起侧壁而非平片。
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const angle = (segment / radialSegments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const squareness = 0.58;
    const outlineX = Math.sign(cosine) * Math.abs(cosine) ** squareness;
    const outlineZ = Math.sign(sine) * Math.abs(sine) ** squareness;
    const seed =
      (((segment + 1) * 17_171 + (variant + 3) * 13_337) % 9_973) /
      9_973;
    const edgeNoise =
      (seed - 0.5) * 0.09 +
      Math.sin(angle * (3 + (variant % 3)) + variant * 0.71) * 0.026;
    const edgeX = outlineX * (0.96 + edgeNoise);
    const edgeZ = outlineZ * (0.96 + edgeNoise * 0.7);
    positions.push(edgeX * 0.94, 0, edgeZ * 0.94);
    positions.push(
      edgeX,
      0.58 + Math.sin(angle * 3 + variant) * 0.018,
      edgeZ,
    );
    positions.push(
      edgeX * 0.63,
      0.92 + Math.sin(angle * 2 + variant * 0.7) * 0.014,
      edgeZ * 0.63,
    );
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, 0, 0);
  const topCenter = positions.length / 3;
  positions.push(0, 1, 0);

  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    const bottom = segment * ringCount;
    const shoulder = bottom + 1;
    const crown = bottom + 2;
    const nextBottom = next * ringCount;
    const nextShoulder = nextBottom + 1;
    const nextCrown = nextBottom + 2;
    indices.push(bottomCenter, nextBottom, bottom);
    indices.push(
      bottom,
      nextBottom,
      nextShoulder,
      bottom,
      nextShoulder,
      shoulder,
    );
    indices.push(
      shoulder,
      nextCrown,
      nextShoulder,
      shoulder,
      crown,
      nextCrown,
    );
    // 顶面保持朝 +Y 的逆时针绕序，第一人称俯看时必须完整可见。
    indices.push(crown, topCenter, nextCrown);
  }

  const geometry = new BufferGeometry();
  const uvs = new Float32Array((positions.length / 3) * 2);
  const quarterTurns = variant % 4;
  const mirrored = variant >= 4;
  for (let vertex = 0; vertex < positions.length / 3; vertex += 1) {
    let u = positions[vertex * 3] * 0.48 + 0.5;
    let v = positions[vertex * 3 + 2] * 0.48 + 0.5;
    for (let turn = 0; turn < quarterTurns; turn += 1) {
      [u, v] = [1 - v, u];
    }
    uvs[vertex * 2] = mirrored ? 1 - u : u;
    uvs[vertex * 2 + 1] = v;
  }
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = `route.fieldstone.variant-${variant}`;
  return geometry;
}

function createFieldstoneMaterial(roughness: number, albedo: Texture) {
  const material = new MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness,
    metalness: 0,
    map: albedo,
    bumpMap: albedo,
    bumpScale: 0.018,
    emissive: "#ffffff",
    emissiveMap: albedo,
    // 主路在屋檐阴影和黄昏仍保持参考图的浅石色，不被压成黑色横条。
    emissiveIntensity: 0.68,
  });
  material.name = "material.fieldstone";
  material.customProgramCacheKey = () => FIELDSTONE_SHADER_KEY;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vStoneLocalPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvStoneLocalPosition = transformed;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying vec3 vStoneLocalPosition;",
          "float stoneHash(vec2 point) {",
          "  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);",
          "}",
        ].join("\n"),
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        [
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "float stoneGrain = stoneHash(floor(vStoneLocalPosition.xz * 12.0));",
          "diffuseColor.rgb *= mix(0.975, 1.025, stoneGrain);",
        ].join("\n"),
      )
      .replace(
        "#include <roughnessmap_fragment>",
        [
          "#include <roughnessmap_fragment>",
          "roughnessFactor = clamp(roughnessFactor + (stoneHash(floor(vStoneLocalPosition.xz * 31.0 + 17.0)) - 0.5) * 0.025, 0.72, 1.0);",
        ].join("\n"),
      )
      .replace(
        "#include <normal_fragment_maps>",
        [
          "#include <normal_fragment_maps>",
          "float stoneBumpX = stoneHash(floor(vStoneLocalPosition.xz * 24.0 + 5.0)) - 0.5;",
          "float stoneBumpZ = stoneHash(floor(vStoneLocalPosition.zx * 29.0 + 19.0)) - 0.5;",
          "normal = normalize(normal + vec3(stoneBumpX * 0.035, 0.0, stoneBumpZ * 0.035));",
        ].join("\n"),
      );
  };
  return material;
}

function stoneColor(colorMix: number, coolColor: string, warmColor: string) {
  const selectedColor = new Color(coolColor)
    .lerp(new Color(warmColor), colorMix)
    .offsetHSL(0, 0, (colorMix - 0.5) * 0.012);
  // 生成贴图本身承担主色，编辑器颜色只做克制染色，避免两次相乘后变暗。
  return new Color("#ffffff").lerp(selectedColor, 0.28);
}

function FieldstoneBatch({
  variant,
  occurrences,
  material,
  coolColor,
  warmColor,
}: {
  variant: GardenFieldstoneOccurrence["variant"];
  occurrences: readonly GardenFieldstoneOccurrence[];
  material: MeshStandardMaterial;
  coolColor: string;
  warmColor: string;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => createFieldstoneGeometry(variant), [variant]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    const euler = new Euler();
    occurrences.forEach((occurrence, index) => {
      position.set(
        occurrence.position[0],
        sampleCottageFlowerGardenTerrainHeight(
          occurrence.position[0],
          occurrence.position[2],
        ) + occurrence.position[1],
        occurrence.position[2],
      );
      euler.set(occurrence.tiltX, occurrence.rotationY, occurrence.tiltZ);
      rotation.setFromEuler(euler);
      scale.set(occurrence.radiusX, occurrence.height, occurrence.radiusZ);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(
        index,
        stoneColor(occurrence.colorMix, coolColor, warmColor),
      );
    });
    mesh.instanceMatrix.setUsage(StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.setUsage(StaticDrawUsage);
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [coolColor, occurrences, warmColor]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <instancedMesh
      ref={meshRef}
      name={`route.fieldstone.variant-${variant}`}
      args={[geometry, material, occurrences.length]}
      frustumCulled={false}
      userData={{
        semanticId: `route.fieldstone.variant-${variant}`,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
      }}
    />
  );
}

export function CottageGardenPath({
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
}: {
  tuning?: CottageGardenTuning;
}) {
  const { mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const flagstoneAlbedo = useGardenFlagstoneTexture();
  const material = useMemo(
    () =>
      createFieldstoneMaterial(
        tuning.structures.pathStoneRoughness,
        flagstoneAlbedo,
      ),
    [flagstoneAlbedo, tuning.structures.pathStoneRoughness],
  );
  const batches = useMemo(
    () =>
      ([0, 1, 2, 3, 4, 5, 6, 7] as const).map((variant) => ({
        variant,
        occurrences: COTTAGE_GARDEN_FIELDSTONE_PATH.stones.filter(
          (stone) => stone.variant === variant,
        ),
      })),
    [],
  );

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  return (
    <group
      name="route.main-path"
      userData={{
        semanticId: "route.main-path",
        widthMeters: mainPath.width,
        lengthMeters: mainPath.length,
        stoneCount: COTTAGE_GARDEN_FIELDSTONE_PATH.stones.length,
        jointSurface: "field.path-surface-blend",
        firstInteractiveFrameResident: true,
        seed: COTTAGE_GARDEN_FIELDSTONE_PATH.seed,
      }}
    >
      {batches.map((batch) => (
        <FieldstoneBatch
          key={batch.variant}
          variant={batch.variant}
          occurrences={batch.occurrences}
          material={material}
          coolColor={tuning.structures.pathStoneColor}
          warmColor={tuning.structures.pathStoneWarmColor}
        />
      ))}
    </group>
  );
}
