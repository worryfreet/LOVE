import { CatmullRomCurve3, Vector3 } from "three";
import { COTTAGE_EXTERIOR_KIT } from "./cottageExterior";
import { COTTAGE_FLOWER_GARDEN_LAYOUT } from "./gardenLayout";

export type GardenVineVector = readonly [number, number, number];
export type GardenVineHostAxis = "x" | "z";

export interface GardenVineHostSurface {
  readonly id: string;
  readonly axis: GardenVineHostAxis;
  readonly fixed: number;
  readonly uRange: readonly [number, number];
  readonly yRange: readonly [number, number];
  readonly normal: GardenVineVector;
  readonly offsetMeters: number;
  readonly exclusions: readonly {
    readonly id: string;
    readonly uRange: readonly [number, number];
    readonly yRange: readonly [number, number];
  }[];
}

export interface GardenVineNode {
  readonly id: string;
  readonly hostId: string;
  readonly pathId: string;
  readonly position: GardenVineVector;
  readonly normal: GardenVineVector;
  readonly tangent: GardenVineVector;
  readonly radiusMeters: number;
  readonly distanceMeters: number;
}

export interface GardenVinePath {
  readonly id: string;
  readonly hostId: string;
  readonly parentPathId: string | null;
  readonly nodes: readonly GardenVineNode[];
}

export interface GardenMorningGloryAttachment {
  readonly id: string;
  readonly pathId: string;
  readonly kind: "leaf" | "bloom";
  readonly position: GardenVineVector;
  readonly normal: GardenVineVector;
  readonly direction: GardenVineVector;
  readonly scale: number;
  readonly phase: number;
}

export interface CottageGardenMorningGlorySystem {
  readonly seed: number;
  readonly hosts: readonly GardenVineHostSurface[];
  readonly paths: readonly GardenVinePath[];
  readonly attachments: readonly GardenMorningGloryAttachment[];
  readonly measurements: {
    readonly routeCount: number;
    readonly branchCount: number;
    readonly nodeCount: number;
    readonly leafCount: number;
    readonly bloomCount: number;
    readonly maximumProjectionResidualMeters: number;
  };
}

interface GardenVineRouteDefinition {
  readonly id: string;
  readonly hostId: string;
  readonly controls: readonly GardenVineVector[];
}

const SAMPLE_SPACING_METERS = 0.14;
const UINT32_RANGE = 4_294_967_296;

/** 每个房屋或围栏宿主路线槽使用三条贴面主藤，总量为原实现的三倍。 */
export const COTTAGE_GARDEN_VINES_PER_ROUTE = 3;

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function tuple(vector: Vector3): GardenVineVector {
  return [vector.x, vector.y, vector.z];
}

