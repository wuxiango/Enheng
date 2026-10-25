import { describe, expect, it } from 'vitest'
import { parseTweetUrl } from '../src/lib/url'

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
