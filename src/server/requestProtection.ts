import 'server-only'
import { getSiteUrl } from './environment'
import { MemoryRateLimiter, validateWriteOrigin } from './requestProtectionCore'

const rateLimiter = new MemoryRateLimiter()

function rejection(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ message }, { status, headers })
}

function clientAddress(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export function protectWriteRequest(
  request: Request,
  scope: string,
  limit = 60,
  windowMilliseconds = 60_000,
) {
  const origin = request.headers.get('origin')
  const originValidation = validateWriteOrigin(
    origin,
    getSiteUrl(),
    process.env.NODE_ENV === 'production',
  )
  if (originValidation === 'missing') {
    return rejection('缺少请求来源', 403)
  }
  if (originValidation === 'invalid') return rejection('请求来源无效', 403)

  const now = Date.now()
  const key = `${scope}:${clientAddress(request)}`
  const retryAfter = rateLimiter.consume(key, limit, windowMilliseconds, now)
  if (retryAfter) {
    return rejection('操作过于频繁，请稍后重试', 429, {
      'Retry-After': String(retryAfter),
    })
  }
  return null
}