function createHostSurfaces() {
  const { cottage, garden } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const frontZ = cottage.centerZ + cottage.depth / 2;
  const halfCottageWidth = cottage.width / 2;
  const eaveHeight = cottage.foundationHeight + cottage.wallHeight;
  const ridgeHeight = eaveHeight + cottage.roofRise;
  const door = COTTAGE_EXTERIOR_KIT.openings.find(
    (opening) => opening.module === "Door",
  );
  const windows = COTTAGE_EXTERIOR_KIT.openings.filter(
    (opening) => opening.module === "Window",
  );
  const halfWidth = garden.width / 2;
  const halfLength = garden.length / 2;
  const windowExclusion = (side: "left" | "right") =>
    windows
      .filter((opening) =>
        side === "left" ? opening.centerX < 0 : opening.centerX > 0,
      )
      .map((opening) => ({
        id: opening.id,
        uRange: [
          opening.centerX - opening.width / 2 - 0.035,
          opening.centerX + opening.width / 2 + 0.035,
        ] as const,
        yRange: [
          opening.bottomY - 0.035,
          opening.bottomY + opening.height + 0.035,
        ] as const,
      }));
  const doorHalfWidth = door ? door.width / 2 : 0.52;
  return [
    {
      id: "vine.host.cottage-front-left",
      axis: "z",
      fixed: frontZ,
      uRange: [-halfCottageWidth + 0.1, -doorHalfWidth - 0.14],
      yRange: [cottage.foundationHeight + 0.03, eaveHeight + 0.03],
      normal: [0, 0, 1],
      offsetMeters: 0.075,
      exclusions: windowExclusion("left"),
    },
    {
      id: "vine.host.cottage-front-right",
      axis: "z",
      fixed: frontZ,
      uRange: [doorHalfWidth + 0.14, halfCottageWidth - 0.1],
      yRange: [cottage.foundationHeight + 0.03, eaveHeight + 0.03],
      normal: [0, 0, 1],
      offsetMeters: 0.075,
      exclusions: windowExclusion("right"),
    },
    {
      id: "vine.host.cottage-gable",
      axis: "z",
      fixed: frontZ,
      uRange: [-halfCottageWidth + 0.06, halfCottageWidth - 0.06],
      yRange: [eaveHeight - 0.08, ridgeHeight - 0.04],
      normal: [0, 0, 1],
      offsetMeters: 0.08,
      exclusions: [],
    },
    {
      id: "vine.host.cottage-fascia",
      axis: "z",
      fixed: frontZ,
      uRange: [-halfCottageWidth + 0.04, halfCottageWidth - 0.04],
      yRange: [eaveHeight - 0.28, eaveHeight + 0.08],
      normal: [0, 0, 1],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-front-west",
      axis: "z",
      fixed: halfLength,
      uRange: [-halfWidth, -1.6],
      yRange: [0.18, 1.34],
      normal: [0, 0, 1],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-front-east",
      axis: "z",
      fixed: halfLength,
      uRange: [1.6, halfWidth],
      yRange: [0.18, 1.34],
      normal: [0, 0, 1],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-west",
      axis: "x",
      fixed: -halfWidth,
      uRange: [-halfLength, halfLength],
      yRange: [0.18, 1.34],
      normal: [-1, 0, 0],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-east",
      axis: "x",
      fixed: halfWidth,
      uRange: [-halfLength, halfLength],
      yRange: [0.18, 1.34],
      normal: [1, 0, 0],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-back-west",
      axis: "z",
      fixed: -halfLength,
      uRange: [-halfWidth, 0],
      yRange: [0.18, 1.34],
      normal: [0, 0, -1],
      offsetMeters: 0.085,
      exclusions: [],
    },
    {
      id: "vine.host.fence-back-east",
      axis: "z",
      fixed: -halfLength,
      uRange: [0, halfWidth],
      yRange: [0.18, 1.34],
      normal: [0, 0, -1],
      offsetMeters: 0.085,
      exclusions: [],
    },
  ] as const satisfies readonly GardenVineHostSurface[];
}

function pointOnHost(
  host: GardenVineHostSurface,
  u: number,
  y: number,
): GardenVineVector {
  return host.axis === "z"
    ? [
        u,
        y,
        host.fixed + host.normal[2] * host.offsetMeters,
      ]
    : [
        host.fixed + host.normal[0] * host.offsetMeters,
        y,
        u,
      ];
}

