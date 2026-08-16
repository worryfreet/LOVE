import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3, type Scene } from "three";
import {
  COTTAGE_GARDEN_LOD,
  resolveCottageGardenLodState,
  resolveCottageGardenLodTier,
  type CottageGardenLodTier,
} from "../model/gardenLod";
import { COTTAGE_GARDEN_WILDFLOWER_MEADOW } from "../model/gardenWildflowerMeadow";
import type { CottageGardenTuning } from "../model/gardenTuning";

const LOD_ANCHOR = new Vector3(...COTTAGE_GARDEN_LOD.anchor);

const LOD_OBJECT_NAMES = {
  outerLawn: COTTAGE_GARDEN_WILDFLOWER_MEADOW.lodObjectName,
  cottageFineDetails: "cottage.fine-details",
  cottageClimbingFoliage: "cottage.climbing-foliage",
  fenceSurfaceDetails: "fence.surface-details",
} as const;

function setObjectVisibleByName(
  scene: Scene,
  name: string,
  visible: boolean,
) {
  const object = scene.getObjectByName(name);
  if (object) object.visible = visible;
}

function applyLodState(
  scene: Scene,
  tier: CottageGardenLodTier,
  distance: number,
) {
  const state = resolveCottageGardenLodState(tier);
  setObjectVisibleByName(
    scene,
    LOD_OBJECT_NAMES.outerLawn,
    state.meadow.outerLawn,
  );
  setObjectVisibleByName(
    scene,
    LOD_OBJECT_NAMES.cottageFineDetails,
    state.cottage.fineDetails,
  );
  setObjectVisibleByName(
    scene,
    LOD_OBJECT_NAMES.cottageClimbingFoliage,
    state.cottage.climbingFoliage,
  );
  setObjectVisibleByName(
    scene,
    LOD_OBJECT_NAMES.fenceSurfaceDetails,
    state.fence.surfaceDetails,
  );
  scene.userData.cottageGardenLod = {
    distance,
    sampledAt: performance.now(),
    ...state,
  };
}

/** 只在跨越带滞回的分级边界时更新可见性，避免每帧 React 重渲染。 */
export function CottageGardenLodController({
  tuning,
}: {
  tuning: CottageGardenTuning;
}) {
  const { camera, scene } = useThree();
  const tierRef = useRef<CottageGardenLodTier | null>(null);
  const lastSampleRef = useRef(0);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastSampleRef.current < 0.25) return;
    lastSampleRef.current = elapsed;
    const distance = camera.position.distanceTo(LOD_ANCHOR);
    const nextTier = resolveCottageGardenLodTier(
      distance,
      tierRef.current ?? "near",
      {
        nearToMiddle: tuning.distance.lodNearToMiddleMeters,
        middleToFar: tuning.distance.lodMiddleToFarMeters,
        hysteresis: tuning.distance.lodHysteresisMeters,
      },
    );
    if (nextTier === tierRef.current) return;
    tierRef.current = nextTier;
    applyLodState(scene, nextTier, distance);
  });

  useEffect(() => {
    const distance = camera.position.distanceTo(LOD_ANCHOR);
    const initialTier = resolveCottageGardenLodTier(
      distance,
      tierRef.current ?? "near",
      {
        nearToMiddle: tuning.distance.lodNearToMiddleMeters,
        middleToFar: tuning.distance.lodMiddleToFarMeters,
        hysteresis: tuning.distance.lodHysteresisMeters,
      },
    );
    tierRef.current = initialTier;
    applyLodState(scene, initialTier, distance);

    return () => {
      delete scene.userData.cottageGardenLod;
    };
  }, [camera, scene, tuning.distance]);

  return null;
}
