import { Link } from 'react-router-dom'
import { TopicGlyph } from '../components/topicIcons'
import { CATEGORIES } from '../lib/classify'
import { useTweets } from './useTweets'

export function HomePage() {
  const { tweets, error } = useTweets()
  const items = [
    { id: 'latest', name: '最新', blurb: '所有精选，按时间倒序' },
    ...CATEGORIES.map((item) => ({ id: item.id, name: item.name, blurb: item.blurb })),
  ]

  return (
    <>
      <div className="topbar">主题</div>
      {error ? <p className="status">{error}</p> : null}
      {tweets === null && !error ? <p className="status">正在加载</p> : null}
      {tweets ? (
        <div>
          {items.map((item) => {
            const matched =
              item.id === 'latest' ? tweets : tweets.filter((tweet) => tweet.categories.includes(item.id as never))
            if (item.id !== 'latest' && matched.length === 0) return null
            const latest = matched[0]
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
                  <p>{item.blurb}</p>
                  <p className="snippet">{latest ? latest.text : '还没有帖子'}</p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
