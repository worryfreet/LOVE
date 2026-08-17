import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { FirstPersonConfig } from './controlTypes'
import {
  isFirstPersonMovementKey,
  resolveConstrainedFirstPersonPosition,
  resolveFirstPersonEyeY,
  resolveFirstPersonMovementVector,
  resolveTouchControlMode,
  resolveTouchMovement,
} from './firstPersonInput'

interface FirstPersonControllerProps {
  config: FirstPersonConfig
  enabled?: boolean
  preserveViewOnEnable?: boolean
  initialView?: {
    position: readonly [number, number, number]
    target: readonly [number, number, number]
  }
}

interface ActivePointer {
  mode: 'move' | 'look'
  start: { x: number; y: number }
  last: { x: number; y: number }
}

export function FirstPersonController({
  config,
  enabled = true,
  preserveViewOnEnable = false,
  initialView,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree()
  const pressed = useRef(new Set<string>())
  const activePointers = useRef(new Map<number, ActivePointer>())
  const touchMovement = useRef({ forward: 0, strafe: 0 })
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const direction = useRef(new Vector3())
  const actionDirection = useRef(new Vector3())

  useEffect(() => {
    const activeKeys = pressed.current
    const pointerStates = activePointers.current
    if (!enabled) {
      activeKeys.clear()
      pointerStates.clear()
      touchMovement.current = { forward: 0, strafe: 0 }
      return
    }
    const initialPosition: readonly [number, number, number] =
      initialView?.position ?? [
        config.spawn[0],
        resolveFirstPersonEyeY(
          { x: config.spawn[0], z: config.spawn[2] },
          config.spawn[1],
          config.eyeHeight,
          config.groundHeightAt,
        ),
        config.spawn[2],
      ]
    const initialTarget: readonly [number, number, number] =
      initialView?.target ??
      config.initialTarget ?? [
          config.spawn[0],
          config.spawn[1] - 0.04,
          config.spawn[2] - 1,
        ]
    if (preserveViewOnEnable) {
      camera.getWorldDirection(direction.current)
    } else {
      camera.position.set(...initialPosition)
      camera.lookAt(...initialTarget)
      direction.current
        .set(
          initialTarget[0] - initialPosition[0],
          initialTarget[1] - initialPosition[1],
          initialTarget[2] - initialPosition[2],
        )
        .normalize()
    }
    yaw.current = Math.atan2(-direction.current.x, -direction.current.z)
    pitch.current = Math.asin(
      MathUtils.clamp(direction.current.y, -1, 1),
    )
    camera.updateProjectionMatrix()
    const previousTabIndex = gl.domElement.getAttribute('tabindex')
    const previousAriaLabel = gl.domElement.getAttribute('aria-label')
    const canvas = gl.domElement
    gl.domElement.style.cursor = 'crosshair'
    gl.domElement.tabIndex = 0
    gl.domElement.setAttribute(
      'aria-label',
      '第一人称漫游画布，桌面单击锁定视角后使用 WASD 或方向键移动，靠近可交互物体时按 E 操作，按 Esc 退出；触屏可在画布左侧拖动移动',
    )

    const hasKeyboardControl = () =>
      document.pointerLockElement === canvas || document.activeElement === canvas
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        hasKeyboardControl() &&
        !event.repeat &&
        config.action?.keyboardCodes?.includes(event.code)
      ) {
        event.preventDefault()
        camera.getWorldDirection(actionDirection.current)
        config.action.onAction({
          position: [camera.position.x, camera.position.y, camera.position.z],
          direction: [
            actionDirection.current.x,
            actionDirection.current.y,
            actionDirection.current.z,
          ],
        })
        return
      }
      if (hasKeyboardControl() && isFirstPersonMovementKey(event.code)) {
        event.preventDefault()
        activeKeys.add(event.code)
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      activeKeys.delete(event.code)
    }
    const handlePointerDown = (event: PointerEvent) => {
      gl.domElement.focus({ preventScroll: true })
      const position = { x: event.clientX, y: event.clientY }
      if (event.pointerType !== 'touch' && 'requestPointerLock' in canvas) {
        pointerStates.set(event.pointerId, {
          mode: 'look',
          start: position,
          last: position,
        })
        gl.domElement.style.cursor = 'grabbing'
        gl.domElement.setPointerCapture(event.pointerId)
        try {
          const request = canvas.requestPointerLock()
          if (request && typeof request.catch === 'function') {
            void request.catch(() => undefined)
          }
        } catch {
          // 浏览器拒绝 Pointer Lock 时，已登记的指针状态继续提供拖动回退。
        }
        return
      }
      let mode: ActivePointer['mode'] = 'look'
      if (event.pointerType === 'touch') {
        const bounds = gl.domElement.getBoundingClientRect()
        mode = resolveTouchControlMode(
          event.clientX,
          bounds.left,
          bounds.width,
        )
      }
      pointerStates.set(event.pointerId, {
        mode,
        start: position,
        last: position,
      })
      gl.domElement.style.cursor = 'grabbing'
      gl.domElement.setPointerCapture(event.pointerId)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType !== 'touch' &&
        document.pointerLockElement === canvas
      ) {
        return
      }
      const pointer = pointerStates.get(event.pointerId)
      if (!pointer) return
      const current = { x: event.clientX, y: event.clientY }

      if (event.pointerType === 'touch' && pointer.mode === 'move') {
        pointer.last = current
        touchMovement.current = resolveTouchMovement(
          pointer.start,
          current,
        )
        return
      }
      const deltaX = current.x - pointer.last.x
      const deltaY = current.y - pointer.last.y
      yaw.current -= deltaX * 0.003
      pitch.current = MathUtils.clamp(pitch.current - deltaY * 0.0025, -1.3, 1.3)
      pointer.last = current
    }
    const handleLockedMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current -= event.movementX * 0.0022
      pitch.current = MathUtils.clamp(
        pitch.current - event.movementY * 0.0019,
        -1.3,
        1.3,
      )
    }
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvas
      canvas.dataset.firstPersonLocked = locked ? 'true' : 'false'
      canvas.style.cursor = locked ? 'none' : 'crosshair'
      if (locked) {
        pointerStates.clear()
      } else {
        activeKeys.clear()
      }
    }
    const handlePointerUp = (event: PointerEvent) => {
      const pointer = pointerStates.get(event.pointerId)
      pointerStates.delete(event.pointerId)
      if (pointer?.mode === 'move') {
        const remainingMove = Array.from(pointerStates.values()).find(
          (candidate) => candidate.mode === 'move',
        )
        touchMovement.current = remainingMove
          ? resolveTouchMovement(remainingMove.start, remainingMove.last)
          : { forward: 0, strafe: 0 }
      }
      gl.domElement.style.cursor =
        pointerStates.size > 0 ? 'grabbing' : 'crosshair'
    }
    const handleBlur = () => {
      activeKeys.clear()
      pointerStates.clear()
      touchMovement.current = { forward: 0, strafe: 0 }
      gl.domElement.style.cursor = 'crosshair'
    }

    const controlRuntime = {
      setViewDirection(target: readonly [number, number, number]) {
        direction.current
          .set(
            target[0] - camera.position.x,
            target[1] - camera.position.y,
            target[2] - camera.position.z,
          )
          .normalize()
        yaw.current = Math.atan2(-direction.current.x, -direction.current.z)
        pitch.current = Math.asin(
          MathUtils.clamp(direction.current.y, -1, 1),
        )
      },
    }
    camera.userData.firstPersonControl = controlRuntime

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    gl.domElement.addEventListener('blur', handleBlur)
    gl.domElement.addEventListener('pointerdown', handlePointerDown)
    gl.domElement.addEventListener('pointermove', handlePointerMove)
    gl.domElement.addEventListener('pointerup', handlePointerUp)
    gl.domElement.addEventListener('pointercancel', handlePointerUp)
    document.addEventListener('mousemove', handleLockedMouseMove)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    handlePointerLockChange()

    return () => {
      activeKeys.clear()
      pointerStates.clear()
      gl.domElement.style.cursor = ''
      delete gl.domElement.dataset.firstPersonLocked
      if (camera.userData.firstPersonControl === controlRuntime) {
        delete camera.userData.firstPersonControl
      }
      if (previousTabIndex === null) {
        gl.domElement.removeAttribute('tabindex')
      } else {
        gl.domElement.setAttribute('tabindex', previousTabIndex)
      }
      if (previousAriaLabel === null) {
        gl.domElement.removeAttribute('aria-label')
      } else {
        gl.domElement.setAttribute('aria-label', previousAriaLabel)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      gl.domElement.removeEventListener('blur', handleBlur)
      gl.domElement.removeEventListener('pointerdown', handlePointerDown)
      gl.domElement.removeEventListener('pointermove', handlePointerMove)
      gl.domElement.removeEventListener('pointerup', handlePointerUp)
      gl.domElement.removeEventListener('pointercancel', handlePointerUp)
      document.removeEventListener('mousemove', handleLockedMouseMove)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [camera, config, enabled, gl, initialView, preserveViewOnEnable])

  useFrame((_, delta) => {
    if (!enabled) return
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')

    const forward =
      Number(pressed.current.has('KeyW') || pressed.current.has('ArrowUp')) -
      Number(pressed.current.has('KeyS') || pressed.current.has('ArrowDown')) +
      touchMovement.current.forward
    const strafe =
      Number(pressed.current.has('KeyD') || pressed.current.has('ArrowRight')) -
      Number(pressed.current.has('KeyA') || pressed.current.has('ArrowLeft')) +
      touchMovement.current.strafe

    if (forward === 0 && strafe === 0) return

    const movement = resolveFirstPersonMovementVector(
      yaw.current,
      forward,
      strafe,
    )
    const sprinting =
      pressed.current.has('ShiftLeft') || pressed.current.has('ShiftRight')
    direction.current
      .set(movement.x, 0, movement.z)
      .normalize()
      .multiplyScalar(Math.min(delta, 0.05) * (sprinting ? 5.2 : 3.2))

    const nextPosition = resolveConstrainedFirstPersonPosition(
      { x: camera.position.x, z: camera.position.z },
      { x: direction.current.x, z: direction.current.z },
      config.bounds,
      config.isPositionAllowed,
    )
    camera.position.x = nextPosition.x
    camera.position.z = nextPosition.z
    camera.position.y = resolveFirstPersonEyeY(
      nextPosition,
      config.spawn[1],
      config.eyeHeight,
      config.groundHeightAt,
    )
  })

  return null
}
