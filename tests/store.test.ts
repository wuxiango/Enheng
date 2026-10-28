import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore, type StoredTweet } from '../src/lib/store'

function sample(id: string, createdAt: string): StoredTweet {
  return {
    id,
    url: `https://x.com/EnHeng456/status/${id}`,
    text: id,
    createdAt,
    authorName: 'EnHeng嗯哼.Ai',
    authorHandle: 'EnHeng456',
    authorAvatar: 'https://pbs.twimg.com/a.jpg',
    verified: true,
    media: [],
    quote: null,
    metrics: { replies: 1, retweets: 2, likes: 3, views: 4 },
    categories: ['ai'],
  }
}

describe('createStore', () => {
  it('按时间倒序读出，并拒绝重复收录', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'tweets.json')
    const store = createStore(file)
    store.add(sample('1', '2026-10-01T00:00:00.000Z'))
    store.add(sample('2', '2026-10-05T00:00:00.000Z'))
    expect(store.list().map((tweet) => tweet.id)).toEqual(['2', '1'])
    expect(() => store.add(sample('2', '2026-10-05T00:00:00.000Z'))).toThrow(/已经收录/)
  })

  it('删除后不再出现，删不存在的帖子会失败', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'tweets.json')
    const store = createStore(file)
    store.add(sample('9', '2026-10-01T00:00:00.000Z'))
    expect(store.remove('9')).toBe(true)
    expect(store.list()).toEqual([])
    expect(store.remove('9')).toBe(false)
  })

  it('只有主动标记的帖子算精选', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'tweets.json')
    const store = createStore(file)
    store.add(sample('1', '2026-10-01T00:00:00.000Z'))
    expect(store.list()[0].featured).toBeUndefined()
    expect(store.setFeatured('1', true)).toBe(true)
    expect(store.list()[0].featured).toBe(true)
    expect(store.setFeatured('1', false)).toBe(true)
    expect(store.list()[0].featured).toBeUndefined()
    expect(store.setFeatured('missing', true)).toBe(false)
  })

  it('一条帖子只保留一个分类，精选可以上下移动', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'tweets.json')
    const store = createStore(file)
    store.add(sample('1', '2026-10-01T00:00:00.000Z'))
    store.add(sample('2', '2026-10-02T00:00:00.000Z'))
    expect(store.setCategory('1', 'life')).toBe(true)
    expect(store.list().find((tweet) => tweet.id === '1')?.categories).toEqual(['life'])
    expect(store.setCategory('1', 'nope')).toBe(false)
    store.setFeatured('1', true)
    store.setFeatured('2', true)
    expect(store.moveFeatured('1', 'up')).toBe(true)
    expect(store.list().filter((tweet) => tweet.featured).sort((a, b) => (a.pickOrder ?? 0) - (b.pickOrder ?? 0)).map((tweet) => tweet.id)).toEqual(['1', '2'])
    store.setFeatured('1', false)
    expect(store.list().find((tweet) => tweet.id === '1')?.pickOrder).toBeUndefined()
  })
})
