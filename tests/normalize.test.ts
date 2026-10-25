import { describe, expect, it } from 'vitest'
import { normalizeFxTweet } from '../src/lib/normalize'

const payload = {
  code: 200,
  tweet: {
    url: 'https://x.com/EnHeng456/status/2112871161872977984',
    id: '2112871161872977984',
    text: 'Axis是最强的加密机器人，这波开盘很好',
    author: {
      screen_name: 'EnHeng456',
      name: 'EnHeng嗯哼.Ai',
      avatar_url: 'https://pbs.twimg.com/profile_images/a.jpg',
      verification: { verified: true },
    },
    replies: 20,
    retweets: 8,
    likes: 34,
    views: 9246,
    created_timestamp: 1792582714,
    quote: {
      text: 'AXIS 交易支持',
      author: {
        screen_name: 'Official_Upbit',
        name: 'Upbit Korea',
        avatar_url: 'https://pbs.twimg.com/profile_images/b.jpg',
        verification: { verified: true },
      },
      created_timestamp: 1792580704,
      media: {
        photos: [{ type: 'photo', url: 'https://pbs.twimg.com/media/q.jpg?name=orig' }],
      },
    },
  },
}

describe('normalizeFxTweet', () => {
  it('整理正文、互动数和引用帖', () => {
    const tweet = normalizeFxTweet(payload)
    expect(tweet.id).toBe('2112871161872977984')
    expect(tweet.authorHandle).toBe('EnHeng456')
    expect(tweet.createdAt).toBe('2026-10-21T11:38:34.000Z')
    expect(tweet.metrics).toEqual({ replies: 20, retweets: 8, likes: 34, views: 9246 })
    expect(tweet.quote?.authorHandle).toBe('Official_Upbit')
    expect(tweet.quote?.media[0]).toEqual({
      type: 'photo',
      url: 'https://pbs.twimg.com/media/q.jpg?name=orig',
    })
  })

  it('拒绝其他账号', () => {
    expect(() =>
      normalizeFxTweet({
        tweet: {
          ...payload.tweet,
          author: { ...payload.tweet.author, screen_name: 'someone' },
        },
      }),
    ).toThrow(/EnHeng456/)
  })
})
