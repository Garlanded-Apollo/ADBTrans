import { useState } from 'react'
import { ArrowLeft, ArrowRight, Home, Search, FolderUp, FolderDown, Trash2, Star, FileUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useQueueStore, executeTask } from '@/stores/queueStore'
import { useBookmarkStore } from '@/stores/bookmarkStore'
import { useEffect } from 'react'

export function Toolbar(): JSX.Element {
  const { currentPath, goBack, goForward, canGoBack, canGoForward, selected, checkedPaths, files, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const { addTask, startAllPending } = useQueueStore()
  const { addBookmark, isBookmarked } = useBookmarkStore()
  const [inputPath, setInputPath] = useState(currentPath)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => { setInputPath(currentPath) }, [currentPath])

  const navigate = (path: string): void => {
    const trimmed = path.trim()
    if (!trimmed || !current?.serial) return
    navigateTo(trimmed, current.serial)
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

  const handleDelete = (): void => {
    if (!current?.serial) return

    const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
    const targetFiles = checkedFiles.length > 0
      ? checkedFiles
      : selected
        ? [selected]
        : []

    if (targetFiles.length === 0) return
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!current?.serial) return
    setDeleteConfirmOpen(false)

    const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
    const targetFiles = checkedFiles.length > 0
      ? checkedFiles
      : selected
        ? [selected]
        : []

    for (const f of targetFiles) {
      try {
        await window.api.deletePath(current.serial, f.path)
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
    useFileStore.getState().removeFilesFromList(targetFiles.map((f) => f.path))
  }

  const checkedCount = files.filter((f) => checkedPaths.has(f.path)).length
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
        <Input className="h-7 pl-8 text-xs" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(inputPath)} placeholder="/storage/emulated/0" />
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
      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="上传文件到手机" onClick={handleUpload} disabled={!current}>
        <FileUp className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="上传文件夹到手机" onClick={handleUploadFolder} disabled={!current}>
        <FolderUp className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        title="下载到电脑"
        onClick={handleDownload}
        disabled={checkedCount === 0 && !selected}
      >
        <FolderDown className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="删除" onClick={handleDelete} disabled={checkedCount === 0 && !selected}><Trash2 className="h-4 w-4" /></Button>

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
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="确认删除"
        message={(() => {
          const checkedFiles = files.filter((f) => checkedPaths.has(f.path))
          const targetFiles = checkedFiles.length > 0
            ? checkedFiles
            : selected
              ? [selected]
              : []
          return `确定要删除以下文件吗？\n\n${targetFiles.map((f) => f.name).join('\n')}`
        })()}
        confirmLabel="删除"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
