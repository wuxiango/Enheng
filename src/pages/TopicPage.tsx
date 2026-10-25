import { Link, useParams } from 'react-router-dom'
import { TweetCard } from '../components/TweetCard'
import { IconBack } from '../components/Icons'
import { CATEGORIES } from '../lib/classify'
import type { CategoryId } from '../lib/types'
import { useTweets } from './useTweets'

export function TopicPage() {
  const { id = '' } = useParams()
  const { tweets, error } = useTweets()
  const category = CATEGORIES.find((item) => item.id === id)
  const known = id === 'latest' || Boolean(category)
  const title = id === 'latest' ? '最新' : category?.name
  const blurb = id === 'latest' ? '所有精选，按时间倒序' : category?.blurb
  const visible = (tweets ?? []).filter((tweet) => id === 'latest' || tweet.categories.includes(id as CategoryId))

  return (
    <>
      <div className="topbar topic-bar">
        <Link to="/" aria-label="返回主题">
          <IconBack size={20} />
        </Link>
        <div>
          <strong>{known ? title : '没有这个主题'}</strong>
          {known && tweets ? <span>{visible.length} 条帖子</span> : null}
        </div>
      </div>
      {known && blurb ? <p className="topic-blurb">{blurb}</p> : null}
      {error ? <p className="status">{error}</p> : null}
      {tweets === null && !error ? <p className="status">正在加载</p> : null}
      {tweets && known && visible.length === 0 ? <p className="status">这个主题还没有帖子</p> : null}
      {visible.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
    </>
  )
}
