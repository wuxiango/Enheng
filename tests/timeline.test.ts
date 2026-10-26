import { describe, expect, it } from 'vitest'
import { readTimeline } from '../src/lib/timeline'

const own = {
  id: '2114014762862600587',
  url: 'https://x.com/EnHeng456/status/2114014762862600587',
  text: '这帮土耳其人为什么在攻击中国人？',
  author: {
    screen_name: 'EnHeng456',
    name: 'EnHeng嗯哼.Ai',
    avatar_url: 'https://pbs.twimg.com/profile_images/a.jpg',
    verification: { verified: true },
  },
  replies: 64,
  reposts: 8,
  likes: 68,
  views: 37612,
  created_timestamp: 1792855370,
  media: { photos: [{ type: 'photo', url: 'https://pbs.twimg.com/media/a.jpg?name=orig' }] },
}

describe('readTimeline', () => {
  it('按主页顺序保留他自己的帖子，并把转发标出来', () => {
    const page = readTimeline({
      results: [
        own,
        {
          id: '9',
          text: '别人的帖子',
          author: { screen_name: 'Btc_kking', name: 'kk' },
          created_timestamp: 1792700000,
          reposted_by: { screen_name: 'EnHeng456', name: 'EnHeng嗯哼.Ai' },
        },
        {
          id: '8',
          text: '路人提到他',
          author: { screen_name: 'someone', name: '路人' },
          created_timestamp: 1792600000,
        },
      ],
      cursor: { bottom: 'next-page' },
    })

    expect(page.tweets.map((tweet) => tweet.id)).toEqual(['2114014762862600587', '9'])
    expect(page.tweets[0].repostedBy).toBeNull()
    expect(page.tweets[0].metrics.retweets).toBe(8)
    expect(page.tweets[0].media).toEqual([{ type: 'photo', url: 'https://pbs.twimg.com/media/a.jpg?name=orig' }])
    expect(page.tweets[0].createdAt).toBe('2026-10-24T15:22:50.000Z')
    expect(page.tweets[1].repostedBy).toEqual({ name: 'EnHeng嗯哼.Ai', handle: 'EnHeng456' })
    expect(page.tweets[1].authorHandle).toBe('Btc_kking')
    expect(page.next).toBe('next-page')
  })
})
