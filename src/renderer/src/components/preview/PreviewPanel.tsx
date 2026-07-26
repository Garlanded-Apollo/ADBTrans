import { useState, useEffect, useMemo } from 'react'
import { Image, File, Info, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { formatBytes, formatDate } from '@/lib/utils'

const TEXT_EXT = ['txt', 'log', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'kt', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'rb', 'go', 'rs', 'c', 'cpp', 'h']
const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']

function getPreviewType(name: string): 'image' | 'text' | 'unknown' {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (IMG_EXT.includes(ext)) return 'image'
  if (TEXT_EXT.includes(ext)) return 'text'
  return 'unknown'
}

function getMimeType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function FileInfo({ file }: { file: { name: string; path: string; type: string; size: number; modified: string; permission: string } }): JSX.Element {
  return (
    <div className="space-y-3 px-1 py-1">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">文件详情</span>
      </div>
      <Separator />
      <div className="space-y-2.5 text-xs leading-relaxed">
        <InfoRow label="名称" value={file.name} />
        <InfoRow label="路径" value={file.path} />
        <InfoRow label="类型" value={file.type === 'folder' ? '文件夹' : (file.name.split('.').pop()?.toUpperCase() || '--')} />
        <InfoRow label="大小" value={file.type === 'folder' ? '--' : formatBytes(file.size)} />
        <InfoRow label="修改时间" value={formatDate(file.modified)} />
        <InfoRow label="权限" value={file.permission} mono />
      </div>
    </div>
  )
}

export function PreviewPanel(): JSX.Element {
  const { selected, checkedPaths, files } = useFileStore()
  const { current } = useDeviceStore()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewFile = useMemo(() => {
    if (checkedPaths.size > 0) {
      const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
      return checkedFiles[checkedFiles.length - 1] || selected
    }
    return selected
  }, [selected, checkedPaths, files])

  useEffect(() => {
    setImageSrc(null)
    setTextContent(null)
    setError(null)

    if (!previewFile || !current || current.state !== 'device' || previewFile.type === 'folder') return

    const previewType = getPreviewType(previewFile.name)
    if (previewType === 'unknown') return

    let cancelled = false

    const loadPreview = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        if (previewType === 'image') {
          const base64 = await window.api.getFileBase64(current.serial, previewFile.path)
          if (!cancelled) {
            const mimeType = getMimeType(previewFile.name)
            setImageSrc(`data:${mimeType};base64,${base64}`)
          }
        } else if (previewType === 'text') {
          const content = await window.api.getFileContent(current.serial, previewFile.path)
          if (!cancelled) {
            setTextContent(content)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || '加载失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      cancelled = true
    }
  }, [previewFile?.path, current?.serial, current?.state])

  if (!previewFile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center border-l text-muted-foreground">
        <File className="mb-2 h-8 w-8 opacity-30" />
        <span className="text-xs">选择文件以预览</span>
      </div>
    )
  }

  const previewType = previewFile.type === 'folder' ? 'unknown' : getPreviewType(previewFile.name)

  // 图片类型：预览+信息合并显示
  if (previewType === 'image') {
    return (
      <div className="flex h-full w-full flex-col border-l overflow-hidden">
        <div className="flex-1 overflow-auto min-h-0 px-3 py-2">
          <div>
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">加载中...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="text-center text-xs text-destructive">
                  <Image className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>{error}</p>
                </div>
              </div>
            ) : imageSrc ? (
              <div className="flex items-center justify-center">
                <img
                  src={imageSrc}
                  alt={previewFile.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 350px)' }}
                />
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="text-center text-xs text-muted-foreground">
                  <Image className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>无法加载图片</p>
                </div>
              </div>
            )}
          </div>
          <Separator />
          <FileInfo file={previewFile} />
        </div>
      </div>
    )
  }

  // 文本类型：两个Tab
  if (previewType === 'text') {
    return (
      <div className="flex h-full w-full flex-col border-l overflow-hidden">
        <Tabs defaultValue="preview" className="flex flex-1 flex-col min-h-0">
          <div className="border-b px-3 pt-2">
            <TabsList className="h-8">
              <TabsTrigger value="preview" className="text-xs px-2.5">预览</TabsTrigger>
              <TabsTrigger value="info" className="text-xs px-2.5">信息</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            <div className="h-full overflow-auto px-3 py-2">
              <div>
                {loading ? (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">加载中...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <div className="text-center text-xs text-destructive">
                      <File className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      <p>{error}</p>
                    </div>
                  </div>
                ) : textContent !== null ? (
                  <div className="w-full rounded-lg border bg-muted/50 p-3">
                    <pre className="whitespace-pre-wrap break-all font-mono text-xs">{textContent}</pre>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <div className="text-center text-xs text-muted-foreground">
                      <File className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      <p>无法加载文本</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="info" className="flex-1 m-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <FileInfo file={previewFile} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // 其他类型/文件夹：只显示信息
  return (
    <div className="flex h-full w-full flex-col border-l overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <FileInfo file={previewFile} />
      </div>
    </div>
  )
}
