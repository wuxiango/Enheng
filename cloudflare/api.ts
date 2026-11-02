import { createLoginGuard } from '../src/lib/loginGuard'
import { decodeImageDataUrl } from '../src/lib/imageData'
import { normalizeFxTweet } from '../src/lib/normalize'
import { passwordsMatch } from '../src/lib/password'
import { signSession, verifySession } from '../src/lib/session'
import type { StoredTweet } from '../src/lib/types'
import { isCuratedAuthor, parseTweetBatch, parseTweetUrl } from '../src/lib/url'
import { createAlbumStore, createTweetStore } from './db'
import type { Env } from './env'

// 和原来 Express 后台 (server/app.ts + server/albumRoutes.ts) 一一对应的 Cloudflare 版本。
// 帖子、相册存在 D1 (DB)，照片存在 R2 (ALBUMS)，密钥只从环境变量读。

const COOKIE = 'enheng_admin'
const SESSION_MAX_AGE = 60 * 60 * 12
const SMALL_BODY = 32 * 1024
const LARGE_BODY = 16 * 1024 * 1024
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

// 每个 isolate 各自计数，和原来单进程内存计数的效果相近
const loginGuard = createLoginGuard()

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function empty(status: number): Response {
  return new Response(null, { status })
}

function readCookie(header: string | null, name: string): string {
  if (!header) return ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='))
      } catch {
        return ''
      }
    }
  }
  return ''
}

async function readBody(request: Request, limit: number): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') || ''
  if (!type.toLowerCase().includes('json')) return {}
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > limit) throw new HttpError(413, '内容太大了')
  const text = await request.text()
  if (new TextEncoder().encode(text).length > limit) throw new HttpError(413, '内容太大了')
  if (!text.trim()) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, '请求格式不对')
  }
}

