import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import {
  COTTAGE_GARDEN_RENDERING,
  type CottageGardenRenderMode,
} from "../model/gardenRendering";

export interface CottageGardenRenderPipelineSnapshot {
  backend: {
    renderer: string;
    requestedContext: string;
    actualContext: string;
  };
  mode: CottageGardenRenderMode;
  passGraph: readonly string[];
  history: "none";
  resolution: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  frameStats: {
    calls: number;
    triangles: number;
    lines: number;
    points: number;
  };
}

export interface CottageGardenRenderPipelineRuntime {
  setMode: (mode: CottageGardenRenderMode) => boolean;
  getSnapshot: () => CottageGardenRenderPipelineSnapshot;
}

/**
 * 花海小院只保留一次默认帧缓冲写入。
 * 细草不再经过低分辨率离屏纹理放大，避免叶片变成荧光点和刷子边缘。
 */
export function CottageGardenRenderer() {
  const { gl, scene } = useThree();
  const modeRef = useRef<CottageGardenRenderMode>("beauty");

  useEffect(() => {
    const previousToneMapping = gl.toneMapping;
    const previousExposure = gl.toneMappingExposure;
    const previousColorSpace = gl.outputColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = COTTAGE_GARDEN_RENDERING.output.exposure;
    gl.outputColorSpace = SRGBColorSpace;

    const runtime: CottageGardenRenderPipelineRuntime = {
      setMode(mode) {
        if (mode !== "beauty" && mode !== "no-post") return false;
        modeRef.current = mode;
        return true;
      },
      getSnapshot: () => ({
        backend: {
          renderer: gl.constructor.name,
          requestedContext: COTTAGE_GARDEN_RENDERING.backend.requiredContext,
          actualContext: gl.getContext().constructor.name,
        },
        mode: modeRef.current,
        passGraph: COTTAGE_GARDEN_RENDERING.presentation.renderGraph,
        history: "none",
        resolution: {
          width: gl.domElement.width,
          height: gl.domElement.height,
          pixelRatio: gl.getPixelRatio(),
        },
        frameStats: {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          lines: gl.info.render.lines,
          points: gl.info.render.points,
        },
      }),
    };
    scene.userData.cottageRenderPipeline = runtime;

    return () => {
      if (scene.userData.cottageRenderPipeline === runtime) {
        delete scene.userData.cottageRenderPipeline;
      }
      gl.toneMapping = previousToneMapping;
      gl.toneMappingExposure = previousExposure;
      gl.outputColorSpace = previousColorSpace;
    };
  }, [gl, scene]);

  return null;
}
