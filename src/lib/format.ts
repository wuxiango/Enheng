export function formatCount(value: number): string {
  if (value >= 10000) {
    const scaled = value / 10000
    const text = scaled >= 10 ? String(Math.round(scaled)) : scaled.toFixed(1).replace(/\.0$/, '')
    return `${text}万`
  }
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function formatTweetTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const year = pick('year')
  const month = pick('month')
  const day = pick('day')
  const hour = pick('hour')
  const minute = pick('minute')
  const currentYear = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  })
    .formatToParts(now)
    .find((part) => part.type === 'year')?.value
  const dateText = year === currentYear ? `${month}月${day}日` : `${year}年${month}月${day}日`
  return `${dateText} ${hour}:${minute}`
}

export function formatStatusStamp(iso: string): { time: string; date: string } {
  const date = new Date(iso)
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    time: `${pick('hour')}:${pick('minute')}`,
    date: `${pick('year')}年${pick('month')}月${pick('day')}日`,
  }
}

export function imageSrc(url: string): string {
  if (!url) return ''
  if (import.meta.env.VITE_STATIC === 'true') {
    const proxied = new URL('https://wsrv.nl/')
    proxied.searchParams.set('url', url)
    proxied.searchParams.set('n', '-1')
    return proxied.toString()
  }
  return `/api/img?url=${encodeURIComponent(url)}`
}

export function tweetsUrl(): string {
  return import.meta.env.VITE_STATIC === 'true' ? `${import.meta.env.BASE_URL}data/tweets.json` : '/api/tweets'
}

export function albumsUrl(): string {
  return import.meta.env.VITE_STATIC === 'true' ? `${import.meta.env.BASE_URL}data/albums.json` : '/api/albums'
}

export function albumFileSrc(file: string): string {
  return import.meta.env.VITE_STATIC === 'true'
    ? `${import.meta.env.BASE_URL}data/album-images/${file}`
    : `/api/album-files/${file}`
}
