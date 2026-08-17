import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AmbientLight, PointLight } from 'three'
import { COTTAGE_ARCHITECTURE } from '../model/cottageArchitecture'
import { cottagePortalRuntime } from '../model/cottagePortalMachine'

export function CottageExperienceCoordinator({
  forceInterior = false,
}: {
  forceInterior?: boolean
}) {
  const { scene } = useThree()
  const pendantRef = useRef<PointLight>(null)
  const hearthRef = useRef<PointLight>(null)
  const memoryWallRef = useRef<PointLight>(null)
  const ambientRef = useRef<AmbientLight>(null)
  const { envelope, datums } = COTTAGE_ARCHITECTURE

  useEffect(() => {
    cottagePortalRuntime.reset()
    if (forceInterior) cottagePortalRuntime.setZone('interior')
    return () => {
      cottagePortalRuntime.reset()
      delete scene.userData.cottageExperience
    }
  }, [forceInterior, scene])

  useFrame(({ camera }, delta) => {
    if (forceInterior) {
      cottagePortalRuntime.setZone('interior')
    } else {
      cottagePortalRuntime.updateZoneFromPosition([
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ])
    }
    cottagePortalRuntime.tick(delta)
    const snapshot = cottagePortalRuntime.getSnapshot()
    const blend = snapshot.interiorBlend
    if (ambientRef.current) ambientRef.current.intensity = 0.08 + blend * 0.62
    if (pendantRef.current) pendantRef.current.intensity = 0.7 + blend * 4.1
    if (hearthRef.current) hearthRef.current.intensity = 0.85 + blend * 4.65
    if (memoryWallRef.current) {
      memoryWallRef.current.intensity = 0.38 + blend * 2.92
    }
    scene.userData.cottageExperience = {
      ...snapshot,
      exteriorHighDensityVisible:
        snapshot.zone !== 'interior' || snapshot.visualOpen,
      layers: {
        exterior: snapshot.zone !== 'interior' || snapshot.visualOpen,
        threshold: true,
        interior: snapshot.visualOpen || snapshot.zone !== 'exterior',
      },
    }
  })

  return (
    <group
      name="scene.cottage-interior-lighting"
      userData={{
        semanticId: 'scene.cottage-interior-lighting',
        temperaturesKelvin: [1800, 2700, 3000],
      }}
    >
      <ambientLight
        ref={ambientRef}
        name="cottage.light.ambient-warm-fill"
        color="#ffd7b0"
        intensity={0.08}
        userData={{ semanticId: 'cottage.light.ambient-warm-fill' }}
      />
      <pointLight
        ref={pendantRef}
        name="cottage.light.pendant-2700k"
        position={[
          envelope.centerX + 0.3,
          datums.eave - 0.34,
          envelope.centerZ + 0.3,
        ]}
        color="#ffd0a0"
        intensity={0.7}
        distance={8.5}
        decay={2}
        castShadow={false}
        userData={{ semanticId: 'cottage.light.pendant-2700k' }}
      />
      <pointLight
        ref={hearthRef}
        name="cottage.light.hearth-1800k"
        position={[
          envelope.centerX - 2.85,
          datums.interiorFloorTop + 0.72,
          envelope.centerZ + 0.75,
        ]}
        color="#ff8848"
        intensity={0.85}
        distance={5.2}
        decay={2}
        castShadow={false}
        userData={{ semanticId: 'cottage.light.hearth-1800k' }}
      />
      <pointLight
        ref={memoryWallRef}
        name="cottage.light.memory-wall-3000k"
        position={[
          envelope.centerX,
          datums.interiorFloorTop + 1.85,
          envelope.centerZ - 2.25,
        ]}
        color="#ffe0b8"
        intensity={0.38}
        distance={4.6}
        decay={2}
        castShadow={false}
        userData={{ semanticId: 'cottage.light.memory-wall-3000k' }}
      />
    </group>
  )
}
