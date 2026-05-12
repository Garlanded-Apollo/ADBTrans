import { ArrowLeft, ArrowRight, Home, Search, FolderUp, FolderDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useQueueStore, executeTask } from '@/stores/queueStore'
import { useState, useEffect } from 'react'

export function Toolbar(): JSX.Element {
  const { currentPath, goBack, goForward, canGoBack, canGoForward, selected, checkedPaths, files, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const { addTask, startNextPending } = useQueueStore()
  const [inputPath, setInputPath] = useState(currentPath)

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

    const checkedFiles = files.filter((f) => checkedPaths.has(f.path) && f.type !== 'folder')
    const targetFiles = checkedFiles.length > 0
      ? checkedFiles
      : selected && selected.type !== 'folder'
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
    const next = startNextPending()
    if (next) executeTask(next)
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
    const next = startNextPending()
    if (next) executeTask(next)
  }

  const checkedCount = files.filter((f) => checkedPaths.has(f.path)).length

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
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-7 pl-8 text-xs" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(inputPath)} placeholder="/storage/emulated/0" />
      </div>
      {checkedCount > 0 && (
        <span className="shrink-0 text-[10px] text-primary">已选 {checkedCount} 项</span>
      )}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" title="上传到手机" onClick={handleUpload} disabled={!current}>
        <FolderUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="下载到电脑"
        onClick={handleDownload}
        disabled={checkedCount === 0 && (!selected || selected.type === 'folder')}
      >
        <FolderDown className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="删除" disabled={!selected}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  )
}
