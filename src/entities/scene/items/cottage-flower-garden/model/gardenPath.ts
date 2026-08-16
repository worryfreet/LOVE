import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "./gardenLayout";

export interface GardenFieldstoneOccurrence {
  id: string;
  variant: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  position: readonly [number, number, number];
  radiusX: number;
  radiusZ: number;
  height: number;
  rotationY: number;
  tiltX: number;
  tiltZ: number;
  colorMix: number;
}

export interface GardenFieldstonePath {
  seed: number;
  stones: readonly GardenFieldstoneOccurrence[];
  measurements: {
    width: number;
    length: number;
    rowCount: number;
    minColumnCount: number;
    maxColumnCount: number;
    minStoneWidth: number;
    maxStoneWidth: number;
    minStoneLength: number;
    maxStoneLength: number;
    minLongitudinalGap: number;
    maxLongitudinalGap: number;
    minCourseCoverage: number;
    maxCourseCoverage: number;
  };
}

const PATH_SEED = 264_719;
const UINT32_RANGE = 4_294_967_296;

/** 图二批准的道路节奏：一至两块大石板密铺成行，窄缝直接露出原有草坪。 */
export const COTTAGE_GARDEN_FLAGSTONE_STYLE = {
  representation: "close-jointed-flagstone-courses",
  jointSurface: "terrain-path-surface-blend",
  rowCount: 34,
  columnCount: [1, 2] as const,
  courseCoverageRatio: [0.92, 0.98] as const,
  lengthRatio: [0.84, 0.9] as const,
  internalJointMeters: [0.04, 0.07] as const,
  heightMeters: [0.065, 0.092] as const,
  baseSinkMeters: 0.018,
  visibleRiseMeters: [0.047, 0.074] as const,
  maximumYawRadians: 0.014,
} as const;

function mixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function randomAt(index: number, channel: number) {
  return (
    mixBits(
      PATH_SEED ^
        Math.imul(index + 1, 0x85ebca77) ^
        Math.imul(channel + 1, 0xc2b2ae3d),
    ) / UINT32_RANGE
  );
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

/** 主路生成紧密错缝的大块铺石；绿色接缝直接由连续 Turf 显露。 */
export function createCottageGardenFieldstonePath(): GardenFieldstonePath {
  const { mainPath } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const rowCount = COTTAGE_GARDEN_FLAGSTONE_STYLE.rowCount;
  const cellLength = mainPath.length / rowCount;
  const stones: GardenFieldstoneOccurrence[] = [];
  const columnCounts: number[] = [];
  const courseCoverages: number[] = [];
  const rowRanges: Array<{ minimumZ: number; maximumZ: number }> = [];
  let occurrenceIndex = 0;

  for (let row = 0; row < rowCount; row += 1) {
    const rowColumnCount = randomAt(row, 20) > 0.38 ? 2 : 1;
    columnCounts.push(rowColumnCount);
    const [minimumCoverageRatio, maximumCoverageRatio] =
      COTTAGE_GARDEN_FLAGSTONE_STYLE.courseCoverageRatio;
    const [minimumLengthRatio, maximumLengthRatio] =
      COTTAGE_GARDEN_FLAGSTONE_STYLE.lengthRatio;
    const [minimumJoint, maximumJoint] =
      COTTAGE_GARDEN_FLAGSTONE_STYLE.internalJointMeters;
    const [minimumHeight, maximumHeight] =
      COTTAGE_GARDEN_FLAGSTONE_STYLE.heightMeters;
    const coverage =
      mainPath.width *
      mix(minimumCoverageRatio, maximumCoverageRatio, randomAt(row, 0));
    courseCoverages.push(coverage);
    const jointWidth =
      rowColumnCount === 1
        ? 0
        : mix(minimumJoint, maximumJoint, randomAt(row, 1));
    const availableStoneWidth = coverage - jointWidth;
    const split =
      rowColumnCount === 1 ? 1 : mix(0.43, 0.57, randomAt(row, 2));
    const stoneWidths =
      rowColumnCount === 1
        ? [availableStoneWidth]
        : [availableStoneWidth * split, availableStoneWidth * (1 - split)];
    const courseStartX = mainPath.centerX - coverage / 2;
    let cursorX = courseStartX;
    let minimumZ = Number.POSITIVE_INFINITY;
    let maximumZ = Number.NEGATIVE_INFINITY;

    stoneWidths.forEach((stoneWidth, column) => {
      const index = occurrenceIndex;
      occurrenceIndex += 1;
      const radiusX = stoneWidth / 2;
      const radiusZ =
        (cellLength *
          mix(minimumLengthRatio, maximumLengthRatio, randomAt(index, 3))) /
        2;
      const x = cursorX + radiusX;
      const z =
        mainPath.centerZ -
        mainPath.length / 2 +
        (row + 0.5) * cellLength +
        (randomAt(index, 4) - 0.5) * cellLength * 0.035;
      stones.push({
        id: `route.main-path.flagstone-${row + 1}-${column + 1}`,
        variant: ((row * 3 + column) % 8) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6
          | 7,
        position: [x, -COTTAGE_GARDEN_FLAGSTONE_STYLE.baseSinkMeters, z],
        radiusX,
        radiusZ,
        height: mix(minimumHeight, maximumHeight, randomAt(index, 5)),
        rotationY:
          (randomAt(index, 6) - 0.5) *
          2 *
          COTTAGE_GARDEN_FLAGSTONE_STYLE.maximumYawRadians,
        tiltX: (randomAt(index, 7) - 0.5) * 0.012,
        tiltZ: (randomAt(index, 8) - 0.5) * 0.012,
        colorMix: randomAt(index, 9),
      });
      minimumZ = Math.min(minimumZ, z - radiusZ);
      maximumZ = Math.max(maximumZ, z + radiusZ);
      cursorX += stoneWidth + jointWidth;
    });
    rowRanges.push({ minimumZ, maximumZ });
  }

  const widths = stones.map((stone) => stone.radiusX * 2);
  const lengths = stones.map((stone) => stone.radiusZ * 2);
  const gaps = rowRanges
    .slice(1)
    .map((range, index) => range.minimumZ - rowRanges[index].maximumZ);
  return {
    seed: PATH_SEED,
    stones,
    measurements: {
      width: mainPath.width,
      length: mainPath.length,
      rowCount,
      minColumnCount: Math.min(...columnCounts),
      maxColumnCount: Math.max(...columnCounts),
      minStoneWidth: Math.min(...widths),
      maxStoneWidth: Math.max(...widths),
      minStoneLength: Math.min(...lengths),
      maxStoneLength: Math.max(...lengths),
      minLongitudinalGap: Math.min(...gaps),
      maxLongitudinalGap: Math.max(...gaps),
      minCourseCoverage: Math.min(...courseCoverages),
      maxCourseCoverage: Math.max(...courseCoverages),
    },
  };
}

export const COTTAGE_GARDEN_FIELDSTONE_PATH =
  createCottageGardenFieldstonePath();
