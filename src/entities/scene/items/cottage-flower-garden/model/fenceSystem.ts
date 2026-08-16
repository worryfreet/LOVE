import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "./gardenLayout";

export type FencePoint = readonly [number, number];
export type FencePostKind = "regular" | "corner" | "gate";

export interface FenceSectionOptions {
  id: string;
  start: FencePoint;
  end: FencePoint;
  spacing: number;
  boardSpacing: number;
  railHeights: readonly number[];
}

export interface FencePostOccurrence {
  id: string;
  family: "FencePost" | "CornerPost";
  kind: FencePostKind;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  tone: number;
  lean: number;
}

export interface FencePostCapOccurrence {
  id: string;
  family: "FencePostCap";
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  rotationY: number;
  tone: number;
  postId: string;
}

export interface FenceBoxOccurrence {
  id: string;
  family: "FenceBoard" | "FenceSection" | "Gate";
  kind: "board" | "rail" | "brace";
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  rotationY: number;
  rotationZ: number;
  tone: number;
  weathering: number;
}

export interface FenceHardwareOccurrence {
  id: string;
  family: "GateHardware";
  kind: "hinge-strap" | "hinge-pin" | "latch" | "bolt";
  primitive: "box" | "cylinder" | "sphere";
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  rotationY: number;
}

export interface GateLeaf {
  id: string;
  family: "Gate";
  side: "west" | "east";
  pivot: FencePoint;
  direction: FencePoint;
  width: number;
  openAngleDegrees: number;
}

export interface FenceSystemOptions {
  gardenWidth: number;
  gardenLength: number;
  gateWidth: number;
  postSpacing: number;
  boardSpacing: number;
  railHeights: readonly number[];
  height: number;
}

export interface FenceSystemResult {
  options: FenceSystemOptions;
  sections: readonly FenceSection[];
  posts: readonly FencePostOccurrence[];
  postCaps: readonly FencePostCapOccurrence[];
  boards: readonly FenceBoxOccurrence[];
  rails: readonly FenceBoxOccurrence[];
  gates: readonly GateLeaf[];
  gateParts: readonly FenceBoxOccurrence[];
  hardware: readonly FenceHardwareOccurrence[];
  measurements: {
    perimeter: number;
    fencedLength: number;
    gateOpeningWidth: number;
  };
}

/** 帽体严格消费桩身中心与顶面，禁止在渲染层按索引制造偏移。 */
export function createFencePostCapOccurrence(
  post: FencePostOccurrence,
): FencePostCapOccurrence {
  const capHeight = 0.18;
  const postTop = post.position[1] + post.size[1] / 2;
  return {
    id: `${post.id}.cap`,
    family: "FencePostCap",
    position: [post.position[0], postTop + capHeight / 2 - 0.006, post.position[2]],
    size: [post.size[0] * 1.06, capHeight, post.size[2] * 1.06],
    rotationY: Math.PI / 4,
    tone: post.tone,
    postId: post.id,
  };
}

