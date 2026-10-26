import { ListPlus, LogIn, LogOut, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useAdminSession } from '../components/adminSession'
import { CATEGORIES } from '../lib/classify'
import type { StoredTweet } from '../lib/types'
import { formatTweetTime } from '../lib/format'
import { stripDuplicateLinks } from '../lib/url'

export function AdminPage() {
  const { authed, setAuthed } = useAdminSession()
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [batch, setBatch] = useState('')
  const [tweets, setTweets] = useState<StoredTweet[]>([])
  const [message, setMessage] = useState('')
  const [failures, setFailures] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [featureOne, setFeatureOne] = useState(false)
  const [featureBatch, setFeatureBatch] = useState(false)

  async function loadTweets() {
    const response = await fetch('/api/tweets')
    const data = (await response.json()) as { tweets: StoredTweet[] }
    setTweets(data.tweets)
  }

  async function login(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setFailures([])
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = (await response.json()) as { error?: string }
    setBusy(false)
    if (!response.ok) {
      setMessage(data.error || '登录失败')
      return
    }
    setPassword('')
    setAuthed(true)
    await loadTweets()
  }

  async function addTweet(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setFailures([])
    const response = await fetch('/api/admin/tweets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, featured: featureOne }),
    })
    const data = (await response.json()) as { error?: string; tweet?: StoredTweet }
    setBusy(false)
    if (!response.ok) {
      setMessage(data.error || '收录失败')
      return
    }
    setUrl('')
    const names = CATEGORIES.filter((item) => data.tweet?.categories.includes(item.id)).map((item) => item.name)
    setMessage(featureOne ? `已收录并放入精选，分到：${names.join('、') || '其他'}` : `已收录，分到：${names.join('、') || '其他'}`)
    await loadTweets()
  }

  async function addBatch(event: FormEvent) {
    event.preventDefault()
    const cleaned = stripDuplicateLinks(batch, tweets.map((tweet) => tweet.id))
    if (cleaned.text.trim() === '') {
      setBatch('')
      setFailures([])
      setMessage(cleaned.removed ? `已去掉 ${cleaned.removed} 条重复链接` : '请贴帖子链接，一行一条')
      return
    }
    setBatch(cleaned.text)
    setBusy(true)
    setMessage('正在批量收录…')
    setFailures([])
    const response = await fetch('/api/admin/tweets/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: cleaned.text, featured: featureBatch }),
    })
    const data = (await response.json()) as {
      error?: string
      added?: StoredTweet[]
      failed?: { raw: string; error: string }[]
      overflow?: number
      duplicates?: number
    }
    setBusy(false)
    if (!response.ok) {
      setMessage(data.error || '批量收录失败')
      return
    }
    const added = data.added?.length ?? 0
    const failed = data.failed ?? []
    const duplicates = (data.duplicates ?? 0) + cleaned.removed
    const overflow = data.overflow ? `还有 ${data.overflow} 条超出一次 40 条的上限，没有处理。` : ''
    const skipped = duplicates ? `去掉了 ${duplicates} 条重复链接。` : ''
    const picked = featureBatch && added > 0 ? '已放入精选。' : ''
    setMessage(`收录了 ${added} 条。${picked}${skipped}${failed.length ? `${failed.length} 条没有收下来。` : ''}${overflow}`)
    setFailures(failed.map((item) => `${item.error}：${item.raw}`))
    if (added > 0 || duplicates > 0) setBatch('')
    await loadTweets()
  }

  async function remove(tweet: StoredTweet) {
    if (!window.confirm('从收录里删除这条帖子？')) return
    const response = await fetch(`/api/admin/tweets/${tweet.id}`, { method: 'DELETE' })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setMessage(data.error || '删除失败')
      return
    }
    setMessage('已删除')
    setFailures([])
    await loadTweets()
  }

  async function toggleFeatured(tweet: StoredTweet) {
    const featured = tweet.featured !== true
    const response = await fetch(`/api/admin/tweets/${tweet.id}/featured`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ featured }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setMessage(data.error || '没有放进精选')
      return
    }
    setMessage(featured ? '已放入精选' : '已移出精选')
    setFailures([])
    await loadTweets()
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthed(false)
    setTweets([])
    setFailures([])
  }

  return (
    <>
      <div className="topbar">管理</div>
      {!authed ? (
        <form className="admin-form" onSubmit={login}>
          <p>输入管理员密码后，才能收录帖子、上传照片和删除。相册仍在左侧，登录后在那边改。</p>
          <label htmlFor="password">管理员密码</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy}>
            <LogIn size={16} strokeWidth={1.75} />
            登录
          </button>
        </form>
      ) : null}
      {authed ? (
        <>
          <form className="admin-form" onSubmit={addTweet}>
            <label htmlFor="tweet-url">帖子链接</label>
            <input
              id="tweet-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/EnHeng456/status/..."
            />
            <label className="admin-check">
              <input type="checkbox" checked={featureOne} onChange={(event) => setFeatureOne(event.target.checked)} />
              放入精选
            </label>
            <div className="admin-actions">
              <button type="submit" disabled={busy || url.trim() === ''}>
                <Plus size={16} strokeWidth={1.75} />
                收录
              </button>
              <button type="button" className="ghost" onClick={logout}>
                <LogOut size={16} strokeWidth={1.75} />
                退出
              </button>
            </div>
          </form>
          <form className="admin-form" onSubmit={addBatch}>
            <label htmlFor="tweet-batch">批量收录</label>
            <textarea
              id="tweet-batch"
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              placeholder={'一行一条，一次最多 40 条\nhttps://x.com/EnHeng456/status/...'}
              rows={6}
            />
            <label className="admin-check">
              <input type="checkbox" checked={featureBatch} onChange={(event) => setFeatureBatch(event.target.checked)} />
              这批放入精选
            </label>
            <div className="admin-actions">
              <button type="submit" disabled={busy || batch.trim() === ''}>
                <ListPlus size={16} strokeWidth={1.75} />
                批量收录
              </button>
            </div>
          </form>
          {failures.length > 0 ? (
            <ul className="admin-failures">
              {failures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <ul className="admin-list">
            {tweets.map((tweet) => (
              <li key={tweet.id}>
                <div>
                  <time dateTime={tweet.createdAt}>{formatTweetTime(tweet.createdAt)}</time>
                  <p>{tweet.text}</p>
                </div>
                <div className="admin-item-actions">
                  <button type="button" className={tweet.featured ? 'picked' : 'ghost'} onClick={() => void toggleFeatured(tweet)}>
                    {tweet.featured ? '移出精选' : '放入精选'}
                  </button>
                  <button type="button" className="danger" onClick={() => remove(tweet)}>
                    <Trash2 size={16} strokeWidth={1.75} />
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {message ? <p className="status">{message}</p> : null}
    </>
  )
}
