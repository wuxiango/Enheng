import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../lib/classify'
import { formatCount, formatTweetTime, imageSrc } from '../lib/format'
import { boxesStayWhole, cropPng, iphoneSliceHeight, measureBlocks, sliceBounds } from '../lib/longShot'
import type { Media, QuoteTweet, StoredTweet } from '../lib/types'
import { IconLike, IconLongShot, IconPlay, IconReply, IconRepost, IconShot, IconViews, VerifiedBadge } from './Icons'

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

function saveFile(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

function fileExtension(type: string, url: string): string {
  if (type.includes('png') || /\.png(?:$|\?)/i.test(url)) return 'png'
  if (type.includes('webp') || /\.webp(?:$|\?)/i.test(url)) return 'webp'
  if (type.includes('gif') || /\.gif(?:$|\?)/i.test(url)) return 'gif'
  return 'jpg'
}

function pictureList(tweet: StoredTweet): Media[] {
  const seen = new Set<string>()
  return [...tweet.media, ...(tweet.quote?.media ?? [])].filter((item) => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

export function TweetCard({ tweet }: { tweet: StoredTweet }) {
  const cardRef = useRef<HTMLElement>(null)
  const busyRef = useRef(false)
  const [shotError, setShotError] = useState('')
  const [longBusy, setLongBusy] = useState(false)
  const names = CATEGORIES.filter((item) => tweet.categories.includes(item.id))

  async function shoot() {
    const node = cardRef.current
    if (!node) return
    setShotError('')
    try {
      const backgroundColor = getComputedStyle(document.body).backgroundColor
      const text = node.querySelector('.tweet-text')
      const lineHeight = text instanceof HTMLElement ? parseFloat(getComputedStyle(text).lineHeight) || 24 : 24
      const long = text instanceof HTMLElement && text.scrollHeight > lineHeight * 12 + 4
      node.classList.add('shooting')
      if (long) node.classList.add('is-long')
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
    } finally {
      node.classList.remove('shooting', 'is-long')
    }
  }

  async function shootLong() {
    const node = cardRef.current
    if (!node || busyRef.current) return
    busyRef.current = true
    setLongBusy(true)
    setShotError('')
    const pictures = pictureList(tweet)
    try {
      node.classList.add('long-shot')
      const backgroundColor = getComputedStyle(document.body).backgroundColor
      const rect = node.getBoundingClientRect()
      const blocks = measureBlocks(node)
      const maxHeight = iphoneSliceHeight(rect.width)
      const slices = sliceBounds(rect.height, blocks, maxHeight)
      if (!boxesStayWhole(slices, blocks, maxHeight)) throw new Error('cut')
      const [dataUrl, savedImages] = await Promise.all([
        toPng(node, {
          pixelRatio: 2,
          backgroundColor,
          includeQueryParams: true,
          filter: (domNode) => {
            if (!(domNode instanceof HTMLElement)) return true
            return !domNode.classList.contains('no-shot') && !domNode.classList.contains('media') && !domNode.closest('.media')
          },
        }),
        Promise.all(
          pictures.map(async (item, index) => {
            try {
              const response = await fetch(imageSrc(item.url), { signal: AbortSignal.timeout(20000) })
              if (!response.ok) return null
              const blob = await response.blob()
              return {
                href: URL.createObjectURL(blob),
                name: `enheng-${tweet.id}-图${index + 1}.${fileExtension(blob.type, item.url)}`,
              }
            } catch {
              return null
            }
          }),
        ),
      ])
      const pages = await cropPng(dataUrl, slices, rect.height)
      pages.forEach((href, index) => saveFile(href, `enheng-${tweet.id}-长文-${index + 1}.png`))
      const images = savedImages.filter((item): item is { href: string; name: string } => item !== null)
      images.forEach((item) => saveFile(item.href, item.name))
      window.setTimeout(() => images.forEach((item) => URL.revokeObjectURL(item.href)), 4000)
      if (images.length < pictures.length) setShotError('文字已经分开保存，有的图片没有存下来')
    } catch {
      setShotError('长文没有保存下来，可以再试一次')
    } finally {
      node.classList.remove('long-shot')
      busyRef.current = false
      setLongBusy(false)
    }
  }

  return (
    <article className="tweet" ref={cardRef}>
      <img className="avatar" src={imageSrc(tweet.authorAvatar)} alt="" />
      <div className="tweet-body">
        {tweet.repostedBy ? <p className="repost-line">嗯哼转发</p> : null}
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
        <p className="shot-more">后面还有，全文在页面上</p>
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
          <button type="button" className="shot no-shot" onClick={shoot} disabled={longBusy}>
            <span className="hit">
              <IconShot size={18} />
            </span>
            截图
          </button>
          <button type="button" className="shot no-shot" onClick={() => void shootLong()} disabled={longBusy}>
            <span className="hit">
              <IconLongShot size={18} />
            </span>
            {longBusy ? '正在保存' : '长文截图'}
          </button>
        </div>
        {shotError ? <p className="shot-error no-shot">{shotError}</p> : null}
      </div>
    </article>
  )
}
