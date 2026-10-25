import { describe, expect, it } from 'vitest'
import { signSession, verifySession } from '../src/lib/session'

describe('session', () => {
  it('签发的会话在有效期内可以通过', () => {
    const now = Date.parse('2026-10-24T00:00:00.000Z')
    const token = signSession('secret', now)
    expect(verifySession(token, 'secret', now + 1000)).toBe(true)
  })

  it('过期或密钥不对时拒绝', () => {
    const now = Date.parse('2026-10-24T00:00:00.000Z')
    const token = signSession('secret', now)
    expect(verifySession(token, 'secret', now + 8 * 24 * 60 * 60 * 1000)).toBe(false)
    expect(verifySession(token, 'other', now + 1000)).toBe(false)
    expect(verifySession('nope', 'secret', now)).toBe(false)
  })
})
