import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { handleApi } from '../cloudflare/api'
import type { Env } from '../cloudflare/env'

// 用 wrangler 的本地 D1 / R2 模拟跑一遍 Cloudflare 版后台（不需要登录，也不碰线上）。
// wrangler 需要 Node 22 以上，低版本 Node 时跳过。
const nodeMajor = Number(process.versions.node.split('.')[0])
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PASSWORD = 'test-password'
const BASE = 'https://enheng.test'

function tweet(id: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    url: `https://x.com/EnHeng456/status/${id}`,
    text: `帖子 ${id}`,
    createdAt,
    authorName: 'EnHeng嗯哼.Ai',
    authorHandle: 'EnHeng456',
    authorAvatar: '',
    verified: true,
    media: [],
    quote: null,
    metrics: { replies: 0, retweets: 0, likes: 0, views: 0 },
    categories: ['other'],
    ...extra,
  }
}

describe.skipIf(nodeMajor < 22)('Cloudflare 版后台', () => {
  let env: Env
  let dispose: () => Promise<void>
  let cookie = ''

  async function call(method: string, path: string, body?: unknown) {
    const response = await handleApi(
      new Request(`${BASE}${path}`, {
        method,
        headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env,
    )
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';')[0]
    const text = await response.text()
    return { status: response.status, data: text ? JSON.parse(text) : null, headers: response.headers }
  }

  beforeAll(async () => {
    const { getPlatformProxy } = await import('wrangler')
    const proxy = await getPlatformProxy<Env>({ persist: { path: mkdtempSync(join(tmpdir(), 'enheng-cf-')) } })
    dispose = proxy.dispose
    env = { ...proxy.env, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: 'x'.repeat(40) } as Env
    const schema = ['0001_init.sql', '0002_login_attempts.sql']
      .map((name) => readFileSync(join(__dirname, '..', 'migrations', name), 'utf8'))
      .join(';\n')
      .replace(/--.*$/gm, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)
    await env.DB.batch(schema.map((statement) => env.DB.prepare(statement)))
    const seed = [
      tweet('1', '2026-10-01T00:00:00.000Z', { featured: true }),
      tweet('2', '2026-10-03T00:00:00.000Z', { featured: true }),
      tweet('3', '2026-10-02T00:00:00.000Z'),
    ]
    await env.DB.batch(
      seed.map((item) =>
        env.DB.prepare('INSERT INTO tweets (id, created_at, data) VALUES (?, ?, ?)').bind(item.id, item.createdAt, JSON.stringify(item)),
      ),
    )
  }, 60_000)

  afterAll(async () => {
    await dispose?.()
  })

  it('帖子按时间倒序返回，字段和原来一样', async () => {
    const { status, data } = await call('GET', '/api/tweets')
    expect(status).toBe(200)
    expect(data.tweets.map((item: { id: string }) => item.id)).toEqual(['2', '3', '1'])
    expect(Object.keys(data.tweets[0])).toEqual(Object.keys(tweet('2', '', { featured: true })))
  })

  it('没登录不能改，密码错了会拒绝', async () => {
    expect((await call('POST', '/api/admin/albums', { name: '相册' })).status).toBe(401)
    expect((await call('POST', '/api/admin/login', { password: 'wrong' })).status).toBe(401)
    expect((await call('GET', '/api/admin/session')).data).toEqual({ ok: false })
    expect((await call('GET', '/api/nope')).status).toBe(404)
  })

  it('登录后能改分类、精选和精选顺序，能删帖子', async () => {
    const login = await call('POST', '/api/admin/login', { password: PASSWORD })
    expect(login.status).toBe(200)
    expect(login.headers.get('set-cookie')).toMatch(/HttpOnly; Path=\/; SameSite=Lax; Max-Age=43200; Secure/)
    expect((await call('GET', '/api/admin/session')).data).toEqual({ ok: true })

    expect((await call('POST', '/api/admin/tweets/3/category', { category: 'ai' })).data).toEqual({ ok: true })
    expect((await call('POST', '/api/admin/tweets/3/category', { category: 'nope' })).status).toBe(404)
    expect((await call('POST', '/api/admin/tweets/2/pick', { direction: 'down' })).status).toBe(200)
    const { data } = await call('GET', '/api/tweets')
    const byId = Object.fromEntries(data.tweets.map((item: { id: string }) => [item.id, item]))
    expect(byId['3'].categories).toEqual(['ai'])
    expect(byId['1'].pickOrder).toBe(0)
    expect(byId['2'].pickOrder).toBe(1)

    expect((await call('POST', '/api/admin/tweets/2/featured', { featured: false })).data).toEqual({ ok: true, featured: false })
    expect((await call('GET', '/api/tweets')).data.tweets.find((item: { id: string }) => item.id === '2').featured).toBeUndefined()
    expect((await call('DELETE', '/api/admin/tweets/3')).data).toEqual({ ok: true })
    expect((await call('DELETE', '/api/admin/tweets/3')).status).toBe(404)
  })

  it('相册：新建、改名、上传、改说明、删照片、删相册', async () => {
    await call('POST', '/api/admin/login', { password: PASSWORD })
    const created = await call('POST', '/api/admin/albums', { name: '  火锅节  ' })
    expect(created.status).toBe(201)
    const album = created.data.albums.find((item: { name: string }) => item.name === '火锅节')
    expect((await call('PATCH', `/api/admin/albums/${album.id}`, { name: '' })).status).toBe(400)
    expect((await call('PATCH', `/api/admin/albums/${album.id}`, { name: '火锅' })).status).toBe(200)

    expect((await call('POST', `/api/admin/albums/${album.id}/photos`, { dataUrl: 'data:image/png;base64,aGVsbG8=' })).status).toBe(400)
    const uploaded = await call('POST', `/api/admin/albums/${album.id}/photos`, { dataUrl: PNG, caption: '封面' })
    expect(uploaded.status).toBe(201)
    const photo = uploaded.data.albums.find((item: { id: string }) => item.id === album.id).photos[0]
    expect(photo.caption).toBe('封面')
    expect(await env.ALBUMS.head(photo.file)).not.toBeNull()

    const raw = await handleApi(new Request(`${BASE}/api/album-files/${photo.file}`), env)
    expect(raw.status).toBe(200)
    expect(raw.headers.get('content-type')).toBe('image/png')

    const renamed = await call('PATCH', `/api/admin/albums/${album.id}/photos/${photo.id}`, { caption: '成都' })
    expect(renamed.data.albums.find((item: { id: string }) => item.id === album.id).photos[0].caption).toBe('成都')
    expect((await call('DELETE', `/api/admin/albums/${album.id}/photos/${photo.id}`)).status).toBe(200)
    expect(await env.ALBUMS.head(photo.file)).toBeNull()
    expect((await handleApi(new Request(`${BASE}/api/album-files/${photo.file}`), env)).status).toBe(404)

    expect((await call('DELETE', `/api/admin/albums/${album.id}`)).data.albums).toEqual([])
  })

  it('退出后会话失效', async () => {
    await call('POST', '/api/admin/login', { password: PASSWORD })
    await call('POST', '/api/admin/logout')
    expect((await call('GET', '/api/admin/session')).data).toEqual({ ok: false })
  })

  async function loginFrom(handler: typeof handleApi, ip: string, password: string) {
    const response = await handler(
      new Request(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify({ password }),
      }),
      env,
    )
    return { status: response.status, data: await response.json() }
  }

  async function freshHandler(): Promise<typeof handleApi> {
    vi.resetModules()
    return (await import('../cloudflare/api')).handleApi
  }

  it('失败 5 次后锁定，换一个后台实例也照样锁定，不存密码', async () => {
    const first = await freshHandler()
    for (let i = 0; i < 5; i += 1) expect((await loginFrom(first, '203.0.113.7', 'wrong')).status).toBe(401)
    const second = await freshHandler()
    expect(second).not.toBe(first)
    const blocked = await loginFrom(second, '203.0.113.7', PASSWORD)
    expect(blocked).toEqual({ status: 429, data: { error: '尝试次数太多，请稍后再试' } })
    expect((await loginFrom(second, '203.0.113.8', PASSWORD)).status).toBe(200)
    const rows = await env.DB.prepare('SELECT * FROM login_attempts').all()
    expect(JSON.stringify(rows.results)).not.toContain('wrong')
    expect(JSON.stringify(rows.results)).not.toContain(PASSWORD)
  })

  it('登录成功后失败次数清零，过期窗口会重新计数', async () => {
    const first = await freshHandler()
    for (let i = 0; i < 4; i += 1) await loginFrom(first, '198.51.100.9', 'wrong')
    const second = await freshHandler()
    expect((await loginFrom(second, '198.51.100.9', PASSWORD)).status).toBe(200)
    expect(await env.DB.prepare('SELECT count FROM login_attempts WHERE key = ?').bind('198.51.100.9').first()).toBeNull()
    for (let i = 0; i < 4; i += 1) expect((await loginFrom(first, '198.51.100.9', 'wrong')).status).toBe(401)
    expect((await loginFrom(second, '198.51.100.9', PASSWORD)).status).toBe(200)

    await env.DB.prepare('INSERT INTO login_attempts (key, count, reset_at) VALUES (?, 5, ?)').bind('192.0.2.1', Date.now() - 1).run()
    expect((await loginFrom(second, '192.0.2.1', PASSWORD)).status).toBe(200)
  })
})
