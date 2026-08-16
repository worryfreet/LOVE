import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getServerEnvironment } from './environment'

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function createPublicSlug(length = 8) {
  const bytes = randomBytes(length)
  return Array.from(bytes, (value) => BASE62[value % BASE62.length]).join('')
}

export function createRecoveryCode() {
  return randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/gu)?.join('-') ?? ''
}

export function hashSecret(secret: string) {
  return createHmac('sha256', getServerEnvironment().sessionSecret)
    .update(secret)
    .digest('hex')
}

export function hashContent(content: Uint8Array) {
  return createHash('sha256').update(content).digest('hex')
}

export function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
