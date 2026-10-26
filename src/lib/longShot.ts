export type Box = { top: number; bottom: number }

// iPhone 14/15 竖屏逻辑分辨率。卡片比手机宽，按这个比例换算后，每张图在手机上刚好不超过一屏。
const IPHONE_WIDTH = 390
const IPHONE_HEIGHT = 844
const EPS = 0.5

export function iphoneSliceHeight(cardWidth: number): number {
  if (!(cardWidth > 0)) return IPHONE_HEIGHT
  return (cardWidth * IPHONE_HEIGHT) / IPHONE_WIDTH
}

export function sliceBounds(total: number, blocks: Box[], maxHeight: number): Array<[number, number]> {
  const end = Math.max(0, total)
  if (!(maxHeight > 0) || end <= maxHeight + EPS) return [[0, end]]

  const sorted = blocks
    .filter((box) => box.bottom - box.top > 0.01)
    .map((box) => ({
      top: Math.max(0, Math.min(box.top, end)),
      bottom: Math.max(0, Math.min(box.bottom, end)),
    }))
    .filter((box) => box.bottom - box.top > 0.01)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom)

  const points = [0]
  let cursor = 0
  for (let guard = 0; guard < 500 && end - cursor > maxHeight + EPS; guard += 1) {
    const limit = cursor + maxHeight
    let cut = limit
    for (const box of sorted) {
      if (box.bottom <= cursor + EPS) continue
      if (box.top >= limit - EPS) break
      const startsInWindow = box.top > cursor + EPS
      const endsInWindow = box.bottom <= limit + EPS
      if (endsInWindow && box.top >= cursor - EPS) {
        cut = box.bottom
        continue
      }
      if (startsInWindow && box.bottom > limit) {
        cut = box.top
        break
      }
      cut = limit
      break
    }
    if (cut <= cursor + EPS) cut = Math.min(limit, end)
    const cutsThrough = sorted.some((box) => box.top < cut - EPS && box.bottom > cut + EPS)
    if (!cutsThrough && cut < limit - EPS) {
      const nextTop = sorted.find((box) => box.top >= cut - EPS)?.top
      if (nextTop == null || nextTop > limit + EPS) cut = limit
    }
    points.push(Math.min(cut, end))
    cursor = points[points.length - 1]
  }
  if (end - points[points.length - 1] > EPS) points.push(end)
  return points.slice(0, -1).map((start, index) => [start, points[index + 1]])
}

export function boxesStayWhole(slices: Array<[number, number]>, boxes: Box[], maxHeight: number): boolean {
  return boxes.every((box) => {
    if (box.bottom - box.top > maxHeight + 1) return true
    return slices.some(([start, end]) => box.top >= start - 0.6 && box.bottom <= end + 0.6)
  })
}

export function measureBlocks(root: HTMLElement): Box[] {
  const rootTop = root.getBoundingClientRect().top
  const blocks: Box[] = []
  const push = (top: number, bottom: number) => {
    const localTop = top - rootTop
    const localBottom = bottom - rootTop
    if (localBottom - localTop > 0.5) blocks.push({ top: localTop, bottom: localBottom })
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const text = walker.currentNode
    const parent = text.parentElement
    if (!parent || !text.textContent?.trim()) continue
    if (parent.closest('.no-shot, .media, .shot-more')) continue
    const range = document.createRange()
    range.selectNodeContents(text)
    for (const rect of range.getClientRects()) {
      if (rect.width < 0.5 || rect.height < 0.5) continue
      push(rect.top, rect.bottom)
    }
  }

  for (const el of root.querySelectorAll('.actions, .avatar, .quote-head, img')) {
    if (!(el instanceof HTMLElement) || el.closest('.media, .no-shot')) continue
    const rect = el.getBoundingClientRect()
    push(rect.top, rect.bottom)
  }
  return blocks
}

export async function cropPng(dataUrl: string, slices: Array<[number, number]>, cssHeight: number): Promise<string[]> {
  const image = await loadImage(dataUrl)
  const scale = cssHeight > 0 ? image.naturalHeight / cssHeight : 1
  return slices.map(([start, end]) => {
    const sy = Math.max(0, Math.min(image.naturalHeight, Math.round(start * scale)))
    const ey = Math.max(sy + 1, Math.min(image.naturalHeight, Math.round(end * scale)))
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = ey - sy
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas')
    context.drawImage(image, 0, sy, image.naturalWidth, ey - sy, 0, 0, image.naturalWidth, ey - sy)
    return canvas.toDataURL('image/png')
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = src
  })
}
