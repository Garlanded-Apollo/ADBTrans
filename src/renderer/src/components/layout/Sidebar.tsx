import { Download, Upload, Clock, FolderOpen, Star, HardDrive } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DeviceCard } from '@/components/device/DeviceCard'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { cn } from '@/lib/utils'

const QUICK_PATHS = [
  { label: '内部存储', path: '/storage/emulated/0', icon: HardDrive },
  { label: 'Download', path: '/storage/emulated/0/Download', icon: Download },
  { label: 'DCIM', path: '/storage/emulated/0/DCIM', icon: Star },
  { label: 'Pictures', path: '/storage/emulated/0/Pictures', icon: Star },
  { label: 'Documents', path: '/storage/emulated/0/Documents', icon: FolderOpen }
]

interface SidebarProps {
  onOpenWifiDialog?: () => void
}

export function Sidebar({ onOpenWifiDialog }: SidebarProps): JSX.Element {
  const { currentPath, navigateTo } = useFileStore()
  const { current } = useDeviceStore()

  const navigate = (path: string): void => {
    if (!current?.serial) return
    navigateTo(path, current.serial)
  }

  return (
    <aside className="flex w-[260px] flex-col border-r bg-muted/20">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          <DeviceCard onOpenWifiDialog={onOpenWifiDialog} />
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">快捷路径</span>
            </div>
            {QUICK_PATHS.map((item) => (
              <button
                key={item.path}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                  currentPath === item.path ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">最近访问</span>
            </div>
            <div className="px-2.5 py-2 text-xs text-muted-foreground">暂无记录</div>
          </div>
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>拖拽文件到此处上传</span>
        </div>
      </div>
    </aside>
  )
}
