import { Link } from 'react-router-dom'
import { TopicGlyph } from '../components/topicIcons'
import { CATEGORIES } from '../lib/classify'
import { featuredTweets, uniqueTweets } from '../lib/tweets'
import { useTimeline } from './useTimeline'
import { useTweets } from './useTweets'

export function HomePage() {
  const { tweets, error } = useTweets()
  const archive = tweets ? uniqueTweets(tweets) : null
  const picks = archive ? featuredTweets(archive) : null
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
      {error ? <p className="status">{error}</p> : null}
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
    </>
  )
}
