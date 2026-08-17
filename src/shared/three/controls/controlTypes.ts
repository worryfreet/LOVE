export interface FirstPersonActionContext {
  position: readonly [number, number, number]
  direction: readonly [number, number, number]
}

export interface FirstPersonConfig {
  spawn: [number, number, number]
  initialTarget?: readonly [number, number, number]
  eyeHeight?: number
  bounds: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
  }
  isPositionAllowed?: (point: { x: number; z: number }) => boolean
  groundHeightAt?: (point: { x: number; z: number }) => number
  action?: {
    keyboardCodes?: readonly string[]
    onAction: (context: FirstPersonActionContext) => void
  }
}
