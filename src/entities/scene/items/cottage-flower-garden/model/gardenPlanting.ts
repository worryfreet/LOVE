import {
  COTTAGE_FLOWER_FIELD_RECTS,
  type GardenRect,
} from "./gardenLayout";
import {
  ROSE_COLOR_PRESETS,
  type RoseColorVariantId,
} from "../../../../model/items/flower-collection/core/roseColorVariants";

export type CottageGardenRoseColorSelectionId =
  | "mixed"
  | RoseColorVariantId;

export interface CottageGardenRoseColorOption {
  readonly id: CottageGardenRoseColorSelectionId;
  readonly label: string;
  readonly palette: readonly string[];
}

/** 花园只引用模型库颜色品种；mixed 保留已有三色确定性混种配置。 */
export const COTTAGE_GARDEN_ROSE_COLOR_OPTIONS = [
  {
    id: "mixed",
    label: "多色玫瑰",
    palette: ["#d71532", "#f5a8bc", "#f5c932", "#743f9d"],
  },
  ...ROSE_COLOR_PRESETS.map((preset) => ({
    id: preset.id,
    label: `${preset.label}玫瑰`,
    palette: preset.palette,
  })),
] satisfies readonly CottageGardenRoseColorOption[];

export const COTTAGE_GARDEN_PLANT_SPECIES = [
  {
    id: "classic-rose",
    label: "玫瑰",
    support: "bed",
    defaultCount: 36,
    defaultHeightMeters: [0.52, 0.86],
    defaultScale: 1.02,
    colors: ["#d71532", "#f5a8bc", "#ecebe4", "#f5c932", "#f47a1f", "#743f9d"],
  },
  {
    id: "sunflower",
    label: "向日葵",
    support: "bed",
    defaultCount: 4,
    defaultHeightMeters: [1.18, 1.48],
    defaultScale: 0.38,
    colors: ["#f2a600", "#ffc629", "#d97900"],
  },
  {
    id: "morning-glory",
    label: "牵牛花",
    support: "trellis",
    defaultCount: 10,
    defaultHeightMeters: [1.2, 1.9],
    defaultScale: 1,
    colors: ["#6675d7", "#9d78cf", "#f3e7ee"],
  },
] as const;

export type CottageGardenPlantSpeciesId =
  (typeof COTTAGE_GARDEN_PLANT_SPECIES)[number]["id"];
export type CottageGardenBedSpeciesId = Exclude<
  CottageGardenPlantSpeciesId,
  "morning-glory"
>;
export type CottageGardenSideId = "left" | "right";
export type CottageGardenPlantRole = "primary" | "companion";