async function fetchTweet(id: string): Promise<StoredTweet> {
  const response = await fetch(`https://api.fxtwitter.com/EnHeng456/status/${id}`, {
    headers: { 'user-agent': 'enheng-select' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('原帖暂时抓不到，请稍后再试')
  return normalizeFxTweet((await response.json()) as { tweet?: never })
}

type Route = {
  method: string
  pattern: RegExp
  admin?: boolean
  large?: boolean
  run: (ctx: Ctx) => Promise<Response> | Response
}

type Ctx = {
  request: Request
  env: Env
  url: URL
  params: string[]
  body: Record<string, unknown>
  tweets: ReturnType<typeof createTweetStore>
  albums: ReturnType<typeof createAlbumStore>
}

const routes: Route[] = [
  { method: 'GET', pattern: /^\/api\/tweets$/, run: async ({ tweets }) => json({ tweets: await tweets.list() }) },

  {
    method: 'GET',
    pattern: /^\/api\/admin\/session$/,
    run: ({ request, env }) => json({ ok: isAdmin(request, env) }),
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/login$/,
    run: ({ request, env, url, body }) => {
      const key = request.headers.get('cf-connecting-ip') || 'unknown'
      if (loginGuard.blocked(key)) return json({ error: '尝试次数太多，请稍后再试' }, 429)
      const password = env.ADMIN_PASSWORD || ''
      if (!password) return json({ error: '还没有设置管理员密码' }, 500)
      const given = String(body.password ?? '')
      if (!passwordsMatch(given, password)) {
        loginGuard.fail(key)
        return json({ error: '密码不对' }, 401)
      }
      loginGuard.succeed(key)
      const secure = url.protocol === 'https:' ? '; Secure' : ''
      const token = signSession(sessionSecret(env))
      return json({ ok: true }, 200, {
        'set-cookie': `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
      })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/logout$/,
    run: () => json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0` }),
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/tweets\/batch$/,
    admin: true,
    run: async ({ body, tweets }) => {
      const batch = parseTweetBatch(String(body.text || ''))
      if (batch.items.length === 0 && batch.rejected.length === 0 && batch.duplicates === 0) {
        return json({ error: '请贴帖子链接，一行一条' }, 400)
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
          if (body.featured === true) tweet.featured = true
          await tweets.add(tweet)
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
      return json({ added, failed, overflow: batch.overflow, duplicates })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/tweets$/,
    admin: true,
    run: async ({ body, tweets }) => {
      const parsed = parseTweetUrl(String(body.url || ''))
      if (!parsed) return json({ error: '请贴一条 x.com 或 twitter.com 的帖子链接' }, 400)
      if (!isCuratedAuthor(parsed.handle)) return json({ error: '只能收录 @EnHeng456 的帖子' }, 400)
      try {
        const tweet = await fetchTweet(parsed.id)
        if (body.featured === true) tweet.featured = true
        await tweets.add(tweet)
        return json({ tweet }, 201)
      } catch (error) {
        const message = error instanceof Error ? error.message : '收录失败'
        return json({ error: message }, message.includes('已经收录') ? 409 : 502)
      }
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/tweets\/([^/]+)\/featured$/,
    admin: true,
    run: async ({ params, body, tweets }) => {
      const featured = body.featured === true
      if (!(await tweets.setFeatured(params[0], featured))) return json({ error: '没有这条帖子' }, 404)
      return json({ ok: true, featured })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/tweets\/([^/]+)\/category$/,
    admin: true,
    run: async ({ params, body, tweets }) => {
      if (!(await tweets.setCategory(params[0], String(body.category || '')))) return json({ error: '没有这条帖子' }, 404)
      return json({ ok: true })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/tweets\/([^/]+)\/pick$/,
    admin: true,
    run: async ({ params, body, tweets }) => {
      const direction = body.direction === 'down' ? 'down' : 'up'
      if (!(await tweets.moveFeatured(params[0], direction))) return json({ error: '这条不能移动' }, 404)
      return json({ ok: true })
    },
  },

  {
    // 原来的 Express 版本会重新构建并推到 GitHub Pages。
    // Cloudflare 版本的数据直接读 D1，改动即时生效，这里只回报公开地址。
    method: 'POST',
    pattern: /^\/api\/admin\/publish$/,
    admin: true,
    run: ({ url }) => json({ ok: true, url: `${url.origin}/` }),
  },

  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/tweets\/([^/]+)$/,
    admin: true,
    run: async ({ params, tweets }) => {
      if (!(await tweets.remove(params[0]))) return json({ error: '没有这条帖子' }, 404)
      return json({ ok: true })
    },
  },

  { method: 'GET', pattern: /^\/api\/albums$/, run: async ({ albums }) => json({ albums: await albums.list() }) },

  {
    method: 'GET',
    pattern: /^\/api\/album-files\/([^/]+)$/,
    run: async ({ params, albums, env }) => {
      const name = params[0]
      if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/.test(name)) return empty(400)
      if (!(await albums.fileKnown(name))) return empty(404)
      const object = await env.ALBUMS.get(name)
      if (!object) return empty(404)
      const ext = name.slice(name.lastIndexOf('.') + 1)
      return new Response(object.body as unknown as ReadableStream, {
        headers: {
          'content-type': TYPES[ext] || 'application/octet-stream',
          'cache-control': 'public, max-age=86400',
          'content-length': String(object.size),
        },
      })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/albums$/,
    admin: true,
    run: async ({ body, albums }) => {
      try {
        await albums.add(String(body.name || ''))
        return json({ albums: await albums.list() }, 201)
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : '没有建成' }, 400)
      }
    },
  },

  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/albums\/([^/]+)$/,
    admin: true,
    run: async ({ params, body, albums }) => {
      try {
        if (!(await albums.rename(params[0], String(body.name || '')))) return json({ error: '没有这个相册' }, 404)
        return json({ albums: await albums.list() })
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : '没有改成' }, 400)
      }
    },
  },

  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/albums\/([^/]+)$/,
    admin: true,
    run: async ({ params, albums, env }) => {
      const removed = await albums.remove(params[0])
      if (!removed) return json({ error: '没有这个相册' }, 404)
      const files = removed.photos.map((photo) => photo.file)
      if (files.length) await env.ALBUMS.delete(files)
      return json({ albums: await albums.list() })
    },
  },

  {
    method: 'POST',
    pattern: /^\/api\/admin\/albums\/([^/]+)\/photos$/,
    admin: true,
    large: true,
    run: async ({ params, body, albums, env }) => {
      const album = await albums.get(params[0])
      if (!album) return json({ error: '没有这个相册' }, 404)
      if (album.photos.length >= 80) return json({ error: '这个相册已经有 80 张，先删掉一些再传' }, 400)
      const decoded = decodeImageDataUrl(String(body.dataUrl || ''))
      if (!decoded) return json({ error: '请上传 8MB 以内的 jpg、png、webp 或 gif' }, 400)
      const id = crypto.randomUUID()
      const file = `${id}.${decoded.ext}`
      await env.ALBUMS.put(file, decoded.body, { httpMetadata: { contentType: TYPES[decoded.ext] } })
      const caption = String(body.caption || '').trim().slice(0, 80)
      try {
        await albums.addPhoto(album.id, { id, file, caption, createdAt: new Date().toISOString() })
      } catch (error) {
        await env.ALBUMS.delete(file)
        throw error
      }
      return json({ albums: await albums.list() }, 201)
    },
  },

  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/albums\/([^/]+)\/photos\/([^/]+)$/,
    admin: true,
    run: async ({ params, body, albums }) => {
      const caption = String(body.caption || '').slice(0, 80)
      if (!(await albums.updatePhoto(params[0], params[1], caption))) return json({ error: '没有这张照片' }, 404)
      return json({ albums: await albums.list() })
    },
  },

  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/albums\/([^/]+)\/photos\/([^/]+)$/,
    admin: true,
    run: async ({ params, albums, env }) => {
      const removed = await albums.removePhoto(params[0], params[1])
      if (!removed) return json({ error: '没有这张照片' }, 404)
      await env.ALBUMS.delete(removed.file)
      return json({ albums: await albums.list() })
    },
  },

  {
    method: 'GET',
    pattern: /^\/api\/img$/,
    run: async ({ url }) => {
      let target: URL
      try {
        target = new URL(url.searchParams.get('url') || '')
      } catch {
        return empty(400)
      }
      if (target.protocol !== 'https:' || target.hostname !== 'pbs.twimg.com') return empty(400)
      try {
        const proxied = new URL('https://wsrv.nl/')
        proxied.searchParams.set('url', target.toString())
        proxied.searchParams.set('n', '-1')
        const response = await fetch(proxied, {
          headers: { 'user-agent': 'enheng-select' },
          signal: AbortSignal.timeout(20000),
        })
        if (!response.ok) return empty(502)
        return new Response(response.body, {
          headers: {
            'content-type': response.headers.get('content-type') || 'image/jpeg',
            'cache-control': 'public, max-age=86400',
          },
        })
      } catch {
        return empty(502)
      }
    },
  },
]

function sessionSecret(env: Env): string {
  const secret = env.SESSION_SECRET || ''
  if (secret.length < 32) throw new HttpError(500, 'SESSION_SECRET 至少需要 32 位随机字符')
  return secret
}

function isAdmin(request: Request, env: Env): boolean {
  return verifySession(readCookie(request.headers.get('cookie'), COOKIE), sessionSecret(env))
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method === 'HEAD' ? 'GET' : request.method
  try {
    for (const route of routes) {
      if (route.method !== method) continue
      const match = route.pattern.exec(url.pathname)
      if (!match) continue
      if (route.admin && !isAdmin(request, env)) return json({ error: '需要管理员登录' }, 401)
      const params = match.slice(1).map((part) => decodeURIComponent(part))
      const body = method === 'GET' || method === 'DELETE' ? {} : await readBody(request, route.large ? LARGE_BODY : SMALL_BODY)
      return await route.run({
        request,
        env,
        url,
        params,
        body,
        tweets: createTweetStore(env.DB),
        albums: createAlbumStore(env.DB),
      })
    }
    return json({ error: '没有这个接口' }, 404)
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status)
    console.error(error)
    return json({ error: '服务器出错了' }, 500)
  }
}
