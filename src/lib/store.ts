import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { StoredTweet } from './types'

export type { StoredTweet } from './types'

type FileShape = { tweets: StoredTweet[] }

export function createStore(file: string) {
  function read(): StoredTweet[] {
    if (!existsSync(file)) return []
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as FileShape
    return parsed.tweets ?? []
  }

  function write(tweets: StoredTweet[]) {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify({ tweets }, null, 2))
  }

  return {
    list(): StoredTweet[] {
      return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    },
    add(tweet: StoredTweet) {
      const tweets = read()
      if (tweets.some((item) => item.id === tweet.id)) {
        throw new Error('这条帖子已经收录')
      }
      tweets.push(tweet)
      write(tweets)
    },
    remove(id: string): boolean {
      const tweets = read()
      const next = tweets.filter((item) => item.id !== id)
      if (next.length === tweets.length) return false
      write(next)
      return true
    },
    setFeatured(id: string, featured: boolean): boolean {
      const tweets = read()
      const tweet = tweets.find((item) => item.id === id)
      if (!tweet) return false
      if (featured) tweet.featured = true
      else delete tweet.featured
      write(tweets)
      return true
    },
  }
}
