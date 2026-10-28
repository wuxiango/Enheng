import type { StoredTweet } from './types'

export function uniqueTweets(tweets: StoredTweet[]): StoredTweet[] {
  const seen = new Set<string>()
  const result: StoredTweet[] = []
  for (const tweet of tweets) {
    if (seen.has(tweet.id)) continue
    seen.add(tweet.id)
    result.push(tweet)
  }
  return result
}

export function featuredTweets(tweets: StoredTweet[]): StoredTweet[] {
  return uniqueTweets(tweets)
    .filter((tweet) => tweet.featured === true)
    .sort((a, b) => {
      const ao = a.pickOrder
      const bo = b.pickOrder
      if (ao != null && bo != null && ao !== bo) return ao - bo
      if (ao != null && bo == null) return -1
      if (ao == null && bo != null) return 1
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
    })
}
