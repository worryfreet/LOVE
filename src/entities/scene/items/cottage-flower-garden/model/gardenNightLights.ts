import {
  resolveStringLightPath,
  type StringLightPoint,
} from "../../../../part/items/cottage-string-lights/lib/stringLightPath";
import { COTTAGE_ARCHITECTURE } from "./cottageArchitecture";
import { COTTAGE_FENCE_SYSTEM } from "./fenceSystem";

export type CottageGardenNightLightZone = "fence" | "cottage";

export interface CottageGardenNightLightRouteDefinition {
  readonly id: string;
  readonly zone: CottageGardenNightLightZone;
  readonly points: readonly StringLightPoint[];
  readonly bulbSpacing: number;
  readonly sag: number;
}

export interface CottageGardenNightLightBulb {
  readonly id: string;
  readonly routeId: string;
  readonly zone: CottageGardenNightLightZone;
  readonly position: StringLightPoint;
  readonly tangent: StringLightPoint;
  readonly color: string;
  readonly shimmerPhase: number;
}

export interface CottageGardenNightLightRoute {
  readonly id: string;
  readonly zone: CottageGardenNightLightZone;
  readonly controlPoints: readonly StringLightPoint[];
  readonly sampledPoints: readonly StringLightPoint[];
  readonly arcLength: number;
  readonly bulbs: readonly CottageGardenNightLightBulb[];
}

export interface CottageGardenNightLightLayout {
  readonly routes: readonly CottageGardenNightLightRoute[];
  readonly bulbs: readonly CottageGardenNightLightBulb[];
  readonly cableSegmentPositions: Float32Array;
  readonly measurements: {
    readonly routeCount: number;
    readonly fenceRouteCount: number;
    readonly cottageRouteCount: number;
    readonly bulbCount: number;
    readonly totalArcLength: number;
  };
}

export const COTTAGE_GARDEN_NIGHT_LIGHT_PALETTE = [
  "#ffd06a",
  "#ff7fa4",
  "#73d9ff",
  "#8ce6b0",
  "#ae93ff",
] as const;

function stableUnit(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function smoothstep(value: number) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
}

/** 黄昏后段渐亮、傍晚保持、接近清晨时渐熄，跨周期保持连续。 */
export function sampleCottageGardenNightLightFactor(absolutePhase: number) {
  if (!Number.isFinite(absolutePhase)) return 0;
  const phase = ((absolutePhase % 1) + 1) % 1;
  const duskFadeIn = smoothstep((phase - 0.56) / 0.14);
  const dawnFadeOut = 1 - smoothstep((phase - 0.93) / 0.07);
  return duskFadeIn * dawnFadeOut;
}

function createFenceRoutes(): readonly CottageGardenNightLightRouteDefinition[] {
  const cableY = COTTAGE_FENCE_SYSTEM.options.height + 0.17;
  const boundaryRoutes = COTTAGE_FENCE_SYSTEM.sections.map((section) => ({
    id: `night-light.${section.id}`,
    zone: "fence" as const,
    points: section
      .createPostPoints()
      .map(([x, z]) => [x, cableY, z] as const),
    bulbSpacing: 0.58,
    sag: 0.105,
  }));
  const halfGate = COTTAGE_FENCE_SYSTEM.options.gateWidth / 2;
  const gateZ = COTTAGE_FENCE_SYSTEM.options.gardenLength / 2 + 0.035;
  return [
    ...boundaryRoutes,
    {
      id: "night-light.fence.gate-garland",
      zone: "fence",
      points: [
        [-halfGate, cableY + 0.02, gateZ],
        [-0.92, cableY + 0.7, gateZ],
        [0, cableY + 0.88, gateZ],
        [0.92, cableY + 0.7, gateZ],
        [halfGate, cableY + 0.02, gateZ],
      ],
      bulbSpacing: 0.36,
      sag: 0.04,
    },
  ];
}

