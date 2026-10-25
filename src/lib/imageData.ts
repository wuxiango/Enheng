const MAX_DEFAULT = 8 * 1024 * 1024

function matches(body: Buffer, ext: string): boolean {
  if (ext === 'jpg') return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
  if (ext === 'png') return body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47
  if (ext === 'gif') {
    const head = body.subarray(0, 6).toString('ascii')
    return head === 'GIF87a' || head === 'GIF89a'
  }
  if (ext === 'webp') return body.length >= 12 && body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

export function decodeImageDataUrl(dataUrl: string, maxBytes = MAX_DEFAULT): { body: Buffer; ext: 'jpg' | 'png' | 'webp' | 'gif' } | null {
  const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([a-z0-9+/=\r\n]+)$/i.exec(dataUrl.trim())
  if (!match) return null
  const raw = match[1].toLowerCase()
  const ext = raw === 'jpeg' || raw === 'jpg' ? 'jpg' : (raw as 'png' | 'webp' | 'gif')
  const body = Buffer.from(match[2], 'base64')
  if (body.length === 0 || body.length > maxBytes) return null
  if (!matches(body, ext)) return null
  return { body, ext }
}
