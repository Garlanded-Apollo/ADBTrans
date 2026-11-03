const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp'
}

export function getImageMimeType(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  return IMAGE_MIME_BY_EXTENSION[extension] || null
}

/**
 * 文件后缀并不可靠（例如文本文件被改成 .jpg）。在交给 <img> 之前先检查
 * 常见图片格式的文件头，避免浏览器把无效内容渲染成裂图。
 */
export function hasImageSignature(base64: string): boolean {
  if (!base64) return false

  let header = ''
  try {
    // 前 24 个 base64 字符足以覆盖 JPEG/PNG/GIF/BMP/WEBP 的文件头
    header = atob(base64.slice(0, 24))
  } catch {
    return false
  }

  const bytes = Array.from(header, (char) => char.charCodeAt(0))
  if (bytes.length < 2) return false

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46
  const isBmp = bytes[0] === 0x42 && bytes[1] === 0x4d
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  return isJpeg || isPng || isGif || isBmp || isWebp
}
