import {
  resolveClosestRoseColorPreset,
  type RoseColorVariantId,
} from "../../../../model/items/flower-collection/core/roseColorVariants";
import {
  normalizeCottageGardenPlanting,
  resolveCottageGardenBedBlocks,
  type CottageGardenBedBlock,
  type CottageGardenPlantRole,
  type CottageGardenPlantSlot,
  type CottageGardenPlantSpeciesId,
  type CottageGardenPlantingTuning,
  type CottageGardenResolvedBedBlock,
} from "./gardenPlanting";

export interface CottageGardenPlantOccurrence {
  readonly id: string;
  readonly speciesId: CottageGardenPlantSpeciesId;
  readonly blockId: string;
  readonly role: CottageGardenPlantRole;
  readonly root: readonly [number, number];
  readonly heightMeters: number;
  readonly scale: number;
  readonly yaw: number;
  readonly phase: number;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly colorMix: number;
  readonly roseColorVariantId: RoseColorVariantId;
}

export interface CottageGardenPlantPopulation {
  readonly occurrences: readonly CottageGardenPlantOccurrence[];
  readonly bySpecies: ReadonlyMap<
    CottageGardenPlantSpeciesId,
    readonly CottageGardenPlantOccurrence[]
  >;
  readonly bedCount: number;
  readonly totalCount: number;
}

const UINT32_RANGE = 4_294_967_296;

function mixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function stableUnit(seed: number, index: number, channel: number) {
  return (
    mixBits(
      seed ^
        Math.imul(index + 1, 0x9e3779b1) ^
        Math.imul(channel + 1, 0x85ebca77),
    ) / UINT32_RANGE
  );
}

function halton(index: number, base: number) {
  let fraction = 1;
  let result = 0;
  let cursor = index;
  while (cursor > 0) {
    fraction /= base;
    result += fraction * (cursor % base);
    cursor = Math.floor(cursor / base);
  }
  return result;
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createSlotOccurrences(
  block: CottageGardenResolvedBedBlock,
  role: CottageGardenPlantRole,
  slot: CottageGardenPlantSlot,
) {
  const occurrences: CottageGardenPlantOccurrence[] = [];
  const insetX = Math.min(0.16, block.rect.width * 0.05);
  const insetZ = Math.min(0.24, block.rect.length * 0.14);
  const usableWidth = Math.max(0.4, block.rect.width - insetX * 2);
  const usableLength = Math.max(0.35, block.rect.length - insetZ * 2);
  const roleOffset = role === "primary" ? 0 : 71_039;
  const seed = block.seed + roleOffset;
  const sequenceOffset = 1 + (seed % 89);
  const clusterCount = role === "primary" ? 3 : 4;
  const clusterPull = block.clusterStrength * (role === "primary" ? 0.42 : 0.31);

  for (let index = 0; index < slot.count; index += 1) {
    const candidate = index + sequenceOffset;
    const uniformU = halton(candidate, 2);
    const uniformV = halton(candidate, 3);
    const clusterIndex = index % clusterCount;
    const clusterU = stableUnit(seed, clusterIndex, 0);
    const clusterV = stableUnit(seed, clusterIndex, 1);
    const jitterU = (stableUnit(seed, index, 2) - 0.5) * 0.12;
    const jitterV = (stableUnit(seed, index, 3) - 0.5) * 0.12;
    const u = clamp(
      mix(uniformU, clusterU, clusterPull) + jitterU,
      0.015,
      0.985,
    );
    const v = clamp(
      mix(uniformV, clusterV, clusterPull) + jitterV,
      0.015,
      0.985,
    );
    const x = block.rect.centerX + (u - 0.5) * usableWidth;
    const z = block.rect.centerZ + (v - 0.5) * usableLength;
    const heightNoise = stableUnit(seed, index, 4);
    const colorMix = stableUnit(seed, index, 8);
    const selectedColor =
      colorMix > 0.84
        ? slot.accentColor
        : colorMix > 0.56
          ? slot.secondaryColor
          : slot.primaryColor;
    occurrences.push({
      id: `${block.id}.${role}.${slot.speciesId}-${index + 1}`,
      speciesId: slot.speciesId,
      blockId: block.id,
      role,
      root: [x, z],
      heightMeters: mix(
        slot.heightMinMeters,
        slot.heightMaxMeters,
        heightNoise,
      ),
      scale: slot.scale * mix(0.9, 1.1, stableUnit(seed, index, 5)),
      // 向日葵花盘朝向入口（+Z）并保留轻微自然偏角；玫瑰继续自由旋转。
      yaw:
        slot.speciesId === "sunflower"
          ? (stableUnit(seed, index, 6) - 0.5) * 0.42
          : stableUnit(seed, index, 6) * Math.PI * 2,
      phase: stableUnit(seed, index, 7) * Math.PI * 2,
      primaryColor: slot.primaryColor,
      secondaryColor: slot.secondaryColor,
      accentColor: slot.accentColor,
      colorMix,
      roseColorVariantId:
        slot.roseColorSelectionId === "mixed"
          ? resolveClosestRoseColorPreset(selectedColor).id
          : slot.roseColorSelectionId,
    });
  }
  return occurrences;
}

function createBlockOccurrences(block: CottageGardenResolvedBedBlock) {
  return [
    ...createSlotOccurrences(block, "primary", block.primary),
    ...(block.companion
      ? createSlotOccurrences(block, "companion", block.companion)
      : []),
  ];
}

export function createCottageGardenPlantPopulation(
  input: CottageGardenPlantingTuning,
): CottageGardenPlantPopulation {
  const planting = normalizeCottageGardenPlanting(input);
  const blocks = resolveCottageGardenBedBlocks(planting);
  const occurrences = [
    ...blocks.flatMap(createBlockOccurrences),
  ];
  const mutableBySpecies = new Map<
    CottageGardenPlantSpeciesId,
    CottageGardenPlantOccurrence[]
  >();
  occurrences.forEach((occurrence) => {
    const species = mutableBySpecies.get(occurrence.speciesId) ?? [];
    species.push(occurrence);
    mutableBySpecies.set(occurrence.speciesId, species);
  });
  return {
    occurrences,
    bySpecies: mutableBySpecies,
    bedCount: blocks.length,
    totalCount: occurrences.length,
  };
}

export function countCottageGardenBlockPlants(block: CottageGardenBedBlock) {
  return block.primary.count + (block.companion?.count ?? 0);
}
