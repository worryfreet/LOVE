import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BufferGeometry,
  CatmullRomCurve3,
  ClampToEdgeWrapping,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  Euler,
  Float32BufferAttribute,
  LinearFilter,
  Matrix4,
  Quaternion,
  RGBAFormat,
  SphereGeometry,
  TubeGeometry,
  UnsignedByteType,
  Vector3,
} from "three";
import {
  FLOWER_RENDER_QUALITY_PROFILES,
  type FlowerRenderQuality,
} from "../../../model/flowerRenderQuality";
import {
  CLASSIC_ROSE_GROUND_Y,
  createClassicRoseBlueprint,
  type ClassicRoseBlueprint,
} from "./classicRoseBlueprint";
import { createBroadLeafGeometry } from "./leafGeometry";
import { createLeafOrientationQuaternion } from "./leafOrientation";
import { createPetalGeometry as createRibbonPetalGeometry } from "./geometry";
import {
  ROSE_COLOR_PRESETS,
  resolveRoseColorPreset,
  type RoseColorVariantId,
} from "./roseColorVariants";
import {
  STUDIO_PETAL_PATTERN_RESOLUTION,
  createStudioPetalPatternData,
} from "./studioPetalPattern";
import {
  studioPetalWidthAt,
  type StudioFlowerPetalPlacement,
  type StudioPetalShape,
} from "./studioFlower";
import {
  FLOWER_PETAL_WIND_ATTRIBUTES,
  applyFlowerPetalWindAttributes,
} from "./flowerWindMaterial";
import { sampleWeightedStemPoint } from "./weightedStem";

export const CLASSIC_ROSE_POPULATION_QUALITIES = [
  "ultra",
  "high",
  "medium",
  "low",
] as const satisfies readonly FlowerRenderQuality[];

export type ClassicRosePopulationQuality =
  (typeof CLASSIC_ROSE_POPULATION_QUALITIES)[number];

export const CLASSIC_ROSE_POPULATION_PETAL_COUNTS = {
  ultra: 52,
  high: 52,
  medium: 52,
  low: 52,
} as const satisfies Readonly<Record<ClassicRosePopulationQuality, number>>;

export const CLASSIC_ROSE_POPULATION_LEAF_COUNTS = {
  ultra: 6,
  high: 6,
  medium: 6,
  low: 6,
} as const satisfies Readonly<Record<ClassicRosePopulationQuality, number>>;

/**
 * 人口 LOD 仍需保留足够的横向曲率采样；低于四段宽度时，杯深和侧卷会
 * 退化成两块大三角面，入口近中景会呈现明显纸片感。
 */
export const CLASSIC_ROSE_POPULATION_PETAL_SEGMENTS = {
  ultra: { length: 40, width: 18 },
  high: { length: 16, width: 10 },
  medium: { length: 10, width: 6 },
  low: { length: 8, width: 4 },
} as const satisfies Readonly<
  Record<
    ClassicRosePopulationQuality,
    { readonly length: number; readonly width: number }
  >
>;

export interface ClassicRosePopulationPrototype {
  readonly modelId: "classic-rose";
  readonly quality: ClassicRosePopulationQuality;
  readonly blueprintFingerprint: string;
  readonly sourceHeightMeters: number;
  readonly petalGeometry: BufferGeometry;
  readonly leafGeometry: BufferGeometry;
  readonly structureGeometry: BufferGeometry;
  readonly organCounts: {
    readonly petals: number;
    readonly leaves: number;
    readonly stems: 1;
    readonly rachises: 2;
    readonly sepals: number;
    readonly thorns: number;
    readonly receptacles: 1;
  };
  dispose(): void;
}

const POPULATION_QUALITY_SET = new Set<FlowerRenderQuality>(
  CLASSIC_ROSE_POPULATION_QUALITIES,
);
const UP = new Vector3(0, 1, 0);
const ROOT_LIFT = new Matrix4().makeTranslation(0, -CLASSIC_ROSE_GROUND_Y, 0);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function smoothstep(value: number) {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
}

function fract(value: number) {
  return value - Math.floor(value);
}

function studioPetalHash3(x: number, y: number, z: number) {
  const px = fract(x * 0.3183099 + 0.1) * 17;
  const py = fract(y * 0.3183099 + 0.2) * 17;
  const pz = fract(z * 0.3183099 + 0.3) * 17;
  return fract(px * py * pz * (px + py + pz));
}

function studioPetalNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep(fract(x));
  const fy = smoothstep(fract(y));
  const fz = smoothstep(fract(z));
  const sample = (dx: number, dy: number, dz: number) =>
    studioPetalHash3(ix + dx, iy + dy, iz + dz);
  const lower = mix(
    mix(sample(0, 0, 0), sample(1, 0, 0), fx),
    mix(sample(0, 1, 0), sample(1, 1, 0), fx),
    fy,
  );
  const upper = mix(
    mix(sample(0, 0, 1), sample(1, 0, 1), fx),
    mix(sample(0, 1, 1), sample(1, 1, 1), fx),
    fy,
  );
  return mix(lower, upper, fz);
}

function studioPetalTurbulence(x: number, y: number, z: number) {
  return (
    studioPetalNoise(x, y, z) * 0.65 +
    studioPetalNoise(x * 2.3, y * 2.3, z * 2.3) * 0.35
  );
}

function solidAttribute(
  count: number,
  size: number,
  values: readonly number[],
) {
  const data = new Float32Array(count * size);
  for (let index = 0; index < count; index += 1) {
    for (let channel = 0; channel < size; channel += 1) {
      data[index * size + channel] = values[channel] ?? 0;
    }
  }
  return new Float32BufferAttribute(data, size);
}

function prepareOrganGeometry(
  source: BufferGeometry,
  color: string,
  petalMask: number,
) {
  const geometry = source;
  const position = geometry.getAttribute("position");
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  if (!geometry.getAttribute("uv")) {
    geometry.setAttribute("uv", solidAttribute(position.count, 2, [0, 0]));
  }
  if (!geometry.getAttribute("color")) {
    const resolved = new Color(color);
    geometry.setAttribute(
      "color",
      solidAttribute(position.count, 3, [resolved.r, resolved.g, resolved.b]),
    );
  }
  geometry.setAttribute(
    "flowerPetalMask",
    solidAttribute(position.count, 1, [petalMask]),
  );
  geometry.setAttribute(
    FLOWER_PETAL_WIND_ATTRIBUTES.flex,
    solidAttribute(position.count, 1, [0]),
  );
  geometry.setAttribute(
    FLOWER_PETAL_WIND_ATTRIBUTES.phase,
    solidAttribute(position.count, 1, [0]),
  );
  return geometry;
}

function mergeOwned(parts: BufferGeometry[], failureMessage: string) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error(failureMessage);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function composeTransform(
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  scale: number | readonly [number, number, number] = 1,
  order: "XYZ" | "YXZ" = "XYZ",
) {
  const scaleVector = typeof scale === "number"
    ? new Vector3(scale, scale, scale)
    : new Vector3(...scale);
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(
      new Euler(rotation[0], rotation[1], rotation[2], order),
    ),
    scaleVector,
  );
}

function crownMatrix(blueprint: ClassicRoseBlueprint) {
  return ROOT_LIFT.clone().multiply(
    composeTransform(
      [
        blueprint.stemLayout.bloomPosition[0],
        blueprint.stemLayout.bloomPosition[1],
        blueprint.stemLayout.bloomPosition[2] + blueprint.attachment.bloomDepth,
      ],
      blueprint.stemLayout.bloomRotation,
      blueprint.bloomScale,
    ),
  );
}

function studioBloomLocal(
  progress: number,
  bloomMax: number,
  transition: number,
) {
  const map = 1 - progress;
  const propagationFront = mix(-transition, 1, bloomMax);
  const mask = clamp(
    (map - propagationFront) / Math.max(transition, 0.0001),
  );
  return 1 - mask;
}

