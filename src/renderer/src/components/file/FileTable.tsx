import { Folder, File, Image, FileText, FileJson, FileCode, Film, Music, Package, Loader2, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFileStore, type FileItem } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { cn, formatBytes, formatDate } from '@/lib/utils'

function getFileIcon(item: FileItem): JSX.Element {
  if (item.type === 'folder') return <Folder className="h-4 w-4 text-blue-500" />
  if (item.type === 'symlink') return <File className="h-4 w-4 text-purple-500" />
  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return <Image className="h-4 w-4 text-green-500" />
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return <Film className="h-4 w-4 text-purple-500" />
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return <Music className="h-4 w-4 text-pink-500" />
  if (['json'].includes(ext)) return <FileJson className="h-4 w-4 text-yellow-500" />
  if (['xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'kt'].includes(ext)) return <FileCode className="h-4 w-4 text-cyan-500" />
  if (['txt', 'log', 'md', 'csv'].includes(ext)) return <FileText className="h-4 w-4 text-muted-foreground" />
  if (['zip', 'tar', 'gz', 'rar', '7z', 'apk'].includes(ext)) return <Package className="h-4 w-4 text-orange-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

interface FileTableProps {
  onOpenFolder: (path: string) => void
}

export function FileTable({ onOpenFolder }: FileTableProps): JSX.Element {
  const { files, selected, setSelected, loading, error } = useFileStore()
  const { current } = useDeviceStore()

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Folder className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p className="text-sm">请先选择设备</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-destructive opacity-50" />
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-1 text-xs">请检查设备连接状态或路径权限</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">名称</TableHead>
              <TableHead className="w-[15%] text-right">大小</TableHead>
              <TableHead className="w-[25%]">修改时间</TableHead>
              <TableHead className="w-[10%]">类型</TableHead>
              <TableHead className="w-[10%]">权限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((item) => (
              <TableRow
                key={item.path}
                className={cn('cursor-pointer select-none', selected?.path === item.path && 'bg-primary/10')}
                onClick={() => setSelected(item)}
                onDoubleClick={() => (item.type === 'folder' || item.type === 'symlink') && onOpenFolder(item.path)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getFileIcon(item)}
                    <span className="truncate">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{item.type === 'folder' ? '--' : formatBytes(item.size)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.modified)}</TableCell>
                <TableCell className="text-muted-foreground">{item.type === 'folder' ? '文件夹' : item.type === 'symlink' ? '链接' : (item.name.split('.').pop()?.toUpperCase() || '--')}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.permission}</TableCell>
              </TableRow>
            ))}
            {files.length === 0 && (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">此目录为空</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
