import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SceneEnvironmentProps } from "../../../model/sceneLoaders";
import { CottageExterior } from "./CottageExterior";
import { CottageInterior } from "./CottageInterior";
import { CottageFenceSystem } from "./CottageFenceSystem";
import { CottageGardenAtmosphere } from "./GardenAtmosphere";
import { CottageGardenRenderer } from "./GardenRenderer";
import { CottageGardenPath } from "./GardenPath";
import { CottageGardenTerrain } from "./GardenTerrain";
import { CottageGardenLodController } from "./GardenLodController";
import { CottageGardenWildflowerMeadow } from "./GardenWildflowerMeadow";
import { CottageGardenPlanting } from "./GardenPlanting";
import { CottageGardenMorningGlory } from "./GardenMorningGlory";
import { CottageGardenRomanceSky } from "./GardenRomanceSky";
import { CottageGardenNightStringLights } from "./GardenNightStringLights";
import { CottageExperienceCoordinator } from "./CottageExperienceCoordinator";
import { cottagePortalRuntime } from "../model/cottagePortalMachine";
import type { CottageGardenTimeCommand } from "../model/gardenTime";
import type { CottageGardenSkyAnimationCommand } from "../model/gardenSkyAnimation";
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  type CottageGardenTuning,
} from "../model/gardenTuning";
import {
  createCottageGardenMeadowHabitatTexture,
  createCottageGardenMeadowLocalCoverageTexture,
  createCottageGardenTerrainHeightTexture,
} from "./gardenFieldTextures";
import type { CottageGardenGiftNames } from "../model/gardenEntrancePlaque";
import type { CottageGardenRomanticSignal } from "../model/gardenRomanticExperience";

export interface CottageFlowerGardenWorldProps extends SceneEnvironmentProps {
  children?: ReactNode;
  timeCommand?: CottageGardenTimeCommand;
  skyAnimationCommand?: CottageGardenSkyAnimationCommand;
  tuning?: CottageGardenTuning;
  interiorEditMode?: boolean;
  giftNames?: CottageGardenGiftNames;
  skyMessage?: string;
  romanticSignal?: CottageGardenRomanticSignal;
}

export function CottageFlowerGardenWorld({
  children,
  reducedMotion,
  timeCommand,
  skyAnimationCommand,
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
  interiorEditMode = false,
  giftNames,
  skyMessage,
  romanticSignal,
}: CottageFlowerGardenWorldProps) {
  const portalSnapshot = useSyncExternalStore(
    cottagePortalRuntime.subscribe,
    cottagePortalRuntime.getSnapshot,
    cottagePortalRuntime.getSnapshot,
  );
  const exteriorHighDensityVisible =
    !interiorEditMode &&
    (portalSnapshot.zone !== "interior" || portalSnapshot.visualOpen);
  const detailedInteriorVisible =
    interiorEditMode ||
    portalSnapshot.visualOpen ||
    portalSnapshot.zone !== "exterior";
  const staticFieldTextures = useMemo(
    () => ({
      habitat: createCottageGardenMeadowHabitatTexture(),
      terrainHeight: createCottageGardenTerrainHeightTexture(),
    }),
    [],
  );
  const localCoverage = useMemo(
    () =>
      createCottageGardenMeadowLocalCoverageTexture(
        tuning.garden.pathClearanceMeters,
        tuning.garden.bedEdgeFeatherMeters,
        tuning.garden.pathSurfaceBlendFeatherMeters,
        tuning.garden.pathSurfaceEdgeWarpMeters,
      ),
    [
      tuning.garden.bedEdgeFeatherMeters,
      tuning.garden.pathClearanceMeters,
      tuning.garden.pathSurfaceBlendFeatherMeters,
      tuning.garden.pathSurfaceEdgeWarpMeters,
    ],
  );

  useEffect(
    () => () => {
      staticFieldTextures.habitat.dispose();
      staticFieldTextures.terrainHeight.dispose();
    },
    [staticFieldTextures],
  );
  useEffect(() => () => localCoverage.dispose(), [localCoverage]);

  return (
    <>
      <CottageGardenAtmosphere
        timeCommand={timeCommand}
        tuning={tuning}
        shadowsEnabled={!interiorEditMode}
        romanticSignal={romanticSignal}
      />
      <CottageGardenRomanceSky
        command={skyAnimationCommand}
        reducedMotion={reducedMotion}
        message={skyMessage}
        romanticSignal={romanticSignal}
      />
      <CottageGardenRenderer />
      <CottageGardenLodController tuning={tuning} />
      <CottageExperienceCoordinator forceInterior={interiorEditMode} />
      <group name="scene.cottage-flower-garden">
        {!interiorEditMode && (
          <group
            name="scene.exterior-world"
            userData={{
              semanticId: "scene.exterior-world",
              highDensityVisible: exteriorHighDensityVisible,
            }}
          >
            <CottageGardenTerrain
              tuning={tuning}
              habitatMap={staticFieldTextures.habitat}
              localCoverageMap={localCoverage}
            />
            {exteriorHighDensityVisible && (
              <>
                <CottageGardenWildflowerMeadow
                  tuning={tuning}
                  terrainMap={staticFieldTextures.terrainHeight}
                  habitatMap={staticFieldTextures.habitat}
                  localCoverageMap={localCoverage}
                />
                <CottageGardenPlanting
                  tuning={tuning}
                  romanticSignal={romanticSignal}
                />
              </>
            )}
            <CottageGardenPath tuning={tuning} />
            <CottageFenceSystem giftNames={giftNames} />
            <CottageGardenNightStringLights />
          </group>
        )}
        <group
          name="scene.cottage-threshold"
          userData={{ semanticId: "scene.cottage-threshold" }}
        >
          {!interiorEditMode && (
            <>
              <CottageExterior tuning={tuning} />
              <CottageGardenMorningGlory tuning={tuning} />
            </>
          )}
        </group>
        <group
          name="scene.cottage-interior-world"
          userData={{
            semanticId: "scene.cottage-interior-world",
            active: detailedInteriorVisible,
          }}
        >
          <CottageInterior tuning={tuning} cutaway={interiorEditMode} />
          {detailedInteriorVisible && children}
        </group>
      </group>
    </>
  );
}
