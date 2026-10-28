import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TweetCard } from '../components/TweetCard'
import { TopicGlyph } from '../components/topicIcons'
import { CATEGORIES } from '../lib/classify'
import { featuredTweets, uniqueTweets } from '../lib/tweets'
import type { StoredTweet } from '../lib/types'
import { useTimeline } from './useTimeline'
import { useTweets } from './useTweets'

function matchesQuery(tweet: StoredTweet, query: string) {
  const raw = query.trim()
  if (!raw) return false
  const id = raw.match(/status\/(\d+)/)?.[1]
  if (id) return tweet.id === id
  const needle = raw.toLowerCase()
  return tweet.text.toLowerCase().includes(needle) || tweet.id.includes(raw)
}

export function HomePage() {
  const { tweets, error } = useTweets()
  const [query, setQuery] = useState('')
  const archive = tweets ? uniqueTweets(tweets) : null
  const picks = archive ? featuredTweets(archive) : null
  const found = archive && query.trim() ? archive.filter((tweet) => matchesQuery(tweet, query)) : null
  const timeline = useTimeline()
  const newest = timeline.tweets?.[0]
  const latestText = timeline.error
    ? timeline.error
    : newest
      ? newest.text
      : timeline.tweets
        ? '主页上还没有帖子'
        : '正在读取主页'

  return (
    <>
      <div className="topbar">主题</div>
      <form className="home-search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr" htmlFor="home-find">搜索收录</label>
        <input
          id="home-find"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索收录的帖子"
        />
      </form>
      {error ? <p className="status">{error}</p> : null}
      {found ? (
        <>
          <p className="status">{found.length > 0 ? `找到 ${found.length} 条` : '没有找到这条收录'}</p>
          {found.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} />
          ))}
        </>
      ) : (
      <div>
        <Link to="/topic/latest" className="topic-row">
          <span className="topic-mark">
            <TopicGlyph id="latest" size={20} />
          </span>
          <div className="topic-copy">
            <div className="topic-name">最新</div>
            <p className="snippet">{latestText}</p>
          </div>
        </Link>
        {tweets === null && !error ? <p className="status">正在加载</p> : null}
        {picks ? (
          <Link to="/topic/picks" className="topic-row picks">
            <span className="topic-mark">
              <TopicGlyph id="picks" size={20} />
            </span>
            <div className="topic-copy">
              <div className="topic-name">
                精选
                <span>{picks.length} 条</span>
              </div>
              <p className="snippet">{picks[0]?.text ?? '还没有帖子'}</p>
            </div>
          </Link>
        ) : null}
        {archive
          ? CATEGORIES.map((item) => {
              const matched = archive.filter((tweet) => tweet.categories.includes(item.id))
              return (
                <Link key={item.id} to={`/topic/${item.id}`} className="topic-row">
                  <span className="topic-mark">
                    <TopicGlyph id={item.id} size={20} />
                  </span>
                  <div className="topic-copy">
                    <div className="topic-name">
                      {item.name}
                      <span>{matched.length} 条</span>
                    </div>
                    <p className="snippet">{matched[0]?.text ?? '还没有帖子'}</p>
                  </div>
                </Link>
              )
            })
          : null}
      </div>
      )}
    </>
  )
}
