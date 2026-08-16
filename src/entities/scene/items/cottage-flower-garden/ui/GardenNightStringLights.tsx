import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import {
  COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT,
  sampleCottageGardenNightLightFactor,
} from "../model/gardenNightLights";
import { createCottageGardenNightLightRenderBundle } from "./gardenNightStringLightsRender";

interface CottageGardenNightLightRuntimeSnapshot {
  readonly componentType: "cottage-garden-night-string-lights";
  readonly routeCount: number;
  readonly fenceRouteCount: number;
  readonly cottageRouteCount: number;
  readonly bulbCount: number;
  readonly drawBatchCount: number;
  readonly pointLightCount: 0;
  phase: number;
  nightFactor: number;
  active: boolean;
}

/**
 * 围栏与小屋共用一个确定性实例池；唯一帧更新只读取自然时间并调整材质亮度。
 * 不创建逐灯 PointLight、阴影或第二套动画循环。
 */
export function CottageGardenNightStringLights() {
  const { scene } = useThree();
  const socketRef = useRef<InstancedMesh>(null);
  const bulbRef = useRef<InstancedMesh>(null);
  const haloRef = useRef<InstancedMesh>(null);
  const layout = COTTAGE_GARDEN_NIGHT_LIGHT_LAYOUT;
  const resources = useMemo(
    () => createCottageGardenNightLightRenderBundle(layout),
    [layout],
  );
  const snapshot = useMemo<CottageGardenNightLightRuntimeSnapshot>(
    () => ({
      componentType: "cottage-garden-night-string-lights",
      routeCount: layout.measurements.routeCount,
      fenceRouteCount: layout.measurements.fenceRouteCount,
      cottageRouteCount: layout.measurements.cottageRouteCount,
      bulbCount: layout.measurements.bulbCount,
      drawBatchCount: resources.diagnostics.drawBatchCount,
      pointLightCount: resources.diagnostics.pointLightCount,
      phase: 0.25,
      nightFactor: 0,
      active: false,
    }),
    [layout, resources.diagnostics],
  );

  useLayoutEffect(() => {
    const sockets = socketRef.current;
    const bulbs = bulbRef.current;
    const halos = haloRef.current;
    if (!sockets || !bulbs || !halos) return;
    const transform = new Object3D();

    layout.bulbs.forEach((bulb, index) => {
      const [x, y, z] = bulb.position;
      transform.position.set(x, y - 0.023, z);
      transform.scale.setScalar(1);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      sockets.setMatrixAt(index, transform.matrix);

      const sizeVariation = 0.9 + Math.sin(bulb.shimmerPhase) * 0.1;
      const zoneScale = bulb.zone === "fence" ? 0.72 : 1;
      transform.position.set(x, y - 0.062, z);
      transform.scale.setScalar(sizeVariation * zoneScale);
      transform.updateMatrix();
      bulbs.setMatrixAt(index, transform.matrix);

      transform.scale.setScalar((0.9 + sizeVariation * 0.12) * zoneScale);
      transform.updateMatrix();
      halos.setMatrixAt(index, transform.matrix);

    });

    for (const mesh of [sockets, bulbs, halos]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
    resources.bulbMaterial.needsUpdate = true;
    resources.haloMaterial.needsUpdate = true;
  }, [layout, resources]);

  useEffect(() => {
    scene.userData.cottageGardenNightLights = snapshot;
    return () => {
      if (scene.userData.cottageGardenNightLights === snapshot) {
        delete scene.userData.cottageGardenNightLights;
      }
      resources.dispose();
    };
  }, [resources, scene, snapshot]);

  useFrame(() => {
    const phase =
      (scene.userData.cottageGardenTime as { phase?: number } | undefined)
        ?.phase ?? 0.25;
    const nightFactor = sampleCottageGardenNightLightFactor(phase);
    resources.bulbMaterial.uniforms.uOpacity.value =
      0.18 + nightFactor * 0.82;
    resources.haloMaterial.uniforms.uOpacity.value = nightFactor * 0.36;
    resources.cableMaterial.opacity = 0.68 + nightFactor * 0.2;
    snapshot.phase = phase;
    snapshot.nightFactor = nightFactor;
    snapshot.active = nightFactor > 0.01;
  });

  return (
    <group
      name="garden.night-string-lights"
      userData={{
        semanticId: "garden.night-string-lights",
        zones: ["fence", "cottage"],
        routeIds: layout.routes.map((route) => route.id),
        bulbCount: layout.measurements.bulbCount,
        representation: "batched-colored-cores-with-additive-halos",
      }}
    >
      <lineSegments
        name="garden.night-string-lights.cables"
        geometry={resources.cableGeometry}
        material={resources.cableMaterial}
      />
      <instancedMesh
        ref={socketRef}
        name="garden.night-string-lights.sockets"
        args={[
          resources.socketGeometry,
          resources.socketMaterial,
          layout.bulbs.length,
        ]}
      />
      <instancedMesh
        ref={bulbRef}
        name="garden.night-string-lights.bulbs"
        args={[
          resources.bulbGeometry,
          resources.bulbMaterial,
          layout.bulbs.length,
        ]}
        instanceColor={resources.instanceColor}
      />
      <instancedMesh
        ref={haloRef}
        name="garden.night-string-lights.halos"
        args={[
          resources.haloGeometry,
          resources.haloMaterial,
          layout.bulbs.length,
        ]}
        instanceColor={resources.instanceColor}
        frustumCulled={false}
      />
    </group>
  );
}
