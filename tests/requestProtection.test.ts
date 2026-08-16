import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MemoryRateLimiter,
  validateWriteOrigin,
} from '@/server/requestProtectionCore'

test('写请求只接受协议与域名都一致的来源', () => {
  const expected = 'https://love.atimefriend.cn'
  assert.equal(validateWriteOrigin(expected, expected, true), 'valid')
  assert.equal(validateWriteOrigin('http://love.atimefriend.cn', expected, true), 'invalid')
  assert.equal(validateWriteOrigin('https://evil.example', expected, true), 'invalid')
  assert.equal(validateWriteOrigin('not-a-url', expected, true), 'invalid')
})

test('生产环境拒绝缺失来源，开发环境允许无来源测试请求', () => {
  assert.equal(validateWriteOrigin(null, 'https://love.atimefriend.cn', true), 'missing')
  assert.equal(validateWriteOrigin(null, 'http://localhost:3000', false), 'valid')
})

test('速率限制按窗口计数并在新窗口自然恢复', () => {
  const limiter = new MemoryRateLimiter()
  assert.equal(limiter.consume('create:127.0.0.1', 2, 10_000, 1_000), null)
  assert.equal(limiter.consume('create:127.0.0.1', 2, 10_000, 2_000), null)
  assert.equal(limiter.consume('create:127.0.0.1', 2, 10_000, 3_000), 8)
  assert.equal(limiter.consume('create:127.0.0.1', 2, 10_000, 11_000), null)
})
