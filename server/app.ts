import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { mountAlbums } from './albumRoutes'
import { normalizeFxTweet } from '../src/lib/normalize'
import { passwordsMatch } from '../src/lib/password'
import { createLoginGuard } from '../src/lib/loginGuard'
import { signSession, verifySession } from '../src/lib/session'
import { createStore } from '../src/lib/store'
import type { StoredTweet } from '../src/lib/types'
import { isCuratedAuthor, parseTweetBatch, parseTweetUrl } from '../src/lib/url'

export const root = process.env.VERCEL ? process.cwd() : join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const file = join(root, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const password = process.env.ADMIN_PASSWORD || ''
const sessionSecret = process.env.SESSION_SECRET || ''
if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET 至少需要 32 位随机字符')
}
const store = createStore(join(root, 'data', 'tweets.json'))
const cookieName = 'enheng_admin'
const loginGuard = createLoginGuard()

function clientKey(req: { socket: { remoteAddress?: string }; headers: { [key: string]: string | string[] | undefined } }): string {
  if (process.env.VERCEL) {
    const forwarded = req.headers['x-forwarded-for']
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const address = first?.split(',')[0]?.trim()
    if (address) return address
  }
  return req.socket.remoteAddress || 'unknown'
}

function writeSessionCookie(res: { setHeader: (name: string, value: string) => void }, token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  )
}

function readCookie(header: string | undefined, name: string): string {
  if (!header) return ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return ''
}

function isAdmin(header: string | undefined): boolean {
  return verifySession(readCookie(header, cookieName), sessionSecret)
}

