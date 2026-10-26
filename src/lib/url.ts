const STATUS_URL =
  /(?:x\.com|twitter\.com|mobile\.twitter\.com|fxtwitter\.com|vxtwitter\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/i

export function parseTweetUrl(input: string): { handle: string; id: string } | null {
  const match = input.trim().match(STATUS_URL)
  if (!match) return null
  return { handle: match[1], id: match[2] }
}

export function isCuratedAuthor(handle: string): boolean {
  return handle.toLowerCase() === 'enheng456'
}

export const BATCH_LIMIT = 40

export function stripDuplicateLinks(input: string, existingIds: Iterable<string> = []): { text: string; removed: number } {
  const seen = new Set(existingIds)
  const kept: string[] = []
  let removed = 0
  for (const raw of input.split(/\s+/).map((item) => item.trim()).filter(Boolean)) {
    const parsed = parseTweetUrl(raw)
    if (parsed && seen.has(parsed.id)) {
      removed += 1
      continue
    }
    if (parsed) seen.add(parsed.id)
    kept.push(raw)
  }
  if (removed === 0) return { text: input, removed: 0 }
  return { text: kept.join('\n'), removed }
}

export function parseTweetBatch(input: string): {
  items: { raw: string; handle: string; id: string }[]
  rejected: { raw: string; error: string }[]
  overflow: number
  duplicates: number
} {
  const stripped = stripDuplicateLinks(input)
  const tokens = stripped.text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const items: { raw: string; handle: string; id: string }[] = []
  const rejected: { raw: string; error: string }[] = []
  for (const raw of tokens) {
    const parsed = parseTweetUrl(raw)
    if (!parsed) {
      rejected.push({ raw, error: '不是帖子链接' })
      continue
    }
    items.push({ raw, handle: parsed.handle, id: parsed.id })
  }
  const overflow = Math.max(0, items.length - BATCH_LIMIT)
  return { items: items.slice(0, BATCH_LIMIT), rejected, overflow, duplicates: stripped.removed }
}
