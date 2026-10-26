import { describe, expect, it } from 'vitest'
import { parseTweetBatch, parseTweetUrl, stripDuplicateLinks } from '../src/lib/url'

describe('parseTweetUrl', () => {
  it('解析 x.com 状态链接', () => {
    expect(parseTweetUrl('https://x.com/EnHeng456/status/2112871161872977984')).toEqual({
      handle: 'EnHeng456',
      id: '2112871161872977984',
    })
  })

  it('解析带查询参数和图片路径的链接', () => {
    expect(
      parseTweetUrl('https://twitter.com/enheng456/status/2107043111704916428/photo/1?s=20'),
    ).toEqual({
      handle: 'enheng456',
      id: '2107043111704916428',
    })
  })

  it('拒绝不是状态链接的地址', () => {
    expect(parseTweetUrl('https://x.com/EnHeng456')).toBeNull()
    expect(parseTweetUrl('不是链接')).toBeNull()
  })
})

describe('parseTweetBatch', () => {
  it('按空白拆开多条链接，并去掉重复', () => {
    const batch = parseTweetBatch(`
      https://x.com/EnHeng456/status/1
      不是链接
      https://x.com/EnHeng456/status/1
      https://twitter.com/other/status/2
    `)
    expect(batch.items.map((item) => item.id)).toEqual(['1', '2'])
    expect(batch.rejected.map((item) => item.error)).toEqual(['不是帖子链接'])
    expect(batch.duplicates).toBe(1)
    expect(batch.overflow).toBe(0)
  })

  it('删掉已经收录过的链接', () => {
    const cleaned = stripDuplicateLinks('https://x.com/EnHeng456/status/9\nhttps://x.com/EnHeng456/status/8', ['9'])
    expect(cleaned.removed).toBe(1)
    expect(cleaned.text).toBe('https://x.com/EnHeng456/status/8')
  })

  it('超出上限的部分记为未处理', () => {
    const links = Array.from({ length: 41 }, (_, index) => `https://x.com/EnHeng456/status/${index + 1}`).join('\n')
    const batch = parseTweetBatch(links)
    expect(batch.items).toHaveLength(40)
    expect(batch.overflow).toBe(1)
  })
})
