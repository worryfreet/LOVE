import { useMemo } from "react";
import {
  CanvasTexture,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import flagstoneAlbedoUrl from "../assets/flagstone-albedo.png";
import weatheredWoodAlbedoUrl from "../assets/weathered-wood-albedo.png";
import weatheredStoneAlbedoUrl from "../assets/weathered-stone-albedo.png";

interface GardenTextureSet {
  grass: Texture;
  wood: Texture;
  woodHorizontal: Texture;
  woodNormal: Texture;
  woodNormalHorizontal: Texture;
  woodRoughness: Texture;
  stone: Texture;
  stoneNormal: Texture;
  stoneRoughness: Texture;
}

let cachedTextures: GardenTextureSet | null = null;
let cachedGrassTexture: Texture | null = null;
let cachedGrassRoughnessTexture: Texture | null = null;
let cachedFlagstoneTexture: Texture | null = null;

function hash(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function textureNoise(x: number, y: number, cellSize: number, salt: number) {
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const localX = (x / cellSize) % 1;
  const localY = (y / cellSize) % 1;
  const smoothX = localX * localX * (3 - 2 * localX);
  const smoothY = localY * localY * (3 - 2 * localY);
  const sample = (offsetX: number, offsetY: number) =>
    hash((cellX + offsetX) * 1_009 + (cellY + offsetY) * 9_973, salt);
  const lower = sample(0, 0) * (1 - smoothX) + sample(1, 0) * smoothX;
  const upper = sample(0, 1) * (1 - smoothX) + sample(1, 1) * smoothX;
  return lower * (1 - smoothY) + upper * smoothY;
}

function finishTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createMaterialDataTexture(
  kind: "wood" | "stone",
  channel: "normal" | "roughness",
) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return finishTexture(canvas);
  const image = context.createImageData(size, size);
  const heightAt = (x: number, y: number) => {
    const wrappedX = (x + size) % size;
    const wrappedY = (y + size) % size;
    if (kind === "wood") {
      const grain = Math.sin(wrappedY * 0.23 + Math.sin(wrappedX * 0.035) * 2.4);
      return grain * 0.36 + textureNoise(wrappedX, wrappedY, 31, 211) * 0.64;
    }
    return (
      textureNoise(wrappedX, wrappedY, 52, 223) * 0.7 +
      textureNoise(wrappedX, wrappedY, 13, 227) * 0.3
    );
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      if (channel === "roughness") {
        const broad = heightAt(x, y);
        const fine = hash(y * size + x, kind === "wood" ? 229 : 233);
        const value = Math.round(
          (kind === "wood" ? 205 : 224) + broad * 18 + fine * 10,
        );
        image.data[offset] = value;
        image.data[offset + 1] = value;
        image.data[offset + 2] = value;
      } else {
        const strength = kind === "wood" ? 2.4 : 3.2;
        const dx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength;
        const dy = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength;
        const length = Math.hypot(dx, dy, 1);
        image.data[offset] = Math.round((dx / length * 0.5 + 0.5) * 255);
        image.data[offset + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
        image.data[offset + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      }
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = finishTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.repeat.set(kind === "wood" ? 3 : 2.4, kind === "wood" ? 7 : 2.4);
  texture.needsUpdate = true;
  return texture;
}

function loadTextureWithoutSuspense(url: string, fallbackColor: string) {
  const placeholder = document.createElement("canvas");
  // 资源本身统一为 1024²。占位画布保持相同尺寸，避免图片解码后
  // WebGL 试图用 texSubImage 把大图写进已经分配的 4×4 存储。
  placeholder.width = 1_024;
  placeholder.height = 1_024;
  const context = placeholder.getContext("2d");
  if (context) {
    context.fillStyle = fallbackColor;
    context.fillRect(0, 0, placeholder.width, placeholder.height);
  }
  const texture = finishTexture(placeholder);
  const image = new Image();
  image.onload = () => {
    texture.image = image;
    texture.needsUpdate = true;
  };
  image.src = url;
  return texture;
}

function createGrassTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return finishTexture(canvas);

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const broad = textureNoise(x, y, 118, 61);
      const medium = textureNoise(x, y, 31, 67);
      const fine = hash(index, 71);
      const stripe = Math.sin((x + y * 0.12) * 0.078) * 2.2;
      const value = broad * 8 + medium * 7 + fine * 6 + stripe - 10.5;
      const offset = index * 4;
      image.data[offset] = Math.max(0, Math.min(255, 115 + value * 0.54));
      image.data[offset + 1] = Math.max(0, Math.min(255, 164 + value * 0.66));
      image.data[offset + 2] = Math.max(0, Math.min(255, 83 + value * 0.46));
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  // 高尔夫球场式草皮只保留毫米级剪草纤维，不绘制可辨识的长草叶。
  context.globalAlpha = 0.38;
  context.lineCap = "round";
  for (let fiber = 0; fiber < 42_000; fiber += 1) {
    const x = hash(fiber, 79) * size;
    const y = hash(fiber, 83) * size;
    const length = 0.7 + hash(fiber, 89) * 1.8;
    const lean = (hash(fiber, 97) - 0.5) * 0.9;
    context.strokeStyle =
      hash(fiber, 101) > 0.5
        ? "rgba(26, 78, 28, 0.5)"
        : "rgba(151, 188, 82, 0.3)";
    context.lineWidth = 0.32 + hash(fiber, 103) * 0.42;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + lean, y - length);
    context.stroke();
  }
  context.globalAlpha = 1;

  const texture = finishTexture(canvas);
  texture.repeat.set(92, 92);
  texture.needsUpdate = true;
  return texture;
}

function createGrassRoughnessTexture() {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return finishTexture(canvas);
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const broad = textureNoise(x, y, 39, 109);
      const fine = hash(index, 113);
      const value = Math.round(241 + broad * 10 + fine * 4);
      const offset = index * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = finishTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.repeat.set(148, 148);
  texture.needsUpdate = true;
  return texture;
}

/** 草地只取轻量 Canvas 纹理，避免为远景地形提前解码木材与石材贴图。 */
export function useGardenGrassTextures() {
  return useMemo(() => {
    cachedGrassTexture ??= createGrassTexture();
    cachedGrassRoughnessTexture ??= createGrassRoughnessTexture();
    return {
      albedo: cachedGrassTexture,
      roughness: cachedGrassRoughnessTexture,
    };
  }, []);
}

/** 石板共享一张生成式浅色石灰岩贴图，实例只改变朝向和暖冷色调。 */
export function useGardenFlagstoneTexture() {
  return useMemo(() => {
    cachedFlagstoneTexture ??= loadTextureWithoutSuspense(
      flagstoneAlbedoUrl.src,
      "#ddd3c2",
    );
    return cachedFlagstoneTexture;
  }, []);
}

/** 复用同一组程序化 Canvas 表面纹理，避免为每批实例重复创建 GPU 资源。 */
export function useGardenMaterialTextures() {
  return useMemo(() => {
    if (!cachedTextures) {
      // TextureLoader.load 立即返回占位纹理，图片完成解码后原位更新；不让场景因
      // Suspense 暂停并销毁正在运行的第一人称 WebGL 上下文。
      const woodSource = loadTextureWithoutSuspense(
        weatheredWoodAlbedoUrl.src,
        "#8c6948",
      );
      const stoneSource = loadTextureWithoutSuspense(
        weatheredStoneAlbedoUrl.src,
        "#81796d",
      );
      woodSource.wrapS = RepeatWrapping;
      woodSource.wrapT = RepeatWrapping;
      woodSource.colorSpace = SRGBColorSpace;
      woodSource.anisotropy = 8;
      woodSource.needsUpdate = true;
      const woodHorizontal = woodSource;
      const wood = woodHorizontal.clone();
      wood.center.set(0.5, 0.5);
      wood.rotation = Math.PI / 2;
      wood.wrapS = RepeatWrapping;
      wood.wrapT = RepeatWrapping;
      wood.colorSpace = SRGBColorSpace;
      wood.anisotropy = 8;
      wood.needsUpdate = true;
      woodHorizontal.needsUpdate = true;
      stoneSource.wrapS = RepeatWrapping;
      stoneSource.wrapT = RepeatWrapping;
      stoneSource.colorSpace = SRGBColorSpace;
      stoneSource.anisotropy = 8;
      stoneSource.needsUpdate = true;
      const woodNormalHorizontal = createMaterialDataTexture("wood", "normal");
      const woodNormal = woodNormalHorizontal.clone();
      woodNormal.center.set(0.5, 0.5);
      woodNormal.rotation = Math.PI / 2;
      woodNormal.needsUpdate = true;
      const woodRoughness = createMaterialDataTexture("wood", "roughness");
      const stoneNormal = createMaterialDataTexture("stone", "normal");
      const stoneRoughness = createMaterialDataTexture("stone", "roughness");
      cachedTextures = {
        grass: (cachedGrassTexture ??= createGrassTexture()),
        wood,
        woodHorizontal,
        woodNormal,
        woodNormalHorizontal,
        woodRoughness,
        stone: stoneSource,
        stoneNormal,
        stoneRoughness,
      };
    }
    return cachedTextures;
  }, []);
}
