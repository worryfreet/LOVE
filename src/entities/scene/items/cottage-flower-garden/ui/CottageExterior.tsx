import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DirectionalLight,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  Shape,
  Vector3,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  COTTAGE_DETAIL_SYSTEM,
  type CottageDetailMaterial,
  type CottageDetailOccurrence,
} from "../model/cottageDetails";
import {
  COTTAGE_EXTERIOR_KIT,
  type CottageExteriorBox,
  type CottageMaterialKey,
} from "../model/cottageExterior";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "../model/gardenLayout";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  resolveCottageWoodTone,
  type CottageGardenTuning,
  type CottageWoodTone,
} from "../model/gardenTuning";
import { createGardenSurfaceMaterial } from "./gardenSurfaceMaterials";
import { useGardenMaterialTextures } from "./gardenTextures";
import { CottageDoorPortal } from "./CottageDoorPortal";

type CottageStructureTuning = CottageGardenTuning["structures"];
const COTTAGE_WOOD_SHADE_FILL = 0.22;
const COTTAGE_TEXTURE_TINT_ANCHOR = new Color("#fff1df");

function resolveTexturedWoodTint(
  baseColor: string,
  tone: CottageWoodTone,
  anchorBlend = 0.55,
) {
  return `#${new Color(resolveCottageWoodTone(baseColor, tone))
    .lerp(COTTAGE_TEXTURE_TINT_ANCHOR, anchorBlend)
    .getHexString()}`;
}

const DETAIL_WOOD_TONES: Record<
  Exclude<CottageDetailMaterial, "stone">,
  CottageWoodTone
> = {
  siding: "siding",
  shingle: "shingle",
  trim: "trim",
  deck: "deck",
};

function CottageMaterial({
  material,
  structureTuning,
}: {
  material: CottageMaterialKey;
  structureTuning: CottageStructureTuning;
}) {
  const {
    stone,
    stoneNormal,
    stoneRoughness,
    wood,
    woodHorizontal,
    woodNormal,
    woodNormalHorizontal,
    woodRoughness,
  } = useGardenMaterialTextures();
  if (material === "glass") {
    return (
      <meshStandardMaterial
        color="#ffdca0"
        emissive="#8a4b2d"
        emissiveIntensity={0.05}
        roughness={0.2}
        metalness={0.02}
        transparent
        opacity={0.7}
      />
    );
  }

  const values: Record<
    Exclude<CottageMaterialKey, "glass">,
    { color: string; roughness: number }
  > = {
    foundation: { color: "#f0ede6", roughness: 0.98 },
    wall: {
      color: resolveTexturedWoodTint(
        structureTuning.cottageWoodColor,
        "wall",
      ),
      roughness: 0.96,
    },
    roof: {
      color: resolveTexturedWoodTint(
        structureTuning.cottageWoodColor,
        "roof",
        0.42,
      ),
      roughness: 0.98,
    },
    wood: {
      color: resolveTexturedWoodTint(
        structureTuning.cottageWoodColor,
        "wood",
        0.62,
      ),
      roughness: 0.95,
    },
    darkWood: {
      color: resolveTexturedWoodTint(
        structureTuning.cottageWoodColor,
        "darkWood",
        0.4,
      ),
      roughness: 0.96,
    },
    door: {
      color: resolveTexturedWoodTint(
        structureTuning.cottageWoodColor,
        "door",
        0.58,
      ),
      roughness: 0.95,
    },
  };
  const isFoundation = material === "foundation";
  const woodMap = material === "wall" || material === "roof"
    ? woodHorizontal
    : wood;
  return (
    <meshStandardMaterial
      {...values[material]}
      map={(isFoundation ? stone : woodMap) ?? null}
      normalMap={
        (isFoundation
          ? stoneNormal
          : material === "wall"
            ? woodNormalHorizontal
            : woodNormal) ?? null
      }
      normalScale={
        new Vector2(
          isFoundation ? 0.8 : 0.46,
          isFoundation ? 0.8 : 0.46,
        )
      }
      roughnessMap={(isFoundation ? stoneRoughness : woodRoughness) ?? null}
      emissive={
        isFoundation
          ? "#d8d0c4"
          : resolveCottageWoodTone(
              structureTuning.cottageWoodColor,
              material === "wall"
                ? "wall"
                : material === "roof"
                  ? "roof"
                  : material === "darkWood"
                    ? "darkWood"
                    : material === "door"
                      ? "door"
                      : "wood",
            )
      }
      emissiveMap={(isFoundation ? stone : woodMap) ?? null}
      emissiveIntensity={isFoundation ? 0.12 : COTTAGE_WOOD_SHADE_FILL}
    />
  );
}

