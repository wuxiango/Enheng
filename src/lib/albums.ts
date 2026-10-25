import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Album, AlbumPhoto } from './albumTypes'

type FileShape = { albums: Album[] }

export function createAlbumStore(file: string) {
  function read(): Album[] {
    if (!existsSync(file)) return []
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as FileShape
    return parsed.albums ?? []
  }

  function write(albums: Album[]) {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify({ albums }, null, 2))
  }

  return {
    list(): Album[] {
      return read()
    },
    add(name: string): Album {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('相册要有名字')
      const albums = read()
      const album: Album = {
        id: randomUUID(),
        name: trimmed,
        createdAt: new Date().toISOString(),
        photos: [],
      }
      albums.push(album)
      write(albums)
      return album
    },
    rename(id: string, name: string): boolean {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('相册要有名字')
      const albums = read()
      const album = albums.find((item) => item.id === id)
      if (!album) return false
      album.name = trimmed
      write(albums)
      return true
    },
    remove(id: string): Album | null {
      const albums = read()
      const album = albums.find((item) => item.id === id) ?? null
      if (!album) return null
      write(albums.filter((item) => item.id !== id))
      return album
    },
    addPhoto(albumId: string, photo: AlbumPhoto): boolean {
      const albums = read()
      const album = albums.find((item) => item.id === albumId)
      if (!album) return false
      album.photos.push(photo)
      write(albums)
      return true
    },
    updatePhoto(albumId: string, photoId: string, caption: string): boolean {
      const albums = read()
      const photo = albums.find((item) => item.id === albumId)?.photos.find((item) => item.id === photoId)
      if (!photo) return false
      photo.caption = caption.trim()
      write(albums)
      return true
    },
    removePhoto(albumId: string, photoId: string): AlbumPhoto | null {
      const albums = read()
      const album = albums.find((item) => item.id === albumId)
      if (!album) return null
      const photo = album.photos.find((item) => item.id === photoId) ?? null
      if (!photo) return null
      album.photos = album.photos.filter((item) => item.id !== photoId)
      write(albums)
      return photo
    },
  }
}
