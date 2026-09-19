import { useState, useCallback, useRef } from 'react'
import { Clock, FolderOpen, Star, HardDrive, Pencil, Trash2, Monitor, Settings, Terminal } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DeviceCard } from '@/components/device/DeviceCard'
import { BookmarkDialog } from '@/components/bookmark/BookmarkDialog'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUpdateStore } from '@/stores/updateStore'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HardDrive,
  Star,
  FolderOpen
}

interface SidebarProps {
  onOpenWifiDialog?: () => void
  activeView: 'files' | 'scripts'
  onViewChange: (view: 'files' | 'scripts') => void
}

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400
const DEFAULT_SIDEBAR_WIDTH = 260

export function Sidebar({ onOpenWifiDialog, activeView, onViewChange }: SidebarProps): JSX.Element {
  const { currentPath, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const { bookmarks } = useBookmarkStore()
  const { history, removeHistory } = useHistoryStore()
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<'main' | 'about'>('main')
  const updateAvailable = useUpdateStore((state) => state.updateAvailable)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const isResizing = useRef(false)
  const sidebarRef = useRef<HTMLElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (e: MouseEvent): void => {
      if (!isResizing.current) return
      const delta = e.clientX - startX
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = (): void => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  const navigate = (path: string): void => {
    onViewChange('files')
    if (!current?.serial) return
    navigateTo(path, current.serial)
  }

  return (
    <aside ref={sidebarRef} className="relative flex flex-col border-r bg-muted/20 overflow-hidden" style={{ width: sidebarWidth }}>
      <div className="p-2 min-w-0">
        <DeviceCard onOpenWifiDialog={onOpenWifiDialog} />
      </div>
      <Separator />
      <div className="p-2 min-w-0">
        <div className="flex items-center justify-between px-1 min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">快捷路径</span>
          </div>
          <button
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setBookmarkDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1 space-y-0.5 overflow-x-hidden">
          {bookmarks.map((item) => (
            <button
              key={item.id}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition-colors',
                currentPath === item.path ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
              )}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              <Star className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2">
        <div className="flex items-center justify-between px-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">最近访问</span>
          </div>
        </div>
        <ScrollArea className="mt-1 min-w-0 flex-1">
          {history.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">暂无记录</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
              >
                <button
                  className="flex flex-1 items-center gap-1.5 truncate cursor-default"
                  onClick={() => navigate(item.path)}
                  title={item.label}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
                <button
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 cursor-default"
                  onClick={(e) => { e.stopPropagation(); removeHistory(item.id) }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
      <Separator />
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="relative flex items-center rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => { setSettingsPage('about'); setSettingsOpen(true) }}
            title={updateAvailable ? '发现新版本，点击查看' : '关于与更新'}
          >
            <Monitor className="h-4 w-4 shrink-0 text-primary" />
            {updateAvailable && (
              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            )}
          </button>
          <span className="truncate text-xs font-semibold">ADBTrans</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7 shrink-0', activeView === 'scripts' && 'bg-primary/10 text-primary')}
            onClick={() => onViewChange(activeView === 'scripts' ? 'files' : 'scripts')}
            title={activeView === 'scripts' ? '返回文件管理' : 'ADB 脚本'}
          >
            {activeView === 'scripts' ? <FolderOpen className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <BookmarkDialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialPage={settingsPage} />
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40 transition-colors"
        onMouseDown={handleResizeStart}
      />
    </aside>
  )
}
