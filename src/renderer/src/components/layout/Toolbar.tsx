import { useState } from 'react'
import { ArrowLeft, ArrowRight, Home, Search, FolderDown, Star, Upload, RefreshCw, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useQueueStore, executeTask } from '@/stores/queueStore'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useEffect } from 'react'

interface ToolbarProps {
  previewOpen?: boolean
  onTogglePreview?: () => void
}

export function Toolbar({ previewOpen = false, onTogglePreview }: ToolbarProps): JSX.Element {
  const { currentPath, goBack, goForward, canGoBack, canGoForward, selected, checkedPaths, files, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const { addTask, startAllPending } = useQueueStore()
  const { addBookmark, isBookmarked } = useBookmarkStore()
  const [inputPath, setInputPath] = useState(currentPath)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState('')

  const toDisplayPath = (p: string): string => p.replace(/^\/storage\/emulated\/0(\/|$)/, '/sdcard$1')
  const toRealPath = (p: string): string => p.replace(/^\/sdcard(\/|$)/, '/storage/emulated/0$1')

  useEffect(() => { setInputPath(toDisplayPath(currentPath)) }, [currentPath])

  const navigate = (path: string): void => {
    const realPath = toRealPath(path.trim())
    if (!realPath || !current?.serial) return
    navigateTo(realPath, current.serial)
  }

  const handleGoBack = (): void => {
    const p = goBack()
    if (p && current?.serial) {
      useFileStore.getState().loadCurrentPath(current.serial)
    }
  }

  const handleGoForward = (): void => {
    const p = goForward()
    if (p && current?.serial) {
      useFileStore.getState().loadCurrentPath(current.serial)
    }
  }

  const handleDownload = async (): Promise<void> => {
    if (!current?.serial) return

    const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
    const targetFiles = checkedFiles.length > 0
      ? checkedFiles
      : selected
        ? [selected]
        : []

    if (targetFiles.length === 0) return

    const localDir = await window.api.selectDirectory()
    if (!localDir) return

    for (const f of targetFiles) {
      addTask({
        serial: current.serial,
        fileName: f.name,
        fromPath: f.path,
        toPath: `${localDir}/${f.name}`,
        direction: 'pull'
      })
    }
    const pending = startAllPending()
    pending.forEach((t) => executeTask(t))
  }

  const handleUpload = async (): Promise<void> => {
    if (!current?.serial) return
    const files = await window.api.selectFiles()
    if (!files) return
    for (const localPath of files) {
      const fileName = localPath.split('/').pop() || localPath
      const remotePath = `${currentPath}/${fileName}`
      addTask({
        serial: current.serial,
        fileName,
        fromPath: localPath,
        toPath: remotePath,
        direction: 'push'
      })
    }
    const pending = startAllPending()
    pending.forEach((t) => executeTask(t))
  }

  const handleUploadFolder = async (): Promise<void> => {
    if (!current?.serial) return
    const folderPath = await window.api.selectUploadDirectory()
    if (!folderPath) return

    const entries = await window.api.listLocalDirectory(folderPath)
    const folderName = folderPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || folderPath
    const remotePath = `${currentPath}/${folderName}`

    if (entries.length === 0) {
      await window.api.mkdir(current.serial, remotePath)
      useFileStore.getState().setPendingScrollTo(folderName)
      useFileStore.getState().loadCurrentPath(current.serial)
      return
    }

    addTask({
      serial: current.serial,
      fileName: folderName,
      fromPath: folderPath,
      toPath: remotePath,
      direction: 'push'
    })
    const pending = startAllPending()
    pending.forEach((t) => executeTask(t))
  }

  const handleAddBookmark = (): void => {
    const defaultName = currentPath.split('/').pop() || currentPath
    setBookmarkLabel(defaultName)
    setBookmarkDialogOpen(true)
  }

  const handleConfirmBookmark = (): void => {
    if (bookmarkLabel.trim()) {
      addBookmark(bookmarkLabel.trim(), currentPath)
      setBookmarkDialogOpen(false)
      setBookmarkLabel('')
    }
  }

  const bookmarked = isBookmarked(currentPath)

  return (
    <div className="flex h-11 items-center gap-1.5 border-b px-3">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack} disabled={!canGoBack()}>
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoForward} disabled={!canGoForward()}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/storage/emulated/0')}>
        <Home className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="刷新" onClick={() => current?.serial && useFileStore.getState().loadCurrentPath(current.serial)} disabled={!current}>
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-7 pl-8 text-xs bg-muted/50 border-border/50 focus:border-primary/50" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(inputPath)} placeholder="输入路径回车跳转..." />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${bookmarked ? 'text-yellow-500' : 'text-muted-foreground'}`}
        title="收藏当前路径"
        onClick={handleAddBookmark}
        disabled={!current}
      >
        <Star className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <DropdownMenu
        align="end"
        trigger={
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" title="上传到手机" disabled={!current}>
            <Upload className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        }
      >
        <DropdownItem icon={<Upload className="h-4 w-4" strokeWidth={2.5} />} onClick={handleUpload}>上传文件</DropdownItem>
        <DropdownItem icon={<Upload className="h-4 w-4" strokeWidth={2.5} />} onClick={handleUploadFolder}>上传文件夹</DropdownItem>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        title="下载到电脑"
        onClick={handleDownload}
        disabled={checkedPaths.size === 0 && !selected}
      >
        <FolderDown className="h-5 w-5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        title={previewOpen ? '关闭预览' : '打开预览'}
        onClick={onTogglePreview}
      >
        {previewOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
      </Button>

      <Dialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>收藏路径</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground">路径: {currentPath}</div>
            <Input
              placeholder="显示名称"
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmBookmark()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookmarkDialogOpen(false)}>取消</Button>
            <Button onClick={handleConfirmBookmark}>收藏</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
