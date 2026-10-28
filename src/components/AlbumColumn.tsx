import { ArrowLeft, ImagePlus, Moon, Pencil, Sun, Trash2, X } from 'lucide-react'
import { FormEvent, TouchEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { sortAlbumPhotos } from '../lib/albumOrder'
import type { Album, AlbumPhoto } from '../lib/albumTypes'
import { albumsUrl, albumFileSrc, imageSrc } from '../lib/format'
import { ENHENG_AVATAR } from '../lib/profile'
import { useAdminSession } from './adminSession'

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AlbumColumn({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const location = useLocation()
  const { authed } = useAdminSession()
  const editing = authed && location.pathname === '/admin'
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [openedId, setOpenedId] = useState('')
  const [message, setMessage] = useState('')
  const [viewer, setViewer] = useState<AlbumPhoto | null>(null)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch(albumsUrl())
      .then((response) => response.json())
      .then((list: { albums: Album[] }) => {
        if (cancelled) return
        const next = list.albums || []
        setAlbums(next)
        setOpenedId((current) => (current && next.some((album) => album.id === current) ? current : ''))
      })
      .catch(() => {
        if (!cancelled) setMessage('相册没有加载出来')
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const selected = albums?.find((album) => album.id === openedId) ?? null
  const photos = selected ? sortAlbumPhotos(selected.photos) : []

  function apply(next: Album[]) {
    setAlbums(next)
    setOpenedId((current) => (next.some((album) => album.id === current) ? current : ''))
  }

  function closeAlbum() {
    setOpenedId('')
    setViewer(null)
    setRenaming('')
  }

  function stepPhoto(delta: number) {
    if (!viewer || photos.length < 2) return
    const index = photos.findIndex((photo) => photo.id === viewer.id)
    if (index < 0) return
    const count = photos.length
    setViewer(photos[(index + delta + count) % count])
  }

  function onSwipeStart(event: TouchEvent) {
    if (event.touches.length !== 1) return
    swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function onSwipeEnd(event: TouchEvent) {
    const start = swipeStart.current
    swipeStart.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    swiped.current = true
    stepPhoto(dx < 0 ? 1 : -1)
  }

  useEffect(() => {
    if (!viewer) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewer(null)
      if (event.key === 'ArrowRight') stepPhoto(1)
      if (event.key === 'ArrowLeft') stepPhoto(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer, selected])

  async function createAlbum(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/albums', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: draft }),
    })
    const data = (await response.json()) as { error?: string; albums?: Album[] }
    setBusy(false)
    if (!response.ok || !data.albums) {
      setMessage(data.error || '没有建成')
      return
    }
    setDraft('')
    apply(data.albums)
    const created = data.albums[data.albums.length - 1]
    if (created) setOpenedId(created.id)
  }

  async function saveName(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setBusy(true)
    setMessage('')
    const response = await fetch(`/api/admin/albums/${selected.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: renameValue }),
    })
    const data = (await response.json()) as { error?: string; albums?: Album[] }
    setBusy(false)
    if (!response.ok || !data.albums) {
      setMessage(data.error || '没有改成')
      return
    }
    setRenaming('')
    apply(data.albums)
  }

  async function removeAlbum() {
    if (!selected) return
    if (!window.confirm(`删除相册「${selected.name}」和里面的照片？`)) return
    const response = await fetch(`/api/admin/albums/${selected.id}`, { method: 'DELETE' })
    const data = (await response.json()) as { error?: string; albums?: Album[] }
    if (!response.ok || !data.albums) {
      setMessage(data.error || '没有删掉')
      return
    }
    apply(data.albums)
  }

  async function upload(list: File[]) {
    if (list.length === 0 || !selected) return
    setBusy(true)
    setMessage(list.length > 1 ? `正在上传 ${list.length} 张…` : '')
    let latest: Album[] | null = null
    let saved = 0
    let failed = 0
    let reason = ''
    for (const file of list) {
      const dataUrl = await readFile(file)
      const response = await fetch(`/api/admin/albums/${selected.id}/photos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; albums?: Album[] }
      if (!response.ok || !data.albums) {
        failed += 1
        reason = data.error || '这张图没有传上去'
        continue
      }
      saved += 1
      latest = data.albums
    }
    if (latest) apply(latest)
    setBusy(false)
    if (list.length > 1) {
      setMessage(failed ? `上传了 ${saved} 张，${failed} 张没有传上。${reason}` : `上传了 ${saved} 张`)
    } else if (failed) {
      setMessage(reason || '这张图没有传上去')
    } else {
      setMessage('')
    }
  }

  async function saveCaption(photo: AlbumPhoto, caption: string) {
    if (!selected || caption === photo.caption) return
    const response = await fetch(`/api/admin/albums/${selected.id}/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caption }),
    })
    const data = (await response.json()) as { error?: string; albums?: Album[] }
    if (!response.ok || !data.albums) {
      setMessage(data.error || '说明没有保存')
      return
    }
    apply(data.albums)
  }

  async function removePhoto(photo: AlbumPhoto) {
    if (!selected) return
    if (!window.confirm('从相册里删除这张照片？')) return
    const response = await fetch(`/api/admin/albums/${selected.id}/photos/${photo.id}`, { method: 'DELETE' })
    const data = (await response.json()) as { error?: string; albums?: Album[] }
    if (!response.ok || !data.albums) {
      setMessage(data.error || '没有删掉')
      return
    }
    apply(data.albums)
    setViewer((current) => (current?.id === photo.id ? null : current))
  }

  return (
    <header className="album-col">
      <div className="album-tools">
        <NavLink to="/" className="logo" end aria-label="嗯哼精选">
          <img src={imageSrc(ENHENG_AVATAR)} alt="" />
        </NavLink>
        <button type="button" className="album-theme" onClick={onToggleTheme} aria-label={dark ? '切换到白天' : '切换到黑夜'}>
          {dark ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
        </button>
        <NavLink to="/admin" className="admin-entry">
          管理
        </NavLink>
      </div>
      <h2>嗯哼相册</h2>
      <p className="album-note">按场次收他公开过的图片。</p>
      {editing ? (
        <form className="album-create" onSubmit={createAlbum}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="新相册的名字" maxLength={40} />
          <button type="submit" disabled={busy || !draft.trim()}>
            新建
          </button>
        </form>
      ) : null}
      {selected ? (
        <section className="album-view">
          <div className="album-view-head">
            <button type="button" className="album-back" onClick={closeAlbum}>
              <ArrowLeft size={16} />
              相册
            </button>
            {editing && renaming === selected.id ? (
              <form onSubmit={saveName}>
                <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={40} />
                <button type="submit" disabled={busy}>
                  保存
                </button>
              </form>
            ) : (
              <strong>{selected.name}</strong>
            )}
            {editing && renaming !== selected.id ? (
              <span className="album-view-actions">
                <button
                  type="button"
                  aria-label="改名"
                  onClick={() => {
                    setRenaming(selected.id)
                    setRenameValue(selected.name)
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button type="button" aria-label="删除相册" onClick={removeAlbum}>
                  <Trash2 size={16} />
                </button>
                <label className={busy ? 'off' : ''} title="上传照片" aria-label="上传照片">
                  <ImagePlus size={16} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={busy}
                    onChange={(event) => {
                      const picked = Array.from(event.target.files || [])
                      event.target.value = ''
                      void upload(picked)
                    }}
                  />
                </label>
              </span>
            ) : null}
          </div>
          {photos.length === 0 ? <p className="album-empty">这个相册还没有照片。</p> : null}
          <div className="photo-grid">
            {photos.map((photo) => (
              <figure key={photo.id}>
                <button type="button" onClick={() => setViewer(photo)} aria-label={photo.caption || '查看原图'}>
                  <img src={albumFileSrc(photo.file)} alt="" />
                </button>
                {editing ? (
                  <input
                    defaultValue={photo.caption}
                    placeholder="给这张图写一句"
                    maxLength={80}
                    onBlur={(event) => void saveCaption(photo, event.target.value)}
                  />
                ) : null}
                {editing ? (
                  <button
                    type="button"
                    className="photo-delete"
                    aria-label="删除照片"
                    onClick={(event) => {
                      event.stopPropagation()
                      void removePhoto(photo)
                    }}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : (
        <ul className="album-list">
          {(albums || []).map((album) => (
            <li key={album.id}>
              <button type="button" onClick={() => setOpenedId(album.id)}>
                <span>{album.name}</span>
                <small>{album.photos.length}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message ? <p className={message.startsWith('上传了') && !message.includes('没有') ? 'album-message ok' : 'album-message'}>{message}</p> : null}
      {viewer
        ? createPortal(
            <div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="原图"
              onClick={() => {
                if (swiped.current) {
                  swiped.current = false
                  return
                }
                setViewer(null)
              }}
              onTouchStart={onSwipeStart}
              onTouchEnd={onSwipeEnd}
            >
              <div className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
                <img src={albumFileSrc(viewer.file)} alt={viewer.caption || selected?.name || ''} draggable={false} />
              </div>
              {viewer.caption ? <p className="lightbox-caption">{viewer.caption}</p> : null}
              <div className="lightbox-bar" onClick={(event) => event.stopPropagation()}>
                {photos.length > 1 ? (
                  <>
                    <button type="button" onClick={() => stepPhoto(-1)}>
                      上一张
                    </button>
                    <button type="button" onClick={() => stepPhoto(1)}>
                      下一张
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={() => setViewer(null)}>
                  退出
                </button>
                <button type="button" onClick={closeAlbum}>
                  其他相册
                </button>
                {editing ? (
                  <button type="button" className="lightbox-delete" onClick={() => void removePhoto(viewer)}>
                    删除这张
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  )
}
