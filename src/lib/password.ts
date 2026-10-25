import { createHash, timingSafeEqual } from 'node:crypto'

export function passwordsMatch(given: string, expected: string): boolean {
  if (given.length > 200) return false
  const actual = createHash('sha256').update(given).digest()
  const wanted = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actual, wanted)
}