function createCottageRoutes(): readonly CottageGardenNightLightRouteDefinition[] {
  const { envelope, datums, roof } = COTTAGE_ARCHITECTURE;
  const halfWidth = envelope.width / 2;
  const halfDepth = envelope.depth / 2;
  const roofEdgeX = halfWidth + roof.overhang - 0.08;
  const frontZ = envelope.centerZ + halfDepth + 0.15;
  const backZ = envelope.centerZ - halfDepth - 0.15;
  const eaveY = datums.eave + 0.025;
  const ridgeY = datums.ridge + 0.015;
  const sideSpan = (x: number): readonly StringLightPoint[] => [
    [x, eaveY, backZ],
    [x, eaveY + 0.035, envelope.centerZ],
    [x, eaveY, frontZ],
  ];

  return [
    {
      id: "night-light.cottage.front-eave",
      zone: "cottage",
      points: [
        [-halfWidth, eaveY - 0.09, frontZ + 0.035],
        [0, eaveY - 0.045, frontZ + 0.055],
        [halfWidth, eaveY - 0.09, frontZ + 0.035],
      ],
      bulbSpacing: 0.37,
      sag: 0.055,
    },
    {
      id: "night-light.cottage.front-gable",
      zone: "cottage",
      points: [
        [-roofEdgeX, eaveY, frontZ],
        [0, ridgeY, frontZ],
        [roofEdgeX, eaveY, frontZ],
      ],
      bulbSpacing: 0.39,
      sag: 0.025,
    },
    {
      id: "night-light.cottage.back-gable",
      zone: "cottage",
      points: [
        [-roofEdgeX, eaveY, backZ],
        [0, ridgeY, backZ],
        [roofEdgeX, eaveY, backZ],
      ],
      bulbSpacing: 0.43,
      sag: 0.025,
    },
    {
      id: "night-light.cottage.west-eave",
      zone: "cottage",
      points: sideSpan(-roofEdgeX),
      bulbSpacing: 0.43,
      sag: 0.055,
    },
    {
      id: "night-light.cottage.east-eave",
      zone: "cottage",
      points: sideSpan(roofEdgeX),
      bulbSpacing: 0.43,
      sag: 0.055,
    },
  ];
}

export const COTTAGE_GARDEN_NIGHT_LIGHT_ROUTE_DEFINITIONS = [
  ...createFenceRoutes(),
  ...createCottageRoutes(),
] as const;

export function createCottageGardenNightLightLayout(
  definitions: readonly CottageGardenNightLightRouteDefinition[] =
    COTTAGE_GARDEN_NIGHT_LIGHT_ROUTE_DEFINITIONS,
): CottageGardenNightLightLayout {
  let globalBulbIndex = 0;
  const routes = definitions.map((definition) => {
    const resolved = resolveStringLightPath(
      definition.points,
      definition.bulbSpacing,
      definition.sag,
      160,
      10,
    );
    const bulbs = resolved.bulbs.map((placement, routeBulbIndex) => {
      const id = `${definition.id}.bulb-${routeBulbIndex + 1}`;
      const colorIndex = Math.floor(
        stableUnit(`${id}.color`) * COTTAGE_GARDEN_NIGHT_LIGHT_PALETTE.length,
      );
      globalBulbIndex += 1;
      return {
        id,
        routeId: definition.id,
        zone: definition.zone,
        position: placement.position,
        tangent: placement.tangent,
        color: COTTAGE_GARDEN_NIGHT_LIGHT_PALETTE[colorIndex],
        shimmerPhase: stableUnit(`${id}.shimmer`) * Math.PI * 2,
      } satisfies CottageGardenNightLightBulb;
    });
    return {
      id: definition.id,
      zone: definition.zone,
      controlPoints: resolved.controlPoints,
      sampledPoints: resolved.sampledPoints,
      arcLength: resolved.arcLength,
      bulbs,
    } satisfies CottageGardenNightLightRoute;
  });
  const bulbs = routes.flatMap((route) => route.bulbs);
  const cablePositions: number[] = [];
  for (const route of routes) {
    for (let index = 1; index < route.sampledPoints.length; index += 1) {
      cablePositions.push(
        ...route.sampledPoints[index - 1],
        ...route.sampledPoints[index],
      );
    }
  }
  return {
    routes,
    bulbs,
    cableSegmentPositions: new Float32Array(cablePositions),
    measurements: {
      routeCount: routes.length,
      fenceRouteCount: routes.filter((route) => route.zone === "fence").length,
      cottageRouteCount: routes.filter((route) => route.zone === "cottage").length,
      bulbCount: globalBulbIndex,
      totalArcLength: routes.reduce((sum, route) => sum + route.arcLength, 0),
    },
  };
}

export const COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT =
  createCottageGardenNightLightLayout();
