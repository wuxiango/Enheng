-- 后台登录失败次数，所有实例共用。只按客户端 IP 记录次数和窗口结束时间，不存密码。
-- 规则和原来内存计数一致：15 分钟窗口内失败 5 次即锁定，到窗口结束自动解除；登录成功清零。
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS login_attempts_reset_at ON login_attempts (reset_at);
