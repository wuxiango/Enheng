import { imageSrc } from '../lib/format'
import { ENHENG_AVATAR, SOCIALS } from '../lib/profile'

export function SocialDock() {
  return (
    <footer className="social-dock">
      <div className="social-row">
      {SOCIALS.map((item) => {
        const body = (
          <>
            <img src={imageSrc(ENHENG_AVATAR)} alt="" />
            <span>
              <strong>{item.name}</strong>
              <small>{item.handle}</small>
            </span>
          </>
        )
        if (!item.href) {
          return (
            <div key={item.id} className="social-card">
              {body}
            </div>
          )
        }
        return (
          <a key={item.id} className="social-card" href={item.href} target="_blank" rel="noreferrer">
            {body}
          </a>
        )
      })}
      </div>
    </footer>
  )
}
