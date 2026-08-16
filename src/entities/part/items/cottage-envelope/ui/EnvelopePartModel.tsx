import { useMemo } from 'react'
import { Shape, type Material } from 'three'
import {
  ENVELOPE_LOCAL_FRAME,
  ENVELOPE_MATERIAL_SLOTS,
  ENVELOPE_PIVOTS,
  resolveEnvelopeDimensions,
  resolveEnvelopeOpenState,
  type EnvelopeDimensions,
} from '../model/envelope'

export interface EnvelopeMaterials {
  readonly paper: Material
  readonly paperInner: Material
  readonly paperEdge: Material
  readonly letter: Material
  readonly ink: Material
  readonly wax: Material
  readonly waxDetail: Material
  readonly adhesive: Material
}

export interface EnvelopePartModelProps {
  readonly id: string
  readonly dimensions?: Partial<EnvelopeDimensions>
  readonly materials: EnvelopeMaterials
  readonly openProgress?: number
  readonly quality?: 'desktop' | 'mobile'
  readonly onActivate?: () => void
}

function createFlapShape(width: number, depth: number) {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.quadraticCurveTo(width * 0.42, -depth * 0.14, width * 0.08, -depth * 0.55)
  shape.quadraticCurveTo(0, -depth * 0.63, -width * 0.08, -depth * 0.55)
  shape.quadraticCurveTo(-width * 0.42, -depth * 0.14, -width / 2, 0)
  shape.closePath()
  return shape
}

function createPocketShape(width: number, depth: number) {
  const shape = new Shape()
  shape.moveTo(-width / 2, -depth / 2)
  shape.lineTo(width / 2, -depth / 2)
  shape.lineTo(width / 2, depth / 2)
  shape.lineTo(width * 0.16, depth * 0.08)
  shape.quadraticCurveTo(0, -depth * 0.02, -width * 0.16, depth * 0.08)
  shape.lineTo(-width / 2, depth / 2)
  shape.closePath()
  return shape
}

function createSideFoldShape(width: number, depth: number, side: -1 | 1) {
  const shape = new Shape()
  shape.moveTo(side * width / 2, -depth / 2)
  shape.lineTo(side * width / 2, depth / 2)
  shape.lineTo(side * width * 0.07, depth * 0.07)
  shape.closePath()
  return shape
}

function createHeartShape(size: number) {
  const shape = new Shape()
  shape.moveTo(0, -size * 0.42)
  shape.bezierCurveTo(-size * 0.64, -size * 0.02, -size * 0.54, size * 0.5, 0, size * 0.24)
  shape.bezierCurveTo(size * 0.54, size * 0.5, size * 0.64, -size * 0.02, 0, -size * 0.42)
  shape.closePath()
  return shape
}

