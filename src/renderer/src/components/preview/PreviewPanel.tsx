import { Image, File, Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { formatBytes, formatDate } from '@/lib/utils'

const TEXT_EXT = ['txt', 'log', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'kt', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh']
const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

function getPreviewType(name: string): 'image' | 'text' | 'unknown' {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (IMG_EXT.includes(ext)) return 'image'
  if (TEXT_EXT.includes(ext)) return 'text'
  return 'unknown'
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

export function PreviewPanel(): JSX.Element {
  const { selected } = useFileStore()

  if (!selected) {
    return (
      <div className="flex w-[340px] flex-col items-center justify-center border-l text-muted-foreground">
        <File className="mb-2 h-8 w-8 opacity-30" />
        <span className="text-xs">选择文件以预览</span>
      </div>
    )
  }

  const previewType = selected.type === 'folder' ? 'unknown' : getPreviewType(selected.name)

  return (
    <div className="flex w-[340px] flex-col border-l">
      <Tabs defaultValue="preview" className="flex flex-1 flex-col">
        <div className="border-b px-3 pt-2">
          <TabsList className="h-8">
            <TabsTrigger value="preview" className="text-xs px-2.5">预览</TabsTrigger>
            <TabsTrigger value="info" className="text-xs px-2.5">信息</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="preview" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="flex min-h-[200px] items-center justify-center p-4">
              {previewType === 'image' ? (
                <div className="text-center text-xs text-muted-foreground">
                  <Image className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>图片预览</p>
                  <p className="mt-1 text-[10px]">需连接设备后加载</p>
                </div>
              ) : previewType === 'text' ? (
                <div className="w-full rounded-lg border bg-muted/50 p-3">
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">文本预览需连接设备后加载</pre>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  <File className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>不支持预览此文件类型</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="info" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">文件详情</span>
              </div>
              <Separator />
              <div className="space-y-2.5 text-xs">
                <InfoRow label="名称" value={selected.name} />
                <InfoRow label="路径" value={selected.path} />
                <InfoRow label="类型" value={selected.type === 'folder' ? '文件夹' : (selected.name.split('.').pop()?.toUpperCase() || '--')} />
                <InfoRow label="大小" value={selected.type === 'folder' ? '--' : formatBytes(selected.size)} />
                <InfoRow label="修改时间" value={formatDate(selected.modified)} />
                <InfoRow label="权限" value={selected.permission} mono />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
