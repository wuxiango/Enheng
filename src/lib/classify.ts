import type { CategoryId } from './types'

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: 'ai', name: 'AI', blurb: '模型、工具，以及 AI 怎么改变做事' },
  { id: 'market', name: '行情', blurb: '周期、仓位和宏观锚' },
  { id: 'projects', name: '项目', blurb: '开盘、发币和产品窗口' },
  { id: 'exchanges', name: '交易所', blurb: '平台、上币和活动' },
  { id: 'people', name: '人物', blurb: '对具体人物和公开动作的看法' },
  { id: 'life', name: '生活', blurb: '现场、日常和经历' },
  { id: 'other', name: '其他', blurb: '还没归进上面主题的帖子' },
]

const RULES: { id: CategoryId; words: string[] }[] = [
  { id: 'ai', words: ['ai', 'grok', 'claude', '模型', '翻译', 'nvidia', '英伟达'] },
  { id: 'market', words: ['行情', '牛市', '牛初', 'btc', '比特币', '美债', '市值', '黄金', '钱袋子', '仓位', '稳定币'] },
  { id: 'projects', words: ['开盘', 'fdv', '空投', 'tge', '发币', '预售'] },
  { id: 'exchanges', words: ['币安', 'binance', 'upbit', 'coinbase', 'htx', '火币', '交易所', '广场'] },
  { id: 'people', words: ['马斯克', 'musk', '孙哥', '孙宇晨', '何一', '李林'] },
  { id: 'life', words: ['网球', '减肥', '教练', '伙食'] },
]

export function classifyTweet(text: string): CategoryId[] {
  const haystack = text.toLowerCase()
  const hits = RULES.filter((rule) => rule.words.some((word) => haystack.includes(word))).map((rule) => rule.id)
  return hits.length > 0 ? hits : ['other']
}
