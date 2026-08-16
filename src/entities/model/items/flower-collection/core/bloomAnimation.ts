function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export const BLOOM_DURATION_MIN = 1
export const BLOOM_DURATION_MAX = 10

function smootherstep(value: number) {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** 运行时仍对外部输入做最后一道限幅，避免旧链接或非法配置破坏时间轴。 */
export function resolveBloomDuration(candidate: unknown, fallback: number) {
  const fallbackDuration = Number.isFinite(fallback)
    ? fallback
    : BLOOM_DURATION_MIN
  const numeric = typeof candidate === 'number' ? candidate : Number(candidate)
  const duration = Number.isFinite(numeric) ? numeric : fallbackDuration
  return Math.min(BLOOM_DURATION_MAX, Math.max(BLOOM_DURATION_MIN, duration))
}

/**
 * 为同一实例批次生成离散但确定的开放延迟，避免绣球等复合花序像扫描线一样
 * 从一侧机械展开。批次顺序只提供轻微层级差，主要差异来自稳定散列。
 */
export function resolveBloomOrganDelay(
  index: number,
  count: number,
  batchOrder: number,
) {
  const safeCount = Math.max(1, count)
  const progress = safeCount > 1 ? index / (safeCount - 1) : 0
  const signal = Math.sin(
    (index + 1) * 12.9898 + (batchOrder + 1) * 78.233,
  ) * 43758.5453
  const jitter = signal - Math.floor(signal)
  return Math.min(0.5, batchOrder * 0.035 + jitter * 0.16 + progress * 0.04)
}

/** 将整株开花进度转换为单器官带延迟的确定性进度。 */
export function resolveOrganBloomProgress(progress: number, delay: number) {
  const normalizedDelay = Math.max(0, Math.min(0.72, delay))
  const local = clamp01((progress - normalizedDelay) / (1 - normalizedDelay))
  return smootherstep(local)
}

/**
 * 花瓣根部保持在原 socket：花苞期沿局部 X 轴向上折叠，并以长轴快于宽轴的
 * 各向异性膨大逐步舒展。末端严格回到单位变换，replay、reset 与
 * reduced-motion 都可精确复位。
 */
export function resolveOrganBloomTransform(
  progress: number,
  delay: number,
  phase: number,
) {
  const eased = resolveOrganBloomProgress(progress, delay)
  const closed = 1 - eased
  return {
    scale: [
      0.58 + eased * 0.42,
      0.72 + eased * 0.28,
      0.86 + eased * 0.14,
    ] as const,
    fold: closed * (0.96 + Math.sin(phase * 0.73) * 0.08),
    twist: closed * closed * Math.sin(phase) * 0.12,
  }
}
