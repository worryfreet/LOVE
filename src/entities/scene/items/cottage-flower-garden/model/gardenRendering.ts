export type CottageGardenRenderMode = "beauty" | "no-post";

/** 阶段五所有光照、雾、色调映射与后处理参数的唯一权威。 */
export const COTTAGE_GARDEN_RENDERING = {
  backend: {
    renderer: "WebGLRenderer",
    requiredContext: "WebGL2",
    threeRevision: "r180",
    classification: "GPU presentation",
  },
  lights: {
    hemisphere: {
      skyColor: "#ffe8cf",
      groundColor: "#4a5337",
      intensity: 1.02,
    },
    directional: {
      color: "#ffd09a",
      intensity: 3.9,
      distanceAlongSunDirection: 82,
    },
    ambient: {
      color: "#ffe0cc",
      intensity: 0.34,
    },
    reflectedFill: {
      color: "#ffe1bd",
      intensity: 1.7,
      position: [24, 28, 46] as readonly [number, number, number],
    },
  },
  fog: {
    color: "#db7d6e",
    near: 180,
    far: 460,
  },
  output: {
    toneMapping: "ACESFilmicToneMapping",
    exposure: 1.06,
    colorSpace: "SRGBColorSpace",
  },
  presentation: {
    renderGraph: ["DirectWebGLRenderer"],
  },
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/** 线性 Fog 的混合因子，用于在 CPU 测试中验证空气透视层级。 */
export function sampleCottageGardenFogFactor(distanceMeters: number) {
  const { near, far } = COTTAGE_GARDEN_RENDERING.fog;
  if (!Number.isFinite(distanceMeters)) return 1;
  return clamp((distanceMeters - near) / (far - near), 0, 1);
}
