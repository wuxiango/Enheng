import { imageSrc } from '../lib/format'
import { ENHENG_AVATAR } from '../lib/profile'

const OFFICIAL_SITE = 'https://kandong.ai'

export function SiteNav() {
  return (
    <header className="site-nav">
      <a className="site-nav-logo" href={OFFICIAL_SITE} target="_blank" rel="noreferrer" aria-label="嗯哼官网">
        <img src={imageSrc(ENHENG_AVATAR)} alt="" />
      </a>
      <a className="site-nav-link" href={OFFICIAL_SITE} target="_blank" rel="noreferrer">
        嗯哼官网：KANDONG.AI
      </a>
    </header>
  )
}
