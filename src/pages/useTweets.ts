import { useCallback, useEffect, useState } from 'react'
import type { StoredTweet } from '../lib/types'
import { tweetsUrl } from '../lib/format'

export function useTweets() {
  const [tweets, setTweets] = useState<StoredTweet[] | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const response = await fetch(tweetsUrl())
    if (!response.ok) throw new Error('帖子没有加载出来')
    const data = (await response.json()) as { tweets: StoredTweet[] }
    setTweets(data.tweets)
    setError('')
  }, [])

  useEffect(() => {
    reload().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : '帖子没有加载出来')
    })
  }, [reload])

  return { tweets, error, reload }
}
