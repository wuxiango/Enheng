import { createHmac, timingSafeEqual } from 'node:crypto'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function signSession(secret: string, now = Date.now()): string {
  const payload = String(now + WEEK_MS)
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifySession(token: string, secret: string, now = Date.now()): boolean {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expiresAt = Number(payload)
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}
