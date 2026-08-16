export type OriginValidation = 'valid' | 'missing' | 'invalid'

interface RateBucket {
  count: number
  resetsAt: number
}

export function validateWriteOrigin(
  origin: string | null,
  expectedSiteUrl: string,
  requireOrigin: boolean,
): OriginValidation {
  if (!origin) return requireOrigin ? 'missing' : 'valid'
  try {
    const received = new URL(origin)
    const expected = new URL(expectedSiteUrl)
    return received.host === expected.host && received.protocol === expected.protocol
      ? 'valid'
      : 'invalid'
  } catch {
    return 'invalid'
  }
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, RateBucket>()

  consume(
    key: string,
    limit: number,
    windowMilliseconds: number,
    now = Date.now(),
  ) {
    const previous = this.buckets.get(key)
    const bucket = !previous || previous.resetsAt <= now
      ? { count: 0, resetsAt: now + windowMilliseconds }
      : previous
    bucket.count += 1
    this.buckets.set(key, bucket)

    if (this.buckets.size > 2_000) {
      for (const [bucketKey, value] of this.buckets) {
        if (value.resetsAt <= now) this.buckets.delete(bucketKey)
      }
    }

    return bucket.count > limit
      ? Math.max(1, Math.ceil((bucket.resetsAt - now) / 1_000))
      : null
  }
}
