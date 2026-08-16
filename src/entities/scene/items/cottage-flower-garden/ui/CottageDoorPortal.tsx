import { Html } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Color,
  Group,
  MathUtils,
  Mesh,
  Vector2,
  Vector3,
} from 'three'
import { COTTAGE_ARCHITECTURE } from '../model/cottageArchitecture'
import {
  cottagePortalRuntime,
  isCottageDoorObserverEligible,
  type CottageDoorMotion,
} from '../model/cottagePortalMachine'
import {
  COTTAGE_GARDEN_TUNING_DEFAULTS,
  resolveCottageWoodTone,
  type CottageGardenTuning,
} from '../model/gardenTuning'
import { useGardenMaterialTextures } from './gardenTextures'

const DOOR_BOARD_COUNT = 7

function DoorSurface({ tuning }: { tuning: CottageGardenTuning }) {
  const { wood, woodNormal, woodRoughness } = useGardenMaterialTextures()
  const color = new Color(
    resolveCottageWoodTone(tuning.structures.cottageWoodColor, 'door'),
  ).lerp(new Color('#fff1df'), 0.58)
  return (
    <meshStandardMaterial
      color={color}
      map={wood}
      normalMap={woodNormal}
      normalScale={new Vector2(0.52, 0.52)}
      roughness={0.9}
      roughnessMap={woodRoughness}
      metalness={0}
    />
  )
}

function DoorLeaf({
  tuning,
  onInteract,
}: {
  tuning: CottageGardenTuning
  onInteract: (event?: ThreeEvent<PointerEvent>) => void
}) {
  const handleRef = useRef<Group>(null)
  const latchRef = useRef<Mesh>(null)
  const { datums, door } = COTTAGE_ARCHITECTURE
  const leafWidth = door.clearWidth - 0.04
  const leafHeight = door.clearHeight - 0.04
  const boardWidth = leafWidth / DOOR_BOARD_COUNT

  useFrame(() => {
    const snapshot = cottagePortalRuntime.getSnapshot()
    const handleProgress = Math.min(1, snapshot.openProgress / 0.14)
    if (handleRef.current) {
      handleRef.current.rotation.z = -handleProgress * 0.34
    }
    if (latchRef.current) {
      latchRef.current.position.x = leafWidth - 0.026 - handleProgress * 0.035
    }
  })

  return (
    <group
      name="portal.cottage-door.leaf"
      onPointerDown={onInteract}
      userData={{
        semanticId: 'portal.cottage-door.leaf',
        module: 'Door',
        construction: 'ledged-and-braced-timber-door',
      }}
    >
      <mesh
        name="portal.cottage-door.solid-core"
        position={[leafWidth / 2, datums.thresholdTop + leafHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[leafWidth, leafHeight, door.leafThickness]} />
        <DoorSurface tuning={tuning} />
      </mesh>
      {Array.from({ length: DOOR_BOARD_COUNT }, (_, index) => (
        <mesh
          key={index}
          name={`portal.cottage-door.board-${index + 1}`}
          position={[
            boardWidth * (index + 0.5),
            datums.thresholdTop + leafHeight / 2,
            door.leafThickness / 2 + 0.012,
          ]}
          castShadow
        >
          <boxGeometry
            args={[boardWidth - 0.012, leafHeight - 0.035, 0.022]}
          />
          <DoorSurface tuning={tuning} />
        </mesh>
      ))}
      {[0.3, 0.68].map((heightRatio) => (
        <mesh
          key={heightRatio}
          position={[
            leafWidth / 2,
            datums.thresholdTop + leafHeight * heightRatio,
            door.leafThickness / 2 + 0.032,
          ]}
          castShadow
        >
          <boxGeometry args={[leafWidth * 0.82, 0.09, 0.045]} />
          <meshStandardMaterial color="#563420" roughness={0.86} />
        </mesh>
      ))}
      <mesh
        position={[
          leafWidth / 2,
          datums.thresholdTop + leafHeight * 0.49,
          door.leafThickness / 2 + 0.038,
        ]}
        rotation={[0, 0, -0.58]}
        castShadow
      >
        <boxGeometry args={[leafWidth * 0.9, 0.075, 0.04]} />
        <meshStandardMaterial color="#563420" roughness={0.86} />
      </mesh>
      {[0.34, 0.72].map((heightRatio) => (
        <group
          key={heightRatio}
          position={[
            0.04,
            datums.thresholdTop + leafHeight * heightRatio,
            door.leafThickness / 2 + 0.055,
          ]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.14, 12]} />
            <meshStandardMaterial
              color="#272421"
              metalness={0.55}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.055, 0.025]} />
            <meshStandardMaterial
              color="#302b27"
              metalness={0.52}
              roughness={0.55}
            />
          </mesh>
        </group>
      ))}
      <group
        ref={handleRef}
        name="portal.cottage-door.handle"
        position={[
          leafWidth * 0.78,
          datums.thresholdTop + 1.02,
          door.leafThickness / 2 + 0.095,
        ]}
        userData={{ semanticId: 'portal.cottage-door.handle' }}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.055, 18, 12]} />
          <meshStandardMaterial
            color="#b48a4d"
            metalness={0.72}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.095, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.027, 0.19, 12]} />
          <meshStandardMaterial
            color="#b48a4d"
            metalness={0.72}
            roughness={0.3}
          />
        </mesh>
      </group>
      <mesh
        ref={latchRef}
        name="portal.cottage-door.latch"
        position={[
          leafWidth - 0.026,
          datums.thresholdTop + 1.02,
          0,
        ]}
      >
        <boxGeometry args={[0.052, 0.045, 0.036]} />
        <meshStandardMaterial color="#9d7540" metalness={0.68} roughness={0.34} />
      </mesh>
    </group>
  )
}

