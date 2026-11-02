// 把 data/tweets.json、data/albums.json 和 data/album-images/ 灌进 Cloudflare 的 D1 / R2。
//
//   node scripts/cf-seed.mjs local            灌进本地模拟的 D1 和 R2（wrangler pages dev 用的那份）
//   node scripts/cf-seed.mjs sql [文件]        只生成 SQL（默认 .wrangler/seed.sql），给远程测试库用：
//                                             wrangler d1 execute enheng-preview --remote --file .wrangler/seed.sql
//   node scripts/cf-seed.mjs r2-remote <桶名>  把照片逐个上传到远程 R2 桶（需要已登录 / CLOUDFLARE_API_TOKEN）
//
// 先跑迁移：wrangler d1 migrations apply DB --local（或 --remote）。
// 默认不覆盖已有的帖子和照片（INSERT OR IGNORE），可以重复跑。
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tweets = JSON.parse(readFileSync(join(root, 'data', 'tweets.json'), 'utf8')).tweets ?? []
const albums = JSON.parse(readFileSync(join(root, 'data', 'albums.json'), 'utf8')).albums ?? []
const imageDir = join(root, 'data', 'album-images')
const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

function rows() {
  const out = []
  for (const tweet of tweets) {
    out.push(['INSERT OR IGNORE INTO tweets (id, created_at, data) VALUES (?, ?, ?)', [tweet.id, tweet.createdAt, JSON.stringify(tweet)]])
  }
  albums.forEach((album, position) => {
    out.push(['INSERT OR IGNORE INTO albums (id, name, created_at, position) VALUES (?, ?, ?, ?)', [album.id, album.name, album.createdAt, position]])
    for (const photo of album.photos ?? []) {
      out.push([
        'INSERT OR IGNORE INTO photos (id, album_id, file, caption, created_at) VALUES (?, ?, ?, ?, ?)',
        [photo.id, album.id, photo.file, photo.caption ?? '', photo.createdAt],
      ])
    }
  })
  return out
}

function photoFiles() {
  return albums.flatMap((album) => (album.photos ?? []).map((photo) => photo.file))
}

function literal(value) {
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

const mode = process.argv[2]

if (mode === 'sql') {
  const file = process.argv[3] || join(root, '.wrangler', 'seed.sql')
  const sql = rows().map(([statement, values]) => fill(statement, values))
  function fill(statement, values) {
    let i = 0
    return `${statement.replace(/\?/g, () => literal(values[i++]))};`
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${sql.join('\n')}\n`)
  console.log(`写好了 ${sql.length} 条 SQL → ${file}`)
} else if (mode === 'local') {
  const { getPlatformProxy } = await import('wrangler')
  const proxy = await getPlatformProxy({ persist: true })
  const { DB, ALBUMS } = proxy.env
  await DB.batch(rows().map(([statement, values]) => DB.prepare(statement).bind(...values)))
  let uploaded = 0
  for (const file of photoFiles()) {
    const path = join(imageDir, file)
    if (!existsSync(path)) {
      console.warn(`缺少照片文件 ${file}`)
      continue
    }
    if (await ALBUMS.head(file)) continue
    const ext = file.slice(file.lastIndexOf('.') + 1)
    await ALBUMS.put(file, readFileSync(path), { httpMetadata: { contentType: TYPES[ext] } })
    uploaded += 1
  }
  const count = await DB.prepare('SELECT (SELECT COUNT(*) FROM tweets) AS tweets, (SELECT COUNT(*) FROM albums) AS albums, (SELECT COUNT(*) FROM photos) AS photos').first()
  console.log(`本地 D1：${count.tweets} 条帖子、${count.albums} 个相册、${count.photos} 张照片；本次上传 ${uploaded} 张到本地 R2`)
  await proxy.dispose()
} else if (mode === 'r2-remote') {
  const bucket = process.argv[3]
  if (!bucket) throw new Error('请给出桶名，例如 enheng-albums-preview')
  for (const file of photoFiles()) {
    const ext = file.slice(file.lastIndexOf('.') + 1)
    const result = spawnSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${bucket}/${file}`, '--remote', '--file', join(imageDir, file), '--content-type', TYPES[ext]],
      { stdio: 'inherit', cwd: root },
    )
    if (result.status !== 0) throw new Error(`上传失败 ${file}`)
  }
} else {
  console.log('用法：node scripts/cf-seed.mjs local | sql [文件] | r2-remote <桶名>')
  process.exit(1)
}
