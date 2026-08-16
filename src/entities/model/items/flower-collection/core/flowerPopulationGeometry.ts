import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BufferGeometry,
  Color,
  ConeGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import {
  FLOWER_RENDER_QUALITY_PROFILES,
  type FlowerRenderQuality,
} from "../../../model/flowerRenderQuality";
import { MORNING_GLORY_DEFAULTS } from "../../../model/flowers/morningGloryParameters";
import { createTrumpetGeometry } from "./geometry";
import {
  createBroadLeafGeometry,
  type BroadLeafGeometryOptions,
} from "./leafGeometry";
import { CLASSIC_ROSE_POPULATION_QUALITIES } from "./classicRosePopulation";

export const FLOWER_POPULATION_QUALITIES =
  CLASSIC_ROSE_POPULATION_QUALITIES;

export type FlowerPopulationQuality =
  (typeof FLOWER_POPULATION_QUALITIES)[number];
export type MorningGloryAttachmentKind = "leaf" | "bloom";

export const MORNING_GLORY_ATTACHMENT_SOURCE_SIZES = {
  leaf: MORNING_GLORY_DEFAULTS.leafLength,
  bloom: MORNING_GLORY_DEFAULTS.corollaRimRadius * 2,
} as const satisfies Readonly<Record<MorningGloryAttachmentKind, number>>;

const GREEN_COLOR = "#35602c";

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

function preparePart(
  source: BufferGeometry,
  flowerPetalMask: number,
  fallbackColor = GREEN_COLOR,
) {
  const geometry = source.clone();
  source.dispose();
  const positions = geometry.getAttribute("position");
  if (!geometry.getAttribute("color")) {
    const color = new Color(fallbackColor);
    geometry.setAttribute(
      "color",
      solidAttribute(positions.count, 3, [color.r, color.g, color.b]),
    );
  }
  geometry.setAttribute(
    "flowerPetalMask",
    solidAttribute(positions.count, 1, [flowerPetalMask]),
  );
  for (const attributeName of Object.keys(geometry.attributes)) {
    if (
      !["position", "normal", "color", "flowerPetalMask"].includes(
        attributeName,
      )
    ) {
      geometry.deleteAttribute(attributeName);
    }
  }
  return geometry;
}

function composeTransform(
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  scale: number | readonly [number, number, number] = 1,
) {
  const scaleVector =
    typeof scale === "number"
      ? new Vector3(scale, scale, scale)
      : new Vector3(...scale);
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    scaleVector,
  );
}

function transformedPart(
  source: BufferGeometry,
  matrix: Matrix4,
  flowerPetalMask: number,
  fallbackColor?: string,
) {
  const geometry = preparePart(source, flowerPetalMask, fallbackColor);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** 牵牛花继续复用模型库器官；玫瑰人口由 classicRosePopulation 单独负责。 */
export function createMorningGloryAttachmentGeometry(
  kind: MorningGloryAttachmentKind,
  quality: FlowerPopulationQuality,
) {
  const profile = FLOWER_RENDER_QUALITY_PROFILES[
    quality satisfies FlowerRenderQuality
  ];
  let geometry: BufferGeometry;
  if (kind === "leaf") {
    const options: BroadLeafGeometryOptions = {
      length: MORNING_GLORY_DEFAULTS.leafLength,
      width: MORNING_GLORY_DEFAULTS.leafWidth,
      cup: MORNING_GLORY_DEFAULTS.leafCup,
      curl: MORNING_GLORY_DEFAULTS.leafCurl,
      edgeWave: MORNING_GLORY_DEFAULTS.leafWave,
      serration: MORNING_GLORY_DEFAULTS.leafSerration,
      serrationCount: 8,
      heartLobes: 1.45,
      midribFold: MORNING_GLORY_DEFAULTS.leafLength * 0.014,
      veinRelief: MORNING_GLORY_DEFAULTS.leafLength * 0.004,
      veinPairs: 7,
      thickness: MORNING_GLORY_DEFAULTS.leafLength * 0.0055,
      lengthSegments: profile.leafLengthSegments,
      widthSegments: profile.leafWidthSegments,
      baseColor: MORNING_GLORY_DEFAULTS.leafBaseColor,
      tipColor: MORNING_GLORY_DEFAULTS.leafTipColor,
      veinColor: MORNING_GLORY_DEFAULTS.leafVeinColor,
    };
    geometry = preparePart(createBroadLeafGeometry(options), 0);
  } else {
    const trumpet = createTrumpetGeometry({
      depth: MORNING_GLORY_DEFAULTS.corollaDepth,
      throatRadius: MORNING_GLORY_DEFAULTS.corollaThroatRadius,
      midRadius: MORNING_GLORY_DEFAULTS.corollaMidRadius,
      rimRadius: MORNING_GLORY_DEFAULTS.corollaRimRadius,
      rimWave: MORNING_GLORY_DEFAULTS.corollaRimWave,
      seamDepth: MORNING_GLORY_DEFAULTS.corollaDepth * 0.038,
      seamWidth: 18,
      radialUndulation: 0.009,
      radialUndulationCount: 9,
      asymmetry: 0.018,
      flarePower: MORNING_GLORY_DEFAULTS.corollaFlarePower,
      rimCurl: MORNING_GLORY_DEFAULTS.corollaRimCurl,
      thickness: MORNING_GLORY_DEFAULTS.corollaThickness,
      throatColor: MORNING_GLORY_DEFAULTS.throatColor,
      middleColor: MORNING_GLORY_DEFAULTS.middleColor,
      rimColor: MORNING_GLORY_DEFAULTS.rimColor,
      veinColor: MORNING_GLORY_DEFAULTS.veinColor,
      radialSegments: profile.trumpetRadialSegments,
      depthSegments: profile.trumpetDepthSegments,
    });
    trumpet.translate(0, 0, MORNING_GLORY_DEFAULTS.corollaDepth);
    const parts = [preparePart(trumpet, 1)];
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      parts.push(
        transformedPart(
          new ConeGeometry(
            MORNING_GLORY_DEFAULTS.corollaThroatRadius * 0.58,
            MORNING_GLORY_DEFAULTS.corollaDepth * 0.26,
            Math.max(5, profile.stemRadialSegments),
          ),
          composeTransform(
            [
              Math.cos(angle) *
                MORNING_GLORY_DEFAULTS.corollaThroatRadius *
                0.92,
              Math.sin(angle) *
                MORNING_GLORY_DEFAULTS.corollaThroatRadius *
                0.92,
              0.02,
            ],
            [Math.PI / 2, angle * 0.08, -angle],
            [1, 1.08, 0.72],
          ),
          0,
          MORNING_GLORY_DEFAULTS.calyxColor,
        ),
      );
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!merged) throw new Error("无法合并模型库牵牛花附件几何");
    geometry = merged;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = `model.morning-glory.${kind}.${quality}`;
  geometry.userData = {
    modelId: "morning-glory",
    attachmentKind: kind,
    quality,
    source: "model-library",
    sourceSizeMeters: MORNING_GLORY_ATTACHMENT_SOURCE_SIZES[kind],
  };
  return geometry;
}
