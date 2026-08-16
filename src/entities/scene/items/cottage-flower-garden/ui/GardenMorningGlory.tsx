import {
  createMorningGloryAttachmentGeometry,
  FLOWER_POPULATION_QUALITIES,
  MORNING_GLORY_ATTACHMENT_SOURCE_SIZES,
  type FlowerPopulationQuality,
  type MorningGloryAttachmentKind,
} from "@/entities/model";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  StaticDrawUsage,
  Vector3,
} from "three";
import {
  createCottageGardenMorningGlorySystem,
  type GardenMorningGloryAttachment,
  type GardenVinePath,
} from "../model/gardenMorningGlory";
import {
  COTTAGE_GARDEN_FLOWER_LOD,
  resolveGardenFlowerQuality,
} from "../model/gardenFlowerLod";
import type { CottageGardenTuning } from "../model/gardenTuning";

const VINE_RADIAL_SEGMENTS = 7;

/**
 * 按相邻切线的最小旋转传输截面，避免 Frenet frame 在低曲率与拐点翻转。
 * 每条路径都由同一权威节点生成，LOD 不改端点或语义 ID。
 */
function createVineTubeGeometry(paths: readonly GardenVinePath[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  const dark = new Color("#3f732f");
  const light = new Color("#75a54a");
  const sampledColor = new Color();

  paths.forEach((path, pathIndex) => {
    if (path.nodes.length < 2) return;
    const frameNormal = new Vector3(...path.nodes[0].normal);
    let previousTangent = new Vector3(...path.nodes[0].tangent).normalize();
    frameNormal
      .addScaledVector(previousTangent, -frameNormal.dot(previousTangent))
      .normalize();

    path.nodes.forEach((node, nodeIndex) => {
      const tangent = new Vector3(...node.tangent).normalize();
      if (nodeIndex > 0) {
        frameNormal.applyQuaternion(
          new Quaternion().setFromUnitVectors(previousTangent, tangent),
        );
        frameNormal
          .addScaledVector(tangent, -frameNormal.dot(tangent))
          .normalize();
      }
      const binormal = new Vector3()
        .crossVectors(tangent, frameNormal)
        .normalize();
      const center = new Vector3(...node.position);
      sampledColor
        .copy(dark)
        .lerp(light, 0.28 + ((nodeIndex + pathIndex * 3) % 7) * 0.055);
      for (let radial = 0; radial < VINE_RADIAL_SEGMENTS; radial += 1) {
        const angle = (radial / VINE_RADIAL_SEGMENTS) * Math.PI * 2;
        const radialNormal = frameNormal
          .clone()
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(binormal, Math.sin(angle))
          .normalize();
        const point = center
          .clone()
          .addScaledVector(radialNormal, node.radiusMeters);
        positions.push(point.x, point.y, point.z);
        normals.push(radialNormal.x, radialNormal.y, radialNormal.z);
        colors.push(sampledColor.r, sampledColor.g, sampledColor.b);
      }
      previousTangent = tangent;
    });
    for (let row = 0; row < path.nodes.length - 1; row += 1) {
      for (let radial = 0; radial < VINE_RADIAL_SEGMENTS; radial += 1) {
        const nextRadial = (radial + 1) % VINE_RADIAL_SEGMENTS;
        const a = vertexOffset + row * VINE_RADIAL_SEGMENTS + radial;
        const b = vertexOffset + row * VINE_RADIAL_SEGMENTS + nextRadial;
        const c =
          vertexOffset + (row + 1) * VINE_RADIAL_SEGMENTS + radial;
        const d =
          vertexOffset + (row + 1) * VINE_RADIAL_SEGMENTS + nextRadial;
        indices.push(a, c, b, b, c, d);
      }
    }
    vertexOffset += path.nodes.length * VINE_RADIAL_SEGMENTS;
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(normals), 3),
  );
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colors), 3),
  );
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = "vine.surface-skeleton.tapered-parallel-transport";
  return geometry;
}

function attachmentQuaternion(attachment: GardenMorningGloryAttachment) {
  const normal = new Vector3(...attachment.normal).normalize();
  const direction = new Vector3(...attachment.direction)
    .addScaledVector(
      normal,
      -new Vector3(...attachment.direction).dot(normal),
    )
    .normalize();
  const width = new Vector3().crossVectors(direction, normal).normalize();
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(width, direction, normal),
  );
}

