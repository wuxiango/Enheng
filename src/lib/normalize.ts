import { classifyTweet } from './classify'
import type { Media, QuoteTweet, StoredTweet } from './types'

type FxMedia = {
  type?: string
  url?: string
  thumbnail_url?: string
}

type FxAuthor = {
  screen_name?: string
  name?: string
  avatar_url?: string
  verification?: { verified?: boolean }
}

type FxTweet = {
  url?: string
  id?: string
  text?: string
  author?: FxAuthor
  replies?: number
  retweets?: number
  likes?: number
  views?: number | null
  created_timestamp?: number
  media?: {
    all?: FxMedia[]
    photos?: FxMedia[]
    videos?: FxMedia[]
  } | null
  quote?: FxTweet | null
}

function mediaFrom(media: FxTweet['media']): Media[] {
  if (!media) return []
  const items = media.all ?? [...(media.photos ?? []), ...(media.videos ?? [])]
  return items
    .map((item) => {
      const video = item.type === 'video' || item.type === 'gif'
      const url = video ? item.thumbnail_url || item.url || '' : item.url || ''
      if (!url) return null
      return { type: video ? 'video' as const : 'photo' as const, url }
    })
    .filter((item): item is Media => item !== null)
}

function quoteFrom(quote: FxTweet | null | undefined): QuoteTweet | null {
  if (!quote?.author?.screen_name || !quote.text || !quote.created_timestamp) return null
  return {
    authorName: quote.author.name || quote.author.screen_name,
    authorHandle: quote.author.screen_name,
    authorAvatar: quote.author.avatar_url || '',
    verified: Boolean(quote.author.verification?.verified),
    text: quote.text,
    createdAt: new Date(quote.created_timestamp * 1000).toISOString(),
    media: mediaFrom(quote.media),
  }
}

export function normalizeFxTweet(payload: { tweet?: FxTweet }): StoredTweet {
  const tweet = payload.tweet
  const handle = tweet?.author?.screen_name || ''
  if (handle.toLowerCase() !== 'enheng456' || !tweet?.id || !tweet.text || !tweet.created_timestamp) {
    throw new Error('只能收录 @EnHeng456 的帖子')
  }
  return {
    id: String(tweet.id),
    url: tweet.url || `https://x.com/EnHeng456/status/${tweet.id}`,
    text: tweet.text,
    createdAt: new Date(tweet.created_timestamp * 1000).toISOString(),
    authorName: tweet.author?.name || 'EnHeng嗯哼.Ai',
    authorHandle: handle,
    authorAvatar: tweet.author?.avatar_url || '',
    verified: Boolean(tweet.author?.verification?.verified),
    media: mediaFrom(tweet.media),
    quote: quoteFrom(tweet.quote),
    metrics: {
      replies: tweet.replies ?? 0,
      retweets: tweet.retweets ?? 0,
      likes: tweet.likes ?? 0,
      views: tweet.views ?? 0,
    },
    categories: classifyTweet(tweet.text),
  }
}
