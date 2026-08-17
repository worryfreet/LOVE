import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  LinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from "three";
import {
  COTTAGE_GARDEN_ATMOSPHERE_RENDERING,
  createCottageGardenSunHaloPixels,
  createCottageGardenSunSurfacePixels,
  createCottageGardenSunVeilPixels,
} from "../model/gardenAtmosphere";
import { COTTAGE_GARDEN_RENDERING } from "../model/gardenRendering";
import {
  COTTAGE_GARDEN_INITIAL_TIME_COMMAND,
  COTTAGE_GARDEN_TIME_PRESETS,
  resolveCottageGardenForwardTargetPhase,
  sampleCottageGardenTime,
  sampleCottageGardenTransitionPhase,
  type CottageGardenRgb,
  type CottageGardenTimeCommand,
} from "../model/gardenTime";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import { cottagePortalRuntime } from "../model/cottagePortalMachine";
import {
  resolveCottageGardenRomanticTimePhase,
  type CottageGardenRomanticSignal,
} from "../model/gardenRomanticExperience";

const skyVertexShader = /* glsl */ `
  varying vec3 vSkyDirection;

  void main() {
    vSkyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uHorizonColor;
  uniform vec3 uMiddleColor;
  uniform vec3 uZenithColor;
  uniform vec3 uSunBlushColor;
  uniform vec3 uCloudShadowColor;
  uniform vec3 uCloudLightColor;
  uniform float uCloudCoverage;
  uniform float uCloudOpacity;
  uniform float uSkySaturation;
  varying vec3 vSkyDirection;

  float skyHash(vec3 point) {
    return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float skyNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = skyHash(cell);
    float b = skyHash(cell + vec3(1.0, 0.0, 0.0));
    float c = skyHash(cell + vec3(0.0, 1.0, 0.0));
    float d = skyHash(cell + vec3(1.0, 1.0, 0.0));
    float e = skyHash(cell + vec3(0.0, 0.0, 1.0));
    float f = skyHash(cell + vec3(1.0, 0.0, 1.0));
    float g = skyHash(cell + vec3(0.0, 1.0, 1.0));
    float h = skyHash(cell + vec3(1.0, 1.0, 1.0));
    float nearLayer = mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
    float farLayer = mix(mix(e, f, local.x), mix(g, h, local.x), local.y);
    return mix(nearLayer, farLayer, local.z);
  }

  float skyFbm(vec3 point) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      value += skyNoise(point) * amplitude;
      point = point * 2.04 + vec3(13.71, 8.43, 5.17);
      amplitude *= 0.5;
    }
    return value / 0.96875;
  }

  void main() {
    vec3 direction = normalize(vSkyDirection);
    float height = clamp(direction.y, 0.0, 1.0);
    float skyMix = smoothstep(0.14, 0.72, height);
    vec3 skyColor = mix(uHorizonColor, uMiddleColor, smoothstep(0.012, 0.2, height));
    skyColor = mix(skyColor, uZenithColor, skyMix);

    float sunDot = dot(direction, normalize(uSunDirection));
    float sunGlow = pow(max(sunDot, 0.0), 14.0);
    float sunHaze = pow(max(sunDot, 0.0), 4.0);
    float horizonHaze = exp(-height * 5.6);
    float roseBand = (1.0 - smoothstep(0.16, 0.58, height)) * 0.12;
    skyColor = mix(skyColor, uSunBlushColor, roseBand + sunHaze * horizonHaze * 0.11);
    skyColor += uSunBlushColor * sunGlow * 0.15;
    skyColor += vec3(0.025, 0.008, 0.012) * horizonHaze;

    vec3 cloudPoint = direction * vec3(4.15, 6.4, 4.15) + vec3(1.73, 0.38, -0.82);
    float cloudLow = skyFbm(cloudPoint);
    float cloudFine = skyNoise(cloudPoint * 3.4 + vec3(9.2, 3.4, 6.7));
    float cloudBand = smoothstep(0.10, 0.22, height) * (1.0 - smoothstep(0.76, 0.94, height));
    float cloudErosion = skyFbm(cloudPoint * 3.4 + vec3(8.7, 2.1, 4.3));
    float cloudBase = cloudLow * 0.78 + cloudFine * 0.14 + cloudErosion * 0.08;
    float cloudThreshold = mix(0.72, 0.46, uCloudCoverage);
    float cloudShape = smoothstep(cloudThreshold, cloudThreshold + 0.12, cloudBase + (cloudErosion - 0.5) * 0.22) * cloudBand;
    float cloudWisps = smoothstep(0.61, 0.73, skyFbm(cloudPoint * vec3(1.42, 1.26, 1.37) + 5.8)) * cloudBand;
    float cloudOpacity = clamp((cloudShape * 0.9 + cloudWisps * 0.22) * uCloudOpacity, 0.0, 0.92);
    cloudOpacity *= 1.0 - smoothstep(0.91, 0.995, sunDot) * 0.9;
    float cloudLight = clamp(0.3 + cloudFine * 0.3 + sunGlow * 0.7 + height * 0.16, 0.0, 1.0);
    vec3 cloudShade = mix(uCloudShadowColor, uCloudLightColor, cloudLight);
    float silverEdge = smoothstep(0.06, 0.34, cloudOpacity) * (1.0 - smoothstep(0.46, 0.7, cloudOpacity));
    cloudShade += uSunBlushColor * silverEdge * (0.08 + sunGlow * 0.12);
    skyColor = mix(skyColor, cloudShade, cloudOpacity);
    float skyLuma = dot(skyColor, vec3(0.2126, 0.7152, 0.0722));
    skyColor = mix(vec3(skyLuma), skyColor, uSkySaturation);

    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

function createSunSurfaceTexture() {
  const { width, height } =
    COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.surfaceTexture;
  const texture = new DataTexture(
    createCottageGardenSunSurfacePixels(width, height),
    width,
    height,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = "atmosphere.sun-surface.texture";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSunHaloTexture(kind: "halo" | "veil") {
  const size = COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.haloTextureSize;
  const pixels =
    kind === "halo"
      ? createCottageGardenSunHaloPixels(size)
      : createCottageGardenSunVeilPixels(size);
  const texture = new DataTexture(
    pixels,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = `atmosphere.sun-${kind}.texture`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function setColor(color: Color, value: CottageGardenRgb) {
  color.setRGB(value[0], value[1], value[2]);
}

interface CottageGardenAtmosphereProps {
  timeCommand?: CottageGardenTimeCommand;
  tuning?: CottageGardenTuning;
  shadowsEnabled?: boolean;
  romanticSignal?: CottageGardenRomanticSignal;
}

export function CottageGardenAtmosphere({
  timeCommand = COTTAGE_GARDEN_INITIAL_TIME_COMMAND,
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
  shadowsEnabled = true,
  romanticSignal,
}: CottageGardenAtmosphereProps) {
  const { camera, gl, scene } = useThree();
  const skyGroupRef = useRef<Group>(null);
  const sunCoreRef = useRef<Group>(null);
  const sunVeilRef = useRef<Sprite>(null);
  const sunInnerHaloRef = useRef<Sprite>(null);
  const sunOuterHaloRef = useRef<Sprite>(null);
  const sunCoreMaterialRef = useRef<MeshStandardMaterial>(null);
  const sunVeilMaterialRef = useRef<SpriteMaterial>(null);
  const sunInnerHaloMaterialRef = useRef<SpriteMaterial>(null);
  const sunOuterHaloMaterialRef = useRef<SpriteMaterial>(null);
  const hemisphereRef = useRef<HemisphereLight>(null);
  const ambientRef = useRef<AmbientLight>(null);
  const reflectedRef = useRef<DirectionalLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);
  const phaseRef = useRef(COTTAGE_GARDEN_TIME_PRESETS[timeCommand.target].phase);
  const lastCommandNonceRef = useRef(timeCommand.nonce);
  const transitionRef = useRef({
    startPhase: phaseRef.current,
    targetPhase: phaseRef.current,
    startedAt: 0,
    durationSeconds: 0,
  });
  const sunDirection = useMemo(() => new Vector3(), []);
  const fogColor = useMemo(() => new Color(), []);
  const sunTint = useMemo(() => new Color(tuning.lighting.sunTint), [tuning.lighting.sunTint]);
  const fogTint = useMemo(() => new Color(tuning.weather.fogTint), [tuning.weather.fogTint]);
  const surfaceTexture = useMemo(createSunSurfaceTexture, []);
  const haloTexture = useMemo(() => createSunHaloTexture("halo"), []);
  const veilTexture = useMemo(() => createSunHaloTexture("veil"), []);
  const initialSample = useMemo(
    () => sampleCottageGardenTime(phaseRef.current),
    [],
  );
  const skyMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uSunDirection: { value: new Vector3(...initialSample.sunDirection) },
        uHorizonColor: { value: new Color().setRGB(...initialSample.sky.horizon) },
        uMiddleColor: { value: new Color().setRGB(...initialSample.sky.middle) },
        uZenithColor: { value: new Color().setRGB(...initialSample.sky.zenith) },
        uSunBlushColor: { value: new Color().setRGB(...initialSample.sky.sunBlush) },
        uCloudShadowColor: {
          value: new Color().setRGB(...initialSample.sky.cloudShadow),
        },
        uCloudLightColor: {
          value: new Color().setRGB(...initialSample.sky.cloudLight),
        },
        uCloudCoverage: {
          value: COTTAGE_GARDEN_TUNING_DEFAULTS.weather.cloudCoverage,
        },
        uCloudOpacity: {
          value: COTTAGE_GARDEN_TUNING_DEFAULTS.weather.cloudOpacity,
        },
        uSkySaturation: {
          value: COTTAGE_GARDEN_TUNING_DEFAULTS.weather.skySaturation,
        },
      },
    });
    material.name = "atmosphere.natural-cycle-sky.material";
    return material;
  }, [initialSample]);

  useEffect(() => {
    if (timeCommand.nonce === lastCommandNonceRef.current) return;
    lastCommandNonceRef.current = timeCommand.nonce;
    transitionRef.current = {
      startPhase: phaseRef.current,
      targetPhase: resolveCottageGardenForwardTargetPhase(
        phaseRef.current,
        timeCommand.target,
      ),
      startedAt: performance.now() / 1_000,
      durationSeconds: Math.max(0, timeCommand.durationSeconds),
    };
  }, [timeCommand]);

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    const background = new Color().setRGB(...initialSample.fog.color);
    const fog = new Fog(background.clone(), initialSample.fog.near, initialSample.fog.far);
    scene.background = background;
    scene.fog = fog;
    gl.setClearColor(background);

    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
      delete scene.userData.cottageGardenTime;
    };
  }, [gl, initialSample, scene]);

  useEffect(
    () => () => {
      skyMaterial.dispose();
      surfaceTexture.dispose();
      haloTexture.dispose();
      veilTexture.dispose();
    },
    [haloTexture, skyMaterial, surfaceTexture, veilTexture],
  );

  useFrame(() => {
    skyGroupRef.current?.position.copy(camera.position);
    const romanticFrame = romanticSignal?.getFrameSnapshot();
    if (romanticFrame?.storyEnvironmentActive) {
      phaseRef.current = resolveCottageGardenRomanticTimePhase(
        romanticFrame.timeSeconds,
      );
    } else {
      const transition = transitionRef.current;
      const now = performance.now() / 1_000;
      phaseRef.current = sampleCottageGardenTransitionPhase(
        transition.startPhase,
        transition.targetPhase,
        now - transition.startedAt,
        transition.durationSeconds,
      );
    }
    const sample = sampleCottageGardenTime(phaseRef.current);
    const interiorBlend = cottagePortalRuntime.getSnapshot().interiorBlend;
    sunDirection.set(...sample.sunDirection).normalize();

    skyMaterial.uniforms.uSunDirection.value.copy(sunDirection);
    setColor(skyMaterial.uniforms.uHorizonColor.value, sample.sky.horizon);
    setColor(skyMaterial.uniforms.uMiddleColor.value, sample.sky.middle);
    setColor(skyMaterial.uniforms.uZenithColor.value, sample.sky.zenith);
    setColor(skyMaterial.uniforms.uSunBlushColor.value, sample.sky.sunBlush);
    setColor(skyMaterial.uniforms.uCloudShadowColor.value, sample.sky.cloudShadow);
    setColor(skyMaterial.uniforms.uCloudLightColor.value, sample.sky.cloudLight);
    skyMaterial.uniforms.uCloudCoverage.value = tuning.weather.cloudCoverage;
    skyMaterial.uniforms.uCloudOpacity.value = tuning.weather.cloudOpacity;
    skyMaterial.uniforms.uSkySaturation.value = tuning.weather.skySaturation;

    const sunPosition = sunDirection
      .clone()
      .multiplyScalar(COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.distance);
    sunCoreRef.current?.position.copy(sunPosition);
    sunVeilRef.current?.position.copy(sunPosition);
    sunInnerHaloRef.current?.position.copy(sunPosition);
    sunOuterHaloRef.current?.position.copy(sunPosition);
    sunCoreRef.current?.scale.setScalar(tuning.lighting.sunSize);
    sunVeilRef.current?.scale.setScalar(
      COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.veil.diameter *
        tuning.lighting.sunSize,
    );
    sunInnerHaloRef.current?.scale.setScalar(
      COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.innerHalo.diameter *
        tuning.lighting.sunSize,
    );
    sunOuterHaloRef.current?.scale.setScalar(
      COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.outerHalo.diameter *
        tuning.lighting.sunSize,
    );
    if (sunCoreMaterialRef.current) {
      setColor(sunCoreMaterialRef.current.color, sample.sun.core);
      setColor(sunCoreMaterialRef.current.emissive, sample.sun.core);
      sunCoreMaterialRef.current.color.multiply(sunTint);
      sunCoreMaterialRef.current.emissive.multiply(sunTint);
      sunCoreMaterialRef.current.emissiveIntensity =
        COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.emissiveIntensity *
        Math.max(0.16, sample.sun.opacity) *
        tuning.lighting.sunIntensity;
    }
    if (sunVeilMaterialRef.current) {
      setColor(sunVeilMaterialRef.current.color, sample.sun.veil);
      sunVeilMaterialRef.current.color.multiply(sunTint);
      sunVeilMaterialRef.current.opacity =
        COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.veil.opacity *
        sample.sun.opacity *
        Math.min(1.35, tuning.lighting.sunIntensity);
    }
    if (sunInnerHaloMaterialRef.current) {
      setColor(sunInnerHaloMaterialRef.current.color, sample.sun.innerHalo);
      sunInnerHaloMaterialRef.current.color.multiply(sunTint);
      sunInnerHaloMaterialRef.current.opacity =
        COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.innerHalo.opacity *
        sample.sun.opacity *
        Math.min(1.35, tuning.lighting.sunIntensity);
    }
    if (sunOuterHaloMaterialRef.current) {
      setColor(sunOuterHaloMaterialRef.current.color, sample.sun.outerHalo);
      sunOuterHaloMaterialRef.current.color.multiply(sunTint);
      sunOuterHaloMaterialRef.current.opacity =
        COTTAGE_GARDEN_ATMOSPHERE_RENDERING.sun.outerHalo.opacity *
        sample.sun.opacity *
        Math.min(1.35, tuning.lighting.sunIntensity);
    }

    const hemisphere = hemisphereRef.current;
    if (hemisphere) {
      setColor(hemisphere.color, sample.lights.hemisphereSky);
      setColor(hemisphere.groundColor, sample.lights.hemisphereGround);
      hemisphere.intensity =
        sample.lights.hemisphereIntensity *
        tuning.lighting.ambientIntensity *
        (1 - interiorBlend * 0.66);
    }
    if (ambientRef.current) {
      setColor(ambientRef.current.color, sample.lights.ambientColor);
      ambientRef.current.intensity =
        sample.lights.ambientIntensity *
        tuning.lighting.ambientIntensity *
        (1 - interiorBlend * 0.72);
    }
    if (reflectedRef.current) {
      setColor(reflectedRef.current.color, sample.lights.reflectedColor);
      reflectedRef.current.intensity =
        sample.lights.reflectedIntensity *
        tuning.lighting.ambientIntensity *
        (1 - interiorBlend * 0.55);
      reflectedRef.current.position.set(
        -sunDirection.x * 38,
        Math.max(16, Math.abs(sunDirection.y) * 24),
        -sunDirection.z * 38,
      );
    }
    if (directionalRef.current) {
      setColor(directionalRef.current.color, sample.lights.directionalColor);
      directionalRef.current.color.multiply(sunTint);
      directionalRef.current.intensity =
        sample.lights.directionalIntensity *
        tuning.lighting.sunIntensity *
        (1 - interiorBlend * 0.58);
      directionalRef.current.position
        .copy(sunDirection)
        .multiplyScalar(
          COTTAGE_GARDEN_RENDERING.lights.directional.distanceAlongSunDirection,
        );
    }

    setColor(fogColor, sample.fog.color);
    fogColor.lerp(fogTint, tuning.weather.fogTintStrength);
    if (scene.background instanceof Color) scene.background.copy(fogColor);
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(fogColor);
      scene.fog.near = sample.fog.near * tuning.weather.fogNearScale;
      scene.fog.far = Math.max(
        scene.fog.near + 24,
        sample.fog.far * tuning.weather.fogFarScale,
      );
    }
    gl.setClearColor(fogColor);
    gl.toneMappingExposure =
      sample.exposure * tuning.lighting.exposure * (1 - interiorBlend * 0.12);
    scene.userData.cottageGardenTime = {
      phase: sample.phase,
      from: sample.from,
      to: sample.to,
      target: timeCommand.target,
      durationSeconds: timeCommand.durationSeconds,
      transitioning: romanticFrame?.storyEnvironmentActive
        ? phaseRef.current < 0.75 - 1e-4
        : Math.abs(transitionRef.current.targetPhase - phaseRef.current) > 1e-4,
      order: "dawn-noon-dusk-evening-clockwise",
      weatherPreset: tuning.weather.preset,
      cloudCoverage: tuning.weather.cloudCoverage,
      sunIntensity: tuning.lighting.sunIntensity,
    };
  });

  const { sky, sun } = COTTAGE_GARDEN_ATMOSPHERE_RENDERING;

  return (
    <>
      <group
        ref={skyGroupRef}
        name="atmosphere.natural-cycle-sky"
        userData={{
          semanticId: "atmosphere.natural-cycle-sky",
          timeField: "field.time-of-day",
          cloudRepresentation: "procedural-direction-domain",
        }}
      >
        <mesh frustumCulled={false} renderOrder={-10}>
          <sphereGeometry args={[sky.radius, sky.segments, sky.heightSegments]} />
          <primitive object={skyMaterial} attach="material" />
        </mesh>
        <group
          name="atmosphere.sun-model"
          userData={{
            semanticId: "atmosphere.sun-model",
            directionField: "field.sun-direction",
            timeField: "field.time-of-day",
          }}
        >
          <group ref={sunCoreRef}>
            <mesh renderOrder={-8} userData={{ semanticId: "atmosphere.sun-core" }}>
              <sphereGeometry args={[sun.radius, sun.widthSegments, sun.heightSegments]} />
              <meshStandardMaterial
                ref={sunCoreMaterialRef}
                map={surfaceTexture}
                emissiveMap={surfaceTexture}
                roughness={1}
                metalness={0}
                depthWrite={false}
                fog={false}
              />
            </mesh>
          </group>
          <sprite
            ref={sunVeilRef}
            scale={[sun.veil.diameter, sun.veil.diameter, 1]}
            renderOrder={-5}
            userData={{ semanticId: "atmosphere.sun-veil" }}
          >
            <spriteMaterial
              ref={sunVeilMaterialRef}
              map={veilTexture}
              transparent
              depthWrite={false}
              depthTest
              blending={AdditiveBlending}
              fog={false}
            />
          </sprite>
          <sprite
            ref={sunInnerHaloRef}
            scale={[sun.innerHalo.diameter, sun.innerHalo.diameter, 1]}
            renderOrder={-7}
            userData={{ semanticId: "atmosphere.sun-halo.inner" }}
          >
            <spriteMaterial
              ref={sunInnerHaloMaterialRef}
              map={haloTexture}
              transparent
              depthWrite={false}
              depthTest
              blending={AdditiveBlending}
              fog={false}
            />
          </sprite>
          <sprite
            ref={sunOuterHaloRef}
            scale={[sun.outerHalo.diameter, sun.outerHalo.diameter, 1]}
            renderOrder={-6}
            userData={{ semanticId: "atmosphere.sun-halo.outer" }}
          >
            <spriteMaterial
              ref={sunOuterHaloMaterialRef}
              map={haloTexture}
              transparent
              depthWrite={false}
              depthTest
              blending={AdditiveBlending}
              fog={false}
            />
          </sprite>
        </group>
      </group>
      <hemisphereLight
        ref={hemisphereRef}
        userData={{ semanticId: "light.hemisphere-ambient" }}
      />
      <ambientLight
        ref={ambientRef}
        userData={{ semanticId: "light.ambient-contribution" }}
      />
      <directionalLight
        ref={reflectedRef}
        userData={{
          semanticId: "light.reflected-natural-fill",
          approximation: "sky-bounce",
        }}
      />
      <directionalLight
        ref={directionalRef}
        castShadow={shadowsEnabled}
        userData={{
          semanticId: "light.directional-sun",
          directionField: "field.sun-direction",
          timeField: "field.time-of-day",
        }}
        shadow-bias={-0.00012}
        shadow-radius={8}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={150}
      />
    </>
  );
}
