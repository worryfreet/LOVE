import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import {
  CottageEnvelope,
  resolveLoveLetterContent,
  type LoveLetterContent,
  type PartParameterValues,
} from '@/entities/part'
import { useReducedMotion } from '@/shared/hooks'
import {
  LOVE_LETTER_OPEN_DURATION_SECONDS,
  isLoveLetterInteractionEligible,
} from '../model/cottageLoveLetterInteraction'

export function InteractiveCottageEnvelope({
  id,
  parameters,
  quality,
  editMode,
  interactionEnabled,
  onRead,
}: {
  id: string
  parameters: PartParameterValues
  quality: 'desktop' | 'mobile'
  editMode: boolean
  interactionEnabled: boolean
  onRead: (content: LoveLetterContent) => void
}) {
  const rootRef = useRef<Group>(null)
  const progressRef = useRef(0)
  const openingRef = useRef(false)
  const nearbyRef = useRef(false)
  const handedOffRef = useRef(false)
  const worldPosition = useMemo(() => new Vector3(), [])
  const viewDirection = useMemo(() => new Vector3(), [])
  const toEnvelope = useMemo(() => new Vector3(), [])
  const reducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [nearby, setNearby] = useState(false)
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  const authoredValue = Number(parameters.openProgress ?? 0)
  const authoredProgress = Number.isFinite(authoredValue)
    ? Math.min(1, Math.max(0, authoredValue))
    : 0
  const content = useMemo(
    () => resolveLoveLetterContent(parameters),
    [parameters],
  )

  useEffect(() => {
    if (!editMode) return
    progressRef.current = authoredProgress
    setProgress(authoredProgress)
    openingRef.current = false
    setOpening(false)
  }, [authoredProgress, editMode])

  useEffect(() => {
    if (editMode) return
    progressRef.current = 0
    openingRef.current = false
    handedOffRef.current = false
    setProgress(0)
    setOpening(false)
    setOpened(false)
  }, [editMode, id])

  const activate = useCallback(() => {
    if (editMode || !interactionEnabled || !nearbyRef.current) return
    if (openingRef.current) return
    if (opened || progressRef.current >= 0.995) {
      if (document.pointerLockElement) document.exitPointerLock()
      onRead(content)
      return
    }
    openingRef.current = true
    setOpening(true)
  }, [content, editMode, interactionEnabled, onRead, opened])

  useEffect(() => {
    if (!nearby || editMode || !interactionEnabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        event.code !== 'KeyE' ||
        event.repeat ||
        target?.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      event.preventDefault()
      activate()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activate, editMode, interactionEnabled, nearby])

  useFrame(({ camera }, delta) => {
    const root = rootRef.current
    if (!root) return

    if (!editMode && interactionEnabled) {
      root.getWorldPosition(worldPosition)
      toEnvelope.copy(worldPosition).sub(camera.position)
      const distance = toEnvelope.length()
      camera.getWorldDirection(viewDirection)
      const viewDot = distance > 0.0001
        ? viewDirection.dot(toEnvelope.multiplyScalar(1 / distance))
        : 1
      const nextNearby = isLoveLetterInteractionEligible(distance, viewDot)
      if (nextNearby !== nearbyRef.current) {
        nearbyRef.current = nextNearby
        setNearby(nextNearby)
      }
    } else if (nearbyRef.current) {
      nearbyRef.current = false
      setNearby(false)
    }

    if (!openingRef.current || editMode) return
    const duration = reducedMotion ? 0.16 : LOVE_LETTER_OPEN_DURATION_SECONDS
    const next = Math.min(1, progressRef.current + delta / duration)
    progressRef.current = next
    setProgress(next)
    if (next < 1) return

    openingRef.current = false
    setOpening(false)
    setOpened(true)
    if (handedOffRef.current) return
    handedOffRef.current = true
    if (document.pointerLockElement) document.exitPointerLock()
    onRead(content)
  })

  return (
    <group
      ref={rootRef}
      name={`${id}:interaction-root`}
      userData={{
        semanticId: `${id}:love-letter-interaction`,
        interaction: 'open-love-letter',
        progress,
        nearby,
        opening,
        opened,
      }}
    >
      <CottageEnvelope
        id={id}
        parameters={parameters}
        quality={quality}
        openProgress={editMode ? authoredProgress : progress}
        onActivate={editMode ? undefined : activate}
      />
      {nearby && !editMode && interactionEnabled && (
        <Html
          center
          position={[0, 0.18, 0]}
          distanceFactor={1.5}
          zIndexRange={[32, 20]}
        >
          <button
            type="button"
            className="cottage-love-letter-prompt"
            data-love-letter-action
            data-opening={opening ? 'true' : undefined}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              activate()
            }}
          >
            <span aria-hidden="true">{opening ? '···' : '♥'}</span>
            {opening ? '正在展开情书' : opened ? '再次读信' : 'E · 拆开情书'}
          </button>
        </Html>
      )}
    </group>
  )
}
