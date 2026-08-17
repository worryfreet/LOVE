export interface CottageGardenRomanticFrame {
  readonly timeSeconds: number
  readonly runId: number
  readonly roseStoryActive: boolean
  readonly storyEnvironmentActive: boolean
  readonly skyTimeSeconds: number
}

/**
 * 场景只读取这一帧级信号，不反向依赖分享页状态机。
 * 这样花开、天色和流星始终共享同一剧情时钟。
 */
export interface CottageGardenRomanticSignal {
  getFrameSnapshot(): CottageGardenRomanticFrame
}

export function resolveCottageGardenRomanticTimePhase(timeSeconds: number) {
  const safeTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0
  const nightProgress = Math.min(1, Math.max(0, (safeTime - 54) / 12))
  const eased = nightProgress * nightProgress * (3 - 2 * nightProgress)
  return 0.5 + eased * 0.25
}
