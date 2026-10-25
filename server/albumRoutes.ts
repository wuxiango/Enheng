import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Express, Request, Response } from 'express'
import { createAlbumStore } from '../src/lib/albums'
import { decodeImageDataUrl } from '../src/lib/imageData'

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function mountAlbums(app: Express, options: { root: string; isAdmin: (cookie: string | undefined) => boolean }) {
  const file = join(options.root, 'data', 'albums.json')
  const dir = join(options.root, 'data', 'album-images')
  const store = createAlbumStore(file)
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    // 托管环境的磁盘是只读的，已有照片仍然可以读取
  }

  function requireAdmin(req: Request, res: Response): boolean {
    if (options.isAdmin(req.headers.cookie)) return true
    res.status(401).json({ error: '需要管理员登录' })
    return false
  }

  function unlinkQuiet(name: string) {
    const path = join(dir, name)
    if (existsSync(path)) unlinkSync(path)
  }

  app.get('/api/albums', (_req, res) => {
    res.json({ albums: store.list() })
  })

  app.get('/api/album-files/:file', (req, res) => {
    const name = req.params.file
    if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/.test(name)) {
      res.status(400).end()
      return
    }
    const known = store.list().some((album) => album.photos.some((photo) => photo.file === name))
    const path = join(dir, name)
    if (!known || !existsSync(path)) {
      res.status(404).end()
      return
    }
    const ext = name.slice(name.lastIndexOf('.') + 1)
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(readFileSync(path))
  })

  app.post('/api/admin/albums', (req, res) => {
    if (!requireAdmin(req, res)) return
    try {
      store.add(String(req.body?.name || ''))
      res.status(201).json({ albums: store.list() })
    } catch (error) {
      const message = error instanceof Error ? error.message : '没有建成'
      res.status(400).json({ error: message })
    }
  })

  app.patch('/api/admin/albums/:id', (req, res) => {
    if (!requireAdmin(req, res)) return
    try {
      const ok = store.rename(req.params.id, String(req.body?.name || ''))
      if (!ok) {
        res.status(404).json({ error: '没有这个相册' })
        return
      }
      res.json({ albums: store.list() })
    } catch (error) {
      const message = error instanceof Error ? error.message : '没有改成'
      res.status(400).json({ error: message })
    }
  })

  app.delete('/api/admin/albums/:id', (req, res) => {
    if (!requireAdmin(req, res)) return
    const removed = store.remove(req.params.id)
    if (!removed) {
      res.status(404).json({ error: '没有这个相册' })
      return
    }
    for (const photo of removed.photos) unlinkQuiet(photo.file)
    res.json({ albums: store.list() })
  })

  app.post('/api/admin/albums/:id/photos', (req, res) => {
    if (!requireAdmin(req, res)) return
    const album = store.list().find((item) => item.id === req.params.id)
    if (!album) {
      res.status(404).json({ error: '没有这个相册' })
      return
    }
    if (album.photos.length >= 80) {
      res.status(400).json({ error: '这个相册已经有 80 张，先删掉一些再传' })
      return
    }
    const decoded = decodeImageDataUrl(String(req.body?.dataUrl || ''))
    if (!decoded) {
      res.status(400).json({ error: '请上传 8MB 以内的 jpg、png、webp 或 gif' })
      return
    }
    const id = randomUUID()
    const filename = `${id}.${decoded.ext}`
    writeFileSync(join(dir, filename), decoded.body)
    const caption = String(req.body?.caption || '').trim().slice(0, 80)
    store.addPhoto(album.id, { id, file: filename, caption, createdAt: new Date().toISOString() })
    res.status(201).json({ albums: store.list() })
  })

  app.patch('/api/admin/albums/:id/photos/:photoId', (req, res) => {
    if (!requireAdmin(req, res)) return
    const caption = String(req.body?.caption || '').slice(0, 80)
    const ok = store.updatePhoto(req.params.id, req.params.photoId, caption)
    if (!ok) {
      res.status(404).json({ error: '没有这张照片' })
      return
    }
    res.json({ albums: store.list() })
  })

  app.delete('/api/admin/albums/:id/photos/:photoId', (req, res) => {
    if (!requireAdmin(req, res)) return
    const removed = store.removePhoto(req.params.id, req.params.photoId)
    if (!removed) {
      res.status(404).json({ error: '没有这张照片' })
      return
    }
    unlinkQuiet(removed.file)
    res.json({ albums: store.list() })
  })
}
