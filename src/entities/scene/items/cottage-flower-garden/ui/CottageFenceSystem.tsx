import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  Euler,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  COTTAGE_FENCE_SYSTEM,
  type FenceBoxOccurrence,
  type FenceHardwareOccurrence,
  type FencePostCapOccurrence,
  type FencePostOccurrence,
} from "../model/fenceSystem";
import { createGardenSurfaceMaterial } from "./gardenSurfaceMaterials";
import { useGardenMaterialTextures } from "./gardenTextures";
import { CottageGardenEntrancePlaque } from "./CottageGardenEntrancePlaque";
import type { CottageGardenGiftNames } from "../model/gardenEntrancePlaque";

type FenceOccurrence = FenceBoxOccurrence | FencePostOccurrence;

function occurrenceRotationY(occurrence: FenceOccurrence) {
  return "rotationY" in occurrence ? occurrence.rotationY : 0;
}

function occurrenceRotationZ(occurrence: FenceOccurrence) {
  return "rotationZ" in occurrence ? occurrence.rotationZ : occurrence.lean;
}

function occurrenceWeathering(occurrence: FenceOccurrence) {
  return "weathering" in occurrence ? occurrence.weathering : occurrence.tone;
}

function createPicketGeometry(variant: number) {
  const shape = new Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  if (variant === 1) {
    shape.lineTo(0.5, 0.34);
    shape.lineTo(0.2, 0.47);
    shape.lineTo(-0.08, 0.38);
    shape.lineTo(-0.5, 0.28);
  } else if (variant === 2) {
    shape.lineTo(0.5, 0.44);
    shape.lineTo(-0.5, 0.28);
  } else if (variant === 3) {
    shape.lineTo(0.5, 0.24);
    shape.lineTo(0.12, 0.5);
    shape.lineTo(-0.5, 0.37);
  } else if (variant === 4) {
    shape.lineTo(0.5, 0.3);
    shape.lineTo(0.19, 0.43);
    shape.lineTo(-0.07, 0.5);
    shape.lineTo(-0.22, 0.4);
    shape.lineTo(-0.5, 0.31);
  } else if (variant === 5) {
    shape.lineTo(0.5, 0.2);
    shape.lineTo(0.28, 0.34);
    shape.lineTo(0.08, 0.27);
    shape.lineTo(-0.18, 0.46);
    shape.lineTo(-0.5, 0.3);
  } else if (variant === 6) {
    shape.lineTo(0.5, 0.42);
    shape.lineTo(0.18, 0.31);
    shape.lineTo(-0.04, 0.5);
    shape.lineTo(-0.3, 0.25);
    shape.lineTo(-0.5, 0.34);
  } else {
    shape.lineTo(0.5, 0.28);
    shape.lineTo(0, 0.5);
    shape.lineTo(-0.5, 0.28);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.035,
    bevelThickness: 0.025,
  });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function InstancedFenceParts({
  name,
  occurrences,
  color,
  geometry = "box",
  picketVariant = 0,
}: {
  name: string;
  occurrences: readonly FenceOccurrence[];
  color: string;
  geometry?: "box" | "picket";
  picketVariant?: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const picketGeometry = useMemo(
    () => createPicketGeometry(picketVariant),
    [picketVariant],
  );
  const roundedBoxGeometry = useMemo(
    () => new RoundedBoxGeometry(1, 1, 1, 2, 0.045),
    [],
  );
  const { wood, woodHorizontal } = useGardenMaterialTextures();
  const material = useMemo(
    () => {
      const fenceMaterial = createGardenSurfaceMaterial({
        color: "#ffffff",
        roughness: 0.96,
        grainScale: 6.8,
        grainStrength: 0.1,
        mottlingStrength: 0.22,
        grainAxis: geometry === "picket" || name.includes("posts") ? "x" : "y",
        emissive: "#8a654a",
        emissiveIntensity: 0.32,
        map:
          name.includes("rails") || name.includes("braces")
            ? woodHorizontal
            : wood,
        bumpMap: wood,
        bumpScale: 0.042,
      });
      fenceMaterial.emissiveMap = null;
      return fenceMaterial;
    },
    [geometry, name, wood, woodHorizontal],
  );

  useEffect(
    () => () => {
      picketGeometry.dispose();
      roundedBoxGeometry.dispose();
      material.dispose();
    },
    [material, picketGeometry, roundedBoxGeometry],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const roll = new Quaternion();
    const scale = new Vector3();
    const colorValue = new Color();
    const baseColor = new Color(color);
    const greyWood = new Color("#8c7f72");
    const freshWood = new Color("#b88862");
    const zAxis = new Vector3(0, 0, 1);
    occurrences.forEach((occurrence, index) => {
      const yawVariation = geometry === "picket" ? (occurrence.tone - 0.5) * 0.11 : 0;
      const baseYaw = occurrenceRotationY(occurrence);
      const normalX = Math.sin(baseYaw);
      const normalZ = Math.cos(baseYaw);
      position.set(
        occurrence.position[0] + normalX * yawVariation * 0.55,
        occurrence.position[1],
        occurrence.position[2] + normalZ * yawVariation * 0.55,
      );
      rotation.setFromEuler(new Euler(0, baseYaw + yawVariation, 0));
      roll.setFromAxisAngle(zAxis, occurrenceRotationZ(occurrence));
      rotation.multiply(roll);
      scale.set(...occurrence.size);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      const tone = occurrence.tone - 0.5;
      const weathering = occurrenceWeathering(occurrence);
      colorValue
        .copy(baseColor)
        .offsetHSL(
          tone * 0.035,
          tone * 0.13,
          tone * 0.4 + (0.5 - weathering) * 0.25,
        );
      if (weathering > 0.68) {
        colorValue.lerp(greyWood, (weathering - 0.68) * 1.25);
      } else if (weathering < 0.24) {
        colorValue.lerp(freshWood, (0.24 - weathering) * 1.4);
      }
      mesh.setColorAt(index, colorValue);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [color, geometry, occurrences]);

  if (occurrences.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[
        geometry === "picket" ? picketGeometry : roundedBoxGeometry,
        material,
        occurrences.length,
      ]}
      castShadow
      receiveShadow
      userData={{
        semanticId: name,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        materialSystem: "stable-id-weathered-wood",
      }}
    ></instancedMesh>
  );
}

function PicketBatches({
  name,
  occurrences,
  color,
}: {
  name: string;
  occurrences: readonly FenceBoxOccurrence[];
  color: string;
}) {
  return (
    <>
      {Array.from({ length: 7 }, (_, variant) => {
        const batch = occurrences.filter((_, index) => index % 7 === variant);
        return (
          <InstancedFenceParts
            key={variant}
            name={`${name}.variant-${variant + 1}`}
            occurrences={batch}
            color={color}
            geometry="picket"
            picketVariant={variant}
          />
        );
      })}
    </>
  );
}

function PostCaps({
  occurrences,
}: {
  occurrences: readonly FencePostCapOccurrence[];
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    occurrences.forEach((occurrence, index) => {
      position.set(...occurrence.position);
      rotation.setFromEuler(new Euler(0, occurrence.rotationY, 0));
      scale.set(...occurrence.size);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [occurrences]);

  return (
    <instancedMesh
      ref={meshRef}
      name="fence.post-caps"
      args={[undefined, undefined, occurrences.length]}
      castShadow
      userData={{
        semanticId: "fence.post-caps",
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        alignment: "shared-post-center-and-top-datum",
      }}
    >
      <coneGeometry args={[0.5, 1, 4]} />
      <meshStandardMaterial
        color="#a78970"
        emissive="#76563e"
        emissiveIntensity={0.5}
        roughness={0.96}
      />
    </instancedMesh>
  );
}

function GateHardware({
  occurrences,
  primitive,
}: {
  occurrences: readonly FenceHardwareOccurrence[];
  primitive: FenceHardwareOccurrence["primitive"];
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    occurrences.forEach((occurrence, index) => {
      position.set(...occurrence.position);
      rotation.setFromEuler(new Euler(0, occurrence.rotationY, 0));
      scale.set(...occurrence.size);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [occurrences]);

  if (occurrences.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      name={`gate.hardware.${primitive}`}
      args={[undefined, undefined, occurrences.length]}
      castShadow
      userData={{
        semanticId: `gate.hardware.${primitive}`,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
      }}
    >
      {primitive === "box" && <boxGeometry args={[1, 1, 1]} />}
      {primitive === "cylinder" && <cylinderGeometry args={[1, 1, 1, 10]} />}
      {primitive === "sphere" && <sphereGeometry args={[1, 10, 7]} />}
      <meshStandardMaterial
        color="#69584c"
        emissive="#332822"
        emissiveIntensity={0.24}
        metalness={0.48}
        roughness={0.58}
      />
    </instancedMesh>
  );
}

function FenceBoardNails({
  occurrences,
}: {
  occurrences: readonly FenceBoxOccurrence[];
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3(0.011, 0.011, 0.008);
    let instanceIndex = 0;
    occurrences.forEach((occurrence) => {
      const normalX = Math.sin(occurrence.rotationY);
      const normalZ = Math.cos(occurrence.rotationY);
      for (const heightRatio of [0.34, 0.67]) {
        position.set(
          occurrence.position[0] + normalX * (occurrence.size[2] / 2 + 0.012),
          occurrence.position[1] + (heightRatio - 0.5) * occurrence.size[1],
          occurrence.position[2] + normalZ * (occurrence.size[2] / 2 + 0.012),
        );
        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(instanceIndex, matrix);
        instanceIndex += 1;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [occurrences]);

  return (
    <instancedMesh
      ref={meshRef}
      name="fence.board-nails"
      args={[undefined, undefined, occurrences.length * 2]}
      castShadow
      userData={{
        semanticId: "fence.board-nails",
        occurrenceCount: occurrences.length * 2,
      }}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#55473b" metalness={0.38} roughness={0.62} />
    </instancedMesh>
  );
}

function FenceBoardKnots({
  occurrences,
}: {
  occurrences: readonly FenceBoxOccurrence[];
}) {
  const visibleBoards = useMemo(
    () => occurrences.filter((_, index) => index % 3 !== 1),
    [occurrences],
  );
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    visibleBoards.forEach((occurrence, index) => {
      const normalX = Math.sin(occurrence.rotationY);
      const normalZ = Math.cos(occurrence.rotationY);
      const tangentX = Math.cos(occurrence.rotationY);
      const tangentZ = -Math.sin(occurrence.rotationY);
      const lateral = (index % 5 === 0 ? -0.17 : 0.12) * occurrence.size[0];
      position.set(
        occurrence.position[0] +
          normalX * (occurrence.size[2] / 2 + 0.014) +
          tangentX * lateral,
        occurrence.position[1] +
          (((index * 37) % 61) / 100) * occurrence.size[1] -
          occurrence.size[1] * 0.3,
        occurrence.position[2] +
          normalZ * (occurrence.size[2] / 2 + 0.014) +
          tangentZ * lateral,
      );
      rotation.setFromEuler(
        new Euler(0, occurrence.rotationY, (index % 7) * 0.19),
      );
      const radius = 0.025 + (index % 4) * 0.007;
      scale.set(radius * 1.35, radius, 0.008);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [visibleBoards]);

  return (
    <instancedMesh
      ref={meshRef}
      name="fence.board-knots"
      args={[undefined, undefined, visibleBoards.length]}
      castShadow
      userData={{
        semanticId: "fence.board-knots",
        occurrenceCount: visibleBoards.length,
      }}
    >
      <sphereGeometry args={[1, 10, 6]} />
      <meshStandardMaterial color="#4c3428" roughness={1} />
    </instancedMesh>
  );
}

export function CottageFenceSystem({
  giftNames,
}: {
  giftNames?: CottageGardenGiftNames;
}) {
  const regularPosts = COTTAGE_FENCE_SYSTEM.posts.filter(
    (post) => post.kind === "regular",
  );
  const cornerPosts = COTTAGE_FENCE_SYSTEM.posts.filter(
    (post) => post.kind === "corner",
  );
  const gatePosts = COTTAGE_FENCE_SYSTEM.posts.filter(
    (post) => post.kind === "gate",
  );
  const gateBoards = COTTAGE_FENCE_SYSTEM.gateParts.filter(
    (part) => part.kind === "board",
  );
  const gateRails = COTTAGE_FENCE_SYSTEM.gateParts.filter(
    (part) => part.kind === "rail",
  );
  const gateBraces = COTTAGE_FENCE_SYSTEM.gateParts.filter(
    (part) => part.kind === "brace",
  );
  const gatePostIds = new Set(gatePosts.map((post) => post.id));
  const fencePostCaps = COTTAGE_FENCE_SYSTEM.postCaps.filter(
    (cap) => !gatePostIds.has(cap.postId),
  );

  return (
    <group
      name="module.fence-system"
      userData={{
        semanticId: "module.fence-system",
        generator: "FenceSystem",
        sectionIds: COTTAGE_FENCE_SYSTEM.sections.map((section) => section.id),
        gateLeafIds: COTTAGE_FENCE_SYSTEM.gates.map((gate) => gate.id),
        gardenWidthMeters: COTTAGE_FENCE_SYSTEM.options.gardenWidth,
        gardenLengthMeters: COTTAGE_FENCE_SYSTEM.options.gardenLength,
        hardwareCount: COTTAGE_FENCE_SYSTEM.hardware.length,
      }}
    >
      <InstancedFenceParts
        name="fence.posts.regular"
        occurrences={regularPosts}
        color="#8a674d"
      />
      <InstancedFenceParts
        name="fence.posts.corner"
        occurrences={cornerPosts}
        color="#745744"
      />
      <InstancedFenceParts
        name="fence.posts.gate"
        occurrences={gatePosts}
        color="#88664c"
      />
      <PostCaps occurrences={fencePostCaps} />
      <InstancedFenceParts
        name="fence.sections.rails"
        occurrences={COTTAGE_FENCE_SYSTEM.rails}
        color="#795b46"
      />
      <PicketBatches
        name="fence.sections.boards"
        occurrences={COTTAGE_FENCE_SYSTEM.boards}
        color="#846349"
      />
      <PicketBatches
        name="gate.leaves.boards"
        occurrences={gateBoards}
        color="#7d5b43"
      />
      <InstancedFenceParts
        name="gate.leaves.rails"
        occurrences={gateRails}
        color="#88664b"
      />
      <InstancedFenceParts
        name="gate.leaves.diagonal-braces"
        occurrences={gateBraces}
        color="#785742"
      />
      <group name="fence.surface-details">
        <FenceBoardNails
          occurrences={[...COTTAGE_FENCE_SYSTEM.boards, ...gateBoards]}
        />
        <FenceBoardKnots
          occurrences={[...COTTAGE_FENCE_SYSTEM.boards, ...gateBoards]}
        />
      </group>
      {(["box", "cylinder", "sphere"] as const).map((primitive) => (
        <GateHardware
          key={primitive}
          primitive={primitive}
          occurrences={COTTAGE_FENCE_SYSTEM.hardware.filter(
            (occurrence) => occurrence.primitive === primitive,
          )}
        />
      ))}
      <CottageGardenEntrancePlaque giftNames={giftNames} />
    </group>
  );
}
