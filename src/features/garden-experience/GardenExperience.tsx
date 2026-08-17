'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import {
  COTTAGE_FLOWER_GARDEN_FIRST_PERSON,
  cottagePortalRuntime,
  CottageFlowerGardenWorld,
  isCottageInteriorFurniturePositionClear,
  type CottageGardenSkyAnimationCommand,
  type CottageGardenTimeCommand,
  type CottageInteriorInstance,
  type CottageInteriorPoint,
} from '@/entities/scene'
import type { LoveLetterContent } from '@/entities/part'
import type { LoveExperienceConfig } from '@/domain/loveProjectConfig'
import { useReducedMotion } from '@/shared/hooks'
import { FirstPersonController } from '@/shared/three'
import { CottageInteriorRuntime } from '@/widgets/scene-editor/ui/CottageInteriorRuntime'
import { LoveLetterReader } from '@/widgets/scene-editor/ui/LoveLetterReader'
import { isCottageInteriorPreparing } from './model/interiorPreparation'
import {
  readRomanticStoryCompletion,
  RomanticStoryRuntime,
  writeRomanticStoryCompletion,
} from './model/romanticStory'
import { RomanticCameraDirector } from './ui/RomanticCameraDirector'
import { GardenSceneLoadingVeil } from './ui/GardenSceneLoadingVeil'
import styles from './gardenExperience.module.css'

