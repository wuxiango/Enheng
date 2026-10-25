import { LogIn, LogOut, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useAdminSession } from '../components/adminSession'
import { CATEGORIES } from '../lib/classify'
import type { StoredTweet } from '../lib/types'
import { formatTweetTime } from '../lib/format'

export function AdminPage() {
  const { authed, setAuthed } = useAdminSession()
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [tweets, setTweets] = useState<StoredTweet[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadTweets() {
    const response = await fetch('/api/tweets')
    const data = (await response.json()) as { tweets: StoredTweet[] }
    setTweets(data.tweets)
  }

  async function login(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
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
    const response = await fetch('/api/admin/tweets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = (await response.json()) as { error?: string; tweet?: StoredTweet }
    setBusy(false)
    if (!response.ok) {
      setMessage(data.error || '收录失败')
      return
    }
    setUrl('')
    const names = CATEGORIES.filter((item) => data.tweet?.categories.includes(item.id)).map((item) => item.name)
    setMessage(`已收录，分到：${names.join('、') || '其他'}`)
    await loadTweets()
  }

  async function remove(tweet: StoredTweet) {
    if (!window.confirm('从精选里删除这条帖子？')) return
    const response = await fetch(`/api/admin/tweets/${tweet.id}`, { method: 'DELETE' })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setMessage(data.error || '删除失败')
      return
    }
    setMessage('已删除')
    await loadTweets()
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthed(false)
    setTweets([])
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
          <ul className="admin-list">
            {tweets.map((tweet) => (
              <li key={tweet.id}>
                <div>
                  <time dateTime={tweet.createdAt}>{formatTweetTime(tweet.createdAt)}</time>
                  <p>{tweet.text}</p>
                </div>
                <button type="button" className="danger" onClick={() => remove(tweet)}>
                  <Trash2 size={16} strokeWidth={1.75} />
                  删除
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {message ? <p className="status">{message}</p> : null}
    </>
  )
}