function createRouteDefinitions(
  hosts: readonly GardenVineHostSurface[],
) {
  const host = (id: string) => {
    const resolved = hosts.find((candidate) => candidate.id === id);
    if (!resolved) throw new Error(`缺少牵牛花宿主面：${id}`);
    return resolved;
  };
  const route = (
    id: string,
    hostId: string,
    controls: readonly (readonly [number, number])[],
  ): GardenVineRouteDefinition => {
    const surface = host(hostId);
    return {
      id,
      hostId,
      controls: controls.map(([u, y]) => pointOnHost(surface, u, y)),
    };
  };
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT;
  const halfCottageWidth = cottage.width / 2;
  const wallBottom = cottage.foundationHeight + 0.04;
  const eaveHeight = cottage.foundationHeight + cottage.wallHeight;
  const ridgeHeight = eaveHeight + cottage.roofRise;
  return [
    route("vine.route.cottage-left", "vine.host.cottage-front-left", [
      [-halfCottageWidth * 0.94, wallBottom],
      [-halfCottageWidth * 0.93, mix(wallBottom, eaveHeight, 0.28)],
      [-halfCottageWidth * 0.91, mix(wallBottom, eaveHeight, 0.57)],
      [-halfCottageWidth * 0.9, mix(wallBottom, eaveHeight, 0.82)],
      [-halfCottageWidth * 0.76, eaveHeight - 0.08],
      [-halfCottageWidth * 0.52, eaveHeight + 0.01],
      [-halfCottageWidth * 0.24, eaveHeight - 0.07],
    ]),
    route("vine.route.cottage-right", "vine.host.cottage-front-right", [
      [halfCottageWidth * 0.94, wallBottom],
      [halfCottageWidth * 0.93, mix(wallBottom, eaveHeight, 0.28)],
      [halfCottageWidth * 0.91, mix(wallBottom, eaveHeight, 0.57)],
      [halfCottageWidth * 0.9, mix(wallBottom, eaveHeight, 0.82)],
      [halfCottageWidth * 0.76, eaveHeight - 0.08],
      [halfCottageWidth * 0.52, eaveHeight + 0.01],
      [halfCottageWidth * 0.24, eaveHeight - 0.07],
    ]),
    route("vine.route.cottage-gable", "vine.host.cottage-gable", [
      [-halfCottageWidth * 0.92, eaveHeight - 0.04],
      [-halfCottageWidth * 0.7, mix(eaveHeight, ridgeHeight, 0.23)],
      [-halfCottageWidth * 0.44, mix(eaveHeight, ridgeHeight, 0.5)],
      [-halfCottageWidth * 0.15, mix(eaveHeight, ridgeHeight, 0.84)],
      [0, ridgeHeight - 0.08],
      [halfCottageWidth * 0.17, mix(eaveHeight, ridgeHeight, 0.82)],
      [halfCottageWidth * 0.46, mix(eaveHeight, ridgeHeight, 0.48)],
      [halfCottageWidth * 0.72, mix(eaveHeight, ridgeHeight, 0.21)],
      [halfCottageWidth * 0.92, eaveHeight - 0.04],
    ]),
    route("vine.route.cottage-fascia", "vine.host.cottage-fascia", [
      [-halfCottageWidth * 0.94, eaveHeight - 0.18],
      [-halfCottageWidth * 0.7, eaveHeight - 0.08],
      [-halfCottageWidth * 0.45, eaveHeight - 0.2],
      [-halfCottageWidth * 0.2, eaveHeight - 0.07],
      [halfCottageWidth * 0.06, eaveHeight - 0.18],
      [halfCottageWidth * 0.32, eaveHeight - 0.06],
      [halfCottageWidth * 0.57, eaveHeight - 0.19],
      [halfCottageWidth * 0.94, eaveHeight - 0.08],
    ]),
    route("vine.route.fence-front-west", "vine.host.fence-front-west", [
      [-10.8, 0.26], [-9.3, 0.52], [-7.8, 0.42], [-6.25, 0.94],
      [-4.8, 0.58], [-3.25, 1.08], [-1.72, 0.74],
    ]),
    route("vine.route.fence-front-east", "vine.host.fence-front-east", [
      [10.8, 0.28], [9.2, 0.56], [7.65, 0.44], [6.15, 0.96],
      [4.72, 0.6], [3.2, 1.08], [1.72, 0.76],
    ]),
    route("vine.route.fence-west", "vine.host.fence-west", [
      [18.7, 0.7], [15.1, 1.06], [11.4, 0.48], [7.8, 0.98],
      [4.1, 0.54], [0.4, 1.04], [-3.4, 0.64], [-7.2, 1],
    ]),
    route("vine.route.fence-east", "vine.host.fence-east", [
      [18.7, 0.72], [15, 1.02], [11.3, 0.5], [7.7, 1],
      [4, 0.56], [0.2, 1.02], [-3.5, 0.62], [-7.2, 0.98],
    ]),
    route("vine.route.fence-back-west", "vine.host.fence-back-west", [
      [-10.8, 0.46], [-8.9, 0.98], [-6.8, 0.54], [-4.6, 1.04],
      [-2.3, 0.6], [-0.2, 0.94],
    ]),
    route("vine.route.fence-back-east", "vine.host.fence-back-east", [
      [10.8, 0.48], [8.8, 0.96], [6.7, 0.56], [4.5, 1.02],
      [2.25, 0.62], [0.2, 0.96],
    ]),
  ] as const;
}

