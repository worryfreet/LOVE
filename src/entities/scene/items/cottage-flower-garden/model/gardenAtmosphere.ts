export type CottageGardenVector3 = readonly [number, number, number];

/** 天空穹顶、3D 太阳与云层采样的统一参数，避免视觉和光照各自漂移。 */
export const COTTAGE_GARDEN_ATMOSPHERE_RENDERING = {
  sky: {
    radius: 850,
    segments: 64,
    heightSegments: 36,
    cloudDomainScale: [3.45, 1.85, 3.45] as CottageGardenVector3,
    palette: {
      horizon: "#ef8268",
      middle: "#bd84a1",
      zenith: "#657aa3",
      sunBlush: "#ff907e",
      cloudShadow: "#826c86",
      cloudLight: "#ffd6bb",
    },
  },
  sun: {
    distance: 142,
    radius: 3.35,
    widthSegments: 48,
    heightSegments: 24,
    surfaceTexture: {
      width: 128,
      height: 64,
    },
    emissiveColor: "#ffb35d",
    emissiveIntensity: 3.8,
    veil: {
      diameter: 22,
      color: "#ffe2c1",
      opacity: 0.7,
    },
    innerHalo: {
      diameter: 44,
      color: "#ffc58e",
      opacity: 0.42,
    },
    outerHalo: {
      diameter: 96,
      color: "#f89882",
      opacity: 0.18,
    },
    haloTextureSize: 128,
  },
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function normalizeVector3(vector: CottageGardenVector3): CottageGardenVector3 {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length <= Number.EPSILON) return [0, 1, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

/** 将共享太阳方向换算为相机局部坐标，太阳模型始终与平行光同向。 */
export function resolveCottageGardenSunPosition(
  direction: CottageGardenVector3,
  distance = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.distance,
): CottageGardenVector3 {
  const normalized = normalizeVector3(direction);
  return [
    normalized[0] * distance,
    normalized[1] * distance,
    normalized[2] * distance,
  ];
}

/** 返回太阳球在画面中的角直径，用于约束“朦胧但仍是实体”的视觉尺度。 */
export function resolveCottageGardenSunAngularDiameterDegrees(
  radius = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.radius,
  distance = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.distance,
) {
  return (Math.atan(radius / distance) * 360) / Math.PI;
}

/** 柔光薄纱至少覆盖太阳实体两倍直径，避免重新读成边缘锐利的圆盘。 */
export function resolveCottageGardenSunSoftnessRatio() {
  const { radius, veil } = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun;
  return veil.diameter / (radius * 2);
}

/** 球面方向直接进入三维噪声域，不再经过会在 ±π 处断开的经度 UV。 */
export function sampleCottageGardenCloudDomain(
  direction: CottageGardenVector3,
): CottageGardenVector3 {
  const normalized = normalizeVector3(direction);
  const scale = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sky.cloudDomainScale;
  return [
    normalized[0] * scale[0],
    normalized[1] * scale[1],
    normalized[2] * scale[2],
  ];
}

/** 为单元测试和巡检视角生成标准球面方向。 */
export function resolveCottageGardenSkyDirection(
  azimuthRadians: number,
  elevationRadians: number,
): CottageGardenVector3 {
  const horizontal = Math.cos(elevationRadians);
  return [
    horizontal * Math.cos(azimuthRadians),
    Math.sin(elevationRadians),
    horizontal * Math.sin(azimuthRadians),
  ];
}

/** 生成可横向平铺的暖色太阳表面纹理，避免引入外部图片接缝。 */
export function createCottageGardenSunSurfacePixels(
  width: number = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.surfaceTexture.width,
  height: number = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.surfaceTexture.height,
) {
  const safeWidth = Math.max(4, Math.floor(width));
  const safeHeight = Math.max(2, Math.floor(height));
  const pixels = new Uint8Array(safeWidth * safeHeight * 4);

  for (let y = 0; y < safeHeight; y += 1) {
    const latitude = y / (safeHeight - 1);
    const latitudeWave = Math.sin(latitude * Math.PI);
    for (let x = 0; x < safeWidth; x += 1) {
      const longitude = (x / safeWidth) * Math.PI * 2;
      const broad =
        Math.sin(longitude * 3 + latitude * 10.4) * 0.5 +
        Math.sin(longitude * 7 - latitude * 18.7) * 0.26 +
        Math.cos(longitude * 11 + latitude * 29.3) * 0.14;
      const granulation =
        broad * latitudeWave + Math.sin(longitude * 19) * 0.1;
      const offset = (y * safeWidth + x) * 4;
      pixels[offset] = Math.round(clamp(247 + granulation * 8, 0, 255));
      pixels[offset + 1] = Math.round(
        clamp(176 + granulation * 22 + latitudeWave * 8, 0, 255),
      );
      pixels[offset + 2] = Math.round(
        clamp(82 + granulation * 18 + latitudeWave * 6, 0, 255),
      );
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}

/** 生成透明边缘的径向光晕纹理，供内外两层 Sprite 共用。 */
export function createCottageGardenSunHaloPixels(
  size: number = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.haloTextureSize,
) {
  const safeSize = Math.max(8, Math.floor(size));
  const pixels = new Uint8Array(safeSize * safeSize * 4);

  for (let y = 0; y < safeSize; y += 1) {
    for (let x = 0; x < safeSize; x += 1) {
      const centeredX = ((x + 0.5) / safeSize) * 2 - 1;
      const centeredY = ((y + 0.5) / safeSize) * 2 - 1;
      const radius = Math.hypot(centeredX, centeredY);
      const falloff = 1 - smoothstep(0.02, 1, radius);
      const alpha = Math.pow(falloff, 1.7);
      const offset = (y * safeSize + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 226;
      pixels[offset + 2] = 170;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return pixels;
}

/** 生成覆盖太阳实体边缘的柔光薄纱，中心保留亮度、外圈渐隐。 */
export function createCottageGardenSunVeilPixels(
  size: number = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.haloTextureSize,
) {
  const safeSize = Math.max(8, Math.floor(size));
  const pixels = new Uint8Array(safeSize * safeSize * 4);

  for (let y = 0; y < safeSize; y += 1) {
    for (let x = 0; x < safeSize; x += 1) {
      const centeredX = ((x + 0.5) / safeSize) * 2 - 1;
      const centeredY = ((y + 0.5) / safeSize) * 2 - 1;
      const radius = Math.hypot(centeredX, centeredY);
      const alpha = 1 - smoothstep(0.14, 1, radius);
      const offset = (y * safeSize + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 234;
      pixels[offset + 2] = 205;
      pixels[offset + 3] = Math.round(Math.pow(alpha, 1.15) * 255);
    }
  }

  return pixels;
}
