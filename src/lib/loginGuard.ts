type Failures = { count: number; resetAt: number }

export function createLoginGuard(limit = 5, windowMs = 15 * 60 * 1000) {
  const failures = new Map<string, Failures>()

  function current(key: string, now: number): Failures | undefined {
    const entry = failures.get(key)
    if (!entry) return undefined
    if (entry.resetAt <= now) {
      failures.delete(key)
      return undefined
    }
    return entry
  }

  return {
    blocked(key: string, now = Date.now()): boolean {
      const entry = current(key, now)
      return Boolean(entry && entry.count >= limit)
    },
    fail(key: string, now = Date.now()): void {
      const entry = current(key, now)
      if (!entry) {
        failures.set(key, { count: 1, resetAt: now + windowMs })
        return
      }
      entry.count += 1
    },
    succeed(key: string): void {
      failures.delete(key)
    },
  }
}
