import { useState } from 'react'
import { Clock, FolderOpen, Star, HardDrive, Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DeviceCard } from '@/components/device/DeviceCard'
import { BookmarkDialog } from '@/components/bookmark/BookmarkDialog'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HardDrive,
  Star,
  FolderOpen
}

interface SidebarProps {
  onOpenWifiDialog?: () => void
}

export function Sidebar({ onOpenWifiDialog }: SidebarProps): JSX.Element {
  const { currentPath, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const { bookmarks } = useBookmarkStore()
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)

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
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">快捷路径</span>
              </div>
              <button
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setBookmarkDialogOpen(true)}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {bookmarks.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                    currentPath === item.path ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Star className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
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
      <BookmarkDialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen} />
    </aside>
  )
}
