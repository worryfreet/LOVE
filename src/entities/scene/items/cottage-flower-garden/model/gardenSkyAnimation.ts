export type CottageGardenSkyVector = readonly [number, number, number];
export type CottageGardenSkyColor = readonly [number, number, number];

export interface CottageGardenSkyAnimationCommand {
  readonly playing: boolean;
  readonly timeSeconds: number;
  readonly issuedAtMilliseconds: number;
  readonly nonce: number;
}

export interface CottageGardenMessageStar {
  readonly id: string;
  readonly origin: CottageGardenSkyVector;
  readonly target: CottageGardenSkyVector;
  readonly streamBend: CottageGardenSkyVector;
  readonly streamPhase: number;
  readonly color: CottageGardenSkyColor;
  readonly size: number;
  readonly phase: number;
}

export interface CottageGardenBackgroundStar {
  readonly id: string;
  readonly position: CottageGardenSkyVector;
  readonly color: CottageGardenSkyColor;
  readonly size: number;
  readonly phase: number;
}

export interface CottageGardenMeteorDefinition {
  readonly id: string;
  readonly startsAtSeconds: number;
  readonly durationSeconds: number;
  readonly start: CottageGardenSkyVector;
  readonly end: CottageGardenSkyVector;
  readonly trailLength: number;
  readonly headSize: number;
  readonly brightness: number;
  readonly fragmentCount: number;
  readonly fragmentSpread: number;
  readonly afterglowSeconds: number;
  readonly color: CottageGardenSkyColor;
}

export interface CottageGardenSkyAnimationSample {
  readonly timeSeconds: number;
  readonly normalizedProgress: number;
  readonly backgroundOpacity: number;
  readonly messageOpacity: number;
  readonly assemblyProgress: number;
  readonly complete: boolean;
}

export interface CottageGardenMeteorSample {
  readonly active: boolean;
  readonly progress: number;
  readonly opacity: number;
  readonly trailScale: number;
  readonly head: CottageGardenSkyVector;
}

export const COTTAGE_GARDEN_SKY_ANIMATION = {
  semanticId: "atmosphere.romance-sky",
  message: "I LOVE YOU!",
  durationSeconds: 10,
  meteorSequenceEndSeconds: 3.65,
  messageAssemblyStartSeconds: 3.1,
  messageAssemblyEndSeconds: 7.4,
  messageDepthMeters: -420,
  messageBaseHeightMeters: 260,
  messageWidthMeters: 240,
  messageCellSpacingMeters: 5.4,
  messageRowSpacingMeters: 5.5,
  backgroundStarCount: 4_200,
  messageStarsPerCell: 5,
  seed: 0x1a0e_2026,
} as const;

export const COTTAGE_GARDEN_SKY_DOME_RADIUS_METERS = 760;
export const COTTAGE_GARDEN_SKY_RENDER_FAR_METERS = 900;

export const COTTAGE_GARDEN_INITIAL_SKY_ANIMATION_COMMAND:
  CottageGardenSkyAnimationCommand = {
    playing: false,
    timeSeconds: 0,
    issuedAtMilliseconds: 0,
    nonce: 0,
  };

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["1111", "1000", "1000", "1110", "1000", "1000", "1111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["1000", "1000", "1000", "1000", "1000", "1000", "1111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10011", "10101", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
} as const satisfies Record<string, readonly string[]>;

const MESSAGE_PALETTE = [
  [1, 0.96, 0.78],
  [0.79, 0.9, 1],
  [1, 0.72, 0.8],
] as const satisfies readonly CottageGardenSkyColor[];

const BACKGROUND_PALETTE = [
  [0.72, 0.82, 1],
  [1, 0.91, 0.75],
  [0.88, 0.9, 1],
] as const satisfies readonly CottageGardenSkyColor[];

const MESSAGE_STREAM_ORIGINS = [
  [-188, 18, -452],
  [-158, 102, -447],
  [-70, 2, -436],
  [0, 118, -442],
  [70, 7, -431],
  [160, 98, -456],
  [188, 22, -427],
] as const satisfies readonly CottageGardenSkyVector[];

