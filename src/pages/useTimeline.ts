import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTimelinePage } from '../lib/timeline'
import type { StoredTweet } from '../lib/types'

const FRESH_MS = 60_000

let memory: { at: number; tweets: StoredTweet[]; next: string | null } | null = null

function remember(tweets: StoredTweet[], next: string | null) {
  memory = { at: Date.now(), tweets, next }
}

export function useTimeline(enabled = true) {
  const [tweets, setTweets] = useState<StoredTweet[] | null>(enabled && memory ? memory.tweets : null)
  const [error, setError] = useState('')
  const [next, setNext] = useState<string | null>(enabled && memory ? memory.next : null)
  const [loadingMore, setLoadingMore] = useState(false)
  const loaded = useRef<StoredTweet[] | null>(enabled && memory ? memory.tweets : null)

  function show(list: StoredTweet[], cursor: string | null) {
    loaded.current = list
    remember(list, cursor)
    setTweets(list)
    setNext(cursor)
    setError('')
  }

  useEffect(() => {
    if (!enabled) return
    if (memory && Date.now() - memory.at < FRESH_MS) {
      show(memory.tweets, memory.next)
      return
    }
    let cancel = false
    fetchTimelinePage()
      .then((page) => {
        if (cancel) return
        const current = loaded.current
        if (current && current.length > 0 && current[0]?.id !== page.tweets[0]?.id) return
        show(current && current.length > page.tweets.length ? current : page.tweets, page.next)
      })
      .catch(() => {
        if (!cancel && !loaded.current?.length) setError('主页暂时没有拉下来，可以稍后再看')
      })
    return () => {
      cancel = true
    }
  }, [enabled])

  const more = useCallback(async () => {
    const cursor = next
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchTimelinePage(cursor)
      const current = loaded.current ?? []
      const seen = new Set(current.map((tweet) => tweet.id))
      const merged = [...current, ...page.tweets.filter((tweet) => !seen.has(tweet.id))]
      show(merged, page.next)
    } catch {
      setError('更早的帖子没有拉下来')
    } finally {
      setLoadingMore(false)
    }
  }, [next, loadingMore])

  return { tweets, error, next, loadingMore, more }
}
