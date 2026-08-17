export const ROMANTIC_STORY_TIMELINE = {
  revealEnd: 3,
  approachEnd: 9,
  plaqueEnd: 13,
  bloomWalkEnd: 31,
  interiorEntryEnd: 35,
  galleryEnd: 42,
  letterArrival: 45,
  returnGardenEnd: 54,
  skyAnimationEnd: 64,
  skyMessageHoldEnd: 69,
  endingRevealEnd: 73,
} as const

export type RomanticStoryPhase =
  | 'cover'
  | 'reveal'
  | 'approach'
  | 'plaque'
  | 'bloom-walk'
  | 'interior-entry'
  | 'gallery'
  | 'letter-approach'
  | 'letter-prompt'
  | 'letter-reading'
  | 'return-garden'
  | 'finale-sky'
  | 'sky-message-hold'
  | 'ending-reveal'
  | 'ending'
  | 'free'

type RomanticStoryStatus =
  | 'cover'
  | 'playing'
  | 'letter-prompt'
  | 'letter-reading'
  | 'ending'
  | 'free'

export interface RomanticStorySnapshot {
  readonly phase: RomanticStoryPhase
  readonly timeSeconds: number
  readonly paused: boolean
  readonly runId: number
}

export interface RomanticStoryFrameSnapshot extends RomanticStorySnapshot {
  readonly automaticCamera: boolean
  readonly roseStoryActive: boolean
  readonly storyEnvironmentActive: boolean
  readonly skyTimeSeconds: number
  readonly letterInteractionOnly: boolean
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export function resolveRomanticStoryPhase(
  timeSeconds: number,
  letterKept = false,
): RomanticStoryPhase {
  const time = Math.max(0, timeSeconds)
  if (time < ROMANTIC_STORY_TIMELINE.revealEnd) return 'reveal'
  if (time < ROMANTIC_STORY_TIMELINE.approachEnd) return 'approach'
  if (time < ROMANTIC_STORY_TIMELINE.plaqueEnd) return 'plaque'
  if (time < ROMANTIC_STORY_TIMELINE.bloomWalkEnd) return 'bloom-walk'
  if (time < ROMANTIC_STORY_TIMELINE.interiorEntryEnd) return 'interior-entry'
  if (time < ROMANTIC_STORY_TIMELINE.galleryEnd) return 'gallery'
  if (time < ROMANTIC_STORY_TIMELINE.letterArrival) return 'letter-approach'
  if (!letterKept) return 'letter-prompt'
  if (time < ROMANTIC_STORY_TIMELINE.returnGardenEnd) return 'return-garden'
  if (time < ROMANTIC_STORY_TIMELINE.skyAnimationEnd) return 'finale-sky'
  if (time < ROMANTIC_STORY_TIMELINE.skyMessageHoldEnd) {
    return 'sky-message-hold'
  }
  if (time < ROMANTIC_STORY_TIMELINE.endingRevealEnd) return 'ending-reveal'
  return 'ending'
}

export class RomanticStoryRuntime {
  private status: RomanticStoryStatus
  private elapsedSeconds = 0
  private letterKept = false
  private completedNaturally = false
  private userPaused = false
  private pageHidden = false
  private runId = 0
  private readonly subscribers = new Set<() => void>()
  private snapshot: RomanticStorySnapshot

  constructor(initialMode: 'cover' | 'free' = 'cover') {
    this.status = initialMode
    this.snapshot = this.createSnapshot()
  }

  subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  getSnapshot = () => this.snapshot

  getFrameSnapshot = (): RomanticStoryFrameSnapshot => {
    const snapshot = this.createSnapshot()
    const automaticCamera = this.status !== 'free'
    return {
      ...snapshot,
      automaticCamera,
      roseStoryActive: this.status !== 'free',
      storyEnvironmentActive:
        this.status !== 'free' || this.completedNaturally,
      skyTimeSeconds: clamp(
        this.elapsedSeconds - ROMANTIC_STORY_TIMELINE.returnGardenEnd,
        0,
        ROMANTIC_STORY_TIMELINE.skyAnimationEnd -
          ROMANTIC_STORY_TIMELINE.returnGardenEnd,
      ),
      letterInteractionOnly:
        this.status === 'letter-prompt' || this.status === 'letter-reading',
    }
  }