const COTTAGE_GARDEN_BASE_METEORS = [
  {
    id: "meteor-01",
    startsAtSeconds: 0.1,
    durationSeconds: 0.56,
    start: [-220, 155, -430],
    end: [-55, 72, -446],
    trailLength: 98,
    headSize: 2.4,
    brightness: 0.9,
    fragmentCount: 3,
    fragmentSpread: 1.1,
    afterglowSeconds: 0.12,
    color: [0.82, 0.92, 1],
  },
  {
    id: "meteor-02",
    startsAtSeconds: 0.34,
    durationSeconds: 0.44,
    start: [-160, 142, -452],
    end: [18, 64, -426],
    trailLength: 112,
    headSize: 2.7,
    brightness: 0.34,
    fragmentCount: 0,
    fragmentSpread: 0.7,
    afterglowSeconds: 0.1,
    color: [1, 0.86, 0.69],
  },
  {
    id: "meteor-03",
    startsAtSeconds: 0.58,
    durationSeconds: 0.6,
    start: [-85, 152, -412],
    end: [62, 85, -446],
    trailLength: 91,
    headSize: 2.25,
    brightness: 0.25,
    fragmentCount: 0,
    fragmentSpread: 0.6,
    afterglowSeconds: 0.12,
    color: [0.76, 0.88, 1],
  },
  {
    id: "meteor-04",
    startsAtSeconds: 0.86,
    durationSeconds: 0.46,
    start: [-40, 136, -458],
    end: [120, 55, -438],
    trailLength: 106,
    headSize: 2.6,
    brightness: 0.52,
    fragmentCount: 1,
    fragmentSpread: 0.8,
    afterglowSeconds: 0.13,
    color: [1, 0.8, 0.73],
  },
  {
    id: "meteor-05",
    startsAtSeconds: 1.14,
    durationSeconds: 0.54,
    start: [-205, 110, -425],
    end: [-54, 44, -452],
    trailLength: 94,
    headSize: 2.2,
    brightness: 0.22,
    fragmentCount: 0,
    fragmentSpread: 0.5,
    afterglowSeconds: 0.1,
    color: [0.82, 0.91, 1],
  },
  {
    id: "meteor-06",
    startsAtSeconds: 1.38,
    durationSeconds: 0.62,
    start: [-112, 158, -414],
    end: [66, 78, -449],
    trailLength: 118,
    headSize: 2.75,
    brightness: 1,
    fragmentCount: 4,
    fragmentSpread: 1.35,
    afterglowSeconds: 0.14,
    color: [1, 0.88, 0.72],
  },
  {
    id: "meteor-07",
    startsAtSeconds: 1.74,
    durationSeconds: 0.48,
    start: [-190, 132, -456],
    end: [-20, 62, -420],
    trailLength: 115,
    headSize: 2.7,
    brightness: 0.46,
    fragmentCount: 1,
    fragmentSpread: 0.85,
    afterglowSeconds: 0.12,
    color: [0.78, 0.9, 1],
  },
  {
    id: "meteor-08",
    startsAtSeconds: 1.96,
    durationSeconds: 0.56,
    start: [-48, 164, -444],
    end: [115, 91, -418],
    trailLength: 101,
    headSize: 2.35,
    brightness: 0.3,
    fragmentCount: 0,
    fragmentSpread: 0.55,
    afterglowSeconds: 0.1,
    color: [0.86, 0.94, 1],
  },
  {
    id: "meteor-09",
    startsAtSeconds: 2.2,
    durationSeconds: 0.52,
    start: [14, 145, -422],
    end: [178, 71, -452],
    trailLength: 110,
    headSize: 2.55,
    brightness: 0.92,
    fragmentCount: 3,
    fragmentSpread: 1.2,
    afterglowSeconds: 0.14,
    color: [1, 0.86, 0.72],
  },
  {
    id: "meteor-10",
    startsAtSeconds: 2.47,
    durationSeconds: 0.44,
    start: [-150, 151, -450],
    end: [4, 82, -423],
    trailLength: 96,
    headSize: 2.3,
    brightness: 0.28,
    fragmentCount: 0,
    fragmentSpread: 0.6,
    afterglowSeconds: 0.12,
    color: [0.8, 0.91, 1],
  },
  {
    id: "meteor-11",
    startsAtSeconds: 2.7,
    durationSeconds: 0.58,
    start: [-75, 125, -418],
    end: [84, 53, -442],
    trailLength: 92,
    headSize: 2.15,
    brightness: 0.24,
    fragmentCount: 0,
    fragmentSpread: 0.5,
    afterglowSeconds: 0.1,
    color: [0.9, 0.95, 1],
  },
  {
    id: "meteor-12",
    startsAtSeconds: 2.98,
    durationSeconds: 0.5,
    start: [-192, 112, -432],
    end: [-48, 50, -458],
    trailLength: 103,
    headSize: 2.45,
    brightness: 0.58,
    fragmentCount: 2,
    fragmentSpread: 0.95,
    afterglowSeconds: 0.14,
    color: [1, 0.83, 0.7],
  },
] as const satisfies readonly CottageGardenMeteorDefinition[];

