import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { CategoryId, StoredTweet } from './types'
import { featuredTweets } from './tweets'

const CATEGORY_IDS: CategoryId[] = ['market', 'views', 'people', 'ai', 'life', 'other']

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
      else {
        delete tweet.featured
        delete tweet.pickOrder
      }
      write(tweets)
      return true
    },
    setCategory(id: string, category: string): boolean {
      if (!CATEGORY_IDS.includes(category as CategoryId)) return false
      const tweets = read()
      const tweet = tweets.find((item) => item.id === id)
      if (!tweet) return false
      tweet.categories = [category as CategoryId]
      write(tweets)
      return true
    },
    moveFeatured(id: string, direction: 'up' | 'down'): boolean {
      const ordered = featuredTweets(read())
      const index = ordered.findIndex((item) => item.id === id)
      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return false
      const next = ordered.slice()
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      const tweets = read()
      for (const [order, picked] of next.entries()) {
        const found = tweets.find((tweet) => tweet.id === picked.id)
        if (found) found.pickOrder = order
      }
      write(tweets)
      return true
    },
  }
}
