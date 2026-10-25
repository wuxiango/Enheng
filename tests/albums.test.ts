import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createAlbumStore } from '../src/lib/albums'
import { decodeImageDataUrl } from '../src/lib/imageData'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('createAlbumStore', () => {
  it('能新建、改名，空名字会被拒绝', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'albums.json')
    const store = createAlbumStore(file)
    const album = store.add('  嗯哼火锅节  ')
    expect(album.name).toBe('嗯哼火锅节')
    expect(store.rename(album.id, '火锅')).toBe(true)
    expect(store.list()[0]?.name).toBe('火锅')
    expect(() => store.add('   ')).toThrow(/名字/)
    expect(store.rename('missing', '别的')).toBe(false)
  })

  it('照片跟着相册走，删相册时把照片一并交出去', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'enheng-')), 'albums.json')
    const store = createAlbumStore(file)
    const album = store.add('其他')
    expect(store.addPhoto(album.id, { id: 'p1', file: 'p1.jpg', caption: '封面', createdAt: '2026-07-14T00:00:00.000Z' })).toBe(true)
    expect(store.updatePhoto(album.id, 'p1', '  成都  ')).toBe(true)
    expect(store.list()[0]?.photos[0]?.caption).toBe('成都')
    const removed = store.remove(album.id)
    expect(removed?.photos.map((photo) => photo.file)).toEqual(['p1.jpg'])
    expect(store.list()).toEqual([])
    expect(store.removePhoto(album.id, 'p1')).toBeNull()
  })
})

describe('decodeImageDataUrl', () => {
  it('接受一小张真正的 png，拒绝假图片', () => {
    expect(decodeImageDataUrl(PNG)?.ext).toBe('png')
    expect(decodeImageDataUrl('data:image/png;base64,aGVsbG8=')).toBeNull()
    expect(decodeImageDataUrl('https://example.com/a.jpg')).toBeNull()
  })
})