function expandRouteDefinitions(
  definitions: readonly GardenVineRouteDefinition[],
  hosts: readonly GardenVineHostSurface[],
  vinesPerRoute: number,
  seed: number,
) {
  return definitions.flatMap((definition, definitionIndex) => {
    const host = hosts.find((candidate) => candidate.id === definition.hostId);
    if (!host) throw new Error(`缺少牵牛花宿主面：${definition.hostId}`);
    const sourceCurve = new CatmullRomCurve3(
      definition.controls.map((control) => new Vector3(...control)),
      false,
      "centripetal",
    );
    const isCottage = host.id.includes("cottage");
    const hostSpan = host.uRange[1] - host.uRange[0];
    const hostHeight = host.yRange[1] - host.yRange[0];
    return Array.from({ length: vinesPerRoute }, (_, strandIndex) => {
      if (vinesPerRoute === 1) {
        return {
          id: `${definition.id}.strand-01`,
          hostId: definition.hostId,
          controls: definition.controls,
        } satisfies GardenVineRouteDefinition;
      }
      const centeredIndex = strandIndex - (vinesPerRoute - 1) / 2;
      const strandSeed = seed + definitionIndex * 10_007 + strandIndex * 7919;
      const lateralPhase = stableUnit(strandSeed, 0, 11) * Math.PI * 2;
      const verticalPhase = stableUnit(strandSeed, 0, 12) * Math.PI * 2;
      const lateralCycles = 0.82 + stableUnit(strandSeed, 0, 13) * 0.92;
      const verticalCycles = 1.16 + stableUnit(strandSeed, 0, 14) * 1.08;
      const lateralAmplitude = Math.min(
        isCottage ? 0.42 : 0.66,
        hostSpan * (isCottage ? 0.105 : 0.045),
      );
      const verticalAmplitude = Math.min(
        isCottage ? 0.34 : 0.36,
        hostHeight *
          (host.id.includes("fascia") ? 0.34 : isCottage ? 0.12 : 0.3),
      );
      const controlCount = Math.max(7, definition.controls.length) +
        ((strandIndex * 2 + definitionIndex) % 3);
      const controls = Array.from({ length: controlCount }, (_, controlIndex) => {
        const progress = controlIndex / (controlCount - 1);
        const middleEnvelope = Math.sin(progress * Math.PI);
        const progressWarp = clamp(
          progress +
            middleEnvelope *
              (stableUnit(strandSeed, controlIndex, 15) - 0.5) *
              0.11,
          0,
          1,
        );
        const control = tuple(sourceCurve.getPointAt(progressWarp));
        const edgeEnvelope = 0.38 + middleEnvelope * 0.62;
        const lateralWave =
          Math.sin(
            progress * Math.PI * 2 * lateralCycles + lateralPhase,
          ) +
          Math.sin(
            progress * Math.PI * 2 * (lateralCycles * 1.91) + verticalPhase,
          ) *
            0.24;
        const verticalWave =
          Math.sin(
            progress * Math.PI * 2 * verticalCycles + verticalPhase,
          ) +
          Math.cos(
            progress * Math.PI * 2 * (verticalCycles * 1.67) + lateralPhase,
          ) *
            0.22;
        const lateralOffset =
          centeredIndex * (isCottage ? 0.2 : 0.3) *
            (0.48 + middleEnvelope * 0.82) +
          lateralWave * lateralAmplitude * edgeEnvelope;
        const verticalOffset =
          centeredIndex * (isCottage ? 0.07 : 0.055) *
            Math.cos(progress * Math.PI * 1.35 + lateralPhase) +
          verticalWave * verticalAmplitude * edgeEnvelope;
        const candidate: GardenVineVector =
          host.axis === "z"
            ? [control[0] + lateralOffset, control[1] + verticalOffset, control[2]]
            : [control[0], control[1] + verticalOffset, control[2] + lateralOffset];
        return projectCottageGardenVinePoint(host, candidate) ?? control;
      });
      return {
        id: `${definition.id}.strand-${String(strandIndex + 1).padStart(2, "0")}`,
        hostId: definition.hostId,
        controls,
      } satisfies GardenVineRouteDefinition;
    });
  });
}

