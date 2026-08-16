import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type Group } from 'three'
import type {
  ModelCommand,
  ModelSceneProps,
} from '@/entities/model/model/modelTypes'
import { createWildflowerGeometry } from '../model/geometry'
import {
  resolveWildflowerBreezeSway,
  type WildflowerSpeciesId,
} from '../model/spec'

export function WildflowerSpecimen({
  species,
  command,
  reducedMotion = false,
}: {
  species: WildflowerSpeciesId
  command?: ModelCommand | null
  reducedMotion?: boolean
}) {
  const groupRef = useRef<Group>(null)
  const breezeElapsed = useRef(Number.POSITIVE_INFINITY)
  const geometry = useMemo(() => createWildflowerGeometry(species), [species])

  useEffect(() => {
    if (reducedMotion) {
      breezeElapsed.current = Number.POSITIVE_INFINITY
      groupRef.current?.rotation.set(0, 0, 0)
    } else if (command?.name === 'breeze') {
      breezeElapsed.current = 0
    }
  }, [command?.name, command?.nonce, reducedMotion])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group || breezeElapsed.current > 2.4) return
    breezeElapsed.current += delta
    const progress = Math.min(1, breezeElapsed.current / 2.4)
    const sway = resolveWildflowerBreezeSway(progress, 0.055)
    group.rotation.z = sway
    group.rotation.x = sway * 0.28
    if (progress === 1) group.rotation.set(0, 0, 0)
  })

  return (
    <group ref={groupRef} name={`wildflower.${species}.breeze-root`}>
      <mesh
        name={`wildflower.${species}.specimen`}
        geometry={geometry}
        castShadow
        receiveShadow
        userData={{ species, semanticRole: 'whole-plant' }}
      >
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.77}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

export function WildDaisy(props: ModelSceneProps) {
  return <WildflowerSpecimen species="wild-daisy" {...props} />
}

export function PinkCosmos(props: ModelSceneProps) {
  return <WildflowerSpecimen species="pink-cosmos" {...props} />
}

export function BlueCornflower(props: ModelSceneProps) {
  return <WildflowerSpecimen species="blue-cornflower" {...props} />
}