const COTTAGE_STONE_DETAIL_COLOR = "#efebe2";

function InstancedCottageDetails({
  materialKey,
  occurrences,
  structureTuning,
}: {
  materialKey: CottageDetailMaterial;
  occurrences: readonly CottageDetailOccurrence[];
  structureTuning: CottageStructureTuning;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const {
    stone,
    stoneNormal,
    stoneRoughness,
    wood,
    woodHorizontal,
    woodNormal,
    woodNormalHorizontal,
    woodRoughness,
  } = useGardenMaterialTextures();
  const roundedStoneGeometry = useMemo(
    () => new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
    [],
  );
  const material = useMemo(
    () => {
      const woodTone =
        materialKey === "stone"
          ? structureTuning.cottageWoodColor
          : resolveCottageWoodTone(
              structureTuning.cottageWoodColor,
              DETAIL_WOOD_TONES[materialKey],
            );
      const detailMaterial = createGardenSurfaceMaterial({
        color: "#ffffff",
        roughness: materialKey === "stone" ? 0.98 : 0.94,
        grainScale:
          materialKey === "stone" ? 1.4 : materialKey === "shingle" ? 7.4 : 5.8,
        grainStrength: materialKey === "stone" ? 0.025 : 0.048,
        mottlingStrength: materialKey === "stone" ? 0.22 : 0.055,
        grainAxis:
          materialKey === "siding" ||
          materialKey === "trim" ||
          materialKey === "deck"
            ? "y"
            : "x",
        emissive:
          materialKey === "stone" ? "#d8d0c4" : woodTone,
        emissiveIntensity:
          materialKey === "stone" ? 0.08 : COTTAGE_WOOD_SHADE_FILL,
        map:
          materialKey === "stone"
            ? stone
            : materialKey === "siding" || materialKey === "shingle"
              ? woodHorizontal
              : wood,
        normalMap:
          materialKey === "stone"
            ? stoneNormal
            : materialKey === "siding" || materialKey === "shingle"
              ? woodNormalHorizontal
              : woodNormal,
        roughnessMap:
          materialKey === "stone" ? stoneRoughness : woodRoughness,
        normalScale: new Vector2(
          materialKey === "stone" ? 0.82 : 0.48,
          materialKey === "stone" ? 0.82 : 0.48,
        ),
      });
      return detailMaterial;
    },
    [
      materialKey,
      stone,
      stoneNormal,
      stoneRoughness,
      structureTuning.cottageWoodColor,
      wood,
      woodHorizontal,
      woodNormal,
      woodNormalHorizontal,
      woodRoughness,
    ],
  );

  useEffect(
    () => () => {
      roundedStoneGeometry.dispose();
      material.dispose();
    },
    [material, roundedStoneGeometry],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    const euler = new Euler();
    const color = new Color();
    const baseColor = new Color(
      materialKey === "stone"
        ? COTTAGE_STONE_DETAIL_COLOR
        : resolveTexturedWoodTint(
            structureTuning.cottageWoodColor,
            DETAIL_WOOD_TONES[materialKey],
            materialKey === "shingle" ? 0.42 : 0.56,
          ),
    );
    occurrences.forEach((occurrence, index) => {
      position.set(...occurrence.position);
      euler.set(...occurrence.rotation);
      rotation.setFromEuler(euler);
      scale.set(...occurrence.size);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      const centeredTone = (occurrence.tone - 0.5) * 2;
      color.copy(baseColor).offsetHSL(
        centeredTone * (materialKey === "stone" ? 0.009 : 0.003),
        centeredTone * (materialKey === "stone" ? 0.035 : 0.012),
        centeredTone *
          (materialKey === "stone"
            ? 0.11
            : structureTuning.cottageWoodVariation),
      );
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [materialKey, occurrences, structureTuning]);

  return (
    <instancedMesh
      ref={meshRef}
      name={`cottage.details.${materialKey}`}
      args={[
        materialKey === "stone" ? roundedStoneGeometry : undefined,
        material,
        occurrences.length,
      ]}
      castShadow
      receiveShadow
      userData={{
        semanticId: `cottage.details.${materialKey}`,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        detailKinds: occurrences.map((occurrence) => occurrence.kind),
      }}
    >
      {materialKey !== "stone" && <boxGeometry args={[1, 1, 1]} />}
    </instancedMesh>
  );
}

function CottageWindowDressings() {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const backdropRef = useRef<InstancedMesh>(null);
  const curtainRef = useRef<InstancedMesh>(null);
  const windows = useMemo(
    () =>
      COTTAGE_EXTERIOR_KIT.openings.filter(
        (opening) => opening.module === "Window",
      ),
    [],
  );

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const curtain = curtainRef.current;
    if (!backdrop || !curtain) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();
    let curtainIndex = 0;
    windows.forEach((opening, windowIndex) => {
      const centerY = opening.bottomY + opening.height / 2;
      position.set(opening.centerX, centerY, cottage.depth / 2 - 0.055);
      scale.set(opening.width * 0.86, opening.height * 0.86, 1);
      matrix.compose(position, rotation, scale);
      backdrop.setMatrixAt(windowIndex, matrix);
      ([-1, 1] as const).forEach((side) => {
        position.set(
          opening.centerX + side * opening.width * 0.28,
          centerY,
          cottage.depth / 2 - 0.035,
        );
        scale.set(opening.width * 0.24, opening.height * 0.82, 1);
        matrix.compose(position, rotation, scale);
        curtain.setMatrixAt(curtainIndex, matrix);
        curtainIndex += 1;
      });
    });
    backdrop.instanceMatrix.needsUpdate = true;
    curtain.instanceMatrix.needsUpdate = true;
    backdrop.computeBoundingSphere();
    curtain.computeBoundingSphere();
  }, [cottage.depth, windows]);

  return (
    <group
      name="cottage.window-dressings"
      userData={{ semanticId: "cottage.window-dressings", interior: false }}
    >
      <instancedMesh
        ref={backdropRef}
        args={[undefined, undefined, windows.length]}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#4b302a"
          emissive="#9c542e"
          emissiveIntensity={0.04}
          roughness={0.9}
        />
      </instancedMesh>
      <instancedMesh
        ref={curtainRef}
        args={[undefined, undefined, windows.length * 2]}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#d4b48a" roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

function CottageFrontLanterns() {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const frontZ = cottage.depth / 2 + 0.18;
  const glowRef = useRef<InstancedMesh>(null);
  const topRef = useRef<InstancedMesh>(null);
  const bottomRef = useRef<InstancedMesh>(null);
  const lanterns = useMemo(
    () => [
      { id: "left", x: -0.8, y: 1.5, scale: 1 },
      { id: "right", x: 0.83, y: 1.58, scale: 0.86 },
    ],
    [],
  );

  useLayoutEffect(() => {
    const glow = glowRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!glow || !top || !bottom) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();
    lanterns.forEach((lantern, index) => {
      position.set(lantern.x, lantern.y, frontZ);
      scale.setScalar(lantern.scale);
      matrix.compose(position, rotation, scale);
      glow.setMatrixAt(index, matrix);
      position.set(lantern.x, lantern.y + 0.09 * lantern.scale, frontZ);
      matrix.compose(position, rotation, scale);
      top.setMatrixAt(index, matrix);
      position.set(lantern.x, lantern.y - 0.09 * lantern.scale, frontZ);
      matrix.compose(position, rotation, scale);
      bottom.setMatrixAt(index, matrix);
    });
    [glow, top, bottom].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [frontZ, lanterns]);

  return (
    <group
      name="cottage.front-lanterns"
      userData={{ semanticId: "cottage.front-lanterns", interior: false }}
    >
      <instancedMesh ref={glowRef} args={[undefined, undefined, lanterns.length]}>
        <boxGeometry args={[0.09, 0.14, 0.075]} />
        <meshStandardMaterial
          color="#c39460"
          emissive="#ff9f45"
          emissiveIntensity={0.68}
          transparent
          opacity={0.76}
          roughness={0.42}
        />
      </instancedMesh>
      <instancedMesh ref={topRef} args={[undefined, undefined, lanterns.length]}>
        <cylinderGeometry args={[0.05, 0.062, 0.042, 8]} />
        <meshStandardMaterial color="#40342d" metalness={0.3} roughness={0.72} />
      </instancedMesh>
      <instancedMesh
        ref={bottomRef}
        args={[undefined, undefined, lanterns.length]}
      >
        <cylinderGeometry args={[0.058, 0.048, 0.04, 8]} />
        <meshStandardMaterial color="#40342d" metalness={0.3} roughness={0.72} />
      </instancedMesh>
    </group>
  );
}

function InstancedCottageBoxes({
  material,
  occurrences,
  structureTuning,
}: {
  material: CottageMaterialKey;
  occurrences: readonly CottageExteriorBox[];
  structureTuning: CottageStructureTuning;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const roundedWoodGeometry = useMemo(
    () => new RoundedBoxGeometry(1, 1, 1, 2, 0.035),
    [],
  );
  const usesRoundedWood =
    material === "wood" || material === "darkWood" || material === "door";

  useEffect(() => () => roundedWoodGeometry.dispose(), [roundedWoodGeometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    const euler = new Euler();
    occurrences.forEach((occurrence, index) => {
      position.set(...occurrence.position);
      euler.set(...occurrence.rotation);
      rotation.setFromEuler(euler);
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
      name={`cottage.boxes.${material}`}
      args={[
        usesRoundedWood ? roundedWoodGeometry : undefined,
        undefined,
        occurrences.length,
      ]}
      castShadow={
        material === "foundation" ||
        material === "wall" ||
        material === "roof" ||
        material === "wood" ||
        material === "darkWood"
      }
      receiveShadow={material !== "glass"}
      userData={{
        semanticId: `cottage.boxes.${material}`,
        occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        occurrenceModules: occurrences.map((occurrence) => occurrence.module),
        shell: "exterior-only",
      }}
    >
      {!usesRoundedWood && <boxGeometry args={[1, 1, 1]} />}
      <CottageMaterial
        material={material}
        structureTuning={structureTuning}
      />
    </instancedMesh>
  );
}

function CottageGables({
  structureTuning,
}: {
  structureTuning: CottageStructureTuning;
}) {
  const { woodHorizontal, woodNormalHorizontal, woodRoughness } =
    useGardenMaterialTextures();
  const gableColor = resolveTexturedWoodTint(
    structureTuning.cottageWoodColor,
    "gable",
    0.54,
  );
  const shapes = useMemo(
    () =>
      COTTAGE_EXTERIOR_KIT.gables.map((gable) => {
        const shape = new Shape();
        shape.moveTo(-gable.halfWidth, gable.baseY);
        shape.lineTo(gable.halfWidth, gable.baseY);
        shape.lineTo(0, gable.baseY + gable.rise);
        shape.closePath();
        return { gable, shape };
      }),
    [],
  );

  return shapes.map(({ gable, shape }) => (
    <mesh
      key={gable.id}
      name={gable.id}
      position={[0, 0, gable.z]}
      receiveShadow
      userData={{
        semanticId: gable.id,
        module: gable.module,
        facing: gable.facing,
        shell: "exterior-only",
      }}
    >
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={gableColor}
        map={woodHorizontal}
        normalMap={woodNormalHorizontal}
        normalScale={new Vector2(0.44, 0.44)}
        roughnessMap={woodRoughness}
        emissive={resolveCottageWoodTone(
          structureTuning.cottageWoodColor,
          "gable",
        )}
        emissiveMap={woodHorizontal}
        emissiveIntensity={COTTAGE_WOOD_SHADE_FILL}
        roughness={0.92}
        side={DoubleSide}
      />
    </mesh>
  ));
}

const OPEN_DOOR_LEAF_IDS = new Set([
  "door.front.slab",
  "door.front-panel-upper",
  "door.front-panel-lower",
]);

function CottageFacadeSkyFill() {
  const lightRef = useRef<DirectionalLight>(null);
  const targetRef = useRef<Object3D>(null);

  useLayoutEffect(() => {
    if (!lightRef.current || !targetRef.current) return;
    lightRef.current.target = targetRef.current;
    targetRef.current.updateMatrixWorld();
  }, []);

  return (
    <group
      name="cottage.facade-sky-fill"
      userData={{
        semanticId: "cottage.facade-sky-fill",
        purpose: "soft-front-sky-bounce",
      }}
    >
      <directionalLight
        ref={lightRef}
        name="cottage.light.facade-sky-bounce"
        position={[-3.8, 5.8, 8.4]}
        color="#ffe6c8"
        intensity={0.92}
        castShadow={false}
        userData={{ semanticId: "cottage.light.facade-sky-bounce" }}
      />
      <object3D ref={targetRef} position={[0, 1.45, 0]} />
    </group>
  );
}

export function CottageExterior({
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
}: {
  tuning?: CottageGardenTuning;
}) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const materialGroups = useMemo(
    () =>
      COTTAGE_EXTERIOR_KIT.boxes.reduce(
        (groups, occurrence) => {
          if (OPEN_DOOR_LEAF_IDS.has(occurrence.id)) return groups;
          groups[occurrence.material].push(occurrence);
          return groups;
        },
        {
          foundation: [],
          wall: [],
          roof: [],
          wood: [],
          darkWood: [],
          door: [],
          glass: [],
        } as Record<CottageMaterialKey, CottageExteriorBox[]>,
      ),
    [],
  );
  const detailGroups = useMemo(
    () =>
      COTTAGE_DETAIL_SYSTEM.occurrences.reduce(
        (groups, occurrence) => {
          groups[occurrence.material].push(occurrence);
          return groups;
        },
        {
          stone: [],
          siding: [],
          shingle: [],
          trim: [],
          deck: [],
        } as Record<CottageDetailMaterial, CottageDetailOccurrence[]>,
      ),
    [],
  );

  return (
    <group
      name="module.cottage-shell"
      position={[cottage.centerX, 0, cottage.centerZ]}
      userData={{
        semanticId: "module.cottage-shell",
        units: "meter",
        interior: false,
        widthMeters: COTTAGE_EXTERIOR_KIT.measurements.width,
        depthMeters: COTTAGE_EXTERIOR_KIT.measurements.depth,
        ridgeHeightMeters: COTTAGE_EXTERIOR_KIT.measurements.ridgeHeight,
        moduleIds: COTTAGE_EXTERIOR_KIT.moduleIds,
      }}
    >
      <CottageFacadeSkyFill />
      {COTTAGE_EXTERIOR_KIT.moduleIds.map((moduleId) => (
        <group
          key={moduleId}
          name={`cottage.${moduleId}`}
          userData={{ semanticId: `cottage.${moduleId}`, module: moduleId }}
        />
      ))}
      {(Object.keys(materialGroups) as CottageMaterialKey[]).map((material) => (
        <InstancedCottageBoxes
          key={material}
          material={material}
          occurrences={materialGroups[material]}
          structureTuning={tuning.structures}
        />
      ))}
      <CottageGables structureTuning={tuning.structures} />
      <group name="cottage.fine-details">
        {(Object.keys(detailGroups) as CottageDetailMaterial[]).map(
          (material) => (
            <InstancedCottageDetails
              key={material}
              materialKey={material}
              occurrences={detailGroups[material]}
              structureTuning={tuning.structures}
            />
          ),
        )}
        <CottageWindowDressings />
        <CottageFrontLanterns />
        <CottageDoorPortal tuning={tuning} />
      </group>
    </group>
  );
}
