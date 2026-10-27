import { toPng } from 'html-to-image'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../lib/classify'
import { formatCount, formatStatusStamp, formatTweetTime, imageSrc } from '../lib/format'
import { boxesStayWhole, cropPng, iphoneSliceHeight, measureBlocks, sliceBounds } from '../lib/longShot'
import type { Media, QuoteTweet, StoredTweet } from '../lib/types'
import { IconLike, IconLongShot, IconPlay, IconReply, IconRepost, IconShot, IconViews, VerifiedBadge } from './Icons'

type ShotItem = { href: string; name: string; file: File }

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

function MediaGrid({ media, linkFor }: { media: Media[]; linkFor?: (item: Media) => string | undefined }) {
  if (media.length === 0) return null
  return (
    <div className={`media media-${Math.min(media.length, 4)}`}>
      {media.slice(0, 4).map((item) => {
        const href = linkFor?.(item)
        const body = (
          <>
            <img src={imageSrc(item.url)} alt="" />
            {item.type === 'video' ? (
              <span className="play">
                <IconPlay size={16} />
              </span>
            ) : null}
          </>
        )
        if (!href) {
          return (
            <div key={item.url} className="media-link">
              {body}
            </div>
          )
        }
        return (
          <a key={item.url} href={href} target="_blank" rel="noreferrer" className="media-link">
            {body}
          </a>
        )
      })}
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
      <MediaGrid media={quote.media} />
    </div>
  )
}

function saveFile(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function fileExtension(type: string, url: string): string {
  if (type.includes('png') || /\.png(?:$|\?)/i.test(url)) return 'png'
  if (type.includes('webp') || /\.webp(?:$|\?)/i.test(url)) return 'webp'
  if (type.includes('gif') || /\.gif(?:$|\?)/i.test(url)) return 'gif'
  return 'jpg'
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('read'))
    reader.readAsDataURL(blob)
  })
}

async function paintImages(root: HTMLElement) {
  const images = [...root.querySelectorAll('img')]
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src
      if (!src || src.startsWith('data:')) return
      try {
        const response = await fetch(src, { signal: AbortSignal.timeout(20000) })
        if (!response.ok) return
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) return
        img.src = await blobToDataUrl(blob)
        await img.decode?.().catch(() => undefined)
      } catch {
        return
      }
      const width = img.clientWidth
      let height = img.clientHeight
      const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0
      if (width > 0 && height < 2 && ratio > 0) height = Math.round(width * ratio)
      if (width > 0 && height > 0) {
        img.style.width = `${width}px`
        img.style.height = `${height}px`
      }
    }),
  )
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const header = comma >= 0 ? dataUrl.slice(0, comma) : ''
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const mime = /data:([^;,]+)/.exec(header)?.[1] || 'image/png'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