export function projectCottageGardenVinePoint(
  host: GardenVineHostSurface,
  candidate: GardenVineVector,
) {
  const rawU = host.axis === "z" ? candidate[0] : candidate[2];
  const u = clamp(rawU, host.uRange[0], host.uRange[1]);
  const y = clamp(candidate[1], host.yRange[0], host.yRange[1]);
  if (
    host.exclusions.some(
      (exclusion) =>
        u > exclusion.uRange[0] &&
        u < exclusion.uRange[1] &&
        y > exclusion.yRange[0] &&
        y < exclusion.yRange[1],
    )
  ) {
    return null;
  }
  return pointOnHost(host, u, y);
}

function pathLength(nodes: readonly GardenVineNode[]) {
  let distance = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    distance += new Vector3(...nodes[index].position).distanceTo(
      new Vector3(...nodes[index - 1].position),
    );
  }
  return distance;
}

function buildMainPath(
  definition: GardenVineRouteDefinition,
  host: GardenVineHostSurface,
) {
  const curve = new CatmullRomCurve3(
    definition.controls.map((control) => new Vector3(...control)),
    false,
    "centripetal",
  );
  const segmentCount = Math.max(
    8,
    Math.ceil(curve.getLength() / SAMPLE_SPACING_METERS),
  );
  const nodes: GardenVineNode[] = [];
  let distanceMeters = 0;
  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const projected = projectCottageGardenVinePoint(
      host,
      tuple(curve.getPointAt(progress)),
    );
    if (!projected) continue;
    const tangent = curve.getTangentAt(progress).normalize();
    if (nodes.length > 0) {
      distanceMeters += new Vector3(...projected).distanceTo(
        new Vector3(...nodes.at(-1)!.position),
      );
    }
    nodes.push({
      id: `${definition.id}.node-${String(index + 1).padStart(3, "0")}`,
      hostId: host.id,
      pathId: definition.id,
      position: projected,
      normal: host.normal,
      tangent: tuple(tangent),
      radiusMeters: 0.0135 * (1 - progress * 0.54),
      distanceMeters,
    });
  }
  return {
    id: definition.id,
    hostId: host.id,
    parentPathId: null,
    nodes,
  } satisfies GardenVinePath;
}

/**
 * 切平面分枝每一步都重新投影回同一语义宿主；进入门窗禁区时自然终止，
 * 不用把穿模枝条留给渲染层隐藏。
 */
