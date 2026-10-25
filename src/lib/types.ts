export type CategoryId = 'ai' | 'market' | 'projects' | 'exchanges' | 'people' | 'life' | 'other'

export type Media = {
  type: 'photo' | 'video'
  url: string
}

export type QuoteTweet = {
  authorName: string
  authorHandle: string
  authorAvatar: string
  verified: boolean
  text: string
  createdAt: string
  media: Media[]
}

export type StoredTweet = {
  id: string
  url: string
  text: string
  createdAt: string
  authorName: string
  authorHandle: string
  authorAvatar: string
  verified: boolean
  media: Media[]
  quote: QuoteTweet | null
  metrics: {
    replies: number
    retweets: number
    likes: number
    views: number
  }
  categories: CategoryId[]
}
