export type AlbumPhoto = {
  id: string
  file: string
  caption: string
  createdAt: string
}

export type Album = {
  id: string
  name: string
  createdAt: string
  photos: AlbumPhoto[]
}
