import type { D1Database } from '@cloudflare/workers-types'
import { sortAlbumPhotos } from '../src/lib/albumOrder'
import type { Album, AlbumPhoto } from '../src/lib/albumTypes'
import { featuredTweets } from '../src/lib/tweets'
import type { CategoryId, StoredTweet } from '../src/lib/types'

const CATEGORY_IDS: CategoryId[] = ['market', 'views', 'people', 'ai', 'life', 'other']

// 和 data/tweets.json、线上 /api/tweets 一样的字段顺序
const TWEET_KEYS: (keyof StoredTweet)[] = [
  'id', 'url', 'text', 'createdAt', 'authorName', 'authorHandle', 'authorAvatar', 'verified',
  'media', 'quote', 'metrics', 'categories', 'featured', 'pickOrder', 'repostedBy',
]

export function canonicalTweet(tweet: StoredTweet): StoredTweet {
  const out: Record<string, unknown> = {}
  for (const key of TWEET_KEYS) if (tweet[key] !== undefined) out[key] = tweet[key]
  for (const [key, value] of Object.entries(tweet)) if (!(key in out) && value !== undefined) out[key] = value
  return out as StoredTweet
}

export function createTweetStore(db: D1Database) {
  async function get(id: string): Promise<StoredTweet | null> {
    const row = await db.prepare('SELECT data FROM tweets WHERE id = ?').bind(id).first<{ data: string }>()
    return row ? (JSON.parse(row.data) as StoredTweet) : null
  }

  async function save(tweet: StoredTweet) {
    await db.prepare('UPDATE tweets SET data = ?, created_at = ? WHERE id = ?')
      .bind(JSON.stringify(canonicalTweet(tweet)), tweet.createdAt, tweet.id)
      .run()
  }

  async function list(): Promise<StoredTweet[]> {
    const { results } = await db.prepare('SELECT data FROM tweets ORDER BY created_at DESC, rowid ASC').all<{ data: string }>()
    return results.map((row) => JSON.parse(row.data) as StoredTweet)
  }

  return {
    list,
    async add(tweet: StoredTweet) {
      const result = await db
        .prepare('INSERT OR IGNORE INTO tweets (id, created_at, data) VALUES (?, ?, ?)')
        .bind(tweet.id, tweet.createdAt, JSON.stringify(canonicalTweet(tweet)))
        .run()
      if (!result.meta.changes) throw new Error('这条帖子已经收录')
    },
    async remove(id: string): Promise<boolean> {
      const result = await db.prepare('DELETE FROM tweets WHERE id = ?').bind(id).run()
      return result.meta.changes > 0
    },
    async setFeatured(id: string, featured: boolean): Promise<boolean> {
      const tweet = await get(id)
      if (!tweet) return false
      if (featured) tweet.featured = true
      else {
        delete tweet.featured
        delete tweet.pickOrder
      }
      await save(tweet)
      return true
    },
    async setCategory(id: string, category: string): Promise<boolean> {
      if (!CATEGORY_IDS.includes(category as CategoryId)) return false
      const tweet = await get(id)
      if (!tweet) return false
      tweet.categories = [category as CategoryId]
      await save(tweet)
      return true
    },
    async moveFeatured(id: string, direction: 'up' | 'down'): Promise<boolean> {
      const ordered = featuredTweets(await list())
      const index = ordered.findIndex((item) => item.id === id)
      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return false
      const next = ordered.slice()
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      const statements = next.map((picked, order) =>
        db.prepare('UPDATE tweets SET data = ? WHERE id = ?')
          .bind(JSON.stringify(canonicalTweet({ ...picked, pickOrder: order })), picked.id),
      )
      await db.batch(statements)
      return true
    },
  }
}

type AlbumRow = { id: string; name: string; created_at: string }
type PhotoRow = { id: string; album_id: string; file: string; caption: string; created_at: string }

function toPhoto(row: PhotoRow): AlbumPhoto {
  return { id: row.id, file: row.file, caption: row.caption, createdAt: row.created_at }
}

export function createAlbumStore(db: D1Database) {
  async function list(): Promise<Album[]> {
    const [albums, photos] = await db.batch([
      db.prepare('SELECT id, name, created_at FROM albums ORDER BY position ASC, rowid ASC'),
      db.prepare('SELECT id, album_id, file, caption, created_at FROM photos ORDER BY rowid ASC'),
    ])
    const albumRows = albums.results as AlbumRow[]
    const photoRows = photos.results as PhotoRow[]
    return albumRows.map((album) => ({
      id: album.id,
      name: album.name,
      createdAt: album.created_at,
      photos: sortAlbumPhotos(photoRows.filter((photo) => photo.album_id === album.id).map(toPhoto)),
    }))
  }

  return {
    list,
    async get(id: string): Promise<Album | null> {
      return (await list()).find((album) => album.id === id) ?? null
    },
    async fileKnown(file: string): Promise<boolean> {
      return Boolean(await db.prepare('SELECT 1 AS ok FROM photos WHERE file = ?').bind(file).first())
    },
    async add(name: string): Promise<Album> {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('相册要有名字')
      const album: Album = { id: crypto.randomUUID(), name: trimmed, createdAt: new Date().toISOString(), photos: [] }
      await db
        .prepare('INSERT INTO albums (id, name, created_at, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM albums))')
        .bind(album.id, album.name, album.createdAt)
        .run()
      return album
    },
    async rename(id: string, name: string): Promise<boolean> {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('相册要有名字')
      const result = await db.prepare('UPDATE albums SET name = ? WHERE id = ?').bind(trimmed, id).run()
      return result.meta.changes > 0
    },
    async remove(id: string): Promise<Album | null> {
      const album = (await list()).find((item) => item.id === id) ?? null
      if (!album) return null
      await db.batch([
        db.prepare('DELETE FROM photos WHERE album_id = ?').bind(id),
        db.prepare('DELETE FROM albums WHERE id = ?').bind(id),
      ])
      return album
    },
    async addPhoto(albumId: string, photo: AlbumPhoto) {
      await db
        .prepare('INSERT INTO photos (id, album_id, file, caption, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(photo.id, albumId, photo.file, photo.caption, photo.createdAt)
        .run()
    },
    async updatePhoto(albumId: string, photoId: string, caption: string): Promise<boolean> {
      const result = await db
        .prepare('UPDATE photos SET caption = ? WHERE id = ? AND album_id = ?')
        .bind(caption.trim(), photoId, albumId)
        .run()
      return result.meta.changes > 0
    },
    async removePhoto(albumId: string, photoId: string): Promise<AlbumPhoto | null> {
      const row = await db
        .prepare('SELECT id, album_id, file, caption, created_at FROM photos WHERE id = ? AND album_id = ?')
        .bind(photoId, albumId)
        .first<PhotoRow>()
      if (!row) return null
      await db.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run()
      return toPhoto(row)
    },
  }
}
