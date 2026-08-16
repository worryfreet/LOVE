import type { Vector3Tuple } from "three";
import {
  readFlowerNumber,
  readFlowerString,
  resolveEditableFlowerSettings,
  type EditableFlowerSettings,
} from "../../../model/flowerParameterUtils";
import {
  CLASSIC_ROSE_CUSTOM_CONFIGURATION,
  CLASSIC_ROSE_PARAMETERS,
} from "../../../model/flowers/classicRoseParameters";
import type { FlowerRenderQuality } from "../../../model/flowerRenderQuality";
import type { ModelParameterValues } from "../../../model/modelParameterTypes";
import { PETAL_MORPHOLOGIES } from "./petalMorphologies";
import {
  resolveRoseColorPreset,
  type RoseColorPreset,
} from "./roseColorVariants";
import {
  createStudioFlowerLayout,
  type StudioFlowerPetalPlacement,
  type StudioFlowerPalette,
  type StudioPetalShape,
} from "./studioFlower";
import type {
  EditableFlowerSpeciesId,
  RibbonGeometryOptions,
} from "./types";
import {
  createWeightedStemLayout,
  sampleWeightedStemPoint,
  type WeightedStemLayout,
} from "./weightedStem";
import { BLOOM_FRAME_PROFILES } from "./layout";

export const CLASSIC_ROSE_GROUND_Y = -0.58;

export type ClassicRoseCrownBandId =
  | "inner"
  | "transition"
  | "cup"
  | "guard";

export interface RoseAttachmentProfile {
  bloomDepth: number;
  receptaclePositionY: number;
  receptacleScale: Vector3Tuple;
  sepalRootY: number;
  sepalRootRadius: number;
}

export interface RoseLeafPlacementBlueprint {
  readonly id: "terminal" | "upper" | "lower";
  readonly position: Vector3Tuple;
  readonly direction: Vector3Tuple;
  readonly surfaceNormal: Vector3Tuple;
  readonly scale: number;
}

export interface RoseLeafSprigBlueprint {
  readonly index: 1 | 2;
  readonly position: Vector3Tuple;
  readonly branchEnd: Vector3Tuple;
  readonly leafTwist: number;
  readonly leaves: readonly RoseLeafPlacementBlueprint[];
}

export interface ClassicRoseCrownBandBlueprint {
  readonly id: ClassicRoseCrownBandId;
  readonly placements: readonly StudioFlowerPetalPlacement[];
  readonly shape: StudioPetalShape;
}

export interface ClassicRoseBlueprint {
  readonly modelId: "classic-rose";
  readonly parameters: ModelParameterValues;
  readonly settings: EditableFlowerSettings;
  readonly stemLayout: WeightedStemLayout;
  readonly attachment: RoseAttachmentProfile;
  readonly crownLayout: readonly StudioFlowerPetalPlacement[];
  readonly crownBands: Readonly<
    Record<ClassicRoseCrownBandId, ClassicRoseCrownBandBlueprint>
  >;
  readonly palette: StudioFlowerPalette;
  readonly colorPreset: RoseColorPreset;
  readonly sepal: RibbonGeometryOptions;
  readonly leafSprigs: readonly RoseLeafSprigBlueprint[];
  readonly petalCount: number;
  readonly calyxCount: number;
  readonly thornCount: number;
  readonly bloomScale: number;
  readonly bloomMax: number;
  readonly bloomTransition: number;
  readonly fingerprint: string;
}

function scaleStudioWidths(
  widths: StudioPetalShape["widths"],
  scale: number,
): StudioPetalShape["widths"] {
  return [
    widths[0] * scale,
    widths[1] * scale,
    widths[2] * scale,
    widths[3] * scale,
    widths[4] * scale,
  ];
}

/**
 * 花托同时包住主茎末端、外瓣根位和萼片根位。这个装配关系由模型实体
 * 统一拥有，模型查看器与人口批次不得分别估算。
 */
export function resolveRoseAttachmentProfile(
  species: Extract<EditableFlowerSpeciesId, "rose" | "classic-rose">,
  layoutRadius: number,
): RoseAttachmentProfile {
  if (species === "classic-rose") {
    const receptacleRadius = Math.max(0.16, layoutRadius * 1.08);
    return {
      bloomDepth: 0,
      receptaclePositionY: 0.045,
      receptacleScale: [receptacleRadius, 0.15, receptacleRadius],
      sepalRootY: -0.015,
      sepalRootRadius: Math.max(0.11, layoutRadius * 0.68),
    };
  }
  const receptacleRadius = Math.max(0.17, layoutRadius * 0.82);
  return {
    bloomDepth: 0,
    receptaclePositionY: 0.04,
    receptacleScale: [receptacleRadius, 0.145, receptacleRadius],
    sepalRootY: -0.01,
    sepalRootRadius: Math.max(0.12, layoutRadius * 0.72),
  };
}

