import { describe, expect, it } from 'vitest'
import { boxesStayWhole, iphoneSliceHeight, sliceBounds, type Box } from '../src/lib/longShot'

function lines(count: number, height = 24, gap = 0): Box[] {
  return Array.from({ length: count }, (_, index) => {
    const top = index * (height + gap)
    return { top, bottom: top + height }
  })
}

describe('sliceBounds', () => {
  it('不超过一屏时不切开', () => {
    expect(sliceBounds(400, lines(10), 844)).toEqual([[0, 400]])
  })

  it('按 iPhone 竖屏比例换算一屏高度', () => {
    expect(iphoneSliceHeight(390)).toBe(844)
    expect(iphoneSliceHeight(780)).toBe(1688)
  })

  it('只在行与行之间切开，不把一行切成两半', () => {
    const blocks = lines(80)
    const maxHeight = 500
    const total = blocks.at(-1)!.bottom
    const slices = sliceBounds(total, blocks, maxHeight)
    expect(slices[0][0]).toBe(0)
    expect(slices.at(-1)?.[1]).toBe(total)
    expect(slices.every(([, end], index) => index === 0 || end > slices[index - 1][1])).toBe(true)
    expect(slices.every(([start, end]) => end - start <= maxHeight + 1)).toBe(true)
    expect(boxesStayWhole(slices, blocks, maxHeight)).toBe(true)
    for (const block of blocks) {
      const crossed = slices.some(([start, end]) => block.top < start - 0.6 && block.bottom > start + 0.6)
        || slices.some(([start, end]) => block.top < end - 0.6 && block.bottom > end + 0.6 && block.bottom > end)
      expect(crossed).toBe(false)
    }
  })

  it('一行正好压在屏幕边上时，整行挪到下一张', () => {
    const blocks = [{ top: 480, bottom: 520 }]
    const slices = sliceBounds(600, blocks, 500)
    expect(slices).toEqual([
      [0, 480],
      [480, 600],
    ])
    expect(boxesStayWhole(slices, blocks, 500)).toBe(true)
  })

  it('两行之间的空白留在上一张，不单独成一张', () => {
    const slices = sliceBounds(100, [{ top: 0, bottom: 20 }], 50)
    expect(slices).toEqual([
      [0, 50],
      [50, 100],
    ])
  })
})
