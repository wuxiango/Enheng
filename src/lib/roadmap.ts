export type Milestone = {
  id: string
  when: string
  title: string
  body: string
  source: string
  sourceHref?: string
}

export const MILESTONES: Milestone[] = [
  {
    id: 'early',
    when: '2022年',
    title: '开局2000块，普通家庭',
    body: '入圈前梦想是每个月赚300美元。',
    source: '',
  },
  {
    id: 'tst',
    when: '2025 年 2 月',
    title: '$TST，1000万市值上车',
    body: '该MEME受CZ互动影响，最终涨了50倍，这是嗯哼一次足以改变他人生的重要转折。',
    source: '',
  },
  {
    id: 'mubarak',
    when: '2025 年 3 月',
    title: '$MUBARAK，约 3000 万市值时因为CZ白帽叙事买入',
    body: '拿到上 Binance 约 1.2 亿市值。',
    source: '',
  },
  {
    id: 'a8',
    when: '2025 年春夏',
    title: '站稳 A8',
    body: '然后停下来健身、控制饮食、学习、AI。',
    source: '',
  },
  {
    id: 'aster',
    when: '2025 年 9 月 17 日',
    title: '$ASTER，从 $0.08 到 $2.2',
    body: '在价格$0.08时重仓买入并公开喊单，之后一路飙升到$2.2，顺利成就A9。',
    source: '',
  },
  {
    id: 'river',
    when: '2026 年 4 月',
    title: '$RIVER，再次抓住妖币',
    body: '本金2万美元，收益17倍！',
    source: '',
  },
  {
    id: 'rave',
    when: '2026 年 4 月',
    title: '$RAVE，著名妖币',
    body: '最高市值破百亿美元，嗯哼曾为链上第7大持有人！',
    source: '',
  },
]
