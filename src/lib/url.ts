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
