import type { AlbumPhoto } from './albumTypes'

function photoName(photo: AlbumPhoto) {
  return photo.caption.trim()
}

export function sortAlbumPhotos(photos: AlbumPhoto[]): AlbumPhoto[] {
  return [...photos].sort((a, b) => {
    const left = photoName(a)
    const right = photoName(b)
    if (!left && right) return 1
    if (left && !right) return -1
    const byName = left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' })
    if (byName !== 0) return byName
    return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
}