export const COTTAGE_GARDEN_METEOR_COVERAGE_SCALE = {
  horizontal: 1.7,
  vertical: 1.6,
  verticalCenter: 90,
  trail: 1.65,
} as const;

/** 扩大整片天区的流星行程，同时保留既有节拍、亮度和消融变化。 */
export const COTTAGE_GARDEN_METEORS: readonly CottageGardenMeteorDefinition[] =
  COTTAGE_GARDEN_BASE_METEORS.map((meteor) => {
    const expandPoint = (point: CottageGardenSkyVector): CottageGardenSkyVector => [
      point[0] * COTTAGE_GARDEN_METEOR_COVERAGE_SCALE.horizontal,
      COTTAGE_GARDEN_METEOR_COVERAGE_SCALE.verticalCenter +
        (point[1] - COTTAGE_GARDEN_METEOR_COVERAGE_SCALE.verticalCenter) *
          COTTAGE_GARDEN_METEOR_COVERAGE_SCALE.vertical,
      point[2],
    ];
    return {
      ...meteor,
      start: expandPoint(meteor.start),
      end: expandPoint(meteor.end),
      trailLength:
        meteor.trailLength * COTTAGE_GARDEN_METEOR_COVERAGE_SCALE.trail,
    };
  });

const UINT32_RANGE = 4_294_967_296;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smootherstep(value: number) {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function mixVector(
  start: CottageGardenSkyVector,
  end: CottageGardenSkyVector,
  progress: number,
): CottageGardenSkyVector {
  return [
    mix(start[0], end[0], progress),
    mix(start[1], end[1], progress),
    mix(start[2], end[2], progress),
  ];
}

function mixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function randomFactory(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function messageCells(message: string) {
  const cells: { readonly column: number; readonly row: number }[] = [];
  let cursor = 0;
  for (const character of message) {
    if (character === " ") {
      cursor += 4;
      continue;
    }
    const glyph = GLYPHS[character as keyof typeof GLYPHS];
    if (!glyph) continue;
    const width = glyph[0].length;
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((value, columnIndex) => {
        if (value === "1") cells.push({ column: cursor + columnIndex, row: rowIndex });
      });
    });
    cursor += width + 1;
  }
  return { cells, width: Math.max(1, cursor - 1) };
}

export function resolveCottageGardenSkyAnimationTime(
  command: CottageGardenSkyAnimationCommand,
  nowMilliseconds: number,
) {
  const anchor = Number.isFinite(command.timeSeconds) ? command.timeSeconds : 0;
  const elapsed =
    command.playing && Number.isFinite(nowMilliseconds)
      ? Math.max(0, nowMilliseconds - command.issuedAtMilliseconds) / 1_000
      : 0;
  return Math.max(
    0,
    Math.min(COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds, anchor + elapsed),
  );
}

export function sampleCottageGardenSkyAnimation(
  timeSeconds: number,
): CottageGardenSkyAnimationSample {
  const time = Math.max(
    0,
    Math.min(
      COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
      Number.isFinite(timeSeconds) ? timeSeconds : 0,
    ),
  );
  const assemblyProgress = smootherstep(
    (time - COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds) /
      (COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyEndSeconds -
        COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds),
  );
  return {
    timeSeconds: time,
    normalizedProgress: time / COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
    backgroundOpacity: 0.84 + smootherstep(time / 2.35) * 0.1,
    messageOpacity: smootherstep((time - 2.45) / 1.05),
    assemblyProgress,
    complete: time >= COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
  };
}

export function resolveCottageGardenEveningVisibility(absolutePhase: number) {
  const normalized = ((absolutePhase % 1) + 1) % 1;
  const rawDistance = Math.abs(normalized - 0.75);
  const circularDistance = Math.min(rawDistance, 1 - rawDistance);
  return 1 - smootherstep((circularDistance - 0.055) / 0.12);
}

