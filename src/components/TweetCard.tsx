import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../lib/classify'
import { formatCount, formatTweetTime, imageSrc } from '../lib/format'
import type { Media, QuoteTweet, StoredTweet } from '../lib/types'
import { IconLike, IconPlay, IconReply, IconRepost, IconShot, IconViews, VerifiedBadge } from './Icons'

function TweetText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g)
  return (
    <p className="tweet-text">
      {parts.map((part, index) =>
        part.startsWith('http') ? (
          <a key={index} href={part} target="_blank" rel="noreferrer">
            {part.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  )
}

function MediaGrid({ media, href }: { media: Media[]; href: string }) {
  if (media.length === 0) return null
  return (
    <div className={`media media-${Math.min(media.length, 4)}`}>
      {media.slice(0, 4).map((item) => (
        <a key={item.url} href={href} target="_blank" rel="noreferrer" className="media-link">
          <img src={imageSrc(item.url)} alt="" />
          {item.type === 'video' ? (
            <span className="play">
              <IconPlay size={16} />
            </span>
          ) : null}
        </a>
      ))}
    </div>
  )
}

function Quote({ quote }: { quote: QuoteTweet }) {
  return (
    <div className="quote">
      <div className="quote-head">
        {quote.authorAvatar ? <img src={imageSrc(quote.authorAvatar)} alt="" /> : null}
        <strong>{quote.authorName}</strong>
        {quote.verified ? <VerifiedBadge /> : null}
        <span>@{quote.authorHandle}</span>
        <span>·</span>
        <span>{formatTweetTime(quote.createdAt)}</span>
      </div>
      <TweetText text={quote.text} />
      <MediaGrid media={quote.media} href={`https://x.com/${quote.authorHandle}`} />
    </div>
  )
}

export function TweetCard({ tweet }: { tweet: StoredTweet }) {
  const cardRef = useRef<HTMLElement>(null)
  const [shotError, setShotError] = useState('')
  const names = CATEGORIES.filter((item) => tweet.categories.includes(item.id))

  async function shoot() {
    const node = cardRef.current
    if (!node) return
    setShotError('')
    try {
      const backgroundColor = getComputedStyle(document.body).backgroundColor
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor,
        // 图片都走 /api/img?url=，默认缓存会丢掉查询参数，第二张截图会串成同一张图
        includeQueryParams: true,
        filter: (domNode) => !(domNode instanceof HTMLElement && domNode.classList.contains('no-shot')),
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `enheng-${tweet.id}.png`
      link.click()
    } catch {
      setShotError('这张图没有保存下来，可以再试一次')
    }
  }

  return (
    <article className="tweet" ref={cardRef}>
      <img className="avatar" src={imageSrc(tweet.authorAvatar)} alt="" />
      <div className="tweet-body">
        <header className="tweet-head">
          <a href={tweet.url} target="_blank" rel="noreferrer">
            <strong>{tweet.authorName}</strong>
          </a>
          {tweet.verified ? <VerifiedBadge /> : null}
          <a className="handle" href={tweet.url} target="_blank" rel="noreferrer">
            @{tweet.authorHandle}
          </a>
          <span className="dot">·</span>
          <a className="time" href={tweet.url} target="_blank" rel="noreferrer">
            <time dateTime={tweet.createdAt}>{formatTweetTime(tweet.createdAt)}</time>
          </a>
        </header>
        <TweetText text={tweet.text} />
        {tweet.quote ? <Quote quote={tweet.quote} /> : null}
        <MediaGrid media={tweet.media} href={tweet.url} />
        {names.length > 0 ? (
          <div className="topics">
            {names.map((item) => (
              <Link key={item.id} to={`/topic/${item.id}`}>
                #{item.name}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="actions">
          <span className="metric reply">
            <span className="hit">
              <IconReply size={18} />
            </span>
            {formatCount(tweet.metrics.replies)}
          </span>
          <span className="metric repost">
            <span className="hit">
              <IconRepost size={18} />
            </span>
            {formatCount(tweet.metrics.retweets)}
          </span>
          <span className="metric like">
            <span className="hit">
              <IconLike size={18} />
            </span>
            {formatCount(tweet.metrics.likes)}
          </span>
          <span className="metric views">
            <span className="hit">
              <IconViews size={18} />
            </span>
            {formatCount(tweet.metrics.views)}
          </span>
          <button type="button" className="shot no-shot" onClick={shoot}>
            <span className="hit">
              <IconShot size={18} />
            </span>
            截图
          </button>
        </div>
        {shotError ? <p className="shot-error no-shot">{shotError}</p> : null}
      </div>
    </article>
  )
}
