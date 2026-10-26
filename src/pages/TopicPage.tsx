import { Link, useParams } from 'react-router-dom'
import { TweetCard } from '../components/TweetCard'
import { IconBack, VerifiedBadge } from '../components/Icons'
import { CATEGORIES } from '../lib/classify'
import { imageSrc } from '../lib/format'
import { ENHENG_AVATAR } from '../lib/profile'
import { featuredTweets, uniqueTweets } from '../lib/tweets'
import type { CategoryId } from '../lib/types'
import { useTimeline } from './useTimeline'
import { useTweets } from './useTweets'

const PROFILE_URL = 'https://x.com/EnHeng456'

export function TopicPage() {
  const { id = '' } = useParams()
  const isLatest = id === 'latest'
  const isPicks = id === 'picks'
  const { tweets, error } = useTweets()
  const timeline = useTimeline(isLatest)
  const category = CATEGORIES.find((item) => item.id === id)
  const known = isLatest || isPicks || Boolean(category)
  const title = isLatest ? '最新' : isPicks ? '精选' : category?.name
  const blurb = isPicks ? '你放进来的帖子。' : category?.blurb
  const archive = uniqueTweets(tweets ?? [])
  const visible = isLatest
    ? (timeline.tweets ?? [])
    : isPicks
      ? featuredTweets(archive)
      : archive.filter((tweet) => tweet.categories.includes(id as CategoryId))

  return (
    <>
      <div className="topbar topic-bar">
        <Link to="/" aria-label="返回主题">
          <IconBack size={20} />
        </Link>
        <div>
          <strong>{known ? title : '没有这个主题'}</strong>
          {known && !isLatest && tweets ? <span>{visible.length} 条帖子</span> : null}
        </div>
      </div>
      {isLatest ? (
        <header className="profile">
          <div className="profile-cover" />
          <div className="profile-row">
            <img className="profile-avatar" src={imageSrc(ENHENG_AVATAR)} alt="" />
            <a className="profile-follow" href={PROFILE_URL} target="_blank" rel="noreferrer">
              在 X 上查看
            </a>
          </div>
          <div className="profile-id">
            <h1>
              EnHeng嗯哼.Ai
              <VerifiedBadge />
            </h1>
            <a href={PROFILE_URL} target="_blank" rel="noreferrer">
              @EnHeng456
            </a>
          </div>
          <p className="profile-bio">嗯哼，05后A9，加密中文圈著名KOL，靠交易成就A9，崇尚终生学习，热衷慈善事业，目前公益捐赠逾百万！</p>
        </header>
      ) : known && blurb ? (
        <p className="topic-blurb">{blurb}</p>
      ) : null}
      {isLatest ? (
        <>
          {timeline.error ? <p className="status">{timeline.error}</p> : null}
          {timeline.tweets === null && !timeline.error ? <p className="status">正在读取主页</p> : null}
          {timeline.tweets && visible.length === 0 ? <p className="status">主页上还没有帖子</p> : null}
        </>
      ) : (
        <>
          {error ? <p className="status">{error}</p> : null}
          {tweets === null && !error ? <p className="status">正在加载</p> : null}
          {tweets && known && visible.length === 0 ? <p className="status">这个主题还没有帖子</p> : null}
        </>
      )}
      {visible.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
      {isLatest && timeline.next ? (
        <button type="button" className="timeline-more" onClick={() => void timeline.more()} disabled={timeline.loadingMore}>
          {timeline.loadingMore ? '正在读取' : '更早的帖子'}
        </button>
      ) : null}
    </>
  )
}