function buildBranches(
  path: GardenVinePath,
  host: GardenVineHostSurface,
  seed: number,
) {
  const branches: GardenVinePath[] = [];
  const stride = host.id.includes("cottage") ? 14 : 22;
  for (
    let sourceIndex = Math.max(5, Math.floor(stride * 0.6));
    sourceIndex < path.nodes.length - 5;
    sourceIndex += stride
  ) {
    const source = path.nodes[sourceIndex];
    const tangent = new Vector3(...source.tangent).normalize();
    const normal = new Vector3(...source.normal).normalize();
    const side = new Vector3().crossVectors(normal, tangent).normalize();
    const branchIndex = branches.length;
    const direction = branchIndex % 2 === 0 ? 1 : -1;
    const stepCount = 5 + Math.floor(stableUnit(seed, sourceIndex, 1) * 4);
    const stepMeters = 0.11 + stableUnit(seed, sourceIndex, 2) * 0.035;
    const pathId = `${path.id}.branch-${String(branchIndex + 1).padStart(2, "0")}`;
    const nodes: GardenVineNode[] = [];
    const candidate = new Vector3(...source.position);
    let distanceMeters = 0;
    for (let step = 0; step <= stepCount; step += 1) {
      if (step > 0) {
        const advance = tangent
          .clone()
          .multiplyScalar(stepMeters * 0.34)
          .addScaledVector(side, stepMeters * direction * (0.82 - step * 0.035))
          .add(new Vector3(0, stepMeters * 0.22, 0));
        candidate.add(advance);
      }
      const projected = projectCottageGardenVinePoint(host, tuple(candidate));
      if (!projected) break;
      if (nodes.length > 0) {
        distanceMeters += new Vector3(...projected).distanceTo(
          new Vector3(...nodes.at(-1)!.position),
        );
      }
      nodes.push({
        id: `${pathId}.node-${String(step + 1).padStart(2, "0")}`,
        hostId: host.id,
        pathId,
        position: projected,
        normal: host.normal,
        tangent: tuple(
          tangent
            .clone()
            .multiplyScalar(0.34)
            .addScaledVector(side, direction * 0.82)
            .add(new Vector3(0, 0.22, 0))
            .normalize(),
        ),
        radiusMeters: source.radiusMeters * (0.78 - (step / stepCount) * 0.6),
        distanceMeters,
      });
    }
    if (nodes.length >= 3) {
      branches.push({
        id: pathId,
        hostId: host.id,
        parentPathId: path.id,
        nodes,
      });
    }
  }
  return branches;
}

function createAttachments(
  paths: readonly GardenVinePath[],
  seed: number,
  scale: number,
) {
  const attachments: GardenMorningGloryAttachment[] = [];
  paths.forEach((path, pathIndex) => {
    const stride = path.parentPathId ? 2 : 3;
    for (let nodeIndex = 2; nodeIndex < path.nodes.length - 1; nodeIndex += stride) {
      const node = path.nodes[nodeIndex];
      const normal = new Vector3(...node.normal);
      const tangent = new Vector3(...node.tangent).normalize();
      const side = new Vector3().crossVectors(normal, tangent).normalize();
      const directionSign =
        stableUnit(seed + pathIndex * 101, nodeIndex, 3) > 0.5 ? 1 : -1;
      const direction = tangent
        .clone()
        .multiplyScalar(0.42)
        .addScaledVector(side, directionSign * 0.9)
        .normalize();
      const position = new Vector3(...node.position).addScaledVector(normal, 0.008);
      attachments.push({
        id: `${path.id}.leaf-${String(nodeIndex + 1).padStart(3, "0")}`,
        pathId: path.id,
        kind: "leaf",
        position: tuple(position),
        normal: node.normal,
        direction: tuple(direction),
        scale:
          scale *
          (0.17 + stableUnit(seed + pathIndex * 109, nodeIndex, 4) * 0.105),
        phase: stableUnit(seed + pathIndex * 113, nodeIndex, 5) * Math.PI * 2,
      });
      if (
        node.position[1] > 0.48 &&
        (nodeIndex + pathIndex * 2) % (path.parentPathId ? 7 : 9) === 0
      ) {
        attachments.push({
          id: `${path.id}.bloom-${String(nodeIndex + 1).padStart(3, "0")}`,
          pathId: path.id,
          kind: "bloom",
          position: tuple(position.clone().addScaledVector(normal, 0.025)),
          normal: node.normal,
          direction: tuple(
            tangent.clone().multiplyScalar(0.6).add(new Vector3(0, 0.38, 0)).normalize(),
          ),
          scale:
            scale *
            (0.16 + stableUnit(seed + pathIndex * 127, nodeIndex, 6) * 0.06),
          phase: stableUnit(seed + pathIndex * 131, nodeIndex, 7) * Math.PI * 2,
        });
      }
    }
  });
  return attachments;
}