function assertPositive(label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} 必须是正数`);
  }
}

function interpolate(start: FencePoint, end: FencePoint, progress: number) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ] as const;
}

function yawFromDirection(directionX: number, directionZ: number) {
  return Math.atan2(-directionZ, directionX);
}

function stableUnit(id: string, salt = 0) {
  let value = 2_166_136_261 ^ salt;
  for (let index = 0; index < id.length; index += 1) {
    value ^= id.charCodeAt(index);
    value = Math.imul(value, 16_777_619);
  }
  return (value >>> 0) / 4_294_967_295;
}

/** 单段围栏只消费起点、终点和间距，不持有庭院全局尺寸。 */
export class FenceSection {
  readonly id: string;
  readonly start: FencePoint;
  readonly end: FencePoint;
  readonly spacing: number;
  readonly boardSpacing: number;
  readonly railHeights: readonly number[];
  readonly length: number;
  readonly rotationY: number;

  constructor(options: FenceSectionOptions) {
    assertPositive("围栏柱间距", options.spacing);
    assertPositive("围栏板间距", options.boardSpacing);
    const deltaX = options.end[0] - options.start[0];
    const deltaZ = options.end[1] - options.start[1];
    const length = Math.hypot(deltaX, deltaZ);
    assertPositive("围栏段长度", length);
    this.id = options.id;
    this.start = options.start;
    this.end = options.end;
    this.spacing = options.spacing;
    this.boardSpacing = options.boardSpacing;
    this.railHeights = options.railHeights;
    this.length = length;
    this.rotationY = yawFromDirection(deltaX / length, deltaZ / length);
  }

  createPostPoints() {
    const intervals = Math.ceil(this.length / this.spacing);
    return Array.from({ length: intervals + 1 }, (_, index) =>
      interpolate(this.start, this.end, index / intervals),
    );
  }

  createBoards(height: number) {
    const count = Math.max(1, Math.floor(this.length / this.boardSpacing));
    const directionX = (this.end[0] - this.start[0]) / this.length;
    const directionZ = (this.end[1] - this.start[1]) / this.length;
    return Array.from({ length: count }, (_, index): FenceBoxOccurrence => {
      const id = `${this.id}.board-${index + 1}`;
      const [baseX, baseZ] = interpolate(
        this.start,
        this.end,
        (index + 0.5) / count,
      );
      const alongOffset =
        (stableUnit(id, 7) - 0.5) * Math.min(this.boardSpacing * 0.86, 0.28);
      const depthOffset = (stableUnit(id, 13) - 0.5) * 0.08;
      const x = baseX + directionX * alongOffset - directionZ * depthOffset;
      const z = baseZ + directionZ * alongOffset + directionX * depthOffset;
      const breakage = stableUnit(id, 101);
      const heightScale =
        breakage < 0.04
          ? 0.5 + breakage * 4.2
          : 0.9 + (stableUnit(id, 11) - 0.5) * 0.22;
      const boardHeight = height * 0.78 * heightScale;
      return {
        id,
        family: "FenceBoard",
        kind: "board",
        position: [x, boardHeight / 2 + 0.03, z],
        size: [
          0.12 + stableUnit(id, 19) * 0.11,
          boardHeight,
          0.055 + stableUnit(id, 23) * 0.075,
        ],
        rotationY: this.rotationY,
        rotationZ: (stableUnit(id, 31) - 0.5) * 0.12,
        tone: stableUnit(id, 37),
        weathering: stableUnit(id, 41),
      };
    });
  }

  createRails() {
    const intervals = Math.ceil(this.length / this.spacing);
    const segmentLength = this.length / intervals;
    return this.railHeights.flatMap((height, railIndex) =>
      Array.from({ length: intervals }, (_, segmentIndex) => {
        const id = `${this.id}.rail-${railIndex + 1}.segment-${segmentIndex + 1}`;
        const [centerX, centerZ] = interpolate(
          this.start,
          this.end,
          (segmentIndex + 0.5) / intervals,
        );
        return {
          id,
          family: "FenceSection" as const,
          kind: "rail" as const,
          position: [
            centerX,
            height + (stableUnit(id, 43) - 0.5) * 0.045,
            centerZ,
          ] as const,
          size: [
            segmentLength * (0.94 + stableUnit(id, 45) * 0.045),
            0.075 + stableUnit(id, 47) * 0.04,
            0.065 + stableUnit(id, 49) * 0.035,
          ] as const,
          rotationY: this.rotationY,
          rotationZ: (stableUnit(id, 51) - 0.5) * 0.035,
          tone: stableUnit(id, 53),
          weathering: stableUnit(id, 55),
        };
      }),
    );
  }
}

function positionKey(point: FencePoint) {
  return `${point[0].toFixed(6)}:${point[1].toFixed(6)}`;
}

function createGateParts(gate: GateLeaf, height: number) {
  const parts: FenceBoxOccurrence[] = [];
  const boardCount = Math.max(3, Math.round(gate.width / 0.34));
  const rotationY = yawFromDirection(gate.direction[0], gate.direction[1]);

  for (let index = 0; index < boardCount; index += 1) {
    const distance = ((index + 0.5) / boardCount) * gate.width;
    const x = gate.pivot[0] + gate.direction[0] * distance;
    const z = gate.pivot[1] + gate.direction[1] * distance;
    const id = `${gate.id}.board-${index + 1}`;
    const boardHeight = height * (0.76 + stableUnit(id, 61) * 0.16);
    parts.push({
      id,
      family: "Gate",
      kind: "board",
      position: [x, boardHeight / 2 + 0.04, z],
      size: [0.13 + stableUnit(id, 67) * 0.1, boardHeight, 0.085],
      rotationY,
      rotationZ: (stableUnit(id, 71) - 0.5) * 0.1,
      tone: stableUnit(id, 73),
      weathering: stableUnit(id, 79),
    });
  }

  const centerX = gate.pivot[0] + gate.direction[0] * gate.width * 0.5;
  const centerZ = gate.pivot[1] + gate.direction[1] * gate.width * 0.5;
  for (const [index, y] of [0.43, 0.93].entries()) {
    parts.push({
      id: `${gate.id}.rail-${index + 1}`,
      family: "Gate",
      kind: "rail",
      position: [centerX, y, centerZ],
      size: [gate.width, 0.11, 0.1],
      rotationY,
      rotationZ: 0,
      tone: stableUnit(`${gate.id}.rail-${index + 1}`, 83),
      weathering: stableUnit(`${gate.id}.rail-${index + 1}`, 89),
    });
  }

  const braceRise = height * 0.56;
  const braceAngle = Math.atan2(braceRise, gate.width * 0.82);
  parts.push({
    id: `${gate.id}.diagonal-brace`,
    family: "Gate",
    kind: "brace",
    position: [centerX, 0.69, centerZ],
    size: [Math.hypot(gate.width * 0.82, braceRise), 0.17, 0.15],
    rotationY,
    rotationZ: gate.side === "west" ? braceAngle : -braceAngle,
    tone: stableUnit(gate.id, 97),
    weathering: stableUnit(gate.id, 101),
  });
  return parts;
}

function createGateHardware(gate: GateLeaf): FenceHardwareOccurrence[] {
  const direction = gate.direction;
  const normal = [-direction[1], direction[0]] as const;
  const rotationY = yawFromDirection(direction[0], direction[1]);
  const occurrences: FenceHardwareOccurrence[] = [];
  for (const [index, y] of [0.43, 0.95].entries()) {
    occurrences.push(
      {
        id: `${gate.id}.hinge-strap-${index + 1}`,
        family: "GateHardware",
        kind: "hinge-strap",
        primitive: "box",
        position: [
          gate.pivot[0] + direction[0] * 0.23 + normal[0] * 0.06,
          y,
          gate.pivot[1] + direction[1] * 0.23 + normal[1] * 0.06,
        ],
        size: [0.54, 0.075, 0.045],
        rotationY,
      },
      {
        id: `${gate.id}.hinge-pin-${index + 1}`,
        family: "GateHardware",
        kind: "hinge-pin",
        primitive: "cylinder",
        position: [
          gate.pivot[0] + normal[0] * 0.067,
          y,
          gate.pivot[1] + normal[1] * 0.067,
        ],
        size: [0.038, 0.19, 0.038],
        rotationY,
      },
      {
        id: `${gate.id}.hinge-bolt-${index + 1}`,
        family: "GateHardware",
        kind: "bolt",
        primitive: "sphere",
        position: [
          gate.pivot[0] + direction[0] * 0.35 + normal[0] * 0.082,
          y,
          gate.pivot[1] + direction[1] * 0.35 + normal[1] * 0.082,
        ],
        size: [0.045, 0.045, 0.045],
        rotationY,
      },
    );
  }
  occurrences.push({
    id: `${gate.id}.latch-plate`,
    family: "GateHardware",
    kind: "latch",
    primitive: "box",
    position: [
      gate.pivot[0] + direction[0] * (gate.width - 0.18) + normal[0] * 0.066,
      0.76,
      gate.pivot[1] + direction[1] * (gate.width - 0.18) + normal[1] * 0.066,
    ],
    size: [0.26, 0.15, 0.045],
    rotationY,
  });
  return occurrences;
}

function resolvePostKind(
  point: FencePoint,
  halfWidth: number,
  halfLength: number,
  halfGate: number,
): FencePostKind {
  const epsilon = 0.000_001;
  const atSouth = Math.abs(point[1] - halfLength) < epsilon;
  if (atSouth && Math.abs(Math.abs(point[0]) - halfGate) < epsilon)
    return "gate";
  const atEastWest = Math.abs(Math.abs(point[0]) - halfWidth) < epsilon;
  const atNorthSouth = Math.abs(Math.abs(point[1]) - halfLength) < epsilon;
  return atEastWest && atNorthSouth ? "corner" : "regular";
}

function createPostOccurrence(
  point: FencePoint,
  kind: FencePostKind,
  height: number,
): FencePostOccurrence {
  const idKey = positionKey(point);
  const sizeVariation = kind === "regular" ? stableUnit(idKey, 101) : 0.5;
  const size =
    (kind === "gate" ? 0.165 : kind === "corner" ? 0.185 : 0.13) +
    (sizeVariation - 0.5) * 0.038;
  const postHeight =
    height +
    (kind === "gate" ? 0.12 : kind === "corner" ? 0.08 : 0) +
    (kind === "regular" ? (stableUnit(idKey, 105) - 0.5) * 0.16 : 0);
  return {
    id: `fence.${kind}-post-${positionKey(point)}`,
    family: kind === "corner" ? "CornerPost" : "FencePost",
    kind,
    position: [point[0], postHeight / 2, point[1]],
    size: [size, postHeight, size],
    tone: stableUnit(idKey, 103),
    lean: kind === "regular" ? (stableUnit(idKey, 107) - 0.5) * 0.12 : 0,
  };
}

export function createFenceSystem(
  options: FenceSystemOptions,
): FenceSystemResult {
  assertPositive("庭院宽度", options.gardenWidth);
  assertPositive("庭院长度", options.gardenLength);
  assertPositive("大门宽度", options.gateWidth);
  if (options.gateWidth >= options.gardenWidth) {
    throw new Error("大门宽度必须小于庭院宽度");
  }
  const halfWidth = options.gardenWidth / 2;
  const halfLength = options.gardenLength / 2;
  const halfGate = options.gateWidth / 2;
  const sectionOptions: FenceSectionOptions[] = [
    {
      id: "fence.section-west",
      start: [-halfWidth, -halfLength],
      end: [-halfWidth, halfLength],
      spacing: options.postSpacing,
      boardSpacing: options.boardSpacing,
      railHeights: options.railHeights,
    },
    {
      id: "fence.section-north",
      start: [-halfWidth, -halfLength],
      end: [halfWidth, -halfLength],
      spacing: options.postSpacing,
      boardSpacing: options.boardSpacing,
      railHeights: options.railHeights,
    },
    {
      id: "fence.section-east",
      start: [halfWidth, -halfLength],
      end: [halfWidth, halfLength],
      spacing: options.postSpacing,
      boardSpacing: options.boardSpacing,
      railHeights: options.railHeights,
    },
    {
      id: "fence.section-south-west",
      start: [-halfWidth, halfLength],
      end: [-halfGate, halfLength],
      spacing: options.postSpacing,
      boardSpacing: options.boardSpacing,
      railHeights: options.railHeights,
    },
    {
      id: "fence.section-south-east",
      start: [halfGate, halfLength],
      end: [halfWidth, halfLength],
      spacing: options.postSpacing,
      boardSpacing: options.boardSpacing,
      railHeights: options.railHeights,
    },
  ];
  const sections = sectionOptions.map(
    (definition) => new FenceSection(definition),
  );
  const postPoints = new Map<string, FencePoint>();
  for (const section of sections) {
    for (const point of section.createPostPoints()) {
      postPoints.set(positionKey(point), point);
    }
  }
  const posts = [...postPoints.values()].map((point) =>
    createPostOccurrence(
      point,
      resolvePostKind(point, halfWidth, halfLength, halfGate),
      options.height,
    ),
  );
  const postCaps = posts.map(createFencePostCapOccurrence);
  const boards = sections.flatMap((section) =>
    section.createBoards(options.height),
  );
  const rails = sections.flatMap((section) => section.createRails());
  const openAngleDegrees = 58;
  const openAngle = (openAngleDegrees * Math.PI) / 180;
  const gates: GateLeaf[] = [
    {
      id: "gate.leaf-west",
      family: "Gate",
      side: "west",
      pivot: [-halfGate, halfLength],
      direction: [Math.cos(openAngle), -Math.sin(openAngle)],
      width: halfGate - 0.12,
      openAngleDegrees,
    },
    {
      id: "gate.leaf-east",
      family: "Gate",
      side: "east",
      pivot: [halfGate, halfLength],
      direction: [-Math.cos(openAngle), -Math.sin(openAngle)],
      width: halfGate - 0.12,
      openAngleDegrees,
    },
  ];
  const gateParts = gates.flatMap((gate) =>
    createGateParts(gate, options.height),
  );
  const hardware = gates.flatMap(createGateHardware);

  return {
    options,
    sections,
    posts,
    postCaps,
    boards,
    rails,
    gates,
    gateParts,
    hardware,
    measurements: {
      perimeter: options.gardenWidth * 2 + options.gardenLength * 2,
      fencedLength:
        options.gardenWidth * 2 + options.gardenLength * 2 - options.gateWidth,
      gateOpeningWidth: options.gateWidth,
    },
  };
}

export function createCottageFlowerGardenFenceSystem() {
  const { garden, fence } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  return createFenceSystem({
    gardenWidth: garden.width,
    gardenLength: garden.length,
    gateWidth: fence.gateWidth,
    postSpacing: fence.postSpacing,
    boardSpacing: fence.boardSpacing,
    railHeights: fence.railHeights,
    height: fence.height,
  });
}

export const COTTAGE_FENCE_SYSTEM = createCottageFlowerGardenFenceSystem();
