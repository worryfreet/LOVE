import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  COTTAGE_GARDEN_INITIAL_SKY_ANIMATION_COMMAND,
  COTTAGE_GARDEN_METEORS,
  COTTAGE_GARDEN_SKY_ANIMATION,
  createCottageGardenBackgroundStars,
  createCottageGardenMessageStars,
  resolveCottageGardenEveningVisibility,
  resolveCottageGardenMessageStarPosition,
  resolveCottageGardenSkyAnimationTime,
  sampleCottageGardenSkyAnimation,
  type CottageGardenBackgroundStar,
  type CottageGardenMessageStar,
  type CottageGardenSkyAnimationCommand,
} from "../model/gardenSkyAnimation";
import {
  COTTAGE_GARDEN_METEOR_RENDER_DIAGNOSTICS,
  createCottageGardenMeteorRenderBundle,
  disposeCottageGardenMeteorRender,
  updateCottageGardenMeteorRender,
} from "./gardenMeteorShowerRender";

const starVertexShader = /* glsl */ `
  attribute vec3 color;
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uTwinkleStrength;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSparkle;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float perspectiveSize = 310.0 / max(1.0, -viewPosition.z);
    gl_PointSize = max(1.0, aSize * uPixelRatio * perspectiveSize);
    gl_Position = projectionMatrix * viewPosition;
    vColor = color;
    float twinkleRate =
      0.45 + fract(sin(aPhase * 12.9898) * 43758.5453) * 1.25;
    float twinkle = 0.5 + sin(uTime * twinkleRate + aPhase) * 0.5;
    vAlpha = uOpacity * (1.0 - uTwinkleStrength + twinkle * uTwinkleStrength);
    vSparkle = smoothstep(4.1, 5.5, aSize);
  }
`;

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSparkle;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float core = 1.0 - smoothstep(0.02, 0.18, distanceToCenter);
    float halo = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
    vec2 centered = abs(gl_PointCoord - vec2(0.5));
    float crossRay =
      (1.0 - smoothstep(0.012, 0.048, min(centered.x, centered.y))) *
      (1.0 - smoothstep(0.16, 0.5, distanceToCenter)) *
      vSparkle;
    float alpha = (core * 0.78 + halo * 0.42 + crossRay * 0.24) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor * (1.0 + core * 0.75), alpha);
  }