export interface GardenExperienceProps {
  config: LoveExperienceConfig
  mode: 'demo' | 'studio' | 'preview' | 'guest'
  experienceKey?: string
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

function SceneReadySignal({
  cycle,
  onReady,
}: {
  cycle: string | number
  onReady: () => void
}) {
  const activeCycle = useRef<string | number | null>(null)
  const renderedFrames = useRef(0)

  useFrame(() => {
    if (activeCycle.current === cycle) return
    renderedFrames.current += 1
    if (renderedFrames.current < 3) return
    activeCycle.current = cycle
    renderedFrames.current = 0
    onReady()
  })

  return null
}

function GardenSceneFallback() {
  return <color attach="background" args={['#170d12']} />
}

function GardenContents({
  config,
  onReadLoveLetter,
  interiorEditor,
  quality,
  reducedMotion,
  storyRuntime,
  storyPhase,
  interiorLoadEpoch,
  onInitialSceneReady,
  onInteriorSceneReady,
}: {
  config: LoveExperienceConfig
  onReadLoveLetter: (content: LoveLetterContent) => void
  interiorEditor?: GardenInteriorEditorRuntime
  quality: 'desktop' | 'mobile'
  reducedMotion: boolean
  storyRuntime: RomanticStoryRuntime
  storyPhase: ReturnType<RomanticStoryRuntime['getSnapshot']>['phase']
  interiorLoadEpoch: number
  onInitialSceneReady: () => void
  onInteriorSceneReady: (epoch: number) => void
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
  const timeCommand = useMemo<CottageGardenTimeCommand>(
    () => ({
      target: config.project.ambience.timeOfDay,
      durationSeconds: 0,
      nonce: 1,
    }),
    [config.project.ambience.timeOfDay],
  )
  const freeMode = storyPhase === 'free'

  return (
    <>
      <CottageFlowerGardenWorld
        reducedMotion={reducedMotion}
        tuning={config.tuning}
        timeCommand={timeCommand}
        skyAnimationCommand={skyCommand}
        romanticSignal={storyRuntime}
        giftNames={{
          from: config.project.identity.senderName,
          to: config.project.identity.recipientName,
        }}
        skyMessage={config.project.ambience.skyMessage}
      >
        <Suspense fallback={<group name="cottage.interior.preparing" />}>
          <CottageInteriorRuntime
            key={`interior-story-${storyRuntime.getSnapshot().runId}`}
            instances={config.interiorInstances}
            editMode={interiorEditor?.open ?? false}
            selectedInstanceId={interiorEditor?.selectedInstanceId ?? null}
            transformMode={interiorEditor?.transformMode ?? 'translate'}
            selectedPathPointIndex={interiorEditor?.selectedPathPointIndex ?? null}
            quality={quality}
            letterInteractionEnabled={
              freeMode || storyPhase === 'letter-prompt'
            }
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
          <SceneReadySignal
            cycle={interiorLoadEpoch}
            onReady={() => onInteriorSceneReady(interiorLoadEpoch)}
          />
        </Suspense>
      </CottageFlowerGardenWorld>
      <RomanticCameraDirector runtime={storyRuntime} />
      <FirstPersonController
        config={firstPersonConfig}
        enabled={freeMode}
        preserveViewOnEnable={storyRuntime.getSnapshot().runId > 0}
      />
      <SceneReadySignal cycle="initial-garden" onReady={onInitialSceneReady} />
    </>
  )
}

export function GardenExperience({
  config,
  mode,
  interiorEditor,
  experienceKey = 'local-preview',
}: GardenExperienceProps) {
  const [activeLetter, setActiveLetter] = useState<LoveLetterContent | null>(null)
  const [quality, setQuality] = useState<'desktop' | 'mobile'>('desktop')
  const [previouslyCompleted, setPreviouslyCompleted] = useState(false)
  const [initialSceneReady, setInitialSceneReady] = useState(false)
  const [interiorReadyEpoch, setInteriorReadyEpoch] = useState<number | null>(
    null,
  )
  const reducedMotion = useReducedMotion()
  const storyEnabled =
    mode === 'guest' && config.project.experience.immersiveEnabled
  const storyRuntime = useMemo(
    () => new RomanticStoryRuntime(storyEnabled ? 'cover' : 'free'),
    [storyEnabled],
  )
  const storySnapshot = useSyncExternalStore(
    storyRuntime.subscribe,
    storyRuntime.getSnapshot,
    storyRuntime.getSnapshot,
  )
  const portalSnapshot = useSyncExternalStore(
    cottagePortalRuntime.subscribe,
    cottagePortalRuntime.getSnapshot,
    cottagePortalRuntime.getSnapshot,
  )
  const interiorPreparing = isCottageInteriorPreparing(
    portalSnapshot,
    interiorReadyEpoch,
  )
  const markInitialSceneReady = useCallback(() => {
    setInitialSceneReady(true)
  }, [])
  const markInteriorSceneReady = useCallback((epoch: number) => {
    const current = cottagePortalRuntime.getSnapshot()
    if (
      current.epoch !== epoch ||
      (current.motion !== 'opening' && current.motion !== 'open')
    ) {
      return
    }
    setInteriorReadyEpoch(epoch)
  }, [])
  const closeLetter = useCallback(() => {
    setActiveLetter(null)
    storyRuntime.closeLetter()
  }, [storyRuntime])
  const keepLetter = useCallback(() => {
    setActiveLetter(null)
    storyRuntime.keepLetter()
  }, [storyRuntime])
  const readLetter = useCallback(
    (content: LoveLetterContent) => {
      if (storySnapshot.phase === 'letter-prompt' && !storyRuntime.openLetter()) {
        return
      }
      setActiveLetter(content)
    },
    [storyRuntime, storySnapshot.phase],
  )

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px), (pointer: coarse)')
    const update = () => setQuality(query.matches ? 'mobile' : 'desktop')
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!storyEnabled) return
    setPreviouslyCompleted(readRomanticStoryCompletion(experienceKey))
  }, [experienceKey, storyEnabled])

  useEffect(() => {
    const updateVisibility = () =>
      storyRuntime.setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', updateVisibility)
    updateVisibility()
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [storyRuntime])

  useEffect(() => {
    if (storySnapshot.phase !== 'ending') return
    writeRomanticStoryCompletion(experienceKey)
    setPreviouslyCompleted(true)
  }, [experienceKey, storySnapshot.phase])

  const startStory = useCallback(() => {
    setActiveLetter(null)
    storyRuntime.start()
  }, [storyRuntime])
  const replayStory = useCallback(() => {
    setActiveLetter(null)
    storyRuntime.replay()
  }, [storyRuntime])

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
        <Suspense fallback={<GardenSceneFallback />}>
          <GardenContents
            config={config}
            onReadLoveLetter={readLetter}
            interiorEditor={interiorEditor}
            quality={quality}
            reducedMotion={reducedMotion}
            storyRuntime={storyRuntime}
            storyPhase={storySnapshot.phase}
            interiorLoadEpoch={portalSnapshot.epoch}
            onInitialSceneReady={markInitialSceneReady}
            onInteriorSceneReady={markInteriorSceneReady}
          />
        </Suspense>
      </Canvas>
      <GardenSceneLoadingVeil
        visible={!initialSceneReady || interiorPreparing}
        phase={initialSceneReady ? 'interior' : 'garden'}
      />
      {storySnapshot.phase === 'free' && mode !== 'studio' && (
        <div className={styles.hint}>
          <span>{quality === 'mobile' ? '轻触场景进入' : '点击场景进入'}</span>
          <small>
            {quality === 'mobile'
              ? '左侧拖动移动 · 右侧拖动观察 · 轻触物品互动'
              : 'WASD 漫游 · 靠近房门或信封按 E'}
          </small>
        </div>
      )}
      {storySnapshot.phase === 'cover' && (
        <div className={styles.giftVeil} data-testid="romantic-gift-cover">
          <div className={styles.giftCopy}>
            <span className={styles.eyebrow}>A GARDEN, ONLY FOR YOU</span>
            <h1>
              {config.project.identity.recipientName || '亲爱的你'}，
              <br />有一座花园正在等你。
            </h1>
            <p>
              {config.project.identity.senderName || '爱你的人'}把想说的话，
              藏进了花开、照片与星光里。
            </p>
            <div className={styles.giftActions}>
              <button type="button" className={styles.primaryAction} onClick={startStory}>
                {previouslyCompleted ? '再看一次沉浸浪漫' : '开启这份礼物'}
              </button>
              <button
                type="button"
                className={styles.textAction}
                onClick={() => storyRuntime.skipToFree()}
              >
                {previouslyCompleted ? '自由享受花园' : '直接自由探索'}
              </button>
            </div>
          </div>
        </div>
      )}
      {storySnapshot.phase === 'letter-prompt' && !activeLetter && (
        <div className={styles.storyPrompt} role="status">
          <span>现在，轮到你了</span>
          <p>亲手拆开桌上的那封信</p>
        </div>
      )}
      {(storySnapshot.phase === 'ending-reveal' ||
        storySnapshot.phase === 'ending') && (
        <div className={styles.endingVeil} data-complete={storySnapshot.phase === 'ending'}>
          <span aria-hidden="true">♥</span>
          <p>{config.project.experience.endingMessage}</p>
          {storySnapshot.phase === 'ending' && (
            <div className={styles.endingActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => storyRuntime.enterFree()}
              >
                自由享受吧
              </button>
              <button type="button" className={styles.textAction} onClick={replayStory}>
                再看一次
              </button>
            </div>
          )}
        </div>
      )}
      {activeLetter && (
        <LoveLetterReader
          content={activeLetter}
          onClose={closeLetter}
          onKeep={storySnapshot.phase === 'letter-reading' ? keepLetter : closeLetter}
        />
      )}
    </section>
  )
}