function projectionResidual(
  host: GardenVineHostSurface,
  position: GardenVineVector,
) {
  const expected =
    host.fixed +
    (host.axis === "z" ? host.normal[2] : host.normal[0]) * host.offsetMeters;
  return Math.abs((host.axis === "z" ? position[2] : position[0]) - expected);
}

/**
 * 方法参考 VegetationGeneratorThreeJS @ f6c26004（MIT）：成熟骨架在加载期
 * 完整生成，使用 centripetal Catmull-Rom、固定米制采样、逐步贴面投影、
 * 切平面交替分枝和稳定节点身份；未引入其 WebGPU、画笔或生长动画。
 */
export function createCottageGardenMorningGlorySystem(options?: {
  readonly enabled?: boolean;
  readonly rootCount?: number;
  readonly vinesPerRoute?: number;
  readonly seed?: number;
  readonly scale?: number;
}): CottageGardenMorningGlorySystem {
  const seed = options?.seed ?? 109_037;
  const hosts = createHostSurfaces();
  if (options?.enabled === false || options?.rootCount === 0) {
    return {
      seed,
      hosts,
      paths: [],
      attachments: [],
      measurements: {
        routeCount: 0,
        branchCount: 0,
        nodeCount: 0,
        leafCount: 0,
        bloomCount: 0,
        maximumProjectionResidualMeters: 0,
      },
    };
  }
  const routeSlots = createRouteDefinitions(hosts).slice(
    0,
    clamp(Math.round(options?.rootCount ?? 10), 1, 10),
  );
  const vinesPerRoute = clamp(
    Math.round(options?.vinesPerRoute ?? COTTAGE_GARDEN_VINES_PER_ROUTE),
    1,
    COTTAGE_GARDEN_VINES_PER_ROUTE,
  );
  const definitions = expandRouteDefinitions(
    routeSlots,
    hosts,
    vinesPerRoute,
    seed,
  );
  const mainPaths = definitions.map((definition) => {
    const host = hosts.find((candidate) => candidate.id === definition.hostId)!;
    return buildMainPath(definition, host);
  });
  const branches = mainPaths.flatMap((path, index) => {
    const host = hosts.find((candidate) => candidate.id === path.hostId)!;
    return buildBranches(path, host, seed + index * 7_919);
  });
  const paths = [...mainPaths, ...branches].filter(
    (path) => path.nodes.length >= 2 && pathLength(path.nodes) > 0.08,
  );
  const attachments = createAttachments(paths, seed, options?.scale ?? 1);
  const maximumProjectionResidualMeters = Math.max(
    0,
    ...paths.flatMap((path) => {
      const host = hosts.find((candidate) => candidate.id === path.hostId)!;
      return path.nodes.map((node) => projectionResidual(host, node.position));
    }),
  );
  return {
    seed,
    hosts,
    paths,
    attachments,
    measurements: {
      routeCount: mainPaths.length,
      branchCount: branches.length,
      nodeCount: paths.reduce((total, path) => total + path.nodes.length, 0),
      leafCount: attachments.filter((attachment) => attachment.kind === "leaf").length,
      bloomCount: attachments.filter((attachment) => attachment.kind === "bloom").length,
      maximumProjectionResidualMeters,
    },
  };
}
