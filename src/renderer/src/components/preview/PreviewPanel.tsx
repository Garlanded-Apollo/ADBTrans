import { useState, useEffect, useMemo } from 'react'
import { Image, File, Info, Loader2, FileText, ScanLine } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { formatBytes, formatDate } from '@/lib/utils'
import { getBuiltInPreviewMode, getFileExtension, usePreviewPreferenceStore, type PreviewMode, type RawImageDimensions } from '@/stores/previewPreferenceStore'

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value))
}

function nv21ToDataUrl(bytes: Uint8Array, width: number, height: number): string {
  if (width <= 0 || height <= 0 || width % 2 !== 0 || height % 2 !== 0) {
    throw new Error('NV21 的宽和高必须是正偶数')
  }

  const frameSize = width * height
  const expectedSize = frameSize * 3 / 2
  if (bytes.length !== expectedSize) {
    throw new Error(`文件大小与 ${width}×${height} NV21 不匹配（应为 ${expectedSize} 字节，实际 ${bytes.length} 字节）`)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建图像画布')

  const imageData = context.createImageData(width, height)
  const rgba = imageData.data

  for (let y = 0; y < height; y += 1) {
    const yRow = y * width
    const uvRow = frameSize + (y >> 1) * width
    for (let x = 0; x < width; x += 1) {
      const yValue = bytes[yRow + x]
      const uvIndex = uvRow + (x & ~1)
      const v = bytes[uvIndex] - 128
      const u = bytes[uvIndex + 1] - 128
      const luminance = Math.max(0, yValue - 16)
      const outputIndex = (yRow + x) * 4

      rgba[outputIndex] = clampChannel((298 * luminance + 409 * v + 128) >> 8)
      rgba[outputIndex + 1] = clampChannel((298 * luminance - 100 * u - 208 * v + 128) >> 8)
      rgba[outputIndex + 2] = clampChannel((298 * luminance + 516 * u + 128) >> 8)
      rgba[outputIndex + 3] = 255
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

interface DimensionSuggestion extends RawImageDimensions {
  source: 'filename' | 'fileSize'
  matchesFileSize: boolean
}

function suggestNv21Dimensions(fileName: string, fileSize: number): DimensionSuggestion | null {
  const nameMatch = fileName.match(/(?:^|[^0-9])(\d{2,5})\s*[xX×]\s*(\d{2,5})(?:[^0-9]|$)/)
  if (nameMatch) {
    const width = Number(nameMatch[1])
    const height = Number(nameMatch[2])
    if (width > 0 && height > 0 && width % 2 === 0 && height % 2 === 0) {
      return {
        width,
        height,
        source: 'filename',
        matchesFileSize: width * height * 3 / 2 === fileSize
      }
    }
  }

  const commonSizes: RawImageDimensions[] = [
    { width: 4000, height: 3000 }, { width: 3000, height: 4000 },
    { width: 3840, height: 2160 }, { width: 2160, height: 3840 },
    { width: 2560, height: 1440 }, { width: 1440, height: 2560 },
    { width: 1920, height: 1080 }, { width: 1080, height: 1920 },
    { width: 1600, height: 1200 }, { width: 1200, height: 1600 },
    { width: 1280, height: 960 }, { width: 960, height: 1280 },
    { width: 1280, height: 720 }, { width: 720, height: 1280 },
    { width: 800, height: 600 }, { width: 600, height: 800 },
    { width: 640, height: 480 }, { width: 480, height: 640 },
    { width: 640, height: 360 }, { width: 360, height: 640 },
    { width: 352, height: 288 }, { width: 288, height: 352 },
    { width: 320, height: 240 }, { width: 240, height: 320 }
  ]
  const match = commonSizes.find(({ width, height }) => width * height * 3 / 2 === fileSize)
  return match ? { ...match, source: 'fileSize', matchesFileSize: true } : null
}

function getAutomaticNv21Dimensions(fileName: string, fileSize: number): RawImageDimensions | undefined {
  const suggestion = suggestNv21Dimensions(fileName, fileSize)
  if (!suggestion?.matchesFileSize) return undefined
  return { width: suggestion.width, height: suggestion.height }
}

function Nv21SizeForm({ extension, fileName, fileSize, initialDimensions, onSave }: { extension: string; fileName: string; fileSize: number; initialDimensions?: RawImageDimensions; onSave: (dimensions: RawImageDimensions) => void }): JSX.Element {
  const suggested = suggestNv21Dimensions(fileName, fileSize)
  const initial = initialDimensions || suggested
  const [width, setWidth] = useState(initial ? String(initial.width) : '')
  const [height, setHeight] = useState(initial ? String(initial.height) : '')
  const parsedWidth = Number(width)
  const parsedHeight = Number(height)
  const valid = Number.isInteger(parsedWidth) && Number.isInteger(parsedHeight) && parsedWidth > 0 && parsedHeight > 0 && parsedWidth % 2 === 0 && parsedHeight % 2 === 0

  return (
    <div className="border-b px-3 py-3">
      <div className="flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium">设置 .{extension} 的 NV21 尺寸</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">NV21 文件不记录宽高，尺寸会保存并应用到同后缀文件。</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          className="h-8 w-20 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          inputMode="numeric"
          placeholder="宽度"
          value={width}
          onChange={(event) => setWidth(event.target.value.replace(/\D/g, ''))}
        />
        <span className="text-xs text-muted-foreground">×</span>
        <input
          className="h-8 w-20 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          inputMode="numeric"
          placeholder="高度"
          value={height}
          onChange={(event) => setHeight(event.target.value.replace(/\D/g, ''))}
        />
        <button
          className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!valid}
          onClick={() => onSave({ width: parsedWidth, height: parsedHeight })}
        >
          应用
        </button>
      </div>
      {suggested && (
        <p className={`mt-1.5 text-[10px] ${suggested.matchesFileSize ? 'text-muted-foreground' : 'text-destructive'}`}>
          {suggested.source === 'filename' ? '已从文件名识别' : '已根据文件大小推测'}为 {suggested.width}×{suggested.height}
          {!suggested.matchesFileSize && '，但该尺寸与文件大小不匹配'}
        </p>
      )}
    </div>
  )
}

function getMimeType(name: string): string {
  const ext = getFileExtension(name)
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
  const [editingNv21Size, setEditingNv21Size] = useState(false)
  const modesByExtension = usePreviewPreferenceStore((state) => state.modesByExtension)
  const rawDimensionsByExtension = usePreviewPreferenceStore((state) => state.rawDimensionsByExtension)
  const setPreviewMode = usePreviewPreferenceStore((state) => state.setMode)
  const setRawDimensions = usePreviewPreferenceStore((state) => state.setRawDimensions)

  const previewFile = useMemo(() => {
    if (checkedPaths.size > 0) {
      const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
      return checkedFiles[checkedFiles.length - 1] || selected
    }
    return selected
  }, [selected, checkedPaths, files])

  useEffect(() => {
    setEditingNv21Size(false)
  }, [previewFile?.path])

  useEffect(() => {
    setImageSrc(null)
    setTextContent(null)
    setError(null)

    if (!previewFile || !current || current.state !== 'device' || previewFile.type === 'folder') return

    const extension = getFileExtension(previewFile.name)
    const savedMode = extension ? modesByExtension[extension] : undefined
    const effectiveMode = savedMode || getBuiltInPreviewMode(previewFile.name)
    const previewType = effectiveMode === 'info' ? 'unknown' : effectiveMode
    if (previewType === 'unknown') return
    const rawDimensions = extension
      ? rawDimensionsByExtension[extension] || getAutomaticNv21Dimensions(previewFile.name, previewFile.size)
      : undefined
    if (previewType === 'nv21' && (!rawDimensions || editingNv21Size)) return

    let cancelled = false

    const loadPreview = async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        if (previewType === 'image' || previewType === 'nv21') {
          const base64 = await window.api.getFileBase64(current.serial, previewFile.path)
          if (!cancelled) {
            if (previewType === 'nv21' && rawDimensions) {
              setImageSrc(nv21ToDataUrl(decodeBase64(base64), rawDimensions.width, rawDimensions.height))
            } else {
              const mimeType = getMimeType(previewFile.name)
              setImageSrc(`data:${mimeType};base64,${base64}`)
            }
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
  }, [previewFile?.path, previewFile?.size, current?.serial, current?.state, modesByExtension, rawDimensionsByExtension, editingNv21Size])

  if (!previewFile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center border-l text-muted-foreground">
        <File className="mb-2 h-8 w-8 opacity-30" />
        <span className="text-xs">选择文件以预览</span>
      </div>
    )
  }

  const extension = getFileExtension(previewFile.name)
  const savedMode = extension ? modesByExtension[extension] : undefined
  const effectiveMode = savedMode || getBuiltInPreviewMode(previewFile.name)
  const storedRawDimensions = extension ? rawDimensionsByExtension[extension] : undefined
  const rawDimensions = storedRawDimensions || getAutomaticNv21Dimensions(previewFile.name, previewFile.size)
  const previewType = previewFile.type === 'folder' || effectiveMode === 'info'
    ? 'unknown'
    : effectiveMode

  const choosePreviewMode = (mode: PreviewMode): void => {
    if (extension) setPreviewMode(extension, mode)
  }

  // 图片类型：预览+信息合并显示
  if (previewType === 'nv21' && (!rawDimensions || editingNv21Size)) {
    return (
      <div className="flex h-full w-full flex-col border-l overflow-hidden">
        <Nv21SizeForm
          key={`${extension}:${previewFile.path}`}
          extension={extension}
          fileName={previewFile.name}
          fileSize={previewFile.size}
          initialDimensions={rawDimensions}
          onSave={(dimensions) => {
            setRawDimensions(extension, dimensions)
            setEditingNv21Size(false)
          }}
        />
        <div className="flex-1 overflow-auto min-h-0">
          <FileInfo file={previewFile} />
        </div>
      </div>
    )
  }

  if (previewType === 'image' || previewType === 'nv21') {
    return (
      <div className="flex h-full w-full flex-col border-l overflow-hidden">
        {previewType === 'nv21' && rawDimensions && (
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>NV21 · {rawDimensions.width}×{rawDimensions.height}</span>
            <button className="text-primary hover:underline" onClick={() => setEditingNv21Size(true)}>修改尺寸</button>
          </div>
        )}
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

  // 其他类型/文件夹：显示信息，并允许为未知后缀选择预览方式
  return (
    <div className="flex h-full w-full flex-col border-l overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        {previewFile.type !== 'folder' && extension && !savedMode && getBuiltInPreviewMode(previewFile.name) === 'info' && (
          <div className="border-b px-3 py-3">
            <p className="text-xs font-medium">选择 .{extension} 文件的默认预览方式</p>
            <p className="mt-1 text-[11px] text-muted-foreground">选择后会自动应用到所有同后缀文件，可在右键菜单中更改。</p>
            <div className="mt-2 flex gap-2">
              <button
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                onClick={() => choosePreviewMode('text')}
              >
                <FileText className="h-3.5 w-3.5" />
                文本
              </button>
              <button
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                onClick={() => choosePreviewMode('image')}
              >
                <Image className="h-3.5 w-3.5" />
                图片
              </button>
              <button
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                onClick={() => choosePreviewMode('nv21')}
              >
                <ScanLine className="h-3.5 w-3.5" />
                NV21
              </button>
            </div>
          </div>
        )}
        <FileInfo file={previewFile} />
      </div>
    </div>
  )
}
