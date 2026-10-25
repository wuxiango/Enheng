import { MILESTONES } from '../lib/roadmap'

export function Roadmap() {
  return (
    <aside className="roadmap">
      <h2>嗯哼成长路线</h2>
      <p className="roadmap-lead">嗯哼，05后A9，加密中文圈著名KOL，靠交易成就A9，崇尚终生学习，热衷慈善事业，目前公益捐赠逾百万！</p>
      <ol>
        {MILESTONES.map((item) => (
          <li key={item.id}>
            <time>{item.when}</time>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            {item.source ? (
              item.sourceHref ? (
                <a href={item.sourceHref} target="_blank" rel="noreferrer">
                  {item.source}
                </a>
              ) : (
                <small>{item.source}</small>
              )
            ) : null}
          </li>
        ))}
      </ol>
    </aside>
  )
}
