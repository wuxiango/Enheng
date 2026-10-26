import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { TweetCard } from '../components/TweetCard'
import { IconBack } from '../components/Icons'
import { fetchStatus } from '../lib/timeline'
import type { StoredTweet } from '../lib/types'
import { useTimeline } from './useTimeline'
import { useTweets } from './useTweets'

export function StatusPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { tweets, error } = useTweets()
  const timeline = useTimeline(true)
  const [remote, setRemote] = useState<StoredTweet | null>(null)
  const [settled, setSettled] = useState(false)
  const stored = tweets?.find((item) => item.id === id) ?? null
  const live = timeline.tweets?.find((item) => item.id === id) ?? null
  const tweet = live ?? stored ?? remote

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    let cancel = false
    setRemote(null)
    setSettled(false)
    fetchStatus(id)
      .then((found) => {
        if (cancel) return
        setRemote(found)
        setSettled(true)
      })
      .catch(() => {
        if (!cancel) setSettled(true)
      })
    return () => {
      cancel = true
    }
  }, [id])

  function back() {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  const archiveDone = tweets !== null || Boolean(error)
  const timelineDone = timeline.tweets !== null || Boolean(timeline.error)
  const missing = !tweet && settled && archiveDone && timelineDone

  return (
    <>
      <div className="topbar topic-bar">
        <button type="button" onClick={back} aria-label="返回">
          <IconBack size={20} />
        </button>
        <div>
          <strong>帖子</strong>
        </div>
      </div>
      {tweet ? <TweetCard tweet={tweet} layout="post" /> : null}
      {!tweet && !missing ? <p className="status">正在打开</p> : null}
      {missing ? (
        <p className="status">
          没有这条帖子。<Link to="/">回首页</Link>
        </p>
      ) : null}
    </>
  )
}
