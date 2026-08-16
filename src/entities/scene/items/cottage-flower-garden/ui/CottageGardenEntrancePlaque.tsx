import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  COTTAGE_GARDEN_ENTRANCE_PLAQUE,
  formatCottageGardenGiftPlaqueLines,
  type CottageGardenGiftNames,
} from "../model/gardenEntrancePlaque";

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    safeRadius,
  );
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function createPlaqueTextTexture(lines: readonly [string, string]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1_540;
  canvas.height = 310;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  const paper = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  paper.addColorStop(0, "#f7e9ca");
  paper.addColorStop(0.52, "#fff5dd");
  paper.addColorStop(1, "#e8d0a5");
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#6f4937";
  context.lineWidth = 9;
  traceRoundedRect(context, 22, 20, canvas.width - 44, canvas.height - 40, 24);
  context.stroke();
  context.strokeStyle = "rgba(139, 94, 70, 0.48)";
  context.lineWidth = 3;
  traceRoundedRect(context, 38, 36, canvas.width - 76, canvas.height - 72, 18);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font =
    '700 112px "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
  context.fillStyle = "#4c3028";
  context.fillText(lines[0], canvas.width / 2, 102);
  context.fillStyle = "#7b3942";
  context.fillText(lines[1], canvas.width / 2, 214);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function CottageGardenEntrancePlaque({
  giftNames = COTTAGE_GARDEN_ENTRANCE_PLAQUE.gift,
}: {
  giftNames?: CottageGardenGiftNames;
}) {
  const contract = COTTAGE_GARDEN_ENTRANCE_PLAQUE;
  const lines = useMemo(
    () => formatCottageGardenGiftPlaqueLines(giftNames),
    [giftNames],
  );
  const [plaqueWidth, plaqueHeight, plaqueDepth] = contract.plaque.size;
  const bodyGeometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        plaqueWidth,
        plaqueHeight,
        plaqueDepth,
        4,
        0.035,
      ),
    [plaqueDepth, plaqueHeight, plaqueWidth],
  );
  const insetGeometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        contract.plaque.faceSize[0] + 0.06,
        contract.plaque.faceSize[1] + 0.035,
        0.022,
        3,
        0.01,
      ),
    [contract.plaque.faceSize],
  );
  const textTexture = useMemo(
    () => createPlaqueTextTexture(lines),
    [lines],
  );

  useEffect(
    () => () => {
      bodyGeometry.dispose();
      insetGeometry.dispose();
      textTexture.dispose();
    },
    [bodyGeometry, insetGeometry, textTexture],
  );

  const postHeight = contract.support.postTopY - contract.support.postBottomY;
  const postCenterY =
    (contract.support.postTopY + contract.support.postBottomY) / 2;
  const hangerHeight =
    contract.support.hangerTopY - contract.support.hangerBottomY;
  const hangerCenterY =
    (contract.support.hangerTopY + contract.support.hangerBottomY) / 2;
  const faceZ = contract.plaque.position[2] + plaqueDepth / 2 + 0.024;

  return (
    <group
      name={contract.semanticId}
      userData={{
        semanticId: contract.semanticId,
        role: contract.role,
        fromName: giftNames.from,
        toName: giftNames.to,
        lines,
        units: contract.units,
        bottomClearanceMeters: contract.plaque.bottomClearance,
        frontNormal: contract.plaque.frontNormal,
        visibleFeatures: contract.visibleFeatures,
      }}
    >
      <group name="garden.entrance-gift-plaque.support">
        {contract.support.postX.map((x) => (
          <mesh
            key={x}
            name="garden.entrance-gift-plaque.extended-post"
            position={[x, postCenterY, contract.support.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[
                contract.support.postSizeXZ,
                postHeight,
                contract.support.postSizeXZ,
              ]}
            />
            <meshStandardMaterial
              color="#836048"
              emissive="#4c3326"
              emissiveIntensity={0.28}
              roughness={0.94}
            />
          </mesh>
        ))}
        <mesh
          name="garden.entrance-gift-plaque.crossbeam"
          position={contract.support.beamPosition}
          castShadow
          receiveShadow
        >
          <boxGeometry args={contract.support.beamSize} />
          <meshStandardMaterial
            color="#8e684d"
            emissive="#4d3427"
            emissiveIntensity={0.26}
            roughness={0.94}
          />
        </mesh>
        {contract.support.hangerX.map((x) => (
          <mesh
            key={x}
            name="garden.entrance-gift-plaque.hanger"
            position={[x, hangerCenterY, contract.plaque.position[2]]}
            castShadow
          >
            <cylinderGeometry args={[0.014, 0.014, hangerHeight, 10]} />
            <meshStandardMaterial
              color="#51443c"
              metalness={0.65}
              roughness={0.42}
            />
          </mesh>
        ))}
      </group>

      <group
        name="garden.entrance-gift-plaque.nameplate"
        position={contract.plaque.position}
      >
        <mesh geometry={bodyGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color="#6f4a35"
            emissive="#3f281e"
            emissiveIntensity={0.24}
            roughness={0.9}
          />
        </mesh>
        <mesh position={[0, 0, plaqueDepth / 2 + 0.011]} geometry={insetGeometry}>
          <meshStandardMaterial color="#ead8b7" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, faceZ - contract.plaque.position[2]]}>
          <planeGeometry args={contract.plaque.faceSize} />
          <meshBasicMaterial map={textTexture} toneMapped />
        </mesh>
        {[-1, 1].flatMap((xSign) =>
          [-1, 1].map((ySign) => (
            <mesh
              key={`${xSign}:${ySign}`}
              name="garden.entrance-gift-plaque.fastener"
              position={[
                xSign * (plaqueWidth / 2 - 0.075),
                ySign * (plaqueHeight / 2 - 0.065),
                plaqueDepth / 2 + 0.032,
              ]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.024, 0.024, 0.014, 14]} />
              <meshStandardMaterial
                color="#ad8953"
                metalness={0.68}
                roughness={0.36}
              />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