`;

type SkyStar = CottageGardenMessageStar | CottageGardenBackgroundStar;
type StarRenderDatum = Pick<SkyStar, "color" | "phase" | "size">;

function createStarGeometry(
  stars: readonly StarRenderDatum[],
  positions: readonly (readonly [number, number, number])[],
) {
  const geometry = new BufferGeometry();
  const positionValues = new Float32Array(stars.length * 3);
  const colorValues = new Float32Array(stars.length * 3);
  const phaseValues = new Float32Array(stars.length);
  const sizeValues = new Float32Array(stars.length);
  stars.forEach((star, index) => {
    const offset = index * 3;
    positionValues[offset] = positions[index][0];
    positionValues[offset + 1] = positions[index][1];
    positionValues[offset + 2] = positions[index][2];
    colorValues[offset] = star.color[0];
    colorValues[offset + 1] = star.color[1];
    colorValues[offset + 2] = star.color[2];
    phaseValues[index] = star.phase;
    sizeValues[index] = star.size;
  });
  geometry.setAttribute("position", new BufferAttribute(positionValues, 3));
  geometry.setAttribute("color", new BufferAttribute(colorValues, 3));
  geometry.setAttribute("aPhase", new BufferAttribute(phaseValues, 1));
  geometry.setAttribute("aSize", new BufferAttribute(sizeValues, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createStarMaterial(name: string, twinkleStrength: number) {
  const material = new ShaderMaterial({
    name,
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uTwinkleStrength: { value: twinkleStrength },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return material;
}

export function CottageGardenRomanceSky({
  command = COTTAGE_GARDEN_INITIAL_SKY_ANIMATION_COMMAND,
  reducedMotion = false,
  message = COTTAGE_GARDEN_SKY_ANIMATION.message,
}: {
  command?: CottageGardenSkyAnimationCommand;
  reducedMotion?: boolean;
  message?: string;
}) {
  const { camera, gl, scene, size } = useThree();
  const skyGroupRef = useRef<Group>(null);
  const eventGroupRef = useRef<Group>(null);
  const messagePointsRef = useRef<Points>(null);
  const eventYawRef = useRef(0);
  const eventAnchorPositionRef = useRef(new Vector3());
  const lastAnchoredCommandNonceRef = useRef(Number.NaN);
  const forwardDirection = useMemo(() => new Vector3(), []);
  const messageStars = useMemo(
    () => createCottageGardenMessageStars(COTTAGE_GARDEN_SKY_ANIMATION.seed, message),
    [message],
  );
  const backgroundStars = useMemo(createCottageGardenBackgroundStars, []);
  const messageGeometry = useMemo(
    () =>
      createStarGeometry(
        messageStars,
        messageStars.map((star) =>
          resolveCottageGardenMessageStarPosition(star, 0),
        ),
      ),
    [messageStars],
  );
  const backgroundGeometry = useMemo(
    () =>
      createStarGeometry(
        backgroundStars,
        backgroundStars.map((star) => star.position),
      ),
    [backgroundStars],
  );
  const messageMaterial = useMemo(
    () => createStarMaterial("atmosphere.romance-sky.message-stars", 0.12),
    [],
  );
  const backgroundMaterial = useMemo(
    () => createStarMaterial("atmosphere.romance-sky.background-stars", 0.24),
    [],
  );
  const meteorRender = useMemo(createCottageGardenMeteorRenderBundle, []);
  const twilightMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        name: "atmosphere.romance-sky.indigo-veil",
        color: "#020719",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: BackSide,
        toneMapped: false,
      }),
    [],
  );
  const diagnosticsRef = useRef({
    semanticId: COTTAGE_GARDEN_SKY_ANIMATION.semanticId,
    message,
    durationSeconds: COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
    timeSeconds: 0,
    normalizedProgress: 0,
    backgroundOpacity: 0,
    assemblyProgress: 0,
    eveningVisibility: 0,
    playing: false,
    complete: false,
    reducedMotion,
    messageStarCount: messageStars.length,
    backgroundStarCount: backgroundStars.length,
    backgroundCoverage: "full-upper-hemisphere",
    meteorCount: COTTAGE_GARDEN_METEORS.length,
    meteorRender: COTTAGE_GARDEN_METEOR_RENDER_DIAGNOSTICS,
    activeMeteorCount: 0,
    activeMeteorFragmentCount: 0,
    meteorTrailVertexCount: 0,
    messageHorizontalScale: 1,
    eventAnchorYaw: 0,
    eventAnchorPosition: [0, 0, 0] as [number, number, number],
    commandNonce: command.nonce,
  });

  useEffect(() => {
    const diagnostics = diagnosticsRef.current;
    scene.userData.cottageSkyAnimation = diagnostics;
    return () => {
      if (scene.userData.cottageSkyAnimation === diagnostics) {
        delete scene.userData.cottageSkyAnimation;
      }
    };
  }, [scene]);

  useEffect(
    () => () => {
      messageGeometry.dispose();
      backgroundGeometry.dispose();
      disposeCottageGardenMeteorRender(meteorRender);
      messageMaterial.dispose();
      backgroundMaterial.dispose();
      twilightMaterial.dispose();
    },
    [
      backgroundGeometry,
      backgroundMaterial,
      messageGeometry,
      messageMaterial,
      meteorRender,
      twilightMaterial,
    ],
  );

  useFrame(() => {
    const skyGroup = skyGroupRef.current;
    if (skyGroup) {
      skyGroup.position.copy(camera.position);
    }
    const resolvedTime = resolveCottageGardenSkyAnimationTime(
      command,
      performance.now(),
    );
    const visualTime = reducedMotion && resolvedTime > 0
      ? COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds
      : resolvedTime;
    const sample = sampleCottageGardenSkyAnimation(visualTime);
    if (lastAnchoredCommandNonceRef.current !== command.nonce) {
      const previousTime = diagnosticsRef.current.timeSeconds;
      const shouldReanchor =
        previousTime <= 0.03 ||
        command.timeSeconds <= 0.03 ||
        Math.abs(command.timeSeconds - previousTime) > 0.35;
      if (shouldReanchor) {
        camera.getWorldDirection(forwardDirection);
        eventYawRef.current = Math.atan2(
          -forwardDirection.x,
          -forwardDirection.z,
        );
        eventAnchorPositionRef.current.copy(camera.position);
      }
      lastAnchoredCommandNonceRef.current = command.nonce;
    }
    if (eventGroupRef.current) {
      eventGroupRef.current.position.copy(eventAnchorPositionRef.current);
      eventGroupRef.current.rotation.set(0, eventYawRef.current, 0);
    }
    const naturalPhase = Number(
      (scene.userData.cottageGardenTime as { phase?: number } | undefined)?.phase ?? 0,
    );
    const eveningVisibility = resolveCottageGardenEveningVisibility(naturalPhase);
    const messageHorizontalScale = Math.max(
      0.62,
      Math.min(1, size.width / Math.max(1, size.height) / 0.72),
    );
    if (messagePointsRef.current) {
      messagePointsRef.current.scale.x = messageHorizontalScale;
    }
    const messagePositions = messageGeometry.getAttribute("position") as BufferAttribute;
    messageStars.forEach((star, index) => {
      const position = resolveCottageGardenMessageStarPosition(star, visualTime);
      messagePositions.setXYZ(index, position[0], position[1], position[2]);
    });
    messagePositions.needsUpdate = true;
    messageMaterial.uniforms.uTime.value = visualTime;
    messageMaterial.uniforms.uOpacity.value = sample.messageOpacity * eveningVisibility;
    messageMaterial.uniforms.uPixelRatio.value = gl.getPixelRatio();
    backgroundMaterial.uniforms.uTime.value = visualTime;
    backgroundMaterial.uniforms.uOpacity.value =
      sample.backgroundOpacity * eveningVisibility;
    backgroundMaterial.uniforms.uPixelRatio.value = gl.getPixelRatio();
    twilightMaterial.opacity =
      eveningVisibility * (0.2 + sample.backgroundOpacity * 0.16);
    const meteorFrame = updateCottageGardenMeteorRender(
      meteorRender,
      visualTime,
      reducedMotion ? 0 : eveningVisibility,
      gl.getPixelRatio(),
    );

    Object.assign(diagnosticsRef.current, {
      timeSeconds: resolvedTime,
      normalizedProgress:
        resolvedTime / COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
      backgroundOpacity: sample.backgroundOpacity * eveningVisibility,
      assemblyProgress: sample.assemblyProgress,
      eveningVisibility,
      playing: command.playing && resolvedTime < COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
      complete: resolvedTime >= COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds,
      reducedMotion,
      activeMeteorCount: meteorFrame.activeMeteorCount,
      activeMeteorFragmentCount: meteorFrame.activeFragmentCount,
      meteorTrailVertexCount: meteorFrame.trailVertexCount,
      messageHorizontalScale,
      eventAnchorYaw: eventYawRef.current,
      eventAnchorPosition: eventAnchorPositionRef.current.toArray(),
      commandNonce: command.nonce,
    });
  });

  return (
    <group
      name="atmosphere.romance-sky"
      userData={{
        semanticId: COTTAGE_GARDEN_SKY_ANIMATION.semanticId,
        signalOwner: "timeline.romance-sky-10s",
        rendererRoute: "WebGLRenderer/ShaderMaterial",
      }}
    >
      <group
        ref={skyGroupRef}
        name="atmosphere.romance-sky.camera-centered-background"
      >
        <mesh
          name="atmosphere.romance-sky.indigo-veil"
          material={twilightMaterial}
          frustumCulled={false}
          renderOrder={-9}
        >
          <sphereGeometry args={[760, 32, 18]} />
        </mesh>
        <points
          name="atmosphere.romance-sky.background-stars"
          geometry={backgroundGeometry}
          material={backgroundMaterial}
          frustumCulled={false}
          renderOrder={-5}
        />
      </group>
      <group
        ref={eventGroupRef}
        name="atmosphere.romance-sky.world-anchored-events"
      >
        <points
          ref={messagePointsRef}
          name="atmosphere.romance-sky.message-stars"
          geometry={messageGeometry}
          material={messageMaterial}
          frustumCulled={false}
          renderOrder={-3}
        />
        <lineSegments
          name="atmosphere.romance-sky.meteor-ablation-trails"
          geometry={meteorRender.trailGeometry}
          material={meteorRender.trailMaterial}
          frustumCulled={false}
          renderOrder={-2}
        />
        <points
          name="atmosphere.romance-sky.meteor-heads"
          geometry={meteorRender.headGeometry}
          material={meteorRender.pointMaterial}
          frustumCulled={false}
          renderOrder={-1}
        />
        <points
          name="atmosphere.romance-sky.meteor-fragments"
          geometry={meteorRender.fragmentGeometry}
          material={meteorRender.pointMaterial}
          frustumCulled={false}
          renderOrder={-1}
        />
      </group>
    </group>
  );
}