  start() {
    this.resetForStory()
    this.status = 'playing'
    this.publish()
  }

  replay() {
    this.start()
  }

  enterFree() {
    this.completedNaturally = this.status === 'ending'
    this.status = 'free'
    this.userPaused = false
    this.publish()
  }

  skipToFree() {
    this.status = 'free'
    this.completedNaturally = false
    this.userPaused = false
    this.elapsedSeconds = ROMANTIC_STORY_TIMELINE.endingRevealEnd
    this.publish()
  }

  togglePaused() {
    if (this.status !== 'playing') return
    this.userPaused = !this.userPaused
    this.publish()
  }

  setPageVisible(visible: boolean) {
    if (this.pageHidden === !visible) return
    this.pageHidden = !visible
    this.publish()
  }

  openLetter() {
    if (this.status !== 'letter-prompt') return false
    this.status = 'letter-reading'
    this.publish()
    return true
  }

  closeLetter() {
    if (this.status !== 'letter-reading') return false
    this.status = 'letter-prompt'
    this.publish()
    return true
  }

  keepLetter() {
    if (this.status !== 'letter-reading') return false
    this.letterKept = true
    this.status = 'playing'
    this.elapsedSeconds = ROMANTIC_STORY_TIMELINE.letterArrival
    this.publish()
    return true
  }

  tick(deltaSeconds: number) {
    if (
      this.status !== 'playing' ||
      this.userPaused ||
      this.pageHidden ||
      !Number.isFinite(deltaSeconds) ||
      deltaSeconds <= 0
    ) {
      return
    }
    const previousPhase = resolveRomanticStoryPhase(
      this.elapsedSeconds,
      this.letterKept,
    )
    const limit = this.letterKept
      ? ROMANTIC_STORY_TIMELINE.endingRevealEnd
      : ROMANTIC_STORY_TIMELINE.letterArrival
    this.elapsedSeconds = Math.min(
      limit,
      this.elapsedSeconds + Math.min(deltaSeconds, 0.1),
    )
    if (!this.letterKept && this.elapsedSeconds >= limit) {
      this.status = 'letter-prompt'
    } else if (this.letterKept && this.elapsedSeconds >= limit) {
      this.status = 'ending'
      this.completedNaturally = true
    }
    const nextPhase = this.resolvePhase()
    if (nextPhase !== previousPhase || this.status !== 'playing') {
      this.publish()
    }
  }

  private resetForStory() {
    this.elapsedSeconds = 0
    this.letterKept = false
    this.completedNaturally = false
    this.userPaused = false
    this.runId += 1
  }

  private resolvePhase(): RomanticStoryPhase {
    if (this.status === 'cover') return 'cover'
    if (this.status === 'free') return 'free'
    if (this.status === 'letter-prompt') return 'letter-prompt'
    if (this.status === 'letter-reading') return 'letter-reading'
    if (this.status === 'ending') return 'ending'
    return resolveRomanticStoryPhase(this.elapsedSeconds, this.letterKept)
  }

  private createSnapshot(): RomanticStorySnapshot {
    return {
      phase: this.resolvePhase(),
      timeSeconds: this.elapsedSeconds,
      paused: this.userPaused || this.pageHidden,
      runId: this.runId,
    }
  }

  private publish() {
    this.snapshot = this.createSnapshot()
    this.subscribers.forEach((subscriber) => subscriber())
  }
}

export function createRomanticStoryCompletionKey(experienceKey: string) {
  return `love:romantic-story:${experienceKey}:completed`
}

export function readRomanticStoryCompletion(experienceKey: string) {
  try {
    return localStorage.getItem(createRomanticStoryCompletionKey(experienceKey)) === '1'
  } catch {
    return false
  }
}

export function writeRomanticStoryCompletion(experienceKey: string) {
  try {
    localStorage.setItem(createRomanticStoryCompletionKey(experienceKey), '1')
  } catch {
    // 隐私模式或存储被禁用时不影响本次礼物体验。
  }
}
