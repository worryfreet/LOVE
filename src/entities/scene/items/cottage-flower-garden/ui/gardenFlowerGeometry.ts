import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
} from "three";
import {
  createWildflowerGeometry,
  WILDFLOWER_SPECS,
  type WildflowerSpeciesId,
} from "@/entities/model";
import { COTTAGE_GARDEN_MEADOW_GREEN_PALETTE } from "../model/gardenMeadowGrass";
import { COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES } from "../model/gardenWildflowerMeadow";

function recolorPlantGreen(geometry: BufferGeometry) {
  const colors = geometry.getAttribute("color");
  const shadow = new Color(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.shadow);
  const meadow = new Color(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.meadow);
  for (let index = 0; index < colors.count; index += 1) {
    const red = colors.getX(index);
    const green = colors.getY(index);
    const blue = colors.getZ(index);
    if (green <= red * 1.06 || green <= blue * 1.06) continue;
    const color = green < 0.2 ? shadow : meadow;
    colors.setXYZ(index, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}

/** 近景沿用完整三维物种几何，只增加统一的花瓣 tint 遮罩。 */
export function createCottageGardenNearFlowerGeometry(
  species: WildflowerSpeciesId,
) {
  const geometry = createWildflowerGeometry(species, "field");
  const colors = geometry.getAttribute("color");
  const spec = WILDFLOWER_SPECS[species];
  const sourcePetalColors = [spec.petalColor, spec.petalAccent].map(
    (value) => new Color(value),
  );
  const petalMask = new Float32Array(colors.count);
  for (let index = 0; index < colors.count; index += 1) {
    const red = colors.getX(index);
    const green = colors.getY(index);
    const blue = colors.getZ(index);
    petalMask[index] = sourcePetalColors.some(
      (color) =>
        Math.abs(red - color.r) < 1e-5 &&
        Math.abs(green - color.g) < 1e-5 &&
        Math.abs(blue - color.b) < 1e-5,
    )
      ? 1
      : 0;
  }
  recolorPlantGreen(geometry);
  geometry.setAttribute(
    "meadowPetalMask",
    new Float32BufferAttribute(petalMask, 1),
  );
  geometry.userData.sourceHeightMeters = spec.height;
  geometry.userData.geometryDetail = "individual";
  geometry.userData.greenPalette = Object.values(
    COTTAGE_GARDEN_MEADOW_GREEN_PALETTE,
  );
  geometry.userData.flowerPalette = [
    ...COTTAGE_GARDEN_FLOWER_COLOR_FAMILIES[species],
  ];
  return geometry;
}

interface ClusterBuffers {
  positions: number[];
  colors: number[];
  petalMasks: number[];
}

function pushVertex(
  buffers: ClusterBuffers,
  position: readonly [number, number, number],
  color: Color,
  petalMask: number,
) {
  buffers.positions.push(...position);
  buffers.colors.push(color.r, color.g, color.b);
  buffers.petalMasks.push(petalMask);
}

function pushTriangle(
  buffers: ClusterBuffers,
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
  color: Color,
  petalMask = 0,
) {
  pushVertex(buffers, a, color, petalMask);
  pushVertex(buffers, b, color, petalMask);
  pushVertex(buffers, c, color, petalMask);
}

function pushStem(
  buffers: ClusterBuffers,
  x: number,
  y: number,
  z: number,
  width: number,
  color: Color,
) {
  const bottomX = x * 0.18;
  const bottomZ = z * 0.18;
  pushTriangle(
    buffers,
    [bottomX - width, 0, bottomZ],
    [bottomX + width, 0, bottomZ],
    [x + width, y, z],
    color,
  );
  pushTriangle(
    buffers,
    [bottomX - width, 0, bottomZ],
    [x + width, y, z],
    [x - width, y, z],
    color,
  );
  pushTriangle(
    buffers,
    [bottomX, 0, bottomZ - width],
    [x, y, z - width],
    [x, y, z + width],
    color,
  );
  pushTriangle(
    buffers,
    [bottomX, 0, bottomZ - width],
    [x, y, z + width],
    [bottomX, 0, bottomZ + width],
    color,
  );
}

function pushFlowerHead(
  buffers: ClusterBuffers,
  species: WildflowerSpeciesId,
  x: number,
  y: number,
  z: number,
  scale: number,
  phase: number,
) {
  const spec = WILDFLOWER_SPECS[species];
  const petalColor = new Color(spec.petalColor);
  const centerColor = new Color(spec.centerColor);
  // 中远景只需稳定的放射轮廓；八段起伏冠面比完整花瓣更带限，也比平卡片更有体积。
  const ringSegments = 8;
  const radius = (spec.headRadius + spec.petalLength * 0.9) * scale;
  const tiltX = Math.sin(phase) * 0.23;
  const tiltZ = Math.cos(phase * 1.7) * 0.18;

  for (let segment = 0; segment < ringSegments; segment += 1) {
    const angleA = (segment / ringSegments) * Math.PI * 2;
    const angleB = ((segment + 1) / ringSegments) * Math.PI * 2;
    const radialA = radius * (0.8 + Math.cos(angleA * spec.petalCount) * 0.2);
    const radialB = radius * (0.8 + Math.cos(angleB * spec.petalCount) * 0.2);
    const point = (angle: number, radial: number) => {
      const localX = Math.cos(angle) * radial;
      const localZ = Math.sin(angle) * radial;
      return [
        x + localX,
        y +
          localX * tiltX +
          localZ * tiltZ +
          Math.sin(angle * 2 + phase) * radius * 0.13,
        z + localZ,
      ] as const;
    };
    pushTriangle(
      buffers,
      [x, y, z],
      point(angleA, radialA),
      point(angleB, radialB),
      petalColor,
      1,
    );
  }

  const centerRadius = radius * 0.28;
  for (let segment = 0; segment < 4; segment += 1) {
    const angleA = (segment / 4) * Math.PI * 2;
    const angleB = ((segment + 1) / 4) * Math.PI * 2;
    pushTriangle(
      buffers,
      [x, y + 0.001, z],
      [
        x + Math.cos(angleA) * centerRadius,
        y + 0.001,
        z + Math.sin(angleA) * centerRadius,
      ],
      [
        x + Math.cos(angleB) * centerRadius,
        y + 0.001,
        z + Math.sin(angleB) * centerRadius,
      ],
      centerColor,
    );
  }
}

/**
 * 中景不是朝上的贴图卡片，而是七个有高度差、可随风弯曲的起伏花头簇。
 * 单簇足以保留物种轮廓，数量又远低于逐株完整花朵。
 */
export function createCottageGardenMiddleFlowerClusterGeometry(
  species: WildflowerSpeciesId,
) {
  const spec = WILDFLOWER_SPECS[species];
  const stemColor = new Color(COTTAGE_GARDEN_MEADOW_GREEN_PALETTE.meadow);
  const buffers: ClusterBuffers = {
    positions: [],
    colors: [],
    petalMasks: [],
  };
  const heads = [
    [0, 1, 0, 1],
    [-0.78, 0.83, 0.38, 0.9],
    [0.72, 0.74, -0.5, 0.84],
    [0.42, 0.91, 0.65, 0.94],
    [-0.48, 0.66, -0.72, 0.78],
    [0.92, 0.61, 0.22, 0.7],
    [-0.92, 0.72, -0.18, 0.74],
  ] as const;
  for (let index = 0; index < heads.length; index += 1) {
    const [xFactor, heightFactor, zFactor, scale] = heads[index];
    const x = xFactor * spec.height;
    const y = heightFactor * spec.height;
    const z = zFactor * spec.height;
    pushStem(buffers, x, y, z, spec.stemRadius * 1.55, stemColor);
    pushFlowerHead(buffers, species, x, y, z, scale, index * 1.37 + 0.4);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(buffers.positions, 3),
  );
  geometry.setAttribute("color", new Float32BufferAttribute(buffers.colors, 3));
  geometry.setAttribute(
    "meadowPetalMask",
    new Float32BufferAttribute(buffers.petalMasks, 1),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.sourceHeightMeters = spec.height;
  geometry.userData.geometryDetail = "upright-cluster";
  geometry.userData.headCount = heads.length;
  return geometry;
}