export function createRoseLeafSprigBlueprint(
  index: 1 | 2,
  position: Vector3Tuple,
  direction: 1 | -1,
): RoseLeafSprigBlueprint {
  const depthDirection = index === 1 ? 1 : -1;
  return {
    index,
    position,
    branchEnd: [direction * 0.68, 0.2, 0.01],
    leafTwist: direction * 0.035,
    leaves: [
      {
        id: "terminal",
        position: [direction * 0.5, 0.15, 0.015],
        direction: [direction * 0.9, 0.28, depthDirection * 0.22],
        surfaceNormal: [direction * 0.08, 0.72, depthDirection * 0.74],
        scale: 1.06,
      },
      {
        id: "upper",
        position: [direction * 0.3, 0.1, 0.01],
        direction: [direction * 0.56, 0.76, -depthDirection * 0.22],
        surfaceNormal: [direction * 0.24, 0.82, depthDirection * 0.5],
        scale: 0.86,
      },
      {
        id: "lower",
        position: [direction * 0.24, 0.07, -0.01],
        direction: [direction * 0.62, -0.48, depthDirection * 0.3],
        surfaceNormal: [-direction * 0.2, 0.7, -depthDirection * 0.66],
        scale: 0.82,
      },
    ],
  };
}

export function resolveClassicRoseParameters(
  overrides?: ModelParameterValues,
  quality?: FlowerRenderQuality,
): ModelParameterValues {
  return {
    ...(CLASSIC_ROSE_CUSTOM_CONFIGURATION.values as ModelParameterValues),
    ...overrides,
    ...(quality ? { renderQuality: quality } : null),
  };
}

