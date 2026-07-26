import { useState, useEffect, memo, useRef, useCallback } from 'react'
import { Image } from 'lucide-react'
import { useDeviceStore } from '@/stores/deviceStore'

interface ThumbnailProps {
  path: string
  name: string
}

const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']

export function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return IMG_EXT.includes(ext)
}

export const Thumbnail = memo(function Thumbnail({ path, name }: ThumbnailProps): JSX.Element {
  const { current } = useDeviceStore()
  const [src, setSrc] = useState<string | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const mountedRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad || !current || current.state !== 'device') {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    const loadThumbnail = async (): Promise<void> => {
      try {
        const base64 = await window.api.getFileBase64(current.serial, path)
        if (!cancelled && mountedRef.current) {
          const ext = name.split('.').pop()?.toLowerCase() || ''
          const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            bmp: 'image/bmp'
          }
          const mimeType = mimeMap[ext] || 'application/octet-stream'
          setSrc(`data:${mimeType};base64,${base64}`)
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setError(true)
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadThumbnail()

    return () => {
      cancelled = true
    }
  }, [shouldLoad, path, current?.serial, current?.state])

  const renderIcon = useCallback(() => (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
      <Image className="h-4 w-4 text-green-500" />
    </div>
  ), [])

  if (error || !current || current.state !== 'device') {
    return <div ref={containerRef} className="h-8 w-8 shrink-0">{renderIcon()}</div>
  }

  if (!shouldLoad || loading) {
    return (
      <div ref={containerRef} className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
        {loading ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Image className="h-4 w-4 text-green-500" />
        )}
      </div>
    )
  }

  if (!src) {
    return <div ref={containerRef} className="h-8 w-8 shrink-0">{renderIcon()}</div>
  }

  return (
    <div ref={containerRef} className="h-8 w-8 shrink-0">
      <img
        src={src}
        alt={name}
        className="h-8 w-8 shrink-0 rounded object-cover"
      />
    </div>
  )
})