export interface CottageGardenPlantSlot {
  speciesId: CottageGardenBedSpeciesId;
  roseColorSelectionId: CottageGardenRoseColorSelectionId;
  count: number;
  heightMinMeters: number;
  heightMaxMeters: number;
  scale: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface CottageGardenBedBlock {
  id: string;
  lengthWeight: number;
  clusterStrength: number;
  seed: number;
  primary: CottageGardenPlantSlot;
  companion: CottageGardenPlantSlot | null;
}

export interface CottageGardenSidePlanting {
  blocks: CottageGardenBedBlock[];
}

export interface CottageGardenTrellisPlanting {
  enabled: boolean;
  count: number;
  heightMinMeters: number;
  heightMaxMeters: number;
  scale: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  seed: number;
}

export interface CottageGardenPlantingTuning {
  pathClearanceMeters: number;
  pathSurfaceBlendFeatherMeters: number;
  pathSurfaceEdgeWarpMeters: number;
  bedEdgeFeatherMeters: number;
  bedGrassDensity: number;
  left: CottageGardenSidePlanting;
  right: CottageGardenSidePlanting;
  trellis: CottageGardenTrellisPlanting;
}

export interface CottageGardenResolvedBedBlock extends CottageGardenBedBlock {
  side: CottageGardenSideId;
  ordinal: number;
  rect: GardenRect;
}

export const COTTAGE_GARDEN_BED_SPECIES_IDS =
  COTTAGE_GARDEN_PLANT_SPECIES.filter(
    (species) => species.support === "bed",
  ).map((species) => species.id) as CottageGardenBedSpeciesId[];

const BED_SPECIES_IDS = new Set<CottageGardenBedSpeciesId>(
  COTTAGE_GARDEN_BED_SPECIES_IDS,
);
const ROSE_COLOR_SELECTION_IDS = new Set<CottageGardenRoseColorSelectionId>(
  COTTAGE_GARDEN_ROSE_COLOR_OPTIONS.map((option) => option.id),
);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;
const BLOCK_ID_PATTERN = /^(left|right)-[a-z0-9-]{2,32}$/u;
export const COTTAGE_GARDEN_SIDE_BLOCK_LIMITS = [1, 8] as const;

export function createCottageGardenPlantSlot(
  speciesId: CottageGardenBedSpeciesId,
  count?: number,
  colors?: readonly [string, string, string],
): CottageGardenPlantSlot {
  const species = COTTAGE_GARDEN_PLANT_SPECIES.find(
    (candidate) => candidate.id === speciesId,
  );
  if (!species) throw new Error(`未知庭院花种：${speciesId}`);
  const palette = colors ?? species.colors;
  return {
    speciesId,
    roseColorSelectionId: "mixed",
    count: count ?? species.defaultCount,
    heightMinMeters: species.defaultHeightMeters[0],
    heightMaxMeters: species.defaultHeightMeters[1],
    scale: species.defaultScale,
    primaryColor: palette[0],
    secondaryColor: palette[1],
    accentColor: palette[2],
  };
}

function block(
  id: string,
  seed: number,
  primary: CottageGardenPlantSlot,
  companion: CottageGardenPlantSlot | null,
  clusterStrength: number,
): CottageGardenBedBlock {
  return {
    id,
    lengthWeight: 1,
    clusterStrength,
    seed,
    primary,
    companion,
  };
}

export const COTTAGE_GARDEN_PLANTING_DEFAULTS: CottageGardenPlantingTuning = {
  pathClearanceMeters: 0.12,
  pathSurfaceBlendFeatherMeters: 0.38,
  pathSurfaceEdgeWarpMeters: 0.14,
  bedEdgeFeatherMeters: 0.42,
  bedGrassDensity: 0.18,
  left: {
    blocks: [
      block(
        "left-01",
        11_903,
        createCottageGardenPlantSlot("classic-rose", 36, ["#d71532", "#711128", "#f5a8bc"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#f7a58f", "#ecebe4", "#f8c2c7"]),
        0.58,
      ),
      block(
        "left-02",
        17_117,
        createCottageGardenPlantSlot("classic-rose", 36, ["#f5c932", "#f47a1f", "#ef3f25"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#f5a8bc", "#d72e72", "#743f9d"]),
        0.46,
      ),
      block(
        "left-03",
        23_903,
        createCottageGardenPlantSlot("classic-rose", 36, ["#f5a8bc", "#d72e72", "#743f9d"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#ecebe4", "#f8c2c7", "#f7a58f"]),
        0.62,
      ),
      block(
        "left-04",
        31_129,
        createCottageGardenPlantSlot("classic-rose", 36, ["#ef3f25", "#f7a58f", "#f5c932"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#711128", "#d71532", "#f6d7d4"]),
        0.72,
      ),
      block(
        "left-05",
        41_033,
        createCottageGardenPlantSlot("sunflower"),
        null,
        0.56,
      ),
    ],
  },
  right: {
    blocks: [
      block(
        "right-01",
        53_021,
        createCottageGardenPlantSlot("classic-rose", 36, ["#f5c932", "#f7a58f", "#ecebe4"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#d71532", "#f5a8bc", "#f47a1f"]),
        0.58,
      ),
      block(
        "right-02",
        61_039,
        createCottageGardenPlantSlot("classic-rose", 36, ["#d72e72", "#f5a8bc", "#f8c2c7"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#743f9d", "#ecebe4", "#711128"]),
        0.48,
      ),
      block(
        "right-03",
        71_029,
        createCottageGardenPlantSlot("classic-rose", 36, ["#743f9d", "#f5a8bc", "#ecebe4"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#d71532", "#711128", "#f6d7d4"]),
        0.6,
      ),
      block(
        "right-04",
        83_039,
        createCottageGardenPlantSlot("classic-rose", 36, ["#f7a58f", "#f47a1f", "#f5c932"]),
        createCottageGardenPlantSlot("classic-rose", 24, ["#d72e72", "#ecebe4", "#ef3f25"]),
        0.72,
      ),
      block(
        "right-05",
        97_031,
        createCottageGardenPlantSlot("sunflower"),
        null,
        0.56,
      ),
    ],
  },
  trellis: {
    enabled: true,
    count: 10,
    heightMinMeters: 1.2,
    heightMaxMeters: 1.9,
    scale: 1,
    primaryColor: "#6675d7",
    secondaryColor: "#9d78cf",
    accentColor: "#f3e7ee",
    seed: 109_037,
  },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? Math.max(minimum, Math.min(maximum, numeric))
    : fallback;
}

function integer(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return Math.round(finiteNumber(value, fallback, minimum, maximum));
}

function color(value: unknown, fallback: string) {
  return typeof value === "string" && COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : fallback;
}

function roseColorSelection(
  value: unknown,
  fallback: CottageGardenRoseColorSelectionId,
) {
  return typeof value === "string" &&
    ROSE_COLOR_SELECTION_IDS.has(value as CottageGardenRoseColorSelectionId)
    ? (value as CottageGardenRoseColorSelectionId)
    : fallback;
}

function normalizeSlot(
  input: unknown,
  fallback: CottageGardenPlantSlot,
): CottageGardenPlantSlot {
  const source = record(input);
  const migratesLegacySpecies =
    typeof source.speciesId === "string" &&
    !BED_SPECIES_IDS.has(source.speciesId as CottageGardenBedSpeciesId);
  const speciesId =
    typeof source.speciesId === "string" &&
    BED_SPECIES_IDS.has(source.speciesId as CottageGardenBedSpeciesId)
      ? (source.speciesId as CottageGardenBedSpeciesId)
      : fallback.speciesId;
  const [rawMinimum, rawMaximum] = [
    finiteNumber(
      migratesLegacySpecies ? undefined : source.heightMinMeters,
      fallback.heightMinMeters,
      0.05,
      2.2,
    ),
    finiteNumber(
      migratesLegacySpecies ? undefined : source.heightMaxMeters,
      fallback.heightMaxMeters,
      0.05,
      2.2,
    ),
  ];
  return {
    speciesId,
    roseColorSelectionId: roseColorSelection(
      migratesLegacySpecies ? undefined : source.roseColorSelectionId,
      fallback.roseColorSelectionId ?? "mixed",
    ),
    count: integer(source.count, fallback.count, 0, 200),
    heightMinMeters: Math.min(rawMinimum, rawMaximum),
    heightMaxMeters: Math.max(rawMinimum, rawMaximum),
    scale: finiteNumber(
      migratesLegacySpecies ? undefined : source.scale,
      fallback.scale,
      0.25,
      1.8,
    ),
    primaryColor: color(
      migratesLegacySpecies ? undefined : source.primaryColor,
      fallback.primaryColor,
    ),
    secondaryColor: color(
      migratesLegacySpecies ? undefined : source.secondaryColor,
      fallback.secondaryColor,
    ),
    accentColor: color(
      migratesLegacySpecies ? undefined : source.accentColor,
      fallback.accentColor,
    ),
  };
}

function normalizeBlock(
  input: unknown,
  fallback: CottageGardenBedBlock,
  side: CottageGardenSideId,
  index: number,
): CottageGardenBedBlock {
  const source = record(input);
  const requestedId = typeof source.id === "string" ? source.id : "";
  const id =
    BLOCK_ID_PATTERN.test(requestedId) && requestedId.startsWith(`${side}-`)
      ? requestedId
      : fallback.id || `${side}-${String(index + 1).padStart(2, "0")}`;
  const companion =
    source.companion === null
      ? null
      : normalizeSlot(source.companion, fallback.companion ?? fallback.primary);
  return {
    id,
    lengthWeight: finiteNumber(
      source.lengthWeight,
      fallback.lengthWeight,
      0.25,
      4,
    ),
    clusterStrength: finiteNumber(
      source.clusterStrength,
      fallback.clusterStrength,
      0,
      1,
    ),
    seed: integer(source.seed, fallback.seed, 1, 2_147_483_647),
    primary: normalizeSlot(source.primary, fallback.primary),
    companion,
  };
}

function normalizeSide(
  input: unknown,
  fallback: CottageGardenSidePlanting,
  side: CottageGardenSideId,
): CottageGardenSidePlanting {
  const source = record(input);
  const requested = Array.isArray(source.blocks) ? source.blocks : fallback.blocks;
  const limited = requested.slice(
    0,
    COTTAGE_GARDEN_SIDE_BLOCK_LIMITS[1],
  );
  const sourceBlocks = limited.length > 0 ? limited : fallback.blocks.slice(0, 1);
  const seen = new Set<string>();
  const blocks = sourceBlocks.map((candidate, index) => {
    const fallbackBlock =
      fallback.blocks[index] ?? fallback.blocks[fallback.blocks.length - 1];
    const normalized = normalizeBlock(candidate, fallbackBlock, side, index);
    if (!seen.has(normalized.id)) {
      seen.add(normalized.id);
      return normalized;
    }
    const id = nextCottageGardenBlockId(side, seen);
    seen.add(id);
    return { ...normalized, id };
  });
  return { blocks };
}

export function normalizeCottageGardenPlanting(
  input: unknown,
  fallback = COTTAGE_GARDEN_PLANTING_DEFAULTS,
): CottageGardenPlantingTuning {
  const source = record(input);
  const trellis = record(source.trellis);
  const [trellisMinimum, trellisMaximum] = [
    finiteNumber(
      trellis.heightMinMeters,
      fallback.trellis.heightMinMeters,
      0.4,
      2.4,
    ),
    finiteNumber(
      trellis.heightMaxMeters,
      fallback.trellis.heightMaxMeters,
      0.4,
      2.4,
    ),
  ];
  return {
    pathClearanceMeters: finiteNumber(
      source.pathClearanceMeters,
      fallback.pathClearanceMeters,
      0.05,
      0.4,
    ),
    pathSurfaceBlendFeatherMeters: finiteNumber(
      source.pathSurfaceBlendFeatherMeters,
      fallback.pathSurfaceBlendFeatherMeters,
      0.18,
      0.7,
    ),
    pathSurfaceEdgeWarpMeters: finiteNumber(
      source.pathSurfaceEdgeWarpMeters,
      fallback.pathSurfaceEdgeWarpMeters,
      0.04,
      0.24,
    ),
    bedEdgeFeatherMeters: finiteNumber(
      source.bedEdgeFeatherMeters,
      fallback.bedEdgeFeatherMeters,
      0.08,
      0.8,
    ),
    bedGrassDensity: finiteNumber(
      source.bedGrassDensity,
      fallback.bedGrassDensity,
      0,
      0.5,
    ),
    left: normalizeSide(source.left, fallback.left, "left"),
    right: normalizeSide(source.right, fallback.right, "right"),
    trellis: {
      enabled:
        typeof trellis.enabled === "boolean"
          ? trellis.enabled
          : fallback.trellis.enabled,
      count: integer(trellis.count, fallback.trellis.count, 0, 10),
      heightMinMeters: Math.min(trellisMinimum, trellisMaximum),
      heightMaxMeters: Math.max(trellisMinimum, trellisMaximum),
      scale: finiteNumber(trellis.scale, fallback.trellis.scale, 0.55, 1.8),
      primaryColor: color(
        trellis.primaryColor,
        fallback.trellis.primaryColor,
      ),
      secondaryColor: color(
        trellis.secondaryColor,
        fallback.trellis.secondaryColor,
      ),
      accentColor: color(trellis.accentColor, fallback.trellis.accentColor),
      seed: integer(trellis.seed, fallback.trellis.seed, 1, 2_147_483_647),
    },
  };
}

function nextCottageGardenBlockId(
  side: CottageGardenSideId,
  existing: Iterable<string>,
) {
  const ids = new Set(existing);
  for (let sequence = 1; sequence <= 99; sequence += 1) {
    const id = `${side}-${String(sequence).padStart(2, "0")}`;
    if (!ids.has(id)) return id;
  }
  return `${side}-${Date.now().toString(36)}`;
}

function cloneBlockWithIdentity(
  source: CottageGardenBedBlock,
  id: string,
  seedOffset: number,
) {
  return {
    ...source,
    id,
    seed: Math.max(1, source.seed + seedOffset),
    primary: { ...source.primary },
    companion: source.companion ? { ...source.companion } : null,
  };
}

export function addCottageGardenBedBlock(
  planting: CottageGardenPlantingTuning,
  side: CottageGardenSideId,
  afterId?: string,
) {
  const normalized = normalizeCottageGardenPlanting(planting);
  const blocks = normalized[side].blocks;
  if (blocks.length >= COTTAGE_GARDEN_SIDE_BLOCK_LIMITS[1]) return normalized;
  const sourceIndex = Math.max(
    0,
    afterId ? blocks.findIndex((candidate) => candidate.id === afterId) : blocks.length - 1,
  );
  const source = blocks[sourceIndex] ?? blocks[blocks.length - 1];
  const newId = nextCottageGardenBlockId(
    side,
    blocks.map((candidate) => candidate.id),
  );
  const sharedWeight = Math.max(0.25, source.lengthWeight / 2);
  const inserted = cloneBlockWithIdentity(source, newId, 7_919 + blocks.length * 101);
  inserted.lengthWeight = sharedWeight;
  const nextBlocks = blocks.map((candidate, index) =>
    index === sourceIndex ? { ...candidate, lengthWeight: sharedWeight } : candidate,
  );
  nextBlocks.splice(sourceIndex + 1, 0, inserted);
  return {
    ...normalized,
    [side]: { blocks: nextBlocks },
  };
}

export function removeCottageGardenBedBlock(
  planting: CottageGardenPlantingTuning,
  side: CottageGardenSideId,
  blockId: string,
) {
  const normalized = normalizeCottageGardenPlanting(planting);
  const blocks = normalized[side].blocks;
  if (blocks.length <= COTTAGE_GARDEN_SIDE_BLOCK_LIMITS[0]) return normalized;
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  if (index < 0) return normalized;
  const removed = blocks[index];
  const receiverIndex = index === 0 ? 1 : index - 1;
  const nextBlocks = blocks
    .map((candidate, candidateIndex) =>
      candidateIndex === receiverIndex
        ? {
            ...candidate,
            lengthWeight: candidate.lengthWeight + removed.lengthWeight,
          }
        : candidate,
    )
    .filter((candidate) => candidate.id !== blockId);
  return {
    ...normalized,
    [side]: { blocks: nextBlocks },
  };
}

export function moveCottageGardenBedBlock(
  planting: CottageGardenPlantingTuning,
  side: CottageGardenSideId,
  blockId: string,
  direction: -1 | 1,
) {
  const normalized = normalizeCottageGardenPlanting(planting);
  const blocks = [...normalized[side].blocks];
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= blocks.length) return normalized;
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
  return { ...normalized, [side]: { blocks } };
}

export function copyCottageGardenSide(
  planting: CottageGardenPlantingTuning,
  sourceSide: CottageGardenSideId,
  targetSide: CottageGardenSideId,
) {
  const normalized = normalizeCottageGardenPlanting(planting);
  const blocks = normalized[sourceSide].blocks.map((source, index) =>
    cloneBlockWithIdentity(
      source,
      `${targetSide}-${String(index + 1).padStart(2, "0")}`,
      13_007 + index * 211,
    ),
  );
  return { ...normalized, [targetSide]: { blocks } };
}

export function resolveCottageGardenBedBlocks(
  planting: CottageGardenPlantingTuning,
): CottageGardenResolvedBedBlock[] {
  const normalized = normalizeCottageGardenPlanting(planting);
  return (["left", "right"] as const).flatMap((side, sideIndex) => {
    const rect = COTTAGE_FLOWER_FIELD_RECTS[sideIndex];
    const blocks = normalized[side].blocks;
    const totalWeight = blocks.reduce(
      (total, candidate) => total + candidate.lengthWeight,
      0,
    );
    let cursorZ = rect.centerZ + rect.length / 2;
    return blocks.map((candidate, ordinal) => {
      const length = rect.length * (candidate.lengthWeight / totalWeight);
      const centerZ = cursorZ - length / 2;
      cursorZ -= length;
      return {
        ...candidate,
        side,
        ordinal,
        rect: {
          centerX: rect.centerX,
          centerZ,
          width: rect.width,
          length,
        },
      };
    });
  });
}

export function findCottageGardenPlantSpecies(
  speciesId: CottageGardenPlantSpeciesId,
) {
  return COTTAGE_GARDEN_PLANT_SPECIES.find(
    (species) => species.id === speciesId,
  );
}
