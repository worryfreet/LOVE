export interface CameraConfig {
  position: [number, number, number]
  target: [number, number, number]
  up?: [number, number, number]
  fov?: number
}

export type ReviewView =
  | 'hero'
  | 'top'
  | 'bottom'
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'detail'