async function fetchTweet(id: string) {
  const response = await fetch(`https://api.fxtwitter.com/EnHeng456/status/${id}`, {
    headers: { 'user-agent': 'enheng-select' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('原帖暂时抓不到，请稍后再试')
  return normalizeFxTweet((await response.json()) as { tweet?: unknown })
}

export const app = express()
app.use((req, res, next) => {
  const large = req.method === 'POST' && /\/photos$/.test(req.path)
  return express.json({ limit: large ? '16mb' : '32kb' })(req, res, next)
})

app.get('/api/tweets', (_req, res) => {
  res.json({ tweets: store.list() })
})

app.get('/api/admin/session', (req, res) => {
  res.json({ ok: isAdmin(req.headers.cookie) })
})

app.post('/api/admin/login', (req, res) => {
  const key = clientKey(req)
  if (loginGuard.blocked(key)) {
    res.status(429).json({ error: '尝试次数太多，请稍后再试' })
    return
  }
  if (!password) {
    res.status(500).json({ error: '还没有设置管理员密码' })
    return
  }
  const given = String(req.body?.password ?? '')
  if (!passwordsMatch(given, password)) {
    loginGuard.fail(key)
    res.status(401).json({ error: '密码不对' })
    return
  }
  loginGuard.succeed(key)
  writeSessionCookie(res, signSession(sessionSecret), 60 * 60 * 12)
  res.json({ ok: true })
})

app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`)
  res.json({ ok: true })
})

app.post('/api/admin/tweets/batch', async (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const batch = parseTweetBatch(String(req.body?.text || ''))
  if (batch.items.length === 0 && batch.rejected.length === 0 && batch.duplicates === 0) {
    res.status(400).json({ error: '请贴帖子链接，一行一条' })
    return
  }
  const added: StoredTweet[] = []
  const failed = [...batch.rejected]
  let duplicates = batch.duplicates
  for (const item of batch.items) {
    if (!isCuratedAuthor(item.handle)) {
      failed.push({ raw: item.raw, error: '只能收录 @EnHeng456 的帖子' })
      continue
    }
    try {
      const tweet = await fetchTweet(item.id)
      if (req.body?.featured === true) tweet.featured = true
      store.add(tweet)
      added.push(tweet)
    } catch (error) {
      const message = error instanceof Error ? error.message : '收录失败'
      if (message.includes('已经收录')) {
        duplicates += 1
        continue
      }
      failed.push({ raw: item.raw, error: message })
    }
  }
  res.json({ added, failed, overflow: batch.overflow, duplicates })
})

app.post('/api/admin/tweets', async (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const parsed = parseTweetUrl(String(req.body?.url || ''))
  if (!parsed) {
    res.status(400).json({ error: '请贴一条 x.com 或 twitter.com 的帖子链接' })
    return
  }
  if (!isCuratedAuthor(parsed.handle)) {
    res.status(400).json({ error: '只能收录 @EnHeng456 的帖子' })
    return
  }
  try {
    const tweet = await fetchTweet(parsed.id)
    if (req.body?.featured === true) tweet.featured = true
    store.add(tweet)
    res.status(201).json({ tweet })
  } catch (error) {
    const message = error instanceof Error ? error.message : '收录失败'
    const status = message.includes('已经收录') ? 409 : 502
    res.status(status).json({ error: message })
  }
})

app.post('/api/admin/tweets/:id/featured', (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const featured = req.body?.featured === true
  const updated = store.setFeatured(req.params.id, featured)
  if (!updated) {
    res.status(404).json({ error: '没有这条帖子' })
    return
  }
  res.json({ ok: true, featured })
})

app.post('/api/admin/tweets/:id/category', (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const updated = store.setCategory(req.params.id, String(req.body?.category || ''))
  if (!updated) {
    res.status(404).json({ error: '没有这条帖子' })
    return
  }
  res.json({ ok: true })
})

app.post('/api/admin/tweets/:id/pick', (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const direction = req.body?.direction === 'down' ? 'down' : 'up'
  const updated = store.moveFeatured(req.params.id, direction)
  if (!updated) {
    res.status(404).json({ error: '这条不能移动' })
    return
  }
  res.json({ ok: true })
})

let publishing = false

app.post('/api/admin/publish', (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  if (publishing) {
    res.status(409).json({ error: '正在同步，请稍等' })
    return
  }
  publishing = true
  const child = spawn('npm run build:pages && node scripts/publish-github.mjs', {
    cwd: root,
    shell: true,
    env: { ...process.env, PUBLISH_MESSAGE: 'Publish the current local site.' },
    windowsHide: true,
  })
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += String(chunk)
  })
  child.stderr.on('data', (chunk) => {
    output += String(chunk)
  })
  child.on('error', () => {
    publishing = false
    if (!res.headersSent) res.status(500).json({ error: '同步没有开始' })
  })
  child.on('close', (code) => {
    publishing = false
    if (res.headersSent) return
    if (code === 0) {
      res.json({ ok: true, url: 'https://wuxiango.github.io/Enheng/' })
      return
    }
    res.status(500).json({ error: '同步没有完成' })
    console.error(output.slice(-800))
  })
})

app.delete('/api/admin/tweets/:id', (req, res) => {
  if (!isAdmin(req.headers.cookie)) {
    res.status(401).json({ error: '需要管理员登录' })
    return
  }
  const removed = store.remove(req.params.id)
  if (!removed) {
    res.status(404).json({ error: '没有这条帖子' })
    return
  }
  res.json({ ok: true })
})

mountAlbums(app, { root, isAdmin })

app.get('/api/img', async (req, res) => {
  let target: URL
  try {
    target = new URL(String(req.query.url || ''))
  } catch {
    res.status(400).end()
    return
  }
  if (target.protocol !== 'https:' || target.hostname !== 'pbs.twimg.com') {
    res.status(400).end()
    return
  }
  try {
    const proxied = new URL('https://wsrv.nl/')
    proxied.searchParams.set('url', target.toString())
    proxied.searchParams.set('n', '-1')
    const response = await fetch(proxied, {
      headers: { 'user-agent': 'enheng-select' },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) {
      res.status(502).end()
      return
    }
    const type = response.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(await response.arrayBuffer()))
  } catch {
    res.status(502).end()
  }
})