function pictureList(tweet: StoredTweet): Media[] {
  const seen = new Set<string>()
  return [...tweet.media, ...(tweet.quote?.media ?? [])].filter((item) => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

function phoneSave(): boolean {
  return window.matchMedia('(max-width: 700px)').matches || /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function shotItem(dataUrl: string, name: string): Promise<ShotItem> {
  const blob = dataUrl.startsWith('data:') ? dataUrlToBlob(dataUrl) : await (await fetch(dataUrl)).blob()
  const file = new File([blob], name, { type: blob.type || 'image/png' })
  return { href: URL.createObjectURL(file), name, file }
}

async function renderPng(node: HTMLElement, backgroundColor: string, filter: (domNode: Node) => boolean) {
  const options = {
    backgroundColor,
    includeQueryParams: true,
    skipFonts: true,
    filter,
  }
  try {
    return await toPng(node, { ...options, pixelRatio: 2 })
  } catch {
    return await toPng(node, { ...options, pixelRatio: 1 })
  }
}

function usePhone() {
  const query = '(max-width: 700px)'
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const sync = () => setPhone(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return phone
}

function TweetFrame({
  tweet,
  dark,
  frameRef,
}: {
  tweet: StoredTweet
  dark: boolean
  frameRef: React.RefObject<HTMLElement | null>
}) {
  const stamp = formatStatusStamp(tweet.createdAt)
  const photos = tweet.media.slice(0, 4)
  return (
    <article ref={frameRef} className="x-card" data-mode={dark ? 'dark' : 'light'}>
      {tweet.repostedBy ? (
        <p className="x-repost">
          <IconRepost size={14} />
          嗯哼转发
        </p>
      ) : null}
      <header className="x-author">
        <img className="x-avatar" alt="" src={imageSrc(tweet.authorAvatar)} />
        <div className="x-who">
          <strong>
            <span>{tweet.authorName}</span>
            {tweet.verified ? <VerifiedBadge /> : null}
          </strong>
          <span className="x-handle">@{tweet.authorHandle}</span>
        </div>
      </header>
      {tweet.text ? <TweetText text={tweet.text} /> : null}
      {photos.length > 0 ? (
        <div className={`x-photos n${photos.length}`}>
          {photos.map((item) => (
            <div key={item.url} className="x-photo">
              <img alt="" src={imageSrc(item.url)} />
              {item.type === 'video' ? (
                <span className="play">
                  <IconPlay size={16} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {tweet.quote ? <Quote quote={tweet.quote} /> : null}
      <p className="x-time">
        <span>{stamp.time}</span>
        <span> · </span>
        <span>{stamp.date}</span>
        <span> · </span>
        <strong>{formatCount(tweet.metrics.views)}</strong>
        <span> 查看</span>
      </p>
      <div className="x-actions">
        <span>
          <IconReply size={18} />
          {formatCount(tweet.metrics.replies)}
        </span>
        <span>
          <IconRepost size={18} />
          {formatCount(tweet.metrics.retweets)}
        </span>
        <span>
          <IconLike size={18} />
          {formatCount(tweet.metrics.likes)}
        </span>
        <span>
          <IconViews size={18} />
          {formatCount(tweet.metrics.views)}
        </span>
      </div>
    </article>
  )
}

export function TweetCard({ tweet, layout = 'feed' }: { tweet: StoredTweet; layout?: 'feed' | 'post' }) {
  const navigate = useNavigate()
  const phone = usePhone()
  const cardRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLElement>(null)
  const busyRef = useRef(false)
  const [shotError, setShotError] = useState('')
  const [longBusy, setLongBusy] = useState(false)
  const [framing, setFraming] = useState(false)
  const [sheet, setSheet] = useState<ShotItem[] | null>(null)
  const names = CATEGORIES.filter((item) => tweet.categories.includes(item.id))
  const stamp = formatStatusStamp(tweet.createdAt)

  function closeSheet() {
    setSheet((current) => {
      current?.forEach((item) => URL.revokeObjectURL(item.href))
      return null
    })
  }

  function deliver(items: ShotItem[]) {
    if (items.length === 0) return
    if (!phoneSave()) {
      items.forEach((item) => saveFile(item.href, item.name))
      window.setTimeout(() => items.forEach((item) => URL.revokeObjectURL(item.href)), 4000)
      return
    }
    setSheet((current) => {
      current?.forEach((item) => URL.revokeObjectURL(item.href))
      return items
    })
  }

  async function keepSheet() {
    if (!sheet) return
    const files = sheet.map((item) => item.file)
    try {
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files })
        return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
    sheet.forEach((item) => saveFile(item.href, item.name))
  }

  function openPost(event: React.MouseEvent<HTMLElement>) {
    if (layout === 'post') return
    if (!window.matchMedia('(max-width: 700px)').matches) return
    const target = event.target
    if (!(target instanceof Element) || target.closest('a, button')) return
    navigate(`/status/${tweet.id}`)
  }

  useEffect(() => {
    if (!framing) return
    let cancel = false
    const run = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const node = frameRef.current
      if (!node || cancel) return
      await paintImages(node)
      if (cancel) return
      const dark = document.documentElement.dataset.theme !== 'light'
      const dataUrl = await renderPng(node, dark ? '#000000' : '#ffffff', () => true)
      if (cancel) return
      deliver([await shotItem(dataUrl, `enheng-${tweet.id}.png`)])
    }
    run()
      .catch(() => {
        if (!cancel) setShotError('这张图没有保存下来，可以再试一次')
      })
      .finally(() => {
        if (cancel) return
        setFraming(false)
        busyRef.current = false
      })
    return () => {
      cancel = true
    }
  }, [framing, tweet.id])

  async function shoot() {
    if (busyRef.current) return
    if (phoneSave()) {
      busyRef.current = true
      setShotError('')
      setFraming(true)
      return
    }
    const node = cardRef.current
    if (!node) return
    busyRef.current = true
    setShotError('')
    try {
      const backgroundColor = getComputedStyle(document.body).backgroundColor
      const text = node.querySelector('.tweet-text')
      const lineHeight = text instanceof HTMLElement ? parseFloat(getComputedStyle(text).lineHeight) || 24 : 24
      const long = text instanceof HTMLElement && text.scrollHeight > lineHeight * 12 + 4
      node.classList.add('shooting')
      if (long) node.classList.add('is-long')
      const dataUrl = await renderPng(node, backgroundColor, (domNode) => {
        return !(domNode instanceof HTMLElement && domNode.classList.contains('no-shot'))
      })
      deliver([await shotItem(dataUrl, `enheng-${tweet.id}.png`)])
    } catch {
      setShotError('这张图没有保存下来，可以再试一次')
    } finally {
      node.classList.remove('shooting', 'is-long')
      busyRef.current = false
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
        renderPng(node, backgroundColor, (domNode) => {
          if (!(domNode instanceof HTMLElement)) return true
          return !domNode.classList.contains('no-shot') && !domNode.classList.contains('media') && !domNode.closest('.media')
        }),
        Promise.all(
          pictures.map(async (item, index) => {
            try {
              const response = await fetch(imageSrc(item.url), { signal: AbortSignal.timeout(20000) })
              if (!response.ok) return null
              const blob = await response.blob()
              const name = `enheng-${tweet.id}-图${index + 1}.${fileExtension(blob.type, item.url)}`
              const file = new File([blob], name, { type: blob.type || 'image/jpeg' })
              return { href: URL.createObjectURL(file), name, file }
            } catch {
              return null
            }
          }),
        ),
      ])
      const pages = await cropPng(dataUrl, slices, rect.height)
      const textFiles = await Promise.all(pages.map((href, index) => shotItem(href, `enheng-${tweet.id}-长文-${index + 1}.png`)))
      const images = savedImages.filter((item): item is ShotItem => item !== null)
      deliver([...textFiles, ...images])
      if (images.length < pictures.length) setShotError('文字已经分开保存，有的图片没有存下来')
    } catch {
      setShotError('长文没有保存下来，可以再试一次')
    } finally {
      node.classList.remove('long-shot')
      busyRef.current = false
      setLongBusy(false)
    }
  }

  const topics =
    names.length > 0 ? (
      <div className="topics">
        {names.map((item) => (
          <Link key={item.id} to={`/topic/${item.id}`}>
            #{item.name}
          </Link>
        ))}
      </div>
    ) : null

  const actions = (
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
      {phone ? null : (
        <>
          <button type="button" className="shot no-shot" onClick={() => void shoot()} disabled={longBusy}>
            <span className="hit">
              <IconShot size={18} />
            </span>
            截图
          </button>
          <button type="button" className="shot shot-long no-shot" onClick={() => void shootLong()} disabled={longBusy}>
            <span className="hit">
              <IconLongShot size={18} />
            </span>
            {longBusy ? '正在保存' : '长文截图'}
          </button>
        </>
      )}
    </div>
  )

  const phoneShot = phone ? (
    <div className="shot-row no-shot">
      <button type="button" className="shot" onClick={() => void shoot()} disabled={longBusy}>
        <span className="hit">
          <IconShot size={18} />
        </span>
        截图
      </button>
    </div>
  ) : null

  const frameNode = framing
    ? createPortal(
        <div className="x-stage" aria-hidden="true">
          <TweetFrame tweet={tweet} dark={document.documentElement.dataset.theme !== 'light'} frameRef={frameRef} />
        </div>,
        document.body,
      )
    : null

  const sheetNode = sheet
    ? createPortal(
        <div className="shot-sheet no-shot" role="dialog" aria-label="保存图片">
          <div className="shot-sheet-bar">
            <strong>保存到手机</strong>
            <button type="button" onClick={closeSheet}>
              关闭
            </button>
          </div>
          <p>点下面的按钮，在分享菜单里选存储图像。也可以长按图片保存。</p>
          <button type="button" className="shot-keep" onClick={() => void keepSheet()}>
            保存{sheet.length > 1 ? ` ${sheet.length} 张` : ''}
          </button>
          <div className="shot-sheet-pages">
            {sheet.map((item) => (
              <img key={item.name} src={item.href} alt={item.name} />
            ))}
          </div>
        </div>,
        document.body,
      )
    : null

  if (layout === 'post') {
    return (
      <>
        <article className="tweet post" ref={cardRef}>
          {tweet.repostedBy ? <p className="repost-line">嗯哼转发</p> : null}
          <header className="status-author">
            <img className="avatar" src={imageSrc(tweet.authorAvatar)} alt="" />
            <div className="who">
              <strong>
                <span className="name">{tweet.authorName}</span>
                {tweet.verified ? <VerifiedBadge /> : null}
              </strong>
              <span className="handle">@{tweet.authorHandle}</span>
            </div>
          </header>
          <TweetText text={tweet.text} />
          <p className="shot-more">后面还有，全文在页面上</p>
          <MediaGrid media={tweet.media} linkFor={(item) => (item.type === 'video' ? tweet.url : undefined)} />
          {tweet.quote ? <Quote quote={tweet.quote} /> : null}
          <p className="status-meta">
            <time dateTime={tweet.createdAt}>
              {stamp.time} · {stamp.date}
            </time>
            <span> · </span>
            <strong>{formatCount(tweet.metrics.views)}</strong>
            <span> 查看</span>
          </p>
          {actions}
          {phoneShot}
          {topics}
          {shotError ? <p className="shot-error no-shot">{shotError}</p> : null}
        </article>
        {frameNode}
        {sheetNode}
      </>
    )
  }

  return (
    <>
      <article className="tweet feed" ref={cardRef} onClick={openPost}>
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
          <MediaGrid media={tweet.media} linkFor={() => tweet.url} />
          {tweet.quote ? <Quote quote={tweet.quote} /> : null}
          {actions}
          {phoneShot}
          {topics}
          {shotError ? <p className="shot-error no-shot">{shotError}</p> : null}
        </div>
      </article>
      {frameNode}
      {sheetNode}
    </>
  )
}
