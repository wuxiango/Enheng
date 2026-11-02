// 登录失败计数放在 D1，多个实例共用一份。阈值和窗口与 src/lib/loginGuard.ts 相同。
export const LOGIN_LIMIT = 5
export const LOGIN_WINDOW_MS = 15 * 60 * 1000

export function createD1LoginGuard(db: D1Database, limit = LOGIN_LIMIT, windowMs = LOGIN_WINDOW_MS) {
  return {
    async blocked(key: string, now = Date.now()): Promise<boolean> {
      const row = await db
        .prepare('SELECT count FROM login_attempts WHERE key = ? AND reset_at > ?')
        .bind(key, now)
        .first<{ count: number }>()
      return Boolean(row && row.count >= limit)
    },
    async fail(key: string, now = Date.now()): Promise<void> {
      await db.batch([
        db.prepare('DELETE FROM login_attempts WHERE reset_at <= ? AND key <> ?').bind(now, key),
        db
          .prepare(
            `INSERT INTO login_attempts (key, count, reset_at) VALUES (?1, 1, ?2 + ?3)
             ON CONFLICT(key) DO UPDATE SET
               count = CASE WHEN reset_at <= ?2 THEN 1 ELSE count + 1 END,
               reset_at = CASE WHEN reset_at <= ?2 THEN ?2 + ?3 ELSE reset_at END`,
          )
          .bind(key, now, windowMs),
      ])
    },
    async succeed(key: string): Promise<void> {
      await db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()
    },
  }
}
