import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_LOVE_LETTER_REVIEW_VIEW,
} from '@/entities/scene/items/cottage-flower-garden/model/gardenLayout'
import { COTTAGE_FLOWER_GARDEN_FIRST_PERSON } from '@/entities/scene/items/cottage-flower-garden/model/gardenTerrain'
import { ROMANTIC_STORY_TIMELINE } from './romanticStory'

export interface RomanticCameraPose {
  readonly position: readonly [number, number, number]
  readonly target: readonly [number, number, number]
  readonly fov: number
}

interface RomanticCameraKeyframe extends RomanticCameraPose {
  readonly timeSeconds: number
  readonly interpolation?: 'linear' | 'smoothstep'
}

const { cottage, visitor } = COTTAGE_FLOWER_GARDEN_LAYOUT

const CAMERA_KEYFRAMES: readonly RomanticCameraKeyframe[] = [
  {
    timeSeconds: 0,
    position: visitor.spawn,
    target: visitor.initialTarget,
    fov: 50,
  },
  {
    timeSeconds: 3,
    position: visitor.spawn,
    target: [0, 1.2, -4.5],
    fov: 48,
  },
  {
    timeSeconds: 9,
    position: [-1.2, 1.42, 21.4],
    target: [0, 2.02, 19.05],
    fov: 48,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.plaqueEnd,
    position: [0, 1.42, 20.25],
    target: [0, 2.02, 19.05],
    fov: 46,
  },
  {
    timeSeconds: 17,
    position: [0, 1.42, 19.25],
    target: [0, 1.5, cottage.centerZ + cottage.depth / 2],
    fov: 48,
    interpolation: 'linear',
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.bloomWalkEnd,
    position: [0, 1.46, -7.8],
    target: [0, 1.5, cottage.centerZ + cottage.depth / 2],
    fov: 52,
    interpolation: 'linear',
  },
  {
    timeSeconds: 42.5,
    position: [0, cottage.porchTop + visitor.eyeHeight, -9.82],
    target: [0, 1.48, cottage.centerZ + cottage.depth / 2 - 0.8],
    fov: 54,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.interiorEntryEnd,
    position: [0, cottage.floorTop + 1.42, cottage.centerZ + 2.35],
    target: [0, 1.56, cottage.centerZ - 2.65],
    fov: 58,
  },
  {
    timeSeconds: 46.5,
    position: [-0.15, cottage.floorTop + 1.42, cottage.centerZ + 1.95],
    target: [-1.48, 1.74, cottage.centerZ - 3.04],
    fov: 54,
  },
  {
    timeSeconds: 48.8,
    position: [0, cottage.floorTop + 1.42, cottage.centerZ + 1.8],
    target: [0, 1.74, cottage.centerZ - 3.04],
    fov: 50,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.galleryEnd,
    position: [0.18, cottage.floorTop + 1.42, cottage.centerZ + 1.72],
    target: [cottage.width / 2 - 0.72, 1.84, cottage.centerZ - 3.04],
    fov: 54,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.letterArrival,
    position: COTTAGE_LOVE_LETTER_REVIEW_VIEW.position,
    target: COTTAGE_LOVE_LETTER_REVIEW_VIEW.target,
    fov: COTTAGE_LOVE_LETTER_REVIEW_VIEW.fov,
  },
  {
    timeSeconds: 59,
    position: [0, cottage.floorTop + 1.42, cottage.centerZ + 2.4],
    target: [0, 1.5, cottage.centerZ + 5.2],
    fov: 54,
  },
  {
    timeSeconds: 64,
    position: [0, cottage.porchTop + visitor.eyeHeight, -8.9],
    target: [0, 1.48, 3.6],
    fov: 54,
  },
  {
    timeSeconds: 66,
    position: [0, 1.42, 4.2],
    target: [0, 3.8, -22],
    fov: 54,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.returnGardenEnd,
    position: [0, 1.42, 4.2],
    target: [0, 70, -200],
    fov: 58,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.skyAnimationEnd,
    position: [0, 1.42, 4.2],
    target: [0, 70, -200],
    fov: 58,
  },
  {
    timeSeconds: ROMANTIC_STORY_TIMELINE.endingRevealEnd,
    position: [0, 1.42, 4.2],
    target: [0, 70, -200],
    fov: 58,
  },
]

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number) {
  const progress = clamp01(value)
  return progress * progress * (3 - 2 * progress)
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

function mixPoint(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    mix(start[0], end[0], progress),
    mix(start[1], end[1], progress),
    mix(start[2], end[2], progress),
  ]
}

export function sampleRomanticCameraPose(timeSeconds: number): RomanticCameraPose {
  const safeTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0
  const nextIndex = CAMERA_KEYFRAMES.findIndex(
    (keyframe) => keyframe.timeSeconds >= safeTime,
  )
  if (nextIndex <= 0) return CAMERA_KEYFRAMES[0]
  if (nextIndex < 0) return CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1]

  const start = CAMERA_KEYFRAMES[nextIndex - 1]
  const end = CAMERA_KEYFRAMES[nextIndex]
  const rawProgress = clamp01(
    (safeTime - start.timeSeconds) / (end.timeSeconds - start.timeSeconds),
  )
  const progress =
    end.interpolation === 'linear' ? rawProgress : smoothstep(rawProgress)
  const position = mixPoint(start.position, end.position, progress)
  const target = mixPoint(start.target, end.target, progress)
  const groundHeight = COTTAGE_FLOWER_GARDEN_FIRST_PERSON.groundHeightAt?.({
    x: position[0],
    z: position[2],
  })
  if (groundHeight !== undefined && position[2] > 18.25) {
    position[1] = groundHeight + (visitor.eyeHeight ?? 1.42)
  }
  return {
    position,
    target,
    fov: mix(start.fov, end.fov, progress),
  }
}

export const ROMANTIC_CAMERA_ROUTE_DURATION_SECONDS =
  ROMANTIC_STORY_TIMELINE.endingRevealEnd
