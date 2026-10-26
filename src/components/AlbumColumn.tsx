import { ImagePlus, Moon, Pencil, Sun, Trash2, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [viewer, setViewer] = useState<AlbumPhoto | null>(null)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(albumsUrl())
      .then((response) => response.json())
      .then((list: { albums: Album[] }) => {
        if (cancelled) return
        const next = list.albums || []
        setAlbums(next)
        setSelectedId((current) => {
          if (current && next.some((album) => album.id === current)) return current
          return next.find((album) => album.photos.length > 0)?.id || next[0]?.id || ''
        })
      })
      .catch(() => {
        if (!cancelled) setMessage('相册没有加载出来')
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const selected = albums?.find((album) => album.id === selectedId) ?? null

  function apply(next: Album[]) {
    setAlbums(next)
    setSelectedId((current) => (next.some((album) => album.id === current) ? current : next[0]?.id || ''))
  }

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
    if (created) setSelectedId(created.id)
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

  async function upload(files: FileList | null) {
    if (!files || !selected) return
    setBusy(true)
    setMessage('')
    let latest: Album[] | null = null
    for (const file of files) {
      const dataUrl = await readFile(file)
      const response = await fetch(`/api/admin/albums/${selected.id}/photos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; albums?: Album[] }
      if (!response.ok || !data.albums) {
        setMessage(data.error || '这张图没有传上去')
        break
      }
      latest = data.albums
    }
    if (latest) apply(latest)
    setBusy(false)
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
      <ul className="album-list">
        {(albums || []).map((album) => (
          <li key={album.id}>
            <button type="button" className={album.id === selectedId ? 'on' : ''} onClick={() => setSelectedId(album.id)}>
              <span>{album.name}</span>
              <small>{album.photos.length}</small>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <section className="album-view">
          <div className="album-view-head">
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
                <label className={busy ? 'off' : ''}>
                  <ImagePlus size={16} />
                  上传
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={busy}
                    onChange={(event) => {
                      void upload(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
              </span>
            ) : null}
          </div>
          {selected.photos.length === 0 ? <p className="album-empty">这个相册还没有照片。</p> : null}
          <div className="photo-grid">
            {selected.photos.map((photo) => (
              <figure key={photo.id}>
                <button type="button" onClick={() => setViewer(photo)}>
                  <img src={albumFileSrc(photo.file)} alt={photo.caption || selected.name} />
                </button>
                {editing ? (
                  <input
                    defaultValue={photo.caption}
                    placeholder="给这张图写一句"
                    maxLength={80}
                    onBlur={(event) => void saveCaption(photo, event.target.value)}
                  />
                ) : photo.caption ? (
                  <figcaption>{photo.caption}</figcaption>
                ) : null}
                {editing ? (
                  <button type="button" className="photo-delete" aria-label="删除照片" onClick={() => void removePhoto(photo)}>
                    <X size={14} />
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {message ? <p className="album-message">{message}</p> : null}
      {viewer ? (
        <dialog className="lightbox" open onClick={() => setViewer(null)}>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={albumFileSrc(viewer.file)} alt={viewer.caption || ''} />
            {viewer.caption ? <figcaption>{viewer.caption}</figcaption> : null}
            <button type="button" onClick={() => setViewer(null)} aria-label="关闭">
              <X size={18} />
            </button>
          </figure>
        </dialog>
      ) : null}
    </header>
  )
}
