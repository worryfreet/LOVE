import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  LineBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  SphereGeometry,
} from "three";
import {
  COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT,
  type CottageGardenNightLightLayout,
} from "../model/gardenNightLights";

export interface CottageGardenNightLightRenderBundle {
  readonly cableGeometry: BufferGeometry;
  readonly socketGeometry: CylinderGeometry;
  readonly bulbGeometry: SphereGeometry;
  readonly haloGeometry: SphereGeometry;
  readonly instanceColor: InstancedBufferAttribute;
  readonly cableMaterial: LineBasicMaterial;
  readonly socketMaterial: MeshStandardMaterial;
  readonly bulbMaterial: ShaderMaterial;
  readonly haloMaterial: ShaderMaterial;
  readonly diagnostics: {
    readonly rendererRoute: "WebGLRenderer/batched-instancing";
    readonly drawBatchCount: 4;
    readonly pointLightCount: 0;
    readonly alphaModel: "straight-alpha-plus-additive-halo";
  };
  dispose: () => void;
}

const nightLightVertexShader = /* glsl */ `
  varying vec3 vInstanceColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 localPosition = instanceMatrix * vec4(position, 1.0);
    vec4 viewPosition = modelViewMatrix * localPosition;
    vInstanceColor = instanceColor;
    vViewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const nightLightBulbFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vInstanceColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    float facing = max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0);
    float hotCore = 0.76 + pow(facing, 2.0) * 0.42;
    gl_FragColor = vec4(vInstanceColor * hotCore, uOpacity);
  }
`;

const nightLightHaloFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vInstanceColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    float facing = max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0);
    float glow = pow(facing, 2.4);
    if (glow < 0.012) discard;
    gl_FragColor = vec4(vInstanceColor, uOpacity * glow);
  }
`;

export function createCottageGardenNightLightRenderBundle(
  layout: CottageGardenNightLightLayout = COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT,
): CottageGardenNightLightRenderBundle {
  const cableGeometry = new BufferGeometry();
  cableGeometry.setAttribute(
    "position",
    new BufferAttribute(layout.cableSegmentPositions, 3),
  );
  cableGeometry.computeBoundingBox();
  cableGeometry.computeBoundingSphere();

  const socketGeometry = new CylinderGeometry(0.012, 0.017, 0.042, 7);
  const bulbGeometry = new SphereGeometry(0.028, 9, 7);
  bulbGeometry.scale(0.9, 1.12, 0.9);
  const haloGeometry = new SphereGeometry(0.09, 8, 6);
  const colors = new Float32Array(layout.bulbs.length * 3);
  const color = new Color();
  layout.bulbs.forEach((bulb, index) => {
    color.set(bulb.color).toArray(colors, index * 3);
  });
  const instanceColor = new InstancedBufferAttribute(colors, 3);

  const cableMaterial = new LineBasicMaterial({
    color: "#251f2b",
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const socketMaterial = new MeshStandardMaterial({
    color: "#51443d",
    roughness: 0.72,
    metalness: 0.34,
  });
  const bulbMaterial = new ShaderMaterial({
    vertexShader: nightLightVertexShader,
    fragmentShader: nightLightBulbFragmentShader,
    uniforms: { uOpacity: { value: 0.18 } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const haloMaterial = new ShaderMaterial({
    vertexShader: nightLightVertexShader,
    fragmentShader: nightLightHaloFragmentShader,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    blending: AdditiveBlending,
  });

  return {
    cableGeometry,
    socketGeometry,
    bulbGeometry,
    haloGeometry,
    instanceColor,
    cableMaterial,
    socketMaterial,
    bulbMaterial,
    haloMaterial,
    diagnostics: {
      rendererRoute: "WebGLRenderer/batched-instancing",
      drawBatchCount: 4,
      pointLightCount: 0,
      alphaModel: "straight-alpha-plus-additive-halo",
    },
    dispose() {
      cableGeometry.dispose();
      socketGeometry.dispose();
      bulbGeometry.dispose();
      haloGeometry.dispose();
      cableMaterial.dispose();
      socketMaterial.dispose();
      bulbMaterial.dispose();
      haloMaterial.dispose();
    },
  };
}
