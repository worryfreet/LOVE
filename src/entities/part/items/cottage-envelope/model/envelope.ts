export interface EnvelopeDimensions {
  readonly width: number
  readonly depth: number
  readonly paperThickness: number
}

export interface EnvelopeOpenState {
  readonly progress: number
  readonly phase: EnvelopeOpenPhase
  readonly sealBreak: number
  readonly flapAngle: number
  readonly letterTravel: number
  readonly letterLift: number
  readonly letterTilt: number
  readonly topFoldAngle: number
  readonly bottomFoldAngle: number
  readonly letterReveal: number
  readonly readerReady: boolean
}

export type EnvelopeOpenPhase =
  | 'sealed'
  | 'opening-flap'
  | 'extracting-letter'
  | 'unfolding-letter'
  | 'ready-to-read'

export const DEFAULT_ENVELOPE_DIMENSIONS = {
  width: 0.22,
  depth: 0.16,
  paperThickness: 0.00035,
} as const satisfies EnvelopeDimensions

export const ENVELOPE_MATERIAL_SLOTS = [
  'paper',
  'paperInner',
  'paperEdge',
  'letter',
  'ink',
  'wax',
  'waxDetail',
  'adhesive',
] as const

export const ENVELOPE_LOCAL_FRAME = {
  origin: '信封中心正下方的承载面',
  forward: '+Z（远离翻盖铰链的方向）',
  up: '+Y',
} as const

export const ENVELOPE_PIVOTS = {
  flap: 'pivot.flap',
  letterRail: 'pivot.letter-rail',
  letterFoldTop: 'pivot.letter-fold-top',
  letterFoldBottom: 'pivot.letter-fold-bottom',
} as const

function positive(value: number | undefined, fallback: number, label: string) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${label}必须是有限正数`)
  }
  return resolved
}

export function resolveEnvelopeDimensions(
  dimensions: Partial<EnvelopeDimensions> = {},
): EnvelopeDimensions {
  const width = positive(
    dimensions.width,
    DEFAULT_ENVELOPE_DIMENSIONS.width,
    '信封宽度',
  )
  const depth = positive(
    dimensions.depth,
    DEFAULT_ENVELOPE_DIMENSIONS.depth,
    '信封深度',
  )
  const paperThickness = positive(
    dimensions.paperThickness,
    DEFAULT_ENVELOPE_DIMENSIONS.paperThickness,
    '纸张厚度',
  )
  if (width < 0.12 || width > 0.42) {
    throw new RangeError('信封宽度必须在 0.12m 到 0.42m 之间')
  }
  if (depth < 0.08 || depth > 0.3) {
    throw new RangeError('信封深度必须在 0.08m 到 0.3m 之间')
  }
  if (paperThickness > Math.min(width, depth) * 0.05) {
    throw new RangeError('纸张厚度不能超过信封短边的 5%')
  }
  if (paperThickness < 0.0002 || paperThickness > 0.001) {
    throw new RangeError('纸张厚度必须在 0.2mm 到 1.0mm 之间')
  }
  return { width, depth, paperThickness }
}

function smoothRange(progress: number, start: number, end: number) {
  if (progress <= start) return 0
  if (progress >= end) return 1
  const local = (progress - start) / (end - start)
  return local * local * (3 - 2 * local)
}

function resolveEnvelopePhase(progress: number): EnvelopeOpenPhase {
  if (progress <= 0) return 'sealed'
  if (progress < 0.28) return 'opening-flap'
  if (progress < 0.6) return 'extracting-letter'
  if (progress < 0.995) return 'unfolding-letter'
  return 'ready-to-read'
}

export function resolveEnvelopeOpenState(openProgress: number): EnvelopeOpenState {
  if (!Number.isFinite(openProgress)) {
    throw new RangeError('信封开合进度必须是有限数值')
  }
  const progress = Math.min(1, Math.max(0, openProgress))
  const flapOpen = smoothRange(progress, 0.02, 0.28)
  const letterTravel = smoothRange(progress, 0.25, 0.6)
  const letterLift = smoothRange(progress, 0.32, 0.66)
  const topUnfold = smoothRange(progress, 0.54, 0.8)
  const bottomUnfold = smoothRange(progress, 0.72, 0.94)
  const handoff = smoothRange(progress, 0.9, 1)
  return {
    progress,
    phase: resolveEnvelopePhase(progress),
    sealBreak: smoothRange(progress, 0.01, 0.14),
    flapAngle: flapOpen === 0 ? 0 : -flapOpen * Math.PI * 0.86,
    letterTravel,
    letterLift,
    letterTilt: -handoff * Math.PI * 0.055,
    topFoldAngle: (1 - topUnfold) * Math.PI * 0.997,
    bottomFoldAngle:
      bottomUnfold === 1 ? 0 : -(1 - bottomUnfold) * Math.PI * 0.997,
    letterReveal: letterTravel,
    readerReady: progress >= 0.995,
  }
}
