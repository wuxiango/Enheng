import { describe, expect, it } from 'vitest'
import { createLoginGuard } from '../src/lib/loginGuard'
import { passwordsMatch } from '../src/lib/password'

describe('passwordsMatch', () => {
  it('只接受完全相同的密码', () => {
    expect(passwordsMatch('BtcEnheng456%', 'BtcEnheng456%')).toBe(true)
    expect(passwordsMatch('BtcEnheng456', 'BtcEnheng456%')).toBe(false)
    expect(passwordsMatch('btcenheng456%', 'BtcEnheng456%')).toBe(false)
  })
})

describe('createLoginGuard', () => {
  it('连续失败 5 次后锁定，成功登录会清掉记录', () => {
    const guard = createLoginGuard(5, 1000)
    const now = 1_000_000
    for (let i = 0; i < 4; i += 1) guard.fail('127.0.0.1', now)
    expect(guard.blocked('127.0.0.1', now)).toBe(false)
    guard.fail('127.0.0.1', now)
    expect(guard.blocked('127.0.0.1', now)).toBe(true)
    expect(guard.blocked('127.0.0.1', now + 1000)).toBe(false)
    guard.fail('10.0.0.8', now)
    guard.succeed('10.0.0.8')
    expect(guard.blocked('10.0.0.8', now)).toBe(false)
  })
})
