import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { cottagePortalRuntime } from '@/entities/scene'
import { sampleRomanticCameraPose } from '../model/romanticCameraPath'
import {
  ROMANTIC_STORY_TIMELINE,
  type RomanticStoryRuntime,
} from '../model/romanticStory'

export function RomanticCameraDirector({
  runtime,
}: {
  runtime: RomanticStoryRuntime
}) {
  const { camera } = useThree()
  const lastRunId = useRef(Number.NaN)
  const target = useRef(new Vector3())

  useFrame((_, delta) => {
    runtime.tick(delta)
    const frame = runtime.getFrameSnapshot()
    if (lastRunId.current !== frame.runId) {
      lastRunId.current = frame.runId
      cottagePortalRuntime.reset()
    }
    if (
      frame.automaticCamera &&
      frame.timeSeconds >= ROMANTIC_STORY_TIMELINE.bloomWalkEnd - 9.5
    ) {
      cottagePortalRuntime.requestOpen()
    }
    if (!frame.automaticCamera) return

    const pose = sampleRomanticCameraPose(frame.timeSeconds)
    camera.position.set(...pose.position)
    target.current.set(...pose.target)
    camera.lookAt(target.current)
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov
      camera.updateProjectionMatrix()
    }
  }, -10)

  return null
}