/** 模型目录和大场景人口共同消费的唯一玫瑰形态权威。 */
export function createClassicRoseBlueprint(
  overrides?: ModelParameterValues,
  quality?: FlowerRenderQuality,
): ClassicRoseBlueprint {
  const parameters = resolveClassicRoseParameters(overrides, quality);
  const settings = resolveEditableFlowerSettings(
    CLASSIC_ROSE_PARAMETERS,
    parameters,
  );
  const readNumber = (id: string) =>
    readFlowerNumber(CLASSIC_ROSE_PARAMETERS, parameters, id);
  const petalShape: StudioPetalShape = {
    length: settings.petal.length,
    stemWidth:
      (settings.petal.widthProfile?.[0] ?? 0.1) * settings.petal.width,
    stemEnd: 0.04,
    widths: [
      (settings.petal.widthProfile?.[1] ?? 0.53) * settings.petal.width,
      (settings.petal.widthProfile?.[2] ?? 0.93) * settings.petal.width,
      settings.petal.width,
      (settings.petal.widthProfile?.[4] ?? 0.67) * settings.petal.width,
      (settings.petal.widthProfile?.[5] ?? 0.067) * settings.petal.width,
    ],
    tipWidth: settings.petal.tipWidth,
    tipArc: 0.072,
    tipNotch: 0.006,
    curlClosed: 1.9,
    curlOpen: settings.petal.curl ?? -0.35,
    curlBias: settings.petal.curlBias ?? 2.3,
    propagation: 1.2,
    cup: settings.petal.cup ?? 0.4,
    sideCurl: settings.petal.sideCurl ?? 0.45,
    waveAmplitude: settings.petal.wave ?? 0.035,
    waveFrequency: settings.petal.waveCount ?? 11,
    asymmetry: settings.petal.asymmetry ?? 0.08,
    noiseAmplitude: 0.007,
    noiseFrequency: 4.2,
    shellGap: 0.045,
    wrapWidth: 0.12,
    wrapCup: 0.58,
  };
  const shapes = {
    inner: {
      ...petalShape,
      length: petalShape.length * 0.68,
      widths: scaleStudioWidths(petalShape.widths, 0.55),
      tipWidth: (petalShape.tipWidth ?? 0) * 0.48,
      tipArc: 0.025,
      tipNotch: 0,
      curlOpen: 0.42,
      cup: 0.62,
      sideCurl: 0.72,
      waveAmplitude: 0.003,
      asymmetry: 0.025,
      noiseAmplitude: 0.0025,
      shellGap: 0.065,
    },
    transition: {
      ...petalShape,
      length: petalShape.length * 0.82,
      widths: scaleStudioWidths(petalShape.widths, 0.74),
      tipWidth: (petalShape.tipWidth ?? 0) * 0.7,
      tipArc: 0.043,
      tipNotch: 0.002,
      curlOpen: 0.2,
      cup: 0.56,
      sideCurl: 0.57,
      waveAmplitude: 0.005,
      asymmetry: 0.035,
      noiseAmplitude: 0.004,
    },
    cup: {
      ...petalShape,
      length: petalShape.length * 0.98,
      widths: scaleStudioWidths(petalShape.widths, 0.96),
      tipWidth: (petalShape.tipWidth ?? 0) * 0.96,
      tipArc: 0.068,
      tipNotch: 0.004,
      curlOpen: -0.03,
      cup: 0.46,
      sideCurl: 0.38,
      waveAmplitude: 0.009,
      noiseAmplitude: 0.006,
    },
    guard: {
      ...petalShape,
      length: petalShape.length * 1.08,
      widths: scaleStudioWidths(petalShape.widths, 1.12),
      tipWidth: (petalShape.tipWidth ?? 0) * 1.14,
      tipArc: 0.088,
      tipNotch: 0.01,
      curlOpen: -0.3,
      cup: 0.33,
      sideCurl: 0.24,
      waveAmplitude: 0.014,
      noiseAmplitude: 0.008,
    },
  } satisfies Record<ClassicRoseCrownBandId, StudioPetalShape>;
  const petalCount = Math.round(readNumber("petalCount"));
  const crownLayout = createStudioFlowerLayout({
    count: petalCount,
    goldenAngle: readNumber("goldenAngle"),
    radius: readNumber("layoutRadius"),
    radiusBias: readNumber("radiusBias"),
    height: readNumber("receptacleHeight"),
    heightBias: readNumber("heightBias"),
    scaleInner: readNumber("innerScale"),
    tiltInner: (readNumber("innerTilt") * Math.PI) / 180,
    outAngle: readNumber("outerAngle"),
    tiltBias: readNumber("tiltBias"),
    jitter: readNumber("petalJitter"),
  });
  const stemLayout = createWeightedStemLayout({
    base: [0, CLASSIC_ROSE_GROUND_Y, 0],
    length: settings.stem.length,
    headBendDegrees: readNumber("headStemBend"),
    azimuthDegrees: BLOOM_FRAME_PROFILES["classic-rose"].azimuth,
    stemCurve: settings.stem.curve,
    bendStart: 0.56,
    bloomAxis: [0, 1, 0],
    socketDepth: 0.1,
    sampleCount: 40,
  });
  const firstSprigPosition = sampleWeightedStemPoint(
    stemLayout,
    (settings.leaf.height - CLASSIC_ROSE_GROUND_Y) / settings.stem.length,
  );
  const secondSprigPosition = sampleWeightedStemPoint(
    stemLayout,
    (settings.leaf.height + 0.5 - CLASSIC_ROSE_GROUND_Y) /
      settings.stem.length,
  );
  secondSprigPosition[2] -= 0.02;
  const colorPreset = resolveRoseColorPreset(
    readFlowerString(CLASSIC_ROSE_PARAMETERS, parameters, "colorVariant"),
  );
  const layoutRadius = readNumber("layoutRadius");
  const bloomScale = readNumber("bloomScale");
  const bloomMax = readNumber("bloomLimit");
  const bloomTransition = readNumber("bloomTransition");
  const calyxCount = Math.round(readNumber("calyxCount"));
  const thornCount = Math.round(readNumber("thornCount"));
  const innerEnd = Math.min(
    petalCount - 3,
    Math.max(2, Math.round(petalCount * 0.19)),
  );
  const transitionEnd = Math.min(
    petalCount - 2,
    Math.max(
      innerEnd + 2,
      Math.round(petalCount * 0.46),
    ),
  );
  const cupEnd = Math.min(
    petalCount - 1,
    Math.max(
      transitionEnd + 2,
      Math.round(petalCount * 0.85),
    ),
  );
  const crownBands = {
    inner: {
      id: "inner",
      placements: crownLayout.slice(0, innerEnd),
      shape: shapes.inner,
    },
    transition: {
      id: "transition",
      placements: crownLayout.slice(innerEnd, transitionEnd),
      shape: shapes.transition,
    },
    cup: {
      id: "cup",
      placements: crownLayout.slice(transitionEnd, cupEnd),
      shape: shapes.cup,
    },
    guard: {
      id: "guard",
      placements: crownLayout.slice(cupEnd),
      shape: shapes.guard,
    },
  } satisfies ClassicRoseBlueprint["crownBands"];
  const fingerprint = [
    "classic-rose-blueprint-v2-hybrid-tea",
    petalCount,
    readNumber("goldenAngle"),
    readNumber("innerTilt"),
    readNumber("outerAngle"),
    bloomScale,
    calyxCount,
    thornCount,
  ].join(":");

  return {
    modelId: "classic-rose",
    parameters,
    settings,
    stemLayout,
    attachment: resolveRoseAttachmentProfile("classic-rose", layoutRadius),
    crownLayout,
    crownBands,
    palette: colorPreset.palette,
    colorPreset,
    sepal: {
      ...PETAL_MORPHOLOGIES.sunflowerRay,
      length: 0.36,
      width: 0.082,
      baseWidth: 0.02,
      tipWidth: 0.008,
      cup: -0.025,
      curl: 0.09,
      sideCurl: 0.012,
      wave: 0.006,
      thickness: 0.001,
      baseColor: "#315927",
      centerColor: "#4e742f",
      tipColor: "#6e8e3c",
      lengthSegments: settings.quality.petalLengthSegments,
      widthSegments: settings.quality.petalWidthSegments,
    },
    leafSprigs: [
      createRoseLeafSprigBlueprint(1, firstSprigPosition, 1),
      createRoseLeafSprigBlueprint(2, secondSprigPosition, -1),
    ],
    petalCount,
    calyxCount,
    thornCount,
    bloomScale,
    bloomMax,
    bloomTransition,
    fingerprint,
  };
}
