import { House } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { imageSrc } from '../lib/format'
import { ENHENG_AVATAR, SOCIALS } from '../lib/profile'

const X_URL = 'https://x.com/EnHeng456'
const WEIBO_URL = 'https://weibo.com/u/6250319654'
const DOUYIN_URL = SOCIALS.find((item) => item.id === 'douyin')?.href ?? ''
const XHS_URL = SOCIALS.find((item) => item.id === 'xiaohongshu')?.href ?? ''

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.7 10.3 22.4 1.5h-1.8l-6.7 7.6L8.4 1.5H1.6l8.1 11.5L1.6 22.5h1.8l7.1-8.1 5.7 8.1h6.8L14.7 10.3Zm-2.5 2.8-.8-1.1L4.9 3h2.8l5.2 7.3.8 1.1 6.8 9.6h-2.8l-5.5-7.9Z"
      />
    </svg>
  )
}

function DouyinLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25F4EE"
        d="M16.4 6.2A4.3 4.3 0 0 1 14.6 4h-2.1v11.2a2.7 2.7 0 1 1-1.9-2.6V10.3a4.9 4.9 0 1 0 3.5 4.7V8.6a6 6 0 0 0 3.4 1.1V7.5a4.2 4.2 0 0 1-1.1-1.3Z"
      />
      <path
        fill="#FE2C55"
        d="M15.6 5.6A4.3 4.3 0 0 1 14 3.6h-2v11.2a2.7 2.7 0 1 1-1.9-2.6V9.8a4.9 4.9 0 1 0 3.5 4.7V8a6 6 0 0 0 3.4 1.1V6.9a4.2 4.2 0 0 1-1.4-1.3Z"
      />
      <path
        fill="currentColor"
        d="M14.9 5.1A4.2 4.2 0 0 1 13.5 3.4h-2.1v11.2a2.7 2.7 0 1 1-1.9-2.6V9.2a4.9 4.9 0 1 0 3.5 4.7V7.5a6 6 0 0 0 3.4 1.1V6.4a4.2 4.2 0 0 1-.5-1.3Z"
      />
    </svg>
  )
}

function WeiboLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#E6162D"
        d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.601l.014-.028zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.977.42-1.804 0-2.404-.781-1.112-2.915-1.053-5.364-.03 0 0-.766.331-.571-.271.376-1.217.315-2.224-.27-2.809-1.338-1.337-4.869.045-7.888 3.08C1.309 10.87 0 13.273 0 15.348c0 3.981 5.099 6.395 10.086 6.395 6.536 0 10.888-3.801 10.888-6.82 0-1.822-1.547-2.854-2.915-3.284v.01zm1.908-5.092c-.766-.856-1.908-1.187-2.96-.962-.436.09-.706.511-.616.932.09.42.511.691.932.602.511-.105 1.067.044 1.442.465.376.421.466.977.316 1.473-.136.406.089.856.51.992.405.119.857-.105.992-.512.33-1.021.12-2.178-.646-3.035l.03.045zm2.418-2.195c-1.576-1.757-3.905-2.419-6.054-1.968-.496.104-.812.587-.706 1.081.104.496.586.813 1.082.707 1.532-.331 3.185.15 4.296 1.383 1.112 1.246 1.429 2.943.947 4.416-.165.48.106 1.007.586 1.157.479.165.991-.104 1.157-.586.675-2.088.241-4.478-1.338-6.235l.03.045z"
      />
    </svg>
  )
}

const XHS_MARK = `${import.meta.env.BASE_URL}xiaohongshu.png`

export function SocialDock() {
  const { pathname } = useLocation()
  return (
    <footer className="social-dock">
      <div className="social-row">
        <a className="brand-link" href={X_URL} target="_blank" rel="noreferrer" aria-label="嗯哼">
          <img src={imageSrc(ENHENG_AVATAR)} alt="" />
        </a>
        <a className="brand-link" href={DOUYIN_URL} target="_blank" rel="noreferrer" aria-label="抖音">
          <DouyinLogo />
        </a>
        <a className="brand-link" href={WEIBO_URL} target="_blank" rel="noreferrer" aria-label="微博">
          <WeiboLogo />
        </a>
        <a className="brand-link xhs" href={XHS_URL} target="_blank" rel="noreferrer" aria-label="小红书">
          <img className="xhs-mark" src={XHS_MARK} alt="" />
        </a>
      </div>
      <nav className="dock-tabs" aria-label="快捷入口">
        <Link className={pathname === '/' ? 'dock-tab on' : 'dock-tab'} to="/" aria-label="首页">
          <House size={26} strokeWidth={1.75} />
          <span>首页</span>
        </Link>
        <a className="dock-tab" href={X_URL} target="_blank" rel="noreferrer" aria-label="推特">
          <XLogo />
          <span>推特</span>
        </a>
        {DOUYIN_URL ? (
          <a className="dock-tab" href={DOUYIN_URL} target="_blank" rel="noreferrer" aria-label="抖音">
            <DouyinLogo />
            <span>抖音</span>
          </a>
        ) : (
          <div className="dock-tab" aria-label="抖音">
            <DouyinLogo />
            <span>抖音</span>
          </div>
        )}
        <a className="dock-tab" href={WEIBO_URL} target="_blank" rel="noreferrer" aria-label="微博">
          <WeiboLogo />
          <span>微博</span>
        </a>
      </nav>
    </footer>
  )
}