export function CottageDoorPortal({
  tuning = COTTAGE_GARDEN_TUNING_DEFAULTS,
}: {
  tuning?: CottageGardenTuning
}) {
  const pivotRef = useRef<Group>(null)
  const { camera } = useThree()
  const cameraDirection = useRef(new Vector3())
  const [eligible, setEligible] = useState(false)
  const [motion, setMotion] = useState<CottageDoorMotion>('closed')
  const { envelope, door } = COTTAGE_ARCHITECTURE
  const frontZ = envelope.depth / 2
  const hingeX = -door.clearWidth / 2 + 0.02

  const observer = useCallback(() => {
    camera.getWorldDirection(cameraDirection.current)
    return {
      position: [camera.position.x, camera.position.y, camera.position.z] as const,
      direction: [
        cameraDirection.current.x,
        cameraDirection.current.y,
        cameraDirection.current.z,
      ] as const,
    }
  }, [camera])

  const interact = useCallback(
    (event?: ThreeEvent<PointerEvent>) => {
      event?.stopPropagation()
      cottagePortalRuntime.requestToggle(observer())
    },
    [observer],
  )

  useEffect(
    () =>
      cottagePortalRuntime.subscribe(() => {
        setMotion(cottagePortalRuntime.getSnapshot().motion)
      }),
    [],
  )

  useFrame(() => {
    const snapshot = cottagePortalRuntime.getSnapshot()
    if (pivotRef.current) {
      pivotRef.current.rotation.y = MathUtils.lerp(
        0,
        door.openAngleRadians,
        MathUtils.smoothstep(snapshot.openProgress, 0, 1),
      )
    }
    const nextEligible = isCottageDoorObserverEligible(observer())
    setEligible((current) => (current === nextEligible ? current : nextEligible))
  })

  const actionLabel =
    motion === 'closed' || motion === 'closing' ? '打开小屋' : '关上房门'

  return (
    <group
      name="portal.cottage-door"
      userData={{
        semanticId: 'portal.cottage-door',
        portalId: door.id,
        initialState: 'closed',
        manualInteraction: true,
      }}
    >
      <group
        ref={pivotRef}
        name="portal.cottage-door.hinge-pivot"
        position={[hingeX, 0, frontZ + 0.045]}
        userData={{
          semanticId: 'portal.cottage-door.hinge-pivot',
          openAngleRadians: door.openAngleRadians,
        }}
      >
        <DoorLeaf tuning={tuning} onInteract={interact} />
      </group>
      {eligible && motion !== 'opening' && motion !== 'closing' && (
        <Html
          position={[0, COTTAGE_ARCHITECTURE.datums.thresholdTop + 1.48, frontZ + 0.32]}
          center
          distanceFactor={2.2}
          zIndexRange={[12, 0]}
        >
          <button
            type="button"
            data-cottage-door-action
            onPointerDown={(event) => {
              event.stopPropagation()
              interact()
            }}
            style={{
              appearance: 'none',
              border: '1px solid rgba(255, 238, 203, 0.72)',
              borderRadius: '999px',
              padding: '9px 14px',
              color: '#fff7e8',
              background: 'rgba(43, 30, 22, 0.82)',
              boxShadow: '0 8px 28px rgba(25, 14, 8, 0.34)',
              font: '600 12px/1 system-ui, sans-serif',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ opacity: 0.68, marginRight: 7 }}>E</span>
            {actionLabel}
          </button>
        </Html>
      )}
    </group>
  )
}
