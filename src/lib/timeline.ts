import { classifyTweet } from './classify'
import { ENHENG_USER_ID } from './profile'
import type { Media, QuoteTweet, StoredTweet } from './types'

type FxAuthor = {
  screen_name?: string
  name?: string
  avatar_url?: string
  verification?: { verified?: boolean }
}

type FxMediaItem = {
  type?: string
  url?: string
  thumbnail_url?: string
}

type FxMedia = {
  all?: FxMediaItem[]
  photos?: FxMediaItem[]
  videos?: FxMediaItem[]
} | null

type FxStatus = {
  id?: string
  url?: string
  text?: string
  author?: FxAuthor
  replies?: number
  reposts?: number
  retweets?: number
  likes?: number
  views?: number | null
  created_timestamp?: number
  media?: FxMedia
  quote?: FxStatus | null
  reposted_by?: FxAuthor | null
}

export type TimelinePage = {
  tweets: StoredTweet[]
  next: string | null
}

function isEnheng(handle: string | undefined): boolean {
  return (handle || '').toLowerCase() === 'enheng456'
}

function mediaFrom(media: FxMedia): Media[] {
  if (!media) return []
  const items = media.all ?? [...(media.photos ?? []), ...(media.videos ?? [])]
  return items.flatMap((item) => {
    const video = item.type === 'video' || item.type === 'gif'
    const url = video ? item.thumbnail_url || item.url || '' : item.url || ''
    if (!url) return []
    return [{ type: video ? ('video' as const) : ('photo' as const), url }]
  })
}

function quoteFrom(quote: FxStatus | null | undefined): QuoteTweet | null {
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

export function normalizeTimelineStatus(status: FxStatus): StoredTweet | null {
  const own = isEnheng(status.author?.screen_name)
  const repostedBy = isEnheng(status.reposted_by?.screen_name) ? status.reposted_by : null
  if ((!own && !repostedBy) || !status.id || !status.text || !status.created_timestamp) return null
  return {
    id: String(status.id),
    url: status.url || `https://x.com/${status.author?.screen_name || 'EnHeng456'}/status/${status.id}`,
    text: status.text,
    createdAt: new Date(status.created_timestamp * 1000).toISOString(),
    authorName: status.author?.name || status.author?.screen_name || 'EnHeng嗯哼.Ai',
    authorHandle: status.author?.screen_name || 'EnHeng456',
    authorAvatar: status.author?.avatar_url || '',
    verified: Boolean(status.author?.verification?.verified),
    media: mediaFrom(status.media),
    quote: quoteFrom(status.quote),
    metrics: {
      replies: status.replies ?? 0,
      retweets: status.reposts ?? status.retweets ?? 0,
      likes: status.likes ?? 0,
      views: status.views ?? 0,
    },
    categories: classifyTweet(status.text),
    repostedBy: repostedBy
      ? { name: repostedBy.name || 'EnHeng嗯哼.Ai', handle: repostedBy.screen_name || 'EnHeng456' }
      : null,
  }
}

export function readTimeline(payload: { results?: FxStatus[]; cursor?: { bottom?: string | null } }): TimelinePage {
  const tweets = (payload.results ?? []).flatMap((status) => {
    const tweet = normalizeTimelineStatus(status)
    return tweet ? [tweet] : []
  })
  return { tweets, next: payload.cursor?.bottom || null }
}

export async function fetchTimelinePage(cursor?: string): Promise<TimelinePage> {
  const url = new URL(`https://api.fxtwitter.com/2/profile/id:${ENHENG_USER_ID}/statuses`)
  url.searchParams.set('count', '20')
  if (cursor) url.searchParams.set('cursor', cursor)
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('主页暂时没有拉下来')
  const payload = (await response.json()) as { code?: number; results?: FxStatus[]; cursor?: { bottom?: string | null } }
  if (payload.code !== 200) throw new Error('主页暂时没有拉下来')
  return readTimeline(payload)
}
