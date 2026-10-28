import { describe, expect, it } from 'vitest'
import { classifyTweet } from '../src/lib/classify'

describe('classifyTweet', () => {
  it('把 AI 工具和翻译放进 AI', () => {
    expect(classifyTweet('这就是 x 和 ai 的伟大，grok 自动翻译把语言统一了')).toEqual(['ai'])
  })

  it('英文单词里的字母不会被当成 AI', () => {
    expect(classifyTweet('打开 Gmail 和 airdrop 的链接，said nothing')).toEqual(['other'])
  })

  it('把仓位和宏观锚放进行情', () => {
    expect(classifyTweet('当下的行情不适合放手一搏，钱基本都在 BTC')).toEqual(['market'])
  })

  it('开盘和发币不再单独成类', () => {
    expect(classifyTweet('这波开盘如果紧跟热度，FDV 有机会，错过窗口就晚了')).toEqual(['other'])
  })

  it('币安人生这个名字不算观点', () => {
    expect(classifyTweet('朋友问你要不要空投，#币安人生 随手一打就是200万')).toEqual(['other'])
  })

  it('把合约和涨停放进行情', () => {
    expect(classifyTweet('剁手了开了两天合约了全反着来')).toEqual(['market'])
  })

  it('不再单列交易所，归入其他', () => {
    expect(classifyTweet('打开币安广场投一票，Upbit 同时上币')).toEqual(['other'])
  })

  it('把对具体人物的看法放进人物', () => {
    expect(classifyTweet('马斯克准备给美国每一个孩子送一股')).toEqual(['people'])
  })

  it('把身体和现场放进生活', () => {
    expect(classifyTweet('我的网球教练说选择大于努力')).toEqual(['life'])
  })

  it('把成长和学习放进观点', () => {
    expect(classifyTweet('回头看，那几年让我飞快成长，人生的第一笔本金就在那里')).toEqual(['views'])
  })

  it('一条帖子只放进得分最高的分类', () => {
    expect(
      classifyTweet('和 Ai 对话了很久，人类最大单一企业的市值上限大概不会超过美债的一半'),
    ).toEqual(['market'])
  })

  it('把稳定币放进行情', () => {
    expect(classifyTweet('第二家稳定币公司大概率也要上市了')).toEqual(['market'])
  })

  it('对不上已知主题时归入其他', () => {
    expect(classifyTweet('今天出门被打了，最近更新少')).toEqual(['other'])
  })
})
