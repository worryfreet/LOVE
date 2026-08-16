'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import {
  COTTAGE_FLOWER_GARDEN_FIRST_PERSON,
  cottagePortalRuntime,
  CottageFlowerGardenWorld,
  isCottageInteriorFurniturePositionClear,
  type CottageGardenSkyAnimationCommand,
  type CottageInteriorInstance,
  type CottageInteriorPoint,
} from '@/entities/scene'
import type { LoveLetterContent } from '@/entities/part'
import type { LoveExperienceConfig } from '@/domain/loveProjectConfig'
import { useReducedMotion } from '@/shared/hooks'
import { FirstPersonController } from '@/shared/three'
import { CottageInteriorRuntime } from '@/widgets/scene-editor/ui/CottageInteriorRuntime'
import { LoveLetterReader } from '@/widgets/scene-editor/ui/LoveLetterReader'
import styles from './gardenExperience.module.css'

export interface GardenExperienceProps {
  config: LoveExperienceConfig
  mode: 'demo' | 'studio' | 'preview' | 'guest'
  interiorEditor?: GardenInteriorEditorRuntime
}

export interface GardenInteriorEditorRuntime {
  open: boolean
  selectedInstanceId: string | null
  transformMode: 'translate' | 'rotate' | 'scale'
  selectedPathPointIndex: number | null
  onSelect: (instanceId: string | null) => void
  onPathPointSelect: (index: number | null) => void
  onCommitTransform: (
    instanceId: string,
    transform: Pick<CottageInteriorInstance, 'position' | 'rotation' | 'scale'>,
  ) => void
  onCommitPathPoint: (
    instanceId: string,
    index: number,
    point: CottageInteriorPoint,
  ) => void
}

function GardenContents({
  config,
  onReadLoveLetter,
  interiorEditor,
  quality,
  reducedMotion,
}: {
  config: LoveExperienceConfig
  onReadLoveLetter: (content: LoveLetterContent) => void
  interiorEditor?: GardenInteriorEditorRuntime
  quality: 'desktop' | 'mobile'
  reducedMotion: boolean
}) {
  const firstPersonConfig = useMemo(
    () => ({
      ...COTTAGE_FLOWER_GARDEN_FIRST_PERSON,
      isPositionAllowed: (point: { x: number; z: number }) =>
        (COTTAGE_FLOWER_GARDEN_FIRST_PERSON.isPositionAllowed?.(point) ?? true) &&
        isCottageInteriorFurniturePositionClear(
          { x: point.x, y: 0, z: point.z },
          config.interiorInstances,
        ),
      action: {
        keyboardCodes: ['KeyE'],
        onAction: cottagePortalRuntime.requestToggle.bind(cottagePortalRuntime),
      },
    }),
    [config.interiorInstances],
  )
  const skyCommand = useMemo<CottageGardenSkyAnimationCommand>(
    () => ({
      playing: config.project.ambience.timeOfDay === 'evening',
      timeSeconds: config.project.ambience.timeOfDay === 'evening' ? 10 : 0,
      issuedAtMilliseconds: 0,
      nonce: 1,
    }),
    [config.project.ambience.timeOfDay],
  )

  return (
    <>
      <CottageFlowerGardenWorld
        reducedMotion={reducedMotion}
        tuning={config.tuning}
        skyAnimationCommand={skyCommand}
        giftNames={{
          from: config.project.identity.senderName,
          to: config.project.identity.recipientName,
        }}
        skyMessage={config.project.ambience.skyMessage}
      >
        <CottageInteriorRuntime
          instances={config.interiorInstances}
          editMode={interiorEditor?.open ?? false}
          selectedInstanceId={interiorEditor?.selectedInstanceId ?? null}
          transformMode={interiorEditor?.transformMode ?? 'translate'}
          selectedPathPointIndex={interiorEditor?.selectedPathPointIndex ?? null}
          quality={quality}
          onSelect={(instanceId) => interiorEditor?.onSelect(instanceId)}
          onPathPointSelect={(index) => interiorEditor?.onPathPointSelect(index)}
          onCommitTransform={(instanceId, transform) =>
            interiorEditor?.onCommitTransform(instanceId, transform)
          }
          onCommitPathPoint={(instanceId, index, point) =>
            interiorEditor?.onCommitPathPoint(instanceId, index, point)
          }
          onReadLoveLetter={onReadLoveLetter}
        />
      </CottageFlowerGardenWorld>
      <FirstPersonController config={firstPersonConfig} />
    </>
  )
}

export function GardenExperience({ config, mode, interiorEditor }: GardenExperienceProps) {
  const [activeLetter, setActiveLetter] = useState<LoveLetterContent | null>(null)
  const [quality, setQuality] = useState<'desktop' | 'mobile'>('desktop')
  const reducedMotion = useReducedMotion()
  const closeLetter = useCallback(() => setActiveLetter(null), [])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px), (pointer: coarse)')
    const update = () => setQuality(query.matches ? 'mobile' : 'desktop')
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return (
    <section className={styles.stage} data-mode={mode}>
      <Canvas
        className={styles.canvas}
        camera={{
          position: COTTAGE_FLOWER_GARDEN_FIRST_PERSON.spawn,
          fov: 52,
          near: 0.08,
          far: 420,
        }}
        dpr={quality === 'mobile' ? [0.75, 1] : [1, 1.25]}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace
          gl.toneMapping = ACESFilmicToneMapping
          gl.shadowMap.enabled = true
          gl.shadowMap.type = PCFSoftShadowMap
        }}
      >
        <Suspense fallback={null}>
          <GardenContents
            config={config}
            onReadLoveLetter={setActiveLetter}
            interiorEditor={interiorEditor}
            quality={quality}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
      {mode !== 'studio' && (
        <div className={styles.hint}>
          <span>点击场景进入</span>
          <small>WASD 漫游 · 靠近房门或信封按 E</small>
        </div>
      )}
      {activeLetter && (
        <LoveLetterReader content={activeLetter} onClose={closeLetter} />
      )}
    </section>
  )
}