function PrintedLetterPanel({
  id,
  width,
  depth,
  paperThickness,
  materials,
  lines,
  heart = false,
}: {
  id: string
  width: number
  depth: number
  paperThickness: number
  materials: EnvelopeMaterials
  lines: readonly number[]
  heart?: boolean
}) {
  const heartShape = useMemo(
    () => createHeartShape(Math.min(width, depth) * 0.2),
    [depth, width],
  )
  return (
    <group name={id}>
      <mesh material={materials.paperEdge} position={[0, -paperThickness * 0.36, 0]} castShadow>
        <boxGeometry args={[width * 1.008, paperThickness * 0.72, depth * 1.008]} />
      </mesh>
      <mesh material={materials.letter} position={[0, paperThickness * 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, paperThickness, depth]} />
      </mesh>
      {lines.map((lineWidth, index) => (
        <mesh
          key={`${id}:line:${index}`}
          name={`${id}:ink-line.${index + 1}`}
          material={materials.ink}
          position={[
            -width * (0.42 - lineWidth / 2),
            paperThickness * 0.74,
            -depth * 0.28 + index * depth * 0.18,
          ]}
        >
          <boxGeometry args={[width * lineWidth, paperThickness * 0.12, paperThickness * 0.9]} />
        </mesh>
      ))}
      {heart && (
        <mesh
          name={`${id}:heart-mark`}
          material={materials.ink}
          position={[width * 0.31, paperThickness * 0.78, depth * 0.27]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <shapeGeometry args={[heartShape, qualitySegments(width)]} />
        </mesh>
      )}
    </group>
  )
}

function qualitySegments(width: number) {
  return width > 0.26 ? 4 : 3
}

export function EnvelopePartModel({
  id,
  dimensions,
  materials,
  openProgress = 0,
  quality = 'desktop',
  onActivate,
}: EnvelopePartModelProps) {
  const { width, depth, paperThickness } = resolveEnvelopeDimensions(dimensions)
  const state = resolveEnvelopeOpenState(openProgress)
  const flapShape = useMemo(() => createFlapShape(width, depth), [depth, width])
  const pocketShape = useMemo(() => createPocketShape(width, depth), [depth, width])
  const leftFold = useMemo(() => createSideFoldShape(width, depth, -1), [depth, width])
  const rightFold = useMemo(() => createSideFoldShape(width, depth, 1), [depth, width])
  const sealHeart = useMemo(() => createHeartShape(width * 0.035), [width])
  const sealRadius = width * 0.075
  const foldedLetterWidth = width * 0.84
  const letterPanelDepth = depth * 0.54
  const letterZ = -depth * 0.04 + state.letterTravel * depth * 0.86
  const letterY = paperThickness * 2.05 + state.letterLift * depth * 0.42
  const waxSplit = state.sealBreak * sealRadius * 0.38
  const paperLayerY = paperThickness * 3.1

  return (
    <group
      name={id}
      onClick={onActivate ? (event) => {
        event.stopPropagation()
        onActivate()
      } : undefined}
      userData={{
        componentId: id,
        partId: 'cottage-envelope',
        localFrame: ENVELOPE_LOCAL_FRAME,
        size: {
          width,
          depth: depth * (1 + state.letterTravel * 1.18),
          height: Math.max(
            paperThickness * 8,
            Math.sin(Math.min(Math.PI / 2, -state.flapAngle)) * depth * 0.62,
            letterY + Math.sin(-state.letterTilt) * letterPanelDepth * 1.5,
          ),
        },
        materialSlots: ENVELOPE_MATERIAL_SLOTS,
        animationPhase: state.phase,
        animationProgress: state.progress,
        readerReady: state.readerReady,
        collider: {
          type: 'box',
          size: [width, paperThickness * 8, depth],
          center: [0, paperThickness * 4, 0],
        },
      }}
    >
      <mesh
        name={`${id}:envelope.back-panel`}
        material={materials.paper}
        position={[0, paperThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, paperThickness, depth]} />
      </mesh>
      <mesh
        name={`${id}:envelope.inner-lining`}
        material={materials.paperInner}
        position={[0, paperThickness * 1.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 0.965, depth * 0.94]} />
      </mesh>

      <group
        name={ENVELOPE_PIVOTS.letterRail}
        position={[0, letterY, letterZ]}
        rotation={[state.letterTilt, 0, 0]}
        userData={{
          pivotId: ENVELOPE_PIVOTS.letterRail,
          jointType: 'prismatic',
          axis: '+Z / +Y',
          progress: state.letterTravel,
        }}
      >
        <PrintedLetterPanel
          id={`${id}:letter.center-panel`}
          width={foldedLetterWidth}
          depth={letterPanelDepth}
          paperThickness={paperThickness}
          materials={materials}
          lines={[0.68, 0.76, 0.58]}
          heart
        />
        <group
          name={ENVELOPE_PIVOTS.letterFoldTop}
          position={[0, paperThickness * 1.2, -letterPanelDepth / 2]}
          rotation={[state.topFoldAngle, 0, 0]}
          userData={{
            pivotId: ENVELOPE_PIVOTS.letterFoldTop,
            jointType: 'hinge',
            axis: '+X',
            angle: state.topFoldAngle,
          }}
        >
          <group position={[0, 0, -letterPanelDepth / 2]}>
            <PrintedLetterPanel
              id={`${id}:letter.top-panel`}
              width={foldedLetterWidth}
              depth={letterPanelDepth}
              paperThickness={paperThickness}
              materials={materials}
              lines={[0.42, 0.74, 0.66, 0.51]}
            />
          </group>
        </group>
        <group
          name={ENVELOPE_PIVOTS.letterFoldBottom}
          position={[0, paperThickness * 2.4, letterPanelDepth / 2]}
          rotation={[state.bottomFoldAngle, 0, 0]}
          userData={{
            pivotId: ENVELOPE_PIVOTS.letterFoldBottom,
            jointType: 'hinge',
            axis: '+X',
            angle: state.bottomFoldAngle,
          }}
        >
          <group position={[0, 0, letterPanelDepth / 2]}>
            <PrintedLetterPanel
              id={`${id}:letter.bottom-panel`}
              width={foldedLetterWidth}
              depth={letterPanelDepth}
              paperThickness={paperThickness}
              materials={materials}
              lines={[0.72, 0.63, 0.76]}
            />
          </group>
        </group>
      </group>

      <mesh
        name={`${id}:envelope.front-pocket`}
        material={materials.paper}
        position={[0, paperLayerY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <shapeGeometry args={[pocketShape, quality === 'desktop' ? 5 : 3]} />
      </mesh>
      <mesh
        name={`${id}:envelope.fold.left`}
        material={materials.paperInner}
        position={[0, paperLayerY + paperThickness * 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shapeGeometry args={[leftFold]} />
      </mesh>
      <mesh
        name={`${id}:envelope.fold.right`}
        material={materials.paperInner}
        position={[0, paperLayerY + paperThickness * 0.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shapeGeometry args={[rightFold]} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`${id}:envelope.seam.${side}`}
          name={`${id}:envelope.seam.${side < 0 ? 'left' : 'right'}`}
          material={materials.adhesive}
          position={[side * width * 0.285, paperLayerY + paperThickness * 0.5, depth * 0.145]}
          rotation={[0, side * 0.96, 0]}
        >
          <boxGeometry args={[width * 0.37, paperThickness * 0.22, paperThickness * 1.15]} />
        </mesh>
      ))}

      <group
        name={ENVELOPE_PIVOTS.flap}
        position={[0, paperLayerY + paperThickness * 0.6, -depth / 2]}
        rotation={[state.flapAngle, 0, 0]}
        userData={{
          pivotId: ENVELOPE_PIVOTS.flap,
          jointType: 'hinge',
          axis: '+X',
          progress: state.progress,
          minAngle: 0,
          maxAngle: -Math.PI * 0.86,
        }}
      >
        <mesh
          name={`${id}:envelope.flap.outer`}
          material={materials.paper}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <shapeGeometry args={[flapShape, quality === 'desktop' ? 6 : 3]} />
        </mesh>
        <mesh
          name={`${id}:envelope.flap.lining`}
          material={materials.paperInner}
          position={[0, paperThickness * 0.55, depth * 0.006]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.955, 0.935, 1]}
        >
          <shapeGeometry args={[flapShape, quality === 'desktop' ? 6 : 3]} />
        </mesh>
        <mesh
          name={`${id}:wax-seal.flap-half`}
          material={materials.wax}
          position={[-waxSplit, paperThickness * 2.1, depth * 0.5]}
          scale={[0.54, 1, 1]}
          castShadow
        >
          <cylinderGeometry args={[sealRadius, sealRadius * 0.95, paperThickness * 2.5, quality === 'desktop' ? 32 : 18]} />
        </mesh>
      </group>

      <group
        name={`${id}:wax-seal.body-half`}
        position={[waxSplit, paperLayerY + paperThickness * 2.2, -depth * 0.004]}
      >
        <mesh material={materials.wax} scale={[0.54, 1, 1]} castShadow>
          <cylinderGeometry args={[sealRadius, sealRadius * 0.95, paperThickness * 2.5, quality === 'desktop' ? 32 : 18]} />
        </mesh>
        <mesh
          name={`${id}:wax-seal.heart-emboss`}
          material={materials.waxDetail}
          position={[-waxSplit, paperThickness * 1.36, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1 - state.sealBreak * 0.18, 1, 1]}
        >
          <shapeGeometry args={[sealHeart, quality === 'desktop' ? 5 : 3]} />
        </mesh>
      </group>
      {state.sealBreak > 0.02 && state.sealBreak < 0.98 && (
        <mesh
          name={`${id}:wax-seal.fragment`}
          material={materials.wax}
          position={[
            sealRadius * 0.22,
            paperLayerY + paperThickness * 3 + state.sealBreak * sealRadius * 0.6,
            -sealRadius * 0.3,
          ]}
          rotation={[0.2, state.sealBreak * 1.8, 0.35]}
          castShadow
        >
          <tetrahedronGeometry args={[sealRadius * 0.22, 0]} />
        </mesh>
      )}
    </group>
  )
}