export function createCottageGardenMessageStars(
  seed: number = COTTAGE_GARDEN_SKY_ANIMATION.seed,
  message: string = COTTAGE_GARDEN_SKY_ANIMATION.message,
) {
  const random = randomFactory(seed);
  const { cells, width } = messageCells(message.toUpperCase());
  const cellSpacing = Math.min(
    COTTAGE_GARDEN_SKY_ANIMATION.messageCellSpacingMeters,
    COTTAGE_GARDEN_SKY_ANIMATION.messageWidthMeters / Math.max(width, 1),
  );
  const centerColumn = (width - 1) / 2;
  const stars: CottageGardenMessageStar[] = [];
  cells.forEach((cell, cellIndex) => {
    for (
      let sampleIndex = 0;
      sampleIndex < COTTAGE_GARDEN_SKY_ANIMATION.messageStarsPerCell;
      sampleIndex += 1
    ) {
      const localX = (random() - 0.5) * 1.44;
      const localY = (random() - 0.5) * 1.44;
      const paletteIndex = Math.floor(random() * MESSAGE_PALETTE.length);
      const streamIndex = Math.min(
        MESSAGE_STREAM_ORIGINS.length - 1,
        Math.floor(
          ((cell.column + 0.5) / width) * MESSAGE_STREAM_ORIGINS.length,
        ),
      );
      const streamOrigin = MESSAGE_STREAM_ORIGINS[streamIndex];
      const origin = [
        streamOrigin[0] + (random() - 0.5) * 16,
        streamOrigin[1] + (random() - 0.5) * 11,
        streamOrigin[2] + (random() - 0.5) * 18,
      ] as const;
      const target = [
        (cell.column - centerColumn) * cellSpacing + localX,
        COTTAGE_GARDEN_SKY_ANIMATION.messageBaseHeightMeters +
          (6 - cell.row) *
            COTTAGE_GARDEN_SKY_ANIMATION.messageRowSpacingMeters +
          localY,
        COTTAGE_GARDEN_SKY_ANIMATION.messageDepthMeters +
          (random() - 0.5) * 2.8,
      ] as const;
      const deltaX = target[0] - origin[0];
      const deltaY = target[1] - origin[1];
      const planarLength = Math.hypot(deltaX, deltaY) || 1;
      const bendDirection = streamIndex % 2 === 0 ? 1 : -1;
      const bendStrength = 29 + streamIndex * 1.4 + (random() - 0.5) * 6;
      stars.push({
        id: `romance-star-${String(cellIndex + 1).padStart(3, "0")}-${sampleIndex + 1}`,
        origin,
        target,
        streamBend: [
          (-deltaY / planarLength) * bendStrength * bendDirection,
          (deltaX / planarLength) * bendStrength * bendDirection,
          (random() - 0.5) * 12,
        ],
        streamPhase: random(),
        color: MESSAGE_PALETTE[paletteIndex],
        size: 4.8 + random() * 5,
        phase: random() * Math.PI * 2,
      });
    }
  });
  return stars;
}

export function resolveCottageGardenMessageStarPosition(
  star: CottageGardenMessageStar,
  timeSeconds: number,
): CottageGardenSkyVector {
  const rawProgress = clamp01(
    (timeSeconds - COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds) /
      (COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyEndSeconds -
        COTTAGE_GARDEN_SKY_ANIMATION.messageAssemblyStartSeconds),
  );
  if (rawProgress >= 1) return star.target;
  const streamEnvelope = Math.sin(rawProgress * Math.PI);
  const staggeredProgress = clamp01(
    rawProgress + (star.streamPhase - 0.5) * 0.72 * streamEnvelope,
  );
  const progress = smootherstep(staggeredProgress);
  const base = mixVector(star.origin, star.target, progress);
  const arc = Math.sin(progress * Math.PI);
  const drift =
    (1 - progress) * arc * (2.4 + Math.sin(star.phase * 1.7) * 0.9);
  return [
    base[0] +
      star.streamBend[0] * arc +
      Math.cos(timeSeconds * 1.24 + star.phase) * drift,
    base[1] +
      star.streamBend[1] * arc +
      Math.sin(timeSeconds * 1.08 + star.phase * 1.13) * drift * 0.72,
    base[2] +
      star.streamBend[2] * arc +
      Math.sin(timeSeconds * 0.88 + star.phase * 0.71) * drift * 0.44,
  ];
}

export function createCottageGardenBackgroundStars(
  count = COTTAGE_GARDEN_SKY_ANIMATION.backgroundStarCount,
  seed = mixBits(COTTAGE_GARDEN_SKY_ANIMATION.seed ^ 0x51a7_9b3d),
) {
  const boundedCount = Math.max(0, Math.floor(count));
  const random = randomFactory(seed);
  const stars: CottageGardenBackgroundStar[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < boundedCount; index += 1) {
    const radius = 520 + random() * 160;
    const heightRatio =
      0.025 + 0.95 * ((index + random()) / Math.max(1, boundedCount));
    const horizontalRatio = Math.sqrt(Math.max(0, 1 - heightRatio ** 2));
    const azimuth =
      index * goldenAngle + (random() - 0.5) * goldenAngle * 0.42;
    const paletteIndex = Math.floor(random() * BACKGROUND_PALETTE.length);
    const brightness = random();
    stars.push({
      id: `background-star-${String(index + 1).padStart(4, "0")}`,
      position: [
        Math.cos(azimuth) * horizontalRatio * radius,
        heightRatio * radius,
        Math.sin(azimuth) * horizontalRatio * radius,
      ],
      color: BACKGROUND_PALETTE[paletteIndex],
      size: 0.9 + brightness ** 4 * 3.5,
      phase: random() * Math.PI * 2,
    });
  }
  return stars;
}