/** CPU 烘焙与 StudioPetalMaterial 相同的静态开放态；运行时风由共享 Shader 负责。 */
function studioPetalPoint(
  shape: StudioPetalShape,
  placement: StudioFlowerPetalPlacement,
  u01: number,
  v: number,
  bloomLocal: number,
) {
  const u = u01 * 2 - 1;
  const integrationSteps = 24;
  const step = v / integrationSteps;
  let angle = 0;
  let centerlineY = 0;
  let centerlineZ = 0;
  for (let index = 0; index < integrationSteps; index += 1) {
    const sample = (index + 0.5) * step;
    const density =
      shape.curlBias * Math.pow(Math.max(sample, 0.0001), shape.curlBias - 1);
    const openness = smoothstep(
      bloomLocal * (1 + shape.propagation) - sample * shape.propagation,
    );
    const curl = mix(shape.curlClosed, shape.curlOpen, openness);
    angle += curl * density * step;
    centerlineY += Math.cos(angle) * step;
    centerlineZ += Math.sin(angle) * step;
  }
  centerlineY *= shape.length;
  centerlineZ *= shape.length;
  const relax = 0.15 + 0.85 * bloomLocal;
  const wrap = 1 - bloomLocal;
  const width =
    studioPetalWidthAt(shape, v) *
    (1 + shape.asymmetry * u * relax) *
    (1 + shape.wrapWidth * wrap);
  const detailFade = smoothstep(width / 0.035);
  const x = u * width;
  let lateralDepth =
    -shape.cup * (1 + shape.wrapCup * wrap) * (1 - u * u) * width;
  lateralDepth +=
    detailFade *
    shape.waveAmplitude *
    relax *
    u *
    u *
    Math.sin(
      v * shape.waveFrequency +
        placement.seed * 17 +
        u * 2.3 +
        placement.seed,
    );
  lateralDepth +=
    detailFade * 0.01 * relax * Math.sin(placement.seed * 7 + v * 5) * v;
  lateralDepth +=
    detailFade *
    shape.noiseAmplitude *
    v *
    bloomLocal *
    (studioPetalTurbulence(
      u * 2 + placement.seed,
      v * shape.noiseFrequency,
      placement.seed * 3.7,
    ) -
      0.5) *
    2;
  const sideAngle = shape.sideCurl * x * relax;
  const sideX = Math.cos(sideAngle) * x - Math.sin(sideAngle) * lateralDepth;
  const sideZ = Math.sin(sideAngle) * x + Math.cos(sideAngle) * lateralDepth;
  const normalY = -Math.sin(angle);
  const normalZ = Math.cos(angle);
  const point = new Vector3(
    sideX,
    centerlineY + normalY * sideZ,
    centerlineZ + normalZ * sideZ,
  );
  point.y -=
    (shape.tipArc ?? 0) * u * u * smoothstep((v - 0.78) / 0.22);
  const notch = Math.exp(-Math.pow(Math.abs(u) / 0.2, 2));
  point.y -=
    (shape.tipNotch ?? 0) * notch * smoothstep((v - 0.78) / 0.22);
  point.multiplyScalar(1 + shape.shellGap * placement.progress * (1 - bloomLocal));
  point.applyAxisAngle(new Vector3(1, 0, 0), -placement.tilt * bloomLocal);
  return point;
}