function MorningGloryAttachmentBatch({
  kind,
  quality,
  attachments,
}: {
  kind: MorningGloryAttachmentKind;
  quality: FlowerPopulationQuality;
  attachments: readonly GardenMorningGloryAttachment[];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const geometry = useMemo(
    () => createMorningGloryAttachmentGeometry(kind, quality),
    [kind, quality],
  );
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        side: DoubleSide,
        roughness:
          kind === "bloom"
            ? quality === "ultra"
              ? 0.68
              : 0.75
            : 0.82,
        metalness: 0,
        emissive: kind === "bloom" ? "#27326d" : "#24421f",
        emissiveIntensity: kind === "bloom" ? 0.09 : 0.025,
      }),
    [kind, quality],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const scale = new Vector3();
    attachments.forEach((attachment, index) => {
      scale.setScalar(attachment.scale);
      matrix.compose(
        new Vector3(...attachment.position),
        attachmentQuaternion(attachment),
        scale,
      );
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.setUsage(StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [attachments]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <instancedMesh
      ref={meshRef}
      name={`vine.morning-glory.${kind}.${quality}`}
      args={[geometry, material, attachments.length]}
      frustumCulled={false}
      castShadow={quality === "ultra"}
      userData={{
        semanticId: `model.morning-glory.${kind}.${quality}`,
        source: "model-library",
        quality,
        occurrenceIds: attachments.map((attachment) => attachment.id),
      }}
    />
  );
}

export function CottageGardenMorningGlory({
  tuning,
}: {
  tuning: CottageGardenTuning;
}) {
  const { trellis } = tuning.garden;
  const system = useMemo(
    () =>
      createCottageGardenMorningGlorySystem({
        enabled: trellis.enabled,
        rootCount: trellis.count,
        seed: trellis.seed,
        scale: trellis.scale,
      }),
    [trellis.enabled, trellis.count, trellis.scale, trellis.seed],
  );
  const vineGeometry = useMemo(
    () => createVineTubeGeometry(system.paths),
    [system.paths],
  );
  const vineMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.88,
        metalness: 0,
        emissive: "#254b22",
        emissiveIntensity: 0.025,
      }),
    [],
  );
  const { camera, size } = useThree();
  const initialQualityById = useMemo(() => {
    const verticalFovDegrees =
      "isPerspectiveCamera" in camera && camera.isPerspectiveCamera
        ? camera.fov
        : 50;
    return new Map(
      system.attachments.map((attachment) => {
        const distanceMeters = camera.position.distanceTo(
          new Vector3(...attachment.position),
        );
        return [
          attachment.id,
          resolveGardenFlowerQuality("medium", {
            distanceMeters,
            sourceHeightMeters:
              MORNING_GLORY_ATTACHMENT_SOURCE_SIZES[attachment.kind] *
              attachment.scale,
            verticalFovDegrees,
            viewportHeightPixels: size.height,
          }),
        ] as const;
      }),
    );
  }, [camera, size.height, system.attachments]);
  const [qualityById, setQualityById] = useState(initialQualityById);
  const qualityByIdRef = useRef(qualityById);
  const lastUpdateRef = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    qualityByIdRef.current = initialQualityById;
    setQualityById(initialQualityById);
  }, [initialQualityById]);
  useEffect(
    () => () => {
      vineGeometry.dispose();
      vineMaterial.dispose();
    },
    [vineGeometry, vineMaterial],
  );

  useFrame(({ clock }) => {
    if (
      clock.elapsedTime - lastUpdateRef.current <
      COTTAGE_GARDEN_FLOWER_LOD.updateIntervalSeconds
    ) {
      return;
    }
    lastUpdateRef.current = clock.elapsedTime;
    const verticalFovDegrees =
      "isPerspectiveCamera" in camera && camera.isPerspectiveCamera
        ? camera.fov
        : 50;
    const next = new Map(qualityByIdRef.current);
    let changed = false;
    system.attachments.forEach((attachment) => {
      const previous = next.get(attachment.id) ?? "medium";
      const quality = resolveGardenFlowerQuality(previous, {
        distanceMeters: camera.position.distanceTo(
          new Vector3(...attachment.position),
        ),
        sourceHeightMeters:
          MORNING_GLORY_ATTACHMENT_SOURCE_SIZES[attachment.kind] *
          attachment.scale,
        verticalFovDegrees,
        viewportHeightPixels: size.height,
      });
      if (quality !== previous) {
        next.set(attachment.id, quality);
        changed = true;
      }
    });
    if (changed) {
      qualityByIdRef.current = next;
      setQualityById(next);
    }
  });

  const batches = useMemo(
    () =>
      (["leaf", "bloom"] as const).flatMap((kind) =>
        FLOWER_POPULATION_QUALITIES.map((quality) => ({
          kind,
          quality,
          attachments: system.attachments.filter(
            (attachment) =>
              attachment.kind === kind &&
              (qualityById.get(attachment.id) ?? "medium") === quality,
          ),
        })),
      ),
    [qualityById, system.attachments],
  );

  if (system.paths.length === 0) return null;
  return (
    <group
      name="vine.morning-glory-system"
      userData={{
        semanticId: "vine.surface-skeleton",
        algorithm:
          "centripetal-catmull-rom-reprojected-parallel-transport",
        hostCount: system.hosts.length,
        ...system.measurements,
      }}
    >
      <mesh
        name="vine.morning-glory.stems"
        geometry={vineGeometry}
        material={vineMaterial}
        castShadow
        userData={{
          semanticId: "vine.surface-skeleton.stems",
          routeIds: system.paths.map((path) => path.id),
        }}
      />
      {batches.map(({ kind, quality, attachments }) =>
        attachments.length > 0 ? (
          <MorningGloryAttachmentBatch
            key={`${kind}-${quality}`}
            kind={kind}
            quality={quality}
            attachments={attachments}
          />
        ) : null,
      )}
    </group>
  );
}
