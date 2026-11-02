-- 嗯哼精选 · Cloudflare D1 初始结构
-- 注意：线上 D1 (enheng) 的真实结构还没读到，这份是按接口返回推断的。
-- 拿到令牌后先跑：wrangler d1 execute enheng --remote --command "SELECT sql FROM sqlite_master"
-- 对照无误再用在正式库上；不一致时改代码去适配线上结构，不要改线上表。

-- 帖子：整条帖子按接口返回的 JSON 原样存在 data 里（字段顺序和 /api/tweets 一致），
-- created_at 单独一列用于排序。精选、精选顺序、分类都在 data 里改。
CREATE TABLE IF NOT EXISTS tweets (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tweets_created_at ON tweets (created_at DESC);

-- 相册：position 保持相册的先后顺序（和原来 albums.json 的顺序一致）。
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- 照片：图片本体放在 R2 (ALBUMS)，对象键就是 file（例如 <uuid>.jpg）。
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  file TEXT NOT NULL UNIQUE,
  caption TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_album ON photos (album_id);
