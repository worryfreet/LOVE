import type {
  CameraConfig,
  ReviewView,
} from './cameraTypes'

export type CanonicalReviewView = ReviewView

const CANONICAL_VIEWS = new Set<CanonicalReviewView>([
  'hero',
  'top',
  'bottom',
  'front',
  'rear',
  'left',
  'right',
  'detail',
])

export function parseCanonicalReviewView(
  value: string | null,
): CanonicalReviewView {
  return CANONICAL_VIEWS.has(value as CanonicalReviewView)
    ? (value as CanonicalReviewView)
    : 'hero'
}

export function resolveCanonicalReviewCamera(
  fallback: CameraConfig,
  view: CanonicalReviewView,
): CameraConfig {
  if (view === 'hero') return fallback

  const [x, y, z] = fallback.target
  if (view === 'detail') {
    const distanceScale = 0.62
    return {
      position: [
        x + (fallback.position[0] - x) * distanceScale,
        y + (fallback.position[1] - y) * distanceScale,
        z + (fallback.position[2] - z) * distanceScale,
      ],
      target: [...fallback.target],
      fov: Math.min(fallback.fov ?? 40, 30),
    }
  }
  const positions: Record<
    Exclude<CanonicalReviewView, 'hero' | 'detail'>,
    [number, number, number]
  > = {
    top: [x, y + 10, z + 0.001],
    bottom: [x, y - 10, z - 0.001],
    front: [x, y + 0.15, z + 7.2],
    rear: [x, y + 0.15, z - 7.2],
    left: [x - 7.2, y + 0.15, z],
    right: [x + 7.2, y + 0.15, z],
  }

  return {
    position: positions[view],
    target: [...fallback.target],
    fov: view === 'top' || view === 'bottom' ? 30 : 28,
  }
}