export function sampleCottageGardenMeteor(
  meteor: CottageGardenMeteorDefinition,
  timeSeconds: number,
): CottageGardenMeteorSample {
  const rawProgress =
    (timeSeconds - meteor.startsAtSeconds) / meteor.durationSeconds;
  if (rawProgress < 0) {
    return {
      active: false,
      progress: 0,
      opacity: 0,
      trailScale: 0,
      head: meteor.start,
    };
  }
  if (rawProgress > 1) {
    const afterglowProgress =
      (timeSeconds - meteor.startsAtSeconds - meteor.durationSeconds) /
      meteor.afterglowSeconds;
    if (afterglowProgress > 1) {
      return {
        active: false,
        progress: 1,
        opacity: 0,
        trailScale: 0,
        head: meteor.end,
      };
    }
    const travel = smootherstep(afterglowProgress) * 0.08;
    return {
      active: true,
      progress: 1,
      opacity: (1 - smootherstep(afterglowProgress)) * 0.34,
      trailScale: 1 - smootherstep(afterglowProgress) * 0.72,
      head: [
        meteor.end[0] + (meteor.end[0] - meteor.start[0]) * travel,
        meteor.end[1] + (meteor.end[1] - meteor.start[1]) * travel,
        meteor.end[2] + (meteor.end[2] - meteor.start[2]) * travel,
      ],
    };
  }
  const progress = rawProgress * (0.96 + rawProgress * 0.04);
  const fadeIn = smootherstep(rawProgress / 0.08);
  const fadeOut = 1 - smootherstep((rawProgress - 0.72) / 0.28) * 0.66;
  return {
    active: true,
    progress,
    opacity: fadeIn * fadeOut,
    trailScale: smootherstep(rawProgress / 0.2),
    head: mixVector(meteor.start, meteor.end, progress),
  };
}

/** 以确定性亮度结节模拟流星体消融，尾迹比例 0 为亮核、1 为尾端。 */
export function sampleCottageGardenMeteorAblation(
  meteor: CottageGardenMeteorDefinition,
  timeSeconds: number,
  trailRatio: number,
) {
  const ratio = clamp01(trailRatio);
  const phase =
    meteor.startsAtSeconds * 11.7 +
    meteor.durationSeconds * 7.3 +
    meteor.trailLength * 0.017;
  const localTime = Math.max(0, timeSeconds - meteor.startsAtSeconds);
  const rawProgress = clamp01(localTime / meteor.durationSeconds);
  const fineVariation =
    0.84 +
    Math.sin(ratio * 31 + phase) * 0.09 +
    Math.sin(ratio * 83 - phase * 1.7) * 0.045;
  const knotCenter = 0.16 + ((phase * 0.137) % 0.2);
  const knotDistance = (ratio - knotCenter) / 0.055;
  const ablationKnot = Math.exp(-(knotDistance * knotDistance)) * 0.24;
  const gapCenter = 0.52 + ((phase * 0.071) % 0.16);
  const gapDistance = (ratio - gapCenter) / 0.04;
  const breakupGap = 1 - Math.exp(-(gapDistance * gapDistance)) * 0.22;
  const tailFade = (1 - ratio) ** 1.62;
  const headPulse =
    0.84 +
    Math.sin(localTime * 41 + phase) * 0.1 +
    Math.sin(localTime * 67 - phase) * 0.045;
  const fragmentWindow =
    smootherstep((rawProgress - 0.3) / 0.13) *
    (1 - smootherstep((rawProgress - 0.86) / 0.14));

  return {
    trailOpacity: Math.max(
      0,
      Math.min(
        1.15,
        meteor.brightness *
          tailFade *
          Math.max(0.42, fineVariation + ablationKnot) *
          breakupGap,
      ),
    ),
    headOpacity: Math.max(
      0,
      Math.min(1.2, meteor.brightness * headPulse),
    ),
    fragmentOpacity: Math.max(
      0,
      Math.min(1, meteor.brightness * fragmentWindow * headPulse),
    ),
  } as const;
}