function createStudioPetalSurface(
  shape: StudioPetalShape,
  placement: StudioFlowerPetalPlacement,
  bloomMax: number,
  transition: number,
  widthSegments: number,
  lengthSegments: number,
) {
  const safeWidthSegments = Math.max(2, Math.round(widthSegments));
  const safeLengthSegments = Math.max(5, Math.round(lengthSegments));
  const rowSize = safeWidthSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const tone: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const roundedTip = (shape.tipWidth ?? 0) > 0.001;
  const bloomLocal = studioBloomLocal(
    placement.progress,
    bloomMax,
    transition,
  );
  const rowCount = roundedTip
    ? safeLengthSegments + 1
    : safeLengthSegments;
  for (let yIndex = 0; yIndex < rowCount; yIndex += 1) {
    const v = yIndex / safeLengthSegments;
    for (let xIndex = 0; xIndex <= safeWidthSegments; xIndex += 1) {
      const u = xIndex / safeWidthSegments;
      const point = studioPetalPoint(
        shape,
        placement,
        u,
        v,
        bloomLocal,
      );
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
      const layerTone = (1 - v) * 0.7 + (1 - placement.progress) * 0.3;
      const brightness = mix(0.44, 1, 1 - layerTone);
      tone.push(layerTone);
      colors.push(brightness, brightness, brightness);
    }
  }
  const connectedRowCount = roundedTip
    ? safeLengthSegments
    : safeLengthSegments - 1;
  for (let yIndex = 0; yIndex < connectedRowCount; yIndex += 1) {
    for (let xIndex = 0; xIndex < safeWidthSegments; xIndex += 1) {
      const a = yIndex * rowSize + xIndex;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  if (!roundedTip) {
    const tipIndex = positions.length / 3;
    const tip = studioPetalPoint(shape, placement, 0.5, 1, bloomLocal);
    positions.push(tip.x, tip.y, tip.z);
    uvs.push(0.5, 1);
    const tipTone = (1 - placement.progress) * 0.3;
    const tipBrightness = mix(0.44, 1, 1 - tipTone);
    tone.push(tipTone);
    colors.push(tipBrightness, tipBrightness, tipBrightness);
    const lastRow = (safeLengthSegments - 1) * rowSize;
    for (let xIndex = 0; xIndex < safeWidthSegments; xIndex += 1) {
      indices.push(lastRow + xIndex, tipIndex, lastRow + xIndex + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "flowerPetalTone",
    new Float32BufferAttribute(tone, 1),
  );
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createPopulationPetalGeometry(
  blueprint: ClassicRoseBlueprint,
  quality: ClassicRosePopulationQuality,
) {
  const segments = CLASSIC_ROSE_POPULATION_PETAL_SEGMENTS[quality];
  const crown = crownMatrix(blueprint);
  const petals = Object.values(blueprint.crownBands).flatMap((band) =>
    band.placements.map((placement) => {
      const geometry = createStudioPetalSurface(
        band.shape,
        placement,
        blueprint.bloomMax,
        blueprint.bloomTransition,
        segments.width,
        segments.length,
      );
      const placementMatrix = composeTransform(
        placement.position,
        placement.rotation,
        placement.scale,
        "YXZ",
      );
      geometry.applyMatrix4(crown.clone().multiply(placementMatrix));
      const position = geometry.getAttribute("position");
      geometry.setAttribute(
        "flowerPetalMask",
        solidAttribute(position.count, 1, [1]),
      );
      applyFlowerPetalWindAttributes(geometry, placement.seed);
      return geometry;
    }),
  );
  const merged = mergeOwned(petals, "无法合并模型库玫瑰 Studio 花瓣");
  merged.name = `model.classic-rose.population.${quality}.petals`;
  merged.userData = {
    modelId: "classic-rose",
    materialSlot: "petal",
    quality,
    blueprintFingerprint: blueprint.fingerprint,
    representationSignature: "classic-rose-studio-petal-static-bloom-v3-wind-phase",
    petalCount: blueprint.petalCount,
    placementTiltPreserved: true,
  };
  return merged;
}

function cylinderBetween(
  start: Vector3,
  end: Vector3,
  radius: number,
  radialSegments: number,
  color: string,
) {
  const direction = end.clone().sub(start);
  const geometry = new CylinderGeometry(
    radius * 0.78,
    radius,
    direction.length(),
    radialSegments,
  );
  geometry.applyMatrix4(
    new Matrix4().compose(
      start.clone().add(end).multiplyScalar(0.5),
      new Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
      new Vector3(1, 1, 1),
    ),
  );
  return prepareOrganGeometry(geometry, color, 0);
}

function createLeafGeometry(
  blueprint: ClassicRoseBlueprint,
  quality: ClassicRosePopulationQuality,
) {
  const profile = FLOWER_RENDER_QUALITY_PROFILES[quality];
  const settings = blueprint.settings;
  const leaves: BufferGeometry[] = [];
  for (const sprig of blueprint.leafSprigs) {
    const source = createBroadLeafGeometry({
      length: settings.leaf.length * 0.82,
      width: settings.leaf.width * 0.9,
      baseColor: settings.leaf.baseColor,
      tipColor: settings.leaf.tipColor,
      veinColor: settings.leaf.veinColor,
      cup: settings.leaf.cup,
      curl: settings.leaf.curl,
      twist: sprig.leafTwist,
      edgeWave: settings.leaf.wave,
      serration: settings.leaf.serration,
      serrationCount: 18,
      heartLobes: 0.04,
      midribFold: settings.leaf.length * 0.011,
      veinRelief: settings.leaf.length * 0.0028,
      veinPairs: 8,
      thickness: settings.leaf.length * 0.0045,
      lengthSegments: profile.leafLengthSegments,
      widthSegments: profile.leafWidthSegments,
    });
    for (const leaf of sprig.leaves) {
      const geometry = prepareOrganGeometry(source.clone(), "#315d24", 0);
      const orientation = createLeafOrientationQuaternion(
        [...leaf.direction],
        [...leaf.surfaceNormal],
      );
      const localPosition = new Vector3(...sprig.position).add(
        new Vector3(...leaf.position),
      );
      geometry.applyMatrix4(
        ROOT_LIFT.clone().multiply(
          new Matrix4().compose(
            localPosition,
            orientation,
            new Vector3(leaf.scale, leaf.scale, leaf.scale),
          ),
        ),
      );
      leaves.push(geometry);
    }
    source.dispose();
  }

  const crown = crownMatrix(blueprint);
  for (let index = 0; index < blueprint.calyxCount; index += 1) {
    const angle = (index / blueprint.calyxCount) * Math.PI * 2 + 0.16;
    const sepal = prepareOrganGeometry(
      createRibbonPetalGeometry(blueprint.sepal),
      "#4e742f",
      0,
    );
    const outer = composeTransform(
      [
        Math.sin(angle) * blueprint.attachment.sepalRootRadius,
        blueprint.attachment.sepalRootY,
        Math.cos(angle) * blueprint.attachment.sepalRootRadius,
      ],
      [0, angle, Math.PI * 0.68],
    );
    const inner = composeTransform(
      [0, 0, 0],
      [0, (index % 2 ? 1 : -1) * 0.035, 0],
      0.9 + (index % 3) * 0.035,
    );
    sepal.applyMatrix4(crown.clone().multiply(outer).multiply(inner));
    leaves.push(sepal);
  }
  const merged = mergeOwned(leaves, "无法合并模型库玫瑰复叶与萼片");
  merged.name = `model.classic-rose.population.${quality}.leaves`;
  merged.userData = {
    modelId: "classic-rose",
    materialSlot: "leaf",
    quality,
    blueprintFingerprint: blueprint.fingerprint,
    leafCount: 6,
    sepalCount: blueprint.calyxCount,
  };
  return merged;
}

function createStructureGeometry(
  blueprint: ClassicRoseBlueprint,
  quality: ClassicRosePopulationQuality,
) {
  const profile = FLOWER_RENDER_QUALITY_PROFILES[quality];
  const settings = blueprint.settings;
  const structureSegments = {
    ultra: { stem: 32, receptacleWidth: 24, receptacleHeight: 14 },
    high: { stem: 24, receptacleWidth: 18, receptacleHeight: 10 },
    medium: { stem: 18, receptacleWidth: 12, receptacleHeight: 8 },
    low: { stem: 12, receptacleWidth: 8, receptacleHeight: 6 },
  }[quality];
  const stemPoints = blueprint.stemLayout.stemPoints.map(
    (point) => new Vector3(point[0], point[1] - CLASSIC_ROSE_GROUND_Y, point[2]),
  );
  const parts: BufferGeometry[] = [
    prepareOrganGeometry(
      new TubeGeometry(
        new CatmullRomCurve3(stemPoints, false, "centripetal"),
        structureSegments.stem,
        settings.stem.radius,
        profile.stemRadialSegments,
        false,
      ),
      settings.stem.color,
      0,
    ),
  ];
  blueprint.leafSprigs.forEach((sprig) => {
    const start = new Vector3(
      sprig.position[0],
      sprig.position[1] - CLASSIC_ROSE_GROUND_Y,
      sprig.position[2],
    );
    const end = start.clone().add(new Vector3(...sprig.branchEnd));
    parts.push(
      cylinderBetween(
        start,
        end,
        0.014,
        profile.stemRadialSegments,
        settings.stem.color,
      ),
    );
  });
  for (let index = 0; index < blueprint.thornCount; index += 1) {
    const progress = ((index + 1) / (blueprint.thornCount + 1)) * 0.82;
    const side = index % 2 === 0 ? 1 : -1;
    const node = sampleWeightedStemPoint(blueprint.stemLayout, progress);
    const scale = 0.8 + (index % 3) * 0.08;
    const thorn = prepareOrganGeometry(
      new ConeGeometry(0.035, 0.12, 6),
      "#7b3927",
      0,
    );
    thorn.applyMatrix4(
      composeTransform(
        [
          node[0] + side * settings.stem.radius * 0.9,
          node[1] - CLASSIC_ROSE_GROUND_Y,
          node[2],
        ],
        [0, 0, side * -1.23],
        scale,
      ),
    );
    parts.push(thorn);
  }
  const receptacle = prepareOrganGeometry(
    new SphereGeometry(
      1,
      structureSegments.receptacleWidth,
      structureSegments.receptacleHeight,
    ),
    "#55763b",
    0,
  );
  receptacle.applyMatrix4(
    crownMatrix(blueprint).multiply(
      composeTransform(
        [0, blueprint.attachment.receptaclePositionY, 0],
        [0, 0, 0],
        blueprint.attachment.receptacleScale,
      ),
    ),
  );
  parts.push(receptacle);
  const merged = mergeOwned(parts, "无法合并模型库玫瑰茎、叶轴与皮刺");
  merged.name = `model.classic-rose.population.${quality}.structure`;
  merged.userData = {
    modelId: "classic-rose",
    materialSlot: "structure",
    quality,
    blueprintFingerprint: blueprint.fingerprint,
    stemCount: 1,
    rachisCount: 2,
    thornCount: blueprint.thornCount,
    receptacleCount: 1,
  };
  return merged;
}

export function createClassicRosePopulationPrototype(
  quality: ClassicRosePopulationQuality,
): ClassicRosePopulationPrototype {
  if (!POPULATION_QUALITY_SET.has(quality)) {
    throw new Error(`不支持的玫瑰人口画质：${quality}`);
  }
  const blueprint = createClassicRoseBlueprint(undefined, quality);
  const petalGeometry = createPopulationPetalGeometry(blueprint, quality);
  const leafGeometry = createLeafGeometry(blueprint, quality);
  const structureGeometry = createStructureGeometry(blueprint, quality);
  const bounds = petalGeometry.boundingBox!
    .clone()
    .union(leafGeometry.boundingBox!)
    .union(structureGeometry.boundingBox!);
  const sourceHeightMeters = bounds.max.y - Math.min(0, bounds.min.y);
  const organCounts = {
    petals: blueprint.petalCount,
    leaves: 6,
    stems: 1,
    rachises: 2,
    sepals: blueprint.calyxCount,
    thorns: blueprint.thornCount,
    receptacles: 1,
  } as const;
  for (const geometry of [petalGeometry, leafGeometry, structureGeometry]) {
    geometry.userData.sourceHeightMeters = sourceHeightMeters;
    geometry.userData.organCounts = organCounts;
  }
  return {
    modelId: "classic-rose",
    quality,
    blueprintFingerprint: blueprint.fingerprint,
    sourceHeightMeters,
    petalGeometry,
    leafGeometry,
    structureGeometry,
    organCounts,
    dispose() {
      petalGeometry.dispose();
      leafGeometry.dispose();
      structureGeometry.dispose();
    },
  };
}

/** 兼容旧调用；返回的展平几何仍由同一 Blueprint 和完整器官构成。 */
export function createClassicRosePopulationGeometry(
  quality: ClassicRosePopulationQuality,
) {
  const prototype = createClassicRosePopulationPrototype(quality);
  const sources = [
    prototype.petalGeometry,
    prototype.leafGeometry,
    prototype.structureGeometry,
  ].map((source) => {
    const geometry = source.clone();
    const position = geometry.getAttribute("position");
    if (!geometry.getAttribute("flowerPetalTone")) {
      geometry.setAttribute(
        "flowerPetalTone",
        solidAttribute(position.count, 1, [0]),
      );
    }
    return geometry;
  });
  const merged = mergeOwned(sources, "无法展平模型库玫瑰人口几何");
  prototype.dispose();
  merged.name = `model.classic-rose.population.${quality}`;
  merged.userData = {
    modelId: "classic-rose",
    quality,
    source: "model-library-blueprint",
    sourceHeightMeters: prototype.sourceHeightMeters,
    organCounts: prototype.organCounts,
    blueprintFingerprint: prototype.blueprintFingerprint,
  };
  return merged;
}

export function createClassicRosePatternTexture(
  colorVariant: RoseColorVariantId,
) {
  const preset = resolveRoseColorPreset(colorVariant);
  const texture = new DataTexture(
    createStudioPetalPatternData(preset.pattern),
    STUDIO_PETAL_PATTERN_RESOLUTION,
    STUDIO_PETAL_PATTERN_RESOLUTION,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  texture.name = `model.classic-rose.pattern.${preset.id}`;
  return texture;
}

export const CLASSIC_ROSE_POPULATION_COLORS = Object.freeze(
  Object.fromEntries(
    ROSE_COLOR_PRESETS.map((preset) => [preset.id, preset.palette[2]]),
  ),
) as Readonly<Record<RoseColorVariantId, string>>;
