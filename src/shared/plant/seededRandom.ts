const UINT32_RANGE = 4_294_967_296

export function normalizeSeed(seed: number) {
  const finite = Number.isFinite(seed) ? Math.trunc(seed) : 1
  return (finite >>> 0) || 1
}

export function deriveSeed(seed: number, salt: number | string) {
  let value = normalizeSeed(seed) ^ 0x9e3779b9
  const text = String(salt)
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x85ebca6b)
    value ^= value >>> 13
  }
  return normalizeSeed(value)
}

export function createSeededRandom(seed: number) {
  let state = normalizeSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE
  }
}

export function seededRange(random: () => number, minimum: number, maximum: number) {
  return minimum + (maximum - minimum) * random()
}

