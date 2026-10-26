import type { CategoryId } from './types'

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: 'market', name: '行情', blurb: '周期、仓位和价格' },
  { id: 'views', name: '观点', blurb: '对行业、成长和做事的看法' },
  { id: 'people', name: '人物', blurb: '对具体的人的看法' },
  { id: 'ai', name: 'AI', blurb: '模型、工具，以及用 AI 做事' },
  { id: 'life', name: '生活', blurb: '身体、吃饭和现场' },
  { id: 'other', name: '其他', blurb: '没有对上上面分类的帖子' },
]

const RULES: { id: CategoryId; words: string[] }[] = [
  { id: 'ai', words: ['ai', 'grok', 'claude', 'chatgpt', 'gemini', 'gpt', '模型', '翻译'] },
  { id: 'market', words: ['行情', '牛市', '牛初', 'btc', '比特币', '大饼', '美债', '市值', '黄金', '钱袋子', '仓位', '稳定币', '建仓', '合约', '涨停', '做空', '大盘', '崩盘', '套住', '炒股', '期权', '通缩', '通胀'] },
  { id: 'people', words: ['马斯克', 'musk', 'elon', '孙哥', '孙宇晨', '何一', '一姐', '李林', 'cz', '马云', '刘强东', '张朝阳'] },
  { id: 'life', words: ['网球', '减肥', '教练', '伙食', '健身', '少吃', '吃饭', '身体', '面基'] },
  { id: 'views', words: ['学习', '成长', '人生', '梦想', '心态', '坚持', '好奇', '感悟', '感想', '心气', '少年', '回头', '做事', '努力', '明白', '失败', '爱情', '舒适圈'] },
]

function mentions(text: string, word: string): boolean {
  const needle = word.toLowerCase()
  if (/^[a-z0-9]+$/i.test(word)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(text)
  }
  const source = needle === '人生' ? text.replaceAll('币安人生', '') : text
  return source.includes(needle)
}

export function classifyTweet(text: string): CategoryId[] {
  const haystack = text.toLowerCase()
  const hits = RULES.filter((rule) => rule.words.some((word) => mentions(haystack, word))).map((rule) => rule.id)
  return hits.length > 0 ? hits : ['other']
}
